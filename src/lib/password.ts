import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }
const HASH_PREFIX = 'scrypt-v1'

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await deriveKey(password, salt)
  return `${HASH_PREFIX}$${salt.toString('hex')}$${key.toString('hex')}`
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (password.length > 128) return false
  const parts = passwordHash.split('$')
  if (parts.length !== 3 || parts[0] !== HASH_PREFIX ||
      !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false

  const key = await deriveKey(password, Buffer.from(parts[1], 'hex'))
  return timingSafeEqual(key, Buffer.from(parts[2], 'hex'))
}
