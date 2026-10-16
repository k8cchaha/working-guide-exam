import { SignJWT, jwtVerify } from 'jose'

export const ADMIN_COOKIE_NAME = 'admin_token'
export const USER_COOKIE_NAME = 'user_token'
export const SESSION_MAX_AGE = 60 * 60 * 8

export type ManagementToken =
  | { role: 'admin'; username: string }
  | { role: 'user'; username: string; sub: string }

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production')
  }
  return new TextEncoder().encode(secret || 'fallback-dev-secret')
}

export async function signManagementToken(session: ManagementToken): Promise<string> {
  return new SignJWT(session)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret())
}

export async function verifyManagementToken(token: string): Promise<ManagementToken | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })
    if (typeof payload.username !== 'string' || !payload.username.trim() ||
        typeof payload.exp !== 'number') return null
    if (payload.role === 'admin') return { role: 'admin', username: payload.username }
    if (payload.role === 'user' && typeof payload.sub === 'string' && payload.sub) {
      return { role: 'user', username: payload.username, sub: payload.sub }
    }
    return null
  } catch {
    return null
  }
}

export function getOwnerKey(session: ManagementToken): string {
  return session.role === 'admin' ? `admin:${session.username}` : `user:${session.sub}`
}

export function readableBankWhere(ownerKey: string, role: ManagementToken['role']) {
  return { OR: [{ ownerKey }, { isShared: true, ownerKey: { startsWith: `${role}:` } }] }
}
