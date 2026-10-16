const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { Script } = require('node:vm')
const ts = require('typescript')
const tokens = require('../.test-build/lib/session-token.js')
const passwords = require('../.test-build/lib/password.js')

const filename = path.resolve(__dirname, '../src/lib/auth.ts')
const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
  fileName: filename,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
})
const instantiate = new Script(`(function(require, module, exports) {\n${outputText}\n})`, { filename }).runInThisContext()
process.env.JWT_SECRET = 'session-tests-only-secret'

function harness(initialCookies = {}, user = { id: 'id-1', username: 'alice' }) {
  const jar = new Map(Object.entries(initialCookies))
  const writes = []
  const queries = []
  const dependencies = {
    'next/headers': { cookies: async () => ({
      get: (name) => jar.has(name) ? { value: jar.get(name) } : undefined,
      delete: (name) => { jar.delete(name); writes.push({ name, deleted: true }) },
      set: (name, token, options) => { jar.set(name, token); writes.push({ name, token, options }) },
    }) },
    '@/lib/session-token': tokens,
    '@/lib/password': passwords,
    '@/lib/db': { prisma: { user: { findUnique: async (args) => { queries.push(args); return user } } } },
  }
  const module = { exports: {} }
  instantiate((name) => { assert.ok(name in dependencies); return dependencies[name] }, module, module.exports)
  return { auth: module.exports, jar, writes, queries }
}

test('Admin-only session helpers never accept signed normal-user tokens', async () => {
  const token = await tokens.signManagementToken({ role: 'user', sub: 'id-1', username: 'alice' })
  const h = harness({ admin_token: token })
  assert.equal(await h.auth.verifyAdminToken(token), null)
  assert.equal(await h.auth.getAdminSession(), null)
  assert.equal(await h.auth.getManagementSession(), null)
  assert.deepEqual(h.queries, [])
})

test('normal-user cookies reject signed Admin tokens', async () => {
  const token = await tokens.signManagementToken({ role: 'admin', username: 'admin' })
  const h = harness({ user_token: token })
  assert.equal(await h.auth.getManagementSession(), null)
  assert.deepEqual(h.queries, [])
})

test('user identity and ownership are loaded from the current account, not token username', async () => {
  const token = await tokens.signManagementToken({ role: 'user', sub: 'id-1', username: 'stale-name' })
  const h = harness({ user_token: token })
  assert.deepEqual(await h.auth.getManagementSession(), {
    role: 'user', sub: 'id-1', username: 'alice', ownerKey: 'user:id-1',
  })
  assert.deepEqual(h.queries, [{ where: { id: 'id-1' }, select: { id: true, username: true } }])
  assert.equal(await harness({ user_token: token }, null).auth.getManagementSession(), null)
})

test('Admin sessions remain compatible and do not require a database account', async () => {
  const token = await tokens.signManagementToken({ role: 'admin', username: 'admin' })
  const h = harness({ admin_token: token })
  assert.deepEqual(await h.auth.getManagementSession(), { role: 'admin', username: 'admin', ownerKey: 'admin:admin' })
  assert.deepEqual(h.queries, [])
})

test('switching management roles clears the other cookie and logout preserves Google session', async () => {
  const h = harness({ admin_token: 'old-admin', 'authjs.session-token': 'google-session' })
  await h.auth.setUserCookie({ id: 'id-1', username: 'alice' })
  assert.equal(h.jar.has('admin_token'), false)
  assert.deepEqual(await tokens.verifyManagementToken(h.jar.get('user_token')), {
    role: 'user', sub: 'id-1', username: 'alice',
  })
  const options = h.writes.find((write) => write.name === 'user_token' && write.options).options
  assert.equal(options.httpOnly, true)
  assert.equal(options.sameSite, 'lax')
  assert.equal(options.maxAge, 28800)
  assert.equal(options.path, '/')
  await h.auth.setAdminCookie(await h.auth.signAdminToken('admin'))
  assert.equal(h.jar.has('user_token'), false)
  assert.equal(h.jar.has('admin_token'), true)
  await h.auth.clearAdminCookie()
  assert.equal(h.jar.has('admin_token'), false)
  assert.equal(h.jar.has('user_token'), false)
  assert.equal(h.jar.get('authjs.session-token'), 'google-session')
})

test('password reauthentication uses the correct account type and preserves whitespace', async () => {
  const original = process.env.ADMIN_USERS
  try {
    process.env.ADMIN_USERS = JSON.stringify([{ username: 'Admin', password: 'admin-password' }])
    const passwordHash = await passwords.hashPassword('  user-password  ')
    const h = harness({}, { passwordHash })
    assert.equal(h.auth.isAdminUsername('admin'), true)
    assert.equal(h.auth.validateAdminCredentials('Admin', 'admin-password'), true)
    assert.equal(h.auth.validateAdminCredentials('admin', 'admin-password'), false)
    assert.equal(await h.auth.validateManagementPassword({ role: 'admin', username: 'Admin' }, 'admin-password'), true)
    assert.equal(await h.auth.validateManagementPassword({ role: 'user', sub: 'id-1' }, '  user-password  '), true)
    assert.equal(await h.auth.validateManagementPassword({ role: 'user', sub: 'id-1' }, 'user-password'), false)
    assert.equal(await h.auth.validateManagementPassword({ role: 'user', sub: 'id-1' }, 'admin-password'), false)
  } finally {
    if (original === undefined) delete process.env.ADMIN_USERS
    else process.env.ADMIN_USERS = original
  }
})
