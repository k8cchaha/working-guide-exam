'use client'

import { useState, useTransition } from 'react'
import { gradeSubmissionAction } from '@/actions/admin'

interface Props {
  submissionId: string
  currentScore: number | null
  maxScore: number
  examId: string
}

export default function GradeForm({ submissionId, currentScore, maxScore }: Props) {
  const [score, setScore] = useState(currentScore?.toString() ?? '')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const n = parseInt(score, 10)
    if (isNaN(n) || n < 0 || n > maxScore) return
    startTransition(async () => {
      await gradeSubmissionAction(submissionId, n)
      setSaved(true)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-600">問答題得分（0–{maxScore}）：</label>
      <input
        type="number"
        min={0}
        max={maxScore}
        value={score}
        onChange={(e) => { setScore(e.target.value); setSaved(false) }}
        className="w-20 border rounded px-2 py-1 text-sm"
      />
      <button
        onClick={handleSave}
        disabled={isPending}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1 rounded transition disabled:opacity-50"
      >
        {isPending ? '儲存中…' : '儲存'}
      </button>
      {saved && <span className="text-green-600 text-xs">✓ 已儲存</span>}
    </div>
  )
}
