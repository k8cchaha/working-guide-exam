const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { Script } = require('node:vm')
const ts = require('typescript')
const accounts = require('../.test-build/lib/accounts.js')

const filename = path.resolve(__dirname, '../src/actions/auth.ts')
const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
  fileName: filename,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
})
const instantiate = new Script(`(function(require, module, exports) {\n${outputText}\n})`, { filename }).runInThisContext()

function harness() {
  const passwords = []
  const user = { id: 'user-id', username: 'alice' }
  const dependencies = {
    '@/lib/db': { prisma: { user: {} } },
    '@/lib/auth': { isAdminUsername: () => false, setUserCookie: async () => {} },
    '@/lib/accounts': {
      ...accounts,
      registerAccount: async (_store, _username, password) => { passwords.push(password); return { user } },
      authenticateAccount: async (_store, _username, password) => { passwords.push(password); return user },
    },
    'next/navigation': { redirect: (url) => { throw Object.assign(new Error('redirect'), { url }) } },
  }
  const module = { exports: {} }
  instantiate((name) => { assert.ok(name in dependencies); return dependencies[name] }, module, module.exports)
  return { actions: module.exports, passwords }
}

function credentials(password) {
  const form = new FormData()
  form.set('username', 'Alice')
  form.set('password', password)
  return form
}

test('registration rejects passwords outside 4–16 before creating an account', async () => {
  const h = harness()
  for (const length of [3, 17]) {
    assert.deepEqual(await h.actions.registerUserAction({ error: '' }, credentials('p'.repeat(length))), {
      error: '密碼需為 4–16 個字元',
    })
  }
  assert.deepEqual(h.passwords, [])
})

test('registration accepts both 4-character and 16-character boundaries', async () => {
  const h = harness()
  for (const length of [4, 16]) {
    await assert.rejects(h.actions.registerUserAction({ error: '' }, credentials('p'.repeat(length))),
      (error) => error.url === '/admin/dashboard')
  }
  assert.deepEqual(h.passwords.map((password) => password.length), [4, 16])
})

test('login accepts new short passwords and preserves existing longer passwords', async () => {
  const h = harness()
  for (const length of [4, 16, 17, 128]) {
    await assert.rejects(h.actions.loginUserAction({ error: '' }, credentials('p'.repeat(length))),
      (error) => error.url === '/admin/dashboard')
  }
  assert.deepEqual(h.passwords.map((password) => password.length), [4, 16, 17, 128])
  assert.deepEqual(await h.actions.loginUserAction({ error: '' }, credentials('p'.repeat(129))), {
    error: '帳號或密碼錯誤',
  })
})
