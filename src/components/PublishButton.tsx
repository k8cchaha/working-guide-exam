'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { publishResultsAction } from '@/actions/admin'

export default function PublishButton({ examId }: { examId: string }) {
  const [confirmed, setConfirmed] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handlePublish() {
    if (!confirmed) { setConfirmed(true); return }
    startTransition(async () => {
      await publishResultsAction(examId)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handlePublish}
      disabled={isPending}
      className={`px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50 ${
        confirmed
          ? 'bg-green-600 hover:bg-green-700 text-white'
          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
      }`}
    >
      {isPending ? '發佈中…' : confirmed ? '確認發佈成績' : '發佈成績'}
    </button>
  )
}
