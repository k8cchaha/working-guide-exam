'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function RefreshButton() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleRefresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isPending}
      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition disabled:opacity-50"
    >
      {isPending ? '刷新中…' : '↻ 刷新'}
    </button>
  )
}
