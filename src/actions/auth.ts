'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { isAdminUsername, setUserCookie } from '@/lib/auth'
import {
  normalizeUsername,
  validateUserInput,
  registerAccount,
  authenticateAccount,
  DUPLICATE_USERNAME_ERROR,
} from '@/lib/accounts'

type AuthState = { error: string }

function readCredentials(formData: FormData) {
  const username = formData.get('username')
  const password = formData.get('password')
  if (typeof username !== 'string' || typeof password !== 'string') return null
  return { username: normalizeUsername(username), password }
}

export async function registerUserAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const credentials = readCredentials(formData)
  if (!credentials) return { error: '請輸入帳號與密碼' }
  const error = validateUserInput(credentials.username, credentials.password)
  if (error) return { error }
  if (isAdminUsername(credentials.username)) return { error: DUPLICATE_USERNAME_ERROR }

  let user: { id: string; username: string }
  try {
    const result = await registerAccount(prisma.user, credentials.username, credentials.password)
    if (result.error) return { error: result.error }
    user = result.user!
  } catch {
    return { error: '目前無法註冊，請稍後再試' }
  }
  await setUserCookie(user)
  redirect('/admin/dashboard')
}

export async function loginUserAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const credentials = readCredentials(formData)
  if (!credentials || validateUserInput(credentials.username, credentials.password)) {
    return { error: '帳號或密碼錯誤' }
  }

  let user: { id: string; username: string } | null
  try {
    user = await authenticateAccount(prisma.user, credentials.username, credentials.password)
  } catch {
    return { error: '目前無法登入，請稍後再試' }
  }
  if (!user) return { error: '帳號或密碼錯誤' }
  await setUserCookie(user)
  redirect('/admin/dashboard')
}
