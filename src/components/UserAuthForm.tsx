'use client'

import { useActionState } from 'react'
import { loginUserAction, registerUserAction } from '@/actions/auth'

const initialState = { error: '' }

type UserAuthFormProps = {
  mode: 'login' | 'register'
}

export default function UserAuthForm({ mode }: UserAuthFormProps) {
  const isRegistration = mode === 'register'
  const [state, formAction, pending] = useActionState(
    isRegistration ? registerUserAction : loginUserAction,
    initialState
  )

  return (
    <form action={formAction} className="space-y-4" aria-busy={pending}>
      <div>
        <div aria-live="polite" aria-atomic="true">
          {state.error && (
            <p className="text-red-600 text-sm text-center mb-4">{state.error}</p>
          )}
        </div>
        <label htmlFor="user-username" className="block text-sm font-medium text-gray-700 mb-1">帳號</label>
        <input
          id="user-username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby={isRegistration ? 'user-username-help' : undefined}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        />
        {isRegistration && (
          <p id="user-username-help" className="mt-1 text-xs text-gray-500">
            3–32 個字元，限英文字母、數字、底線（_）、句點（.）或連字號（-）；前後空白會移除，英文字母會轉為小寫。
          </p>
        )}
      </div>
      <div>
        <label htmlFor="user-password" className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
        <input
          id="user-password"
          name="password"
          type="password"
          autoComplete={isRegistration ? 'new-password' : 'current-password'}
          minLength={8}
          maxLength={128}
          aria-describedby={isRegistration ? 'user-password-help' : undefined}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        />
        {isRegistration && (
          <p id="user-password-help" className="mt-1 text-xs text-gray-500">
            8–128 個字元，區分大小寫，空白也算密碼的一部分。
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        aria-live="polite"
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-50"
      >
        {pending ? (isRegistration ? '註冊中…' : '登入中…') : (isRegistration ? '註冊' : '登入')}
      </button>
    </form>
  )
}
