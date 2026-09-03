'use client'

import { useActionState } from 'react'
import { loginAction } from '@/actions/admin'

const initialState = { error: '' }

export default function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string }, formData: FormData) => {
      const result = await loginAction(formData)
      return result ?? { error: '' }
    },
    initialState
  )

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="text-red-500 text-sm text-center">{state.error}</p>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">帳號</label>
        <input
          name="username"
          type="text"
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
        <input
          name="password"
          type="password"
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
      >
        {pending ? '登入中…' : '登入'}
      </button>
    </form>
  )
}
