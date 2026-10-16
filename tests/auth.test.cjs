const { test } = require('node:test')
const assert = require('node:assert/strict')
const { hashPassword, verifyPassword } = require('../.test-build/lib/password.js')
const {
  normalizeUsername, validateUserInput, registerAccount, authenticateAccount, DUPLICATE_USERNAME_ERROR,
} = require('../.test-build/lib/accounts.js')
const {
  signManagementToken, verifyManagementToken, getOwnerKey, readableBankWhere,
} = require('../.test-build/lib/session-token.js')
const { SignJWT } = require('jose')

process.env.JWT_SECRET = 'test-secret-not-used-by-the-application'

function memoryAccounts() {
  const users = new Map()
  return {
    users,
    async findUnique({ where }) { return users.get(where.username) ?? null },
    async create({ data }) {
      if (users.has(data.username)) throw Object.assign(new Error('unique constraint'), { code: 'P2002' })
      const user = { ...data, id: `id-${users.size + 1}` }
      users.set(data.username, user)
      return user
    },
  }
}

test('username normalization and credential limits are consistent', () => {
  assert.equal(normalizeUsername('  Alice.TEST  '), 'alice.test')
  assert.equal(validateUserInput('alice.test', 'password123'), null)
  for (const name of ['ab', 'a'.repeat(33), 'has space', '使用者', 'alice@host']) {
    assert.match(validateUserInput(name, 'password123'), /帳號/)
  }
  for (const length of [0, 3, 17, 128]) {
    assert.equal(validateUserInput('alice', 'p'.repeat(length)), '密碼需為 4–16 個字元')
  }
  for (const length of [4, 5, 16]) {
    assert.equal(validateUserInput('alice', 'p'.repeat(length)), null)
  }
})

test('scrypt uses different salts, preserves spaces, and rejects malformed hashes', async () => {
  const password = '  password123  '
  const first = await hashPassword(password)
  const second = await hashPassword(password)
  assert.notEqual(first, second)
  assert.equal(first.includes(password), false)
  assert.equal(await verifyPassword(password, first), true)
  assert.equal(await verifyPassword(password.trim(), first), false)
  assert.equal(await verifyPassword('wrong-password', first), false)
  for (const malformed of ['', 'plaintext', 'scrypt-v1$ff$ff', `${first}$extra`, first.replace('scrypt-v1', 'scrypt-v2')]) {
    assert.equal(await verifyPassword(password, malformed), false)
  }
  assert.equal(await verifyPassword('p'.repeat(129), first), false)
})

test('signup stores only hashes and duplicate accounts never overwrite credentials', async () => {
  const store = memoryAccounts()
  const result = await registerAccount(store, normalizeUsername('Alice'), 'password123')
  assert.deepEqual(result.user, { id: 'id-1', username: 'alice' })
  assert.equal('passwordHash' in result.user, false)
  const originalHash = store.users.get('alice').passwordHash
  const duplicate = await registerAccount(store, normalizeUsername(' ALICE '), 'other-password')
  assert.equal(duplicate.error, DUPLICATE_USERNAME_ERROR)
  assert.equal(store.users.get('alice').passwordHash, originalHash)
  assert.deepEqual(await authenticateAccount(store, 'alice', 'password123'), result.user)
  assert.equal(await authenticateAccount(store, 'alice', 'wrong-password'), null)
  assert.equal(await authenticateAccount(store, 'missing', 'password123'), null)
})

test('concurrent registration returns exactly one account and one duplicate error', async () => {
  const store = memoryAccounts()
  const results = await Promise.all([
    registerAccount(store, 'alice', 'password123'),
    registerAccount(store, 'alice', 'password456'),
  ])
  assert.equal(results.filter((result) => result.user).length, 1)
  assert.equal(results.filter((result) => result.error === DUPLICATE_USERNAME_ERROR).length, 1)
  assert.equal(store.users.size, 1)
})

test('unrelated database failures are not reported as duplicate accounts', async () => {
  const store = memoryAccounts()
  store.create = async () => { throw new Error('database unavailable') }
  await assert.rejects(registerAccount(store, 'alice', 'password123'), /database unavailable/)
})

test('management tokens enforce role, user ID, expiration and algorithm', async () => {
  const admin = { role: 'admin', username: 'admin' }
  const user = { role: 'user', username: 'alice', sub: 'user-id' }
  assert.deepEqual(await verifyManagementToken(await signManagementToken(admin)), admin)
  assert.deepEqual(await verifyManagementToken(await signManagementToken(user)), user)

  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  const invalidClaims = [
    { role: 'owner', username: 'admin' },
    { role: 'user', username: 'alice' },
    { role: 'user', username: 'alice', sub: '' },
    { role: 'admin', username: '' },
    { role: 'admin', username: 123 },
  ]
  for (const claims of invalidClaims) {
    const token = await new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(secret)
    assert.equal(await verifyManagementToken(token), null)
  }
  const expired = await new SignJWT(admin).setProtectedHeader({ alg: 'HS256' }).setExpirationTime(1).sign(secret)
  const noExpiry = await new SignJWT(admin).setProtectedHeader({ alg: 'HS256' }).sign(secret)
  const wrongAlgorithm = await new SignJWT(admin).setProtectedHeader({ alg: 'HS384' }).setExpirationTime('1h').sign(secret)
  const wrongSecret = await new SignJWT(admin).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h')
    .sign(new TextEncoder().encode('unrelated-secret'))
  for (const token of [expired, noExpiry, wrongAlgorithm, wrongSecret, 'not-a-token']) {
    assert.equal(await verifyManagementToken(token), null)
  }
})

test('legacy admin tokens without issuedAt remain valid', async () => {
  const token = await new SignJWT({ role: 'admin', username: 'admin' })
    .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('8h')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET))
  assert.deepEqual(await verifyManagementToken(token), { role: 'admin', username: 'admin' })
})

test('production sessions fail closed without a configured secret', async () => {
  const token = await signManagementToken({ role: 'admin', username: 'admin' })
  const secret = process.env.JWT_SECRET
  const environment = process.env.NODE_ENV
  try {
    delete process.env.JWT_SECRET
    process.env.NODE_ENV = 'production'
    assert.equal(await verifyManagementToken(token), null)
    await assert.rejects(signManagementToken({ role: 'admin', username: 'admin' }), /JWT_SECRET/)
  } finally {
    process.env.JWT_SECRET = secret
    if (environment === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = environment
  }
})

test('ownership separates roles, uses immutable user IDs, and scopes shared reads to the same role', () => {
  const admin = getOwnerKey({ role: 'admin', username: 'alice' })
  const user = getOwnerKey({ role: 'user', username: 'alice', sub: 'immutable-id' })
  assert.notEqual(admin, user)
  assert.notEqual(user, getOwnerKey({ role: 'admin', username: 'user:immutable-id' }))
  assert.equal(user, getOwnerKey({ role: 'user', username: 'renamed', sub: 'immutable-id' }))
  assert.notEqual(user, getOwnerKey({ role: 'user', username: 'alice', sub: 'another-id' }))
  assert.deepEqual(readableBankWhere(user, 'user'), {
    OR: [{ ownerKey: user }, { isShared: true, ownerKey: { startsWith: 'user:' } }],
  })
  assert.deepEqual(readableBankWhere(admin, 'admin'), {
    OR: [{ ownerKey: admin }, { isShared: true, ownerKey: { startsWith: 'admin:' } }],
  })
})
