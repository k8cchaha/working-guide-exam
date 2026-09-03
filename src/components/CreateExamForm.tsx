'use client'

import { useActionState } from 'react'
import { createExamAction } from '@/actions/admin'

const initialState = { error: '' }

export default function CreateExamForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string }, formData: FormData) => {
      const result = await createExamAction(formData)
      return result ?? { error: '' }
    },
    initialState
  )

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <p className="text-red-500 text-sm">{state.error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            合格分數（滿分 100，加分題可超過）
          </label>
          <input
            name="passingScore"
            type="number"
            defaultValue={80}
            min={0}
            max={106}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          成員名單（每行一位）
        </label>
        <textarea
          name="members"
          rows={6}
          placeholder={'Alice\nBob\nCharlie'}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-50"
      >
        {pending ? '建立中…' : '建立測驗 →'}
      </button>
    </form>
  )
}
