import { hashPassword, verifyPassword } from './password'

export const DUPLICATE_USERNAME_ERROR = '此帳號已存在，請改用其他帳號'

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function validateUserInput(username: string, password: string): string | null {
  if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
    return '帳號需為 3–32 個英數字、底線、點或連字號'
  }
  if (password.length < 8 || password.length > 128) return '密碼需為 8–128 個字元'
  return null
}

type Account = { id: string; username: string; passwordHash: string }
type AccountStore = {
  findUnique: (args: { where: { username: string } }) => Promise<Account | null>
  create: (args: { data: { username: string; passwordHash: string } }) => Promise<Account>
}

export async function registerAccount(store: AccountStore, username: string, password: string) {
  const passwordHash = await hashPassword(password)
  try {
    const user = await store.create({ data: { username, passwordHash } })
    return { user: { id: user.id, username: user.username } }
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2002') return { error: DUPLICATE_USERNAME_ERROR }
    throw error
  }
}

export async function authenticateAccount(store: AccountStore, username: string, password: string) {
  const user = await store.findUnique({ where: { username } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) return null
  return { id: user.id, username: user.username }
}
