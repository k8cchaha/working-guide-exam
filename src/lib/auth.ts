import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'admin_token'
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-dev-secret')

export async function signAdminToken(username: string) {
  return new SignJWT({ username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(secret)
}

export async function verifyAdminToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as { username: string; role: string }
  } catch {
    return null
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyAdminToken(token)
}

export async function setAdminCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
}

export async function clearAdminCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export function validateAdminCredentials(username: string, password: string): boolean {
  const raw = process.env.ADMIN_USERS || '[]'
  try {
    const users: { username: string; password: string }[] = JSON.parse(raw)
    return users.some((u) => u.username === username && u.password === password)
  } catch {
    return false
  }
}
