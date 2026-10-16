const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { Script } = require('node:vm')
const ts = require('typescript')
const { getOwnerKey, readableBankWhere } = require('../.test-build/lib/session-token.js')

// Execute the real actions with explicit unit-test boundaries, not Next or Prisma.
// No global require hooks, application configuration, or database connections.
const filename = path.resolve(__dirname, '../src/actions/admin.ts')
const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
  fileName: filename,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
})
const instantiate = new Script(`(function(require, module, exports) {\n${outputText}\n})`, { filename })
  .runInThisContext()

const USER = { role: 'user', username: 'alice', sub: 'immutable-id', ownerKey: 'user:immutable-id' }
const ADMIN = { role: 'admin', username: USER.username, ownerKey: 'admin:alice' }
const FOREIGN_OWNERS = [ADMIN.ownerKey, 'user:another-id']
const QUESTION = { type: 'short_answer', text: ' Question ', points: 10, isBonus: false }

function harness({ session = USER, passwordValid = true, db = {} } = {}) {
  const calls = []
  const passwordCalls = []
  const invoke = (name, ...args) => {
    calls.push({ name, args: args[0] })
    assert.equal(typeof db[name], 'function', `Unexpected Prisma call: ${name}`)
    return db[name](...args)
  }
  const prisma = {}
  for (const model of ['exam', 'submission', 'savedList', 'savedListMember', 'questionBank', 'question']) {
    prisma[model] = new Proxy({}, { get: (_, method) => (...args) => invoke(`${model}.${method}`, ...args) })
  }
  prisma.$transaction = (...args) => invoke('$transaction', ...args)
  const dependencies = {
    '@/lib/auth': {
      getManagementSession: async () => session,
      validateManagementPassword: async (...args) => {
        passwordCalls.push(args)
        return passwordValid
      },
      validateAdminCredentials: () => assert.fail('Management actions must not use legacy admin credentials'),
    },
    '@/lib/db': { prisma },
    '@/lib/session-token': { readableBankWhere },
    '@/lib/scoring': { calculateTotal: (automatic, manual) => automatic + manual },
    '@/lib/questions': { QUESTIONS: [{ type: 'short_answer', points: 20 }] },
    'next/navigation': {
      redirect: (url) => { throw Object.assign(new Error('redirect'), { url }) },
    },
  }
  const module = { exports: {} }
  instantiate((name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`)
    return dependencies[name]
  }, module, module.exports)
  return {
    actions: module.exports, calls, passwordCalls,
    query(name) {
      const matching = calls.filter((call) => call.name === name)
      assert.equal(matching.length, 1, `Expected one ${name} call`)
      return matching[0].args
    },
  }
}

// Match the actual predicates against foreign fixtures. A missing owner constraint
// would expose the row or report a successful mutation, rather than always returning null.
function matches(row, where) {
  return !!row && Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return value.some((clause) => matches(row, clause))
    if (key === 'ownerKey_name') return matches(row, value)
    return value !== null && typeof value === 'object'
      ? matches(row[key], value)
      : row[key] === value
  })
}
const lookup = (...rows) => ({ where }) => rows.find((row) => matches(row, where)) ?? null
const affected = (row) => ({ where }) => ({ count: matches(row, where) ? 1 : 0 })
const called = (h, ...names) => assert.deepEqual(h.calls.map((call) => call.name), names)

const mutations = [
  { action: 'publishResultsAction', method: 'exam.updateMany', error: '找不到測驗' },
  { action: 'reopenExamAction', method: 'exam.updateMany', error: '找不到可重新開啟的測驗', status: 'PUBLISHED' },
  { action: 'deleteExamAction', method: 'exam.deleteMany', error: '找不到測驗', reauth: true },
  { action: 'deleteBankAction', method: 'questionBank.deleteMany', error: '題庫不存在', reauth: true },
]

const unauthenticated = [
  ['gradeSubmissionAction', ['submission', 5]],
  ...mutations.map(({ action }) => [action, ['resource', 'password']]),
  ['createExamAction', [60, 'GOOGLE', [], 'bank']],
  ['saveListAction', ['list', 'PASSWORD', [{ name: 'member' }]]],
  ['deleteSavedListAction', ['list']],
  ['createBankAction', ['bank']],
  ['toggleBankSharedAction', ['bank', true]],
  ['updateBankAction', ['bank', { name: 'bank', isShared: true }]],
  ['createQuestionAction', [{ ...QUESTION, bankId: 'bank' }]],
  ['updateQuestionAction', ['question', QUESTION]],
  ['updateQuestionOrdersAction', ['bank', ['question']]],
  ['deleteQuestionAction', ['question']],
]
for (const [action, args] of unauthenticated) {
  test(`${action} rejects unauthenticated requests before queries or reauthentication`, async () => {
    const h = harness({ session: null })
    assert.deepEqual(await h.actions[action](...args), { error: '未授權' })
    called(h)
    assert.deepEqual(h.passwordCalls, [])
  })
}

for (const ownerKey of FOREIGN_OWNERS) {
  test(`grading denies a submission owned by ${ownerKey}, despite the same display username`, async () => {
    const submission = { id: 'submission', adminUsername: USER.username, exam: { ownerKey } }
    const h = harness({ db: { 'submission.findFirst': lookup(submission) } })
    assert.deepEqual(await h.actions.gradeSubmissionAction(submission.id, 5), { error: '找不到作答記錄' })
    assert.deepEqual(h.query('submission.findFirst').where, {
      id: submission.id, exam: { ownerKey: USER.ownerKey },
    })
    called(h, 'submission.findFirst')
  })
}

test('grading also scopes the parent exam lookup to the authenticated owner', async () => {
  const submission = { id: 'submission', examId: 'exam', exam: { ownerKey: USER.ownerKey } }
  const h = harness({ db: {
    'submission.findFirst': lookup(submission),
    'exam.findUnique': lookup({ id: 'exam', ownerKey: ADMIN.ownerKey }),
  } })
  assert.deepEqual(await h.actions.gradeSubmissionAction(submission.id, 5), { error: '找不到測驗' })
  assert.deepEqual(h.query('exam.findUnique').where, { id: 'exam', ownerKey: USER.ownerKey })
  called(h, 'submission.findFirst', 'exam.findUnique')
})

test('owned submissions can be graded, but invalid manual scores never reach update', async () => {
  const submission = { id: 'submission', examId: 'exam', autoScore: 70, exam: { ownerKey: USER.ownerKey } }
  const exam = { id: 'exam', ownerKey: USER.ownerKey, questionBank: { questions: [QUESTION] } }
  for (const manualScore of [5, -1, 11, 1.5]) {
    const h = harness({ db: {
      'submission.findFirst': lookup(submission),
      'exam.findUnique': lookup(exam),
      'submission.update': ({ data }) => ({ ...submission, ...data }),
    } })
    const result = await h.actions.gradeSubmissionAction(submission.id, manualScore)
    assert.deepEqual(h.query('submission.findFirst').where, { id: submission.id, exam: { ownerKey: USER.ownerKey } })
    assert.deepEqual(h.query('exam.findUnique').where, { id: exam.id, ownerKey: USER.ownerKey })
    if (manualScore === 5) {
      assert.deepEqual(result, { ok: true })
      assert.deepEqual(h.query('submission.update'), {
        where: { id: submission.id }, data: { manualScore: 5, totalScore: 75 },
      })
    } else {
      assert.deepEqual(result, { error: '分數必須介於 0 到 10 之間' })
      called(h, 'submission.findFirst', 'exam.findUnique')
    }
  }
})

for (const { action, method, error, status, reauth } of mutations) {
  test(`${action} denies foreign owners using the exact mutation predicate`, async () => {
    for (const ownerKey of FOREIGN_OWNERS) {
      const h = harness({ db: { [method]: affected({ id: 'resource', ownerKey, status: 'PUBLISHED', adminUsername: USER.username }) } })
      assert.deepEqual(await h.actions[action]('resource', '  user password  '), { error })
      assert.deepEqual(h.query(method).where, {
        id: 'resource', ownerKey: USER.ownerKey, ...(status ? { status } : {}),
      })
      called(h, method)
      assert.deepEqual(h.passwordCalls, reauth ? [[USER, '  user password  ']] : [])
    }
  })

  test(`${action} allows an owned resource${reauth ? ' after general-user reauthentication' : ''}`, async () => {
    const h = harness({ db: { [method]: affected({ id: 'resource', ownerKey: USER.ownerKey, status: 'PUBLISHED' }) } })
    assert.deepEqual(await h.actions[action]('resource', 'user password'), { ok: true })
    const query = h.query(method)
    assert.deepEqual(query.where, { id: 'resource', ownerKey: USER.ownerKey, ...(status ? { status } : {}) })
    if (action === 'publishResultsAction') {
      assert.equal(query.data.status, 'PUBLISHED')
      assert.ok(query.data.publishedAt instanceof Date)
    } else if (action === 'reopenExamAction') {
      assert.deepEqual(query.data, { status: 'ACTIVE', publishedAt: null })
    }
    assert.deepEqual(h.passwordCalls, reauth ? [[USER, 'user password']] : [])
  })

  if (reauth) {
    test(`${action} rejects a failed general-user password check without a database call`, async () => {
      const h = harness({ passwordValid: false })
      assert.deepEqual(await h.actions[action]('resource', 'wrong password'), { error: '密碼錯誤' })
      assert.deepEqual(h.passwordCalls, [[USER, 'wrong password']])
      called(h)
    })
  }
}

test('reopening an owned but active exam fails the published-status predicate', async () => {
  const h = harness({ db: { 'exam.updateMany': affected({ id: 'exam', ownerKey: USER.ownerKey, status: 'ACTIVE' }) } })
  assert.deepEqual(await h.actions.reopenExamAction('exam'), { error: '找不到可重新開啟的測驗' })
  assert.deepEqual(h.query('exam.updateMany').where, { id: 'exam', ownerKey: USER.ownerKey, status: 'PUBLISHED' })
})

test('creating an exam cannot use another account\'s private bank', async () => {
  for (const ownerKey of FOREIGN_OWNERS) {
    const h = harness({ db: { 'questionBank.findFirst': lookup({ id: 'bank', ownerKey, isShared: false }) } })
    assert.deepEqual(await h.actions.createExamAction(60, 'GOOGLE', [], 'bank'), { error: '題庫不存在或未開放共用' })
    assert.deepEqual(h.query('questionBank.findFirst'), {
      where: { id: 'bank', OR: [{ ownerKey: USER.ownerKey }, { isShared: true }] }, select: { id: true },
    })
    called(h, 'questionBank.findFirst')
  }
})

for (const session of [USER, ADMIN]) {
  test(`exam creation for ${session.role} allows owned/private and foreign/shared banks, storing identity separately`, async () => {
    assert.equal(session.ownerKey, getOwnerKey(session))
    for (const bank of [
      { id: 'bank', ownerKey: session.ownerKey, isShared: false },
      { id: 'bank', ownerKey: 'user:another-id', isShared: true },
    ]) {
      const h = harness({ session, db: {
        'questionBank.findFirst': lookup(bank),
        'exam.create': ({ data }) => ({ ...data, id: 'new-exam' }),
      } })
      await assert.rejects(h.actions.createExamAction(65, 'PASSWORD', [
        { name: ' Member ', password: ' secret ' }, { name: ' Guest ' },
      ], bank.id, 'fixed'), (error) => error.url === '/admin/dashboard/new-exam')
      assert.deepEqual(h.query('questionBank.findFirst').where, {
        id: bank.id, OR: [{ ownerKey: session.ownerKey }, { isShared: true }],
      })
      assert.deepEqual(h.query('exam.create').data, {
        adminUsername: session.username, ownerKey: session.ownerKey,
        authMode: 'PASSWORD', passingScore: 65, questionOrder: 'fixed', questionBankId: bank.id,
        members: { create: [{ name: 'Member', password: 'secret' }, { name: 'Guest', password: null }] },
      })
      called(h, 'questionBank.findFirst', 'exam.create')
    }
  })

  test(`list and bank creation for ${session.role} use owner-key uniqueness while preserving display username`, async () => {
    const foreign = { id: 'foreign', name: 'Name', ownerKey: 'user:another-id', adminUsername: session.username }
    const h = harness({ session, db: {
      'savedList.findUnique': lookup(foreign),
      'savedList.create': ({ data }) => ({ ...data, id: 'list', members: data.members.create }),
      'questionBank.upsert': ({ where, create }) => lookup(foreign)({ where }) ?? { ...create, id: 'bank' },
    } })
    const result = await h.actions.saveListAction(' Name ', 'PASSWORD', [{ name: ' Member ' }])
    assert.deepEqual(result, { ok: true, list: {
      id: 'list', name: 'Name', authMode: 'PASSWORD', members: [{ name: 'Member', password: null }],
    } })
    assert.deepEqual(h.query('savedList.findUnique').where, {
      ownerKey_name: { ownerKey: session.ownerKey, name: 'Name' },
    })
    assert.deepEqual(h.query('savedList.create').data, {
      adminUsername: session.username, ownerKey: session.ownerKey, name: 'Name', authMode: 'PASSWORD',
      members: { create: [{ name: 'Member', password: null }] },
    })
    assert.equal((await h.actions.createBankAction(' Name ', true)).ok, true)
    assert.deepEqual(h.query('questionBank.upsert'), {
      where: { ownerKey_name: { ownerKey: session.ownerKey, name: 'Name' } }, update: {},
      create: { adminUsername: session.username, ownerKey: session.ownerKey, name: 'Name', isShared: true },
    })
    called(h, 'savedList.findUnique', 'savedList.create', 'questionBank.upsert')
  })
}

test('saving an existing owned list scopes the lookup before replacing its members', async () => {
  const existing = { id: 'list', name: 'Name', ownerKey: USER.ownerKey }
  const h = harness({ db: {
    'savedList.findUnique': lookup(existing),
    'savedListMember.deleteMany': () => ({ count: 1 }),
    'savedList.update': ({ data }) => ({ ...existing, authMode: data.authMode, members: data.members.create }),
  } })
  assert.equal((await h.actions.saveListAction(' Name ', 'PASSWORD', [{ name: 'New' }])).ok, true)
  assert.deepEqual(h.query('savedList.findUnique').where, { ownerKey_name: { ownerKey: USER.ownerKey, name: 'Name' } })
  assert.deepEqual(h.query('savedListMember.deleteMany').where, { savedListId: existing.id })
  assert.deepEqual(h.query('savedList.update').where, { id: existing.id })
  called(h, 'savedList.findUnique', 'savedListMember.deleteMany', 'savedList.update')
})

const scopedQueries = [
  { action: 'deleteSavedListAction', args: ['resource'], method: 'savedList.deleteMany', error: '找不到清單' },
  { action: 'toggleBankSharedAction', args: ['resource', false], method: 'questionBank.updateMany', error: '題庫不存在' },
  { action: 'updateBankAction', args: ['resource', { name: 'New', isShared: false }], method: 'questionBank.findFirst', error: '題庫不存在' },
  { action: 'createQuestionAction', args: [{ ...QUESTION, bankId: 'resource' }], method: 'questionBank.findFirst', error: '題庫不存在' },
  { action: 'updateQuestionOrdersAction', args: ['resource', ['question']], method: 'questionBank.findFirst', error: '題庫不存在' },
  { action: 'updateQuestionAction', args: ['resource', QUESTION], method: 'question.findFirst', error: '題目不存在', parent: true },
  { action: 'deleteQuestionAction', args: ['resource'], method: 'question.deleteMany', error: '題目不存在', parent: true },
]
for (const { action, args, method, error, parent } of scopedQueries) {
  test(`${action} excludes foreign resources even when bank sharing and display usernames match`, async () => {
    for (const ownerKey of FOREIGN_OWNERS) {
      const foreign = { id: 'resource', adminUsername: USER.username, ownerKey, isShared: true, bank: { ownerKey } }
      const h = harness({ db: { [method]: method.endsWith('Many') ? affected(foreign) : lookup(foreign) } })
      assert.deepEqual(await h.actions[action](...args), { error })
      assert.deepEqual(h.query(method).where, {
        id: 'resource', ...(parent ? { bank: { ownerKey: USER.ownerKey } } : { ownerKey: USER.ownerKey }),
      })
      called(h, method)
    }
  })
}

test('question creation verifies the owned parent before querying order and inserting', async () => {
  const h = harness({ db: {
    'questionBank.findFirst': lookup({ id: 'bank', ownerKey: USER.ownerKey }),
    'question.aggregate': () => ({ _max: { sortOrder: 3 } }),
    'question.create': ({ data }) => ({ ...data, id: 'question' }),
  } })
  const result = await h.actions.createQuestionAction({ ...QUESTION, bankId: 'bank', gradingHint: ' Hint ' })
  assert.equal(result.ok, true)
  assert.deepEqual(h.query('questionBank.findFirst').where, { id: 'bank', ownerKey: USER.ownerKey })
  assert.deepEqual(h.query('question.aggregate').where, { bankId: 'bank' })
  assert.deepEqual(h.query('question.create').data, {
    bankId: 'bank', ...QUESTION, text: 'Question', options: undefined, gradingHint: 'Hint', sortOrder: 4,
  })
  called(h, 'questionBank.findFirst', 'question.aggregate', 'question.create')
})

test('reordering an owned bank cannot modify question IDs from another bank', async () => {
  const foreignQuestion = { id: 'foreign-question', bankId: 'foreign-bank' }
  const h = harness({ db: {
    'questionBank.findFirst': lookup({ id: 'bank', ownerKey: USER.ownerKey }),
    'question.updateMany': affected(foreignQuestion),
    '$transaction': (operations) => Promise.all(operations),
  } })
  assert.deepEqual(await h.actions.updateQuestionOrdersAction('bank', [foreignQuestion.id]), { ok: true })
  assert.deepEqual(h.query('questionBank.findFirst').where, { id: 'bank', ownerKey: USER.ownerKey })
  assert.deepEqual(h.query('question.updateMany'), {
    where: { id: foreignQuestion.id, bankId: 'bank' }, data: { sortOrder: 0 },
  })
  assert.equal(matches(foreignQuestion, h.query('question.updateMany').where), false)
  called(h, 'questionBank.findFirst', 'question.updateMany', '$transaction')
})
