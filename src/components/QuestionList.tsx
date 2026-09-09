'use client'

import { useState } from 'react'
import { deleteQuestionAction, toggleQuestionSharedAction } from '@/actions/admin'
import { useRouter } from 'next/navigation'

export interface QuestionData {
  id: string
  adminUsername: string
  isShared: boolean
  type: string
  text: string
  points: number
  isBonus: boolean
  gradingHint: string | null
  createdAt: Date
}

interface Props {
  questions: QuestionData[]
  currentAdmin: string
}

const TYPE_LABEL: Record<string, string> = {
  single: '單選',
  multiple: '複選',
  short_answer: '問答',
}

export default function QuestionList({ questions: initial, currentAdmin }: Props) {
  const router = useRouter()
  const [questions, setQuestions] = useState<QuestionData[]>(initial)
  const [deletingId, setDeletingId] = useState('')

  async function handleDelete(id: string) {
    setDeletingId(id)
    await deleteQuestionAction(id)
    setQuestions((prev) => prev.filter((q) => q.id !== id))
    setDeletingId('')
  }

  async function handleToggleShared(id: string, current: boolean) {
    await toggleQuestionSharedAction(id, !current)
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, isShared: !current } : q))
    router.refresh()
  }

  const mine = questions.filter((q) => q.adminUsername === currentAdmin)
  const sharedByOthers = questions.filter((q) => q.adminUsername !== currentAdmin)

  if (questions.length === 0) return null

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">考題庫</h2>

      {mine.length > 0 && (
        <div className={sharedByOthers.length > 0 ? 'mb-6' : ''}>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">我建立的</h3>
          <div className="space-y-2">
            {mine.map((q) => (
              <div key={q.id} className="flex items-start justify-between gap-3 p-3 border rounded-xl hover:bg-gray-50 transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      {TYPE_LABEL[q.type] ?? q.type}
                    </span>
                    <span className="text-xs text-gray-400">{q.points} 分</span>
                    {q.isBonus && <span className="text-xs text-amber-600 font-medium">⭐ 加分</span>}
                    {q.isShared
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">🌐 共用中</span>
                      : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">🔒 未共用</span>
                    }
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-2">{q.text}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleShared(q.id, q.isShared)}
                    className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
                  >
                    {q.isShared ? '取消共用' : '設為共用'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(q.id)}
                    disabled={deletingId === q.id}
                    className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                  >
                    {deletingId === q.id ? '…' : '刪除'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sharedByOthers.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">他人共用的</h3>
          <div className="space-y-2">
            {sharedByOthers.map((q) => (
              <div key={q.id} className="flex items-start gap-3 p-3 border rounded-xl bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      {TYPE_LABEL[q.type] ?? q.type}
                    </span>
                    <span className="text-xs text-gray-400">{q.points} 分</span>
                    {q.isBonus && <span className="text-xs text-amber-600 font-medium">⭐ 加分</span>}
                    <span className="text-xs text-gray-400">由 {q.adminUsername} 提供</span>
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-2">{q.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
