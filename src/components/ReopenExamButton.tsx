'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reopenExamAction } from '@/actions/admin'

export default function ReopenExamButton({ examId }: { examId: string }) {
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleReopen() {
    if (!confirmed) {
      setConfirmed(true)
      setError('')
      return
    }

    startTransition(async () => {
      const result = await reopenExamAction(examId)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div>
      {confirmed && (
        <p className="text-xs text-amber-700 mb-2 max-w-xs">
          既有作答與分數會保留，排名將暫停公開，直到再次發佈成績。
        </p>
      )}
      <button
        type="button"
        onClick={handleReopen}
        disabled={isPending}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${
          confirmed
            ? 'bg-amber-600 hover:bg-amber-700 text-white'
            : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
        }`}
      >
        {isPending ? '重新開啟中…' : confirmed ? '確認重新開啟測驗' : '重新開啟測驗'}
      </button>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}
