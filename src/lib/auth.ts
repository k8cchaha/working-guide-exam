import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import {
  ADMIN_COOKIE_NAME,
  USER_COOKIE_NAME,
  SESSION_MAX_AGE,
  signManagementToken,
  verifyManagementToken,
  getOwnerKey,
  type ManagementToken,
} from '@/lib/session-token'

export type ManagementSession = ManagementToken & { ownerKey: string }

export async function signAdminToken(username: string) {
  return signManagementToken({ username, role: 'admin' })
}

export async function verifyAdminToken(token: string) {
  const session = await verifyManagementToken(token)
  return session?.role === 'admin' ? session : null
}

export async function getAdminSession() {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value
  if (!token) return null
  return verifyAdminToken(token)
}

export async function getManagementSession(): Promise<ManagementSession | null> {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value
  if (adminToken) {
    const session = await verifyAdminToken(adminToken)
    if (session) return { ...session, ownerKey: getOwnerKey(session) }
  }

  const userToken = cookieStore.get(USER_COOKIE_NAME)?.value
  if (!userToken) return null
  const session = await verifyManagementToken(userToken)
  if (session?.role !== 'user') return null
  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true, username: true } })
  if (!user) return null
  return { role: 'user', sub: user.id, username: user.username, ownerKey: `user:${user.id}` }
}

async function setManagementCookie(name: string, token: string) {
  const cookieStore = await cookies()
  cookieStore.delete(name === ADMIN_COOKIE_NAME ? USER_COOKIE_NAME : ADMIN_COOKIE_NAME)
  cookieStore.set(name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

export async function setAdminCookie(token: string) {
  await setManagementCookie(ADMIN_COOKIE_NAME, token)
}

export async function setUserCookie(user: { id: string; username: string }) {
  const token = await signManagementToken({ role: 'user', sub: user.id, username: user.username })
  await setManagementCookie(USER_COOKIE_NAME, token)
}

export async function clearAdminCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE_NAME)
  cookieStore.delete(USER_COOKIE_NAME)
}

function getAdminUsers(): { username: string; password: string }[] {
  try {
    const users: unknown = JSON.parse(process.env.ADMIN_USERS || '[]')
    if (!Array.isArray(users)) return []
    return users.filter((user) => typeof user?.username === 'string' && typeof user?.password === 'string')
  } catch {
    return []
  }
}

export function isAdminUsername(username: string): boolean {
  return getAdminUsers().some((user) => user.username.trim().toLowerCase() === username)
}

export function validateAdminCredentials(username: string, password: string): boolean {
  return getAdminUsers().some((user) => user.username === username && user.password === password)
}

export async function validateManagementPassword(session: ManagementSession, password: string): Promise<boolean> {
  if (session.role === 'admin') return validateAdminCredentials(session.username, password)
  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { passwordHash: true } })
  return !!user && verifyPassword(password, user.passwordHash)
}
