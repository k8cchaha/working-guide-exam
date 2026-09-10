'use client'

import { useState } from 'react'
import { deleteQuestionAction, toggleBankSharedAction, deleteBankAction } from '@/actions/admin'
import { useRouter } from 'next/navigation'

export interface QuestionData {
  id: string
  type: string
  text: string
  points: number
  isBonus: boolean
  gradingHint: string | null
  createdAt: Date
}

export interface BankData {
  id: string
  adminUsername: string
  name: string
  isShared: boolean
  createdAt: Date
  questions: QuestionData[]
}

interface Props {
  banks: BankData[]
  currentAdmin: string
}

const TYPE_LABEL: Record<string, string> = {
  single: '單選',
  multiple: '複選',
  true_false: '是非',
  short_answer: '問答',
}

function BankCard({
  bank,
  isOwn,
  onDeleteQuestion,
  onToggleShared,
  onDeleteBank,
}: {
  bank: BankData
  isOwn: boolean
  onDeleteQuestion: (bankId: string, questionId: string) => void
  onToggleShared: (bankId: string, current: boolean) => void
  onDeleteBank: (bankId: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [deletingQId, setDeletingQId] = useState('')

  async function handleDeleteQ(qId: string) {
    setDeletingQId(qId)
    await deleteQuestionAction(qId)
    onDeleteQuestion(bank.id, qId)
    setDeletingQId('')
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between gap-3 p-3 bg-gray-50 hover:bg-gray-100 transition"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <span className="font-medium text-sm text-gray-800">{bank.name}</span>
          <span className="text-xs text-gray-400">{bank.questions.length} 題</span>
          {bank.isShared
            ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">🌐 共用中</span>
            : isOwn && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">🔒 未共用</span>
          }
          {!isOwn && <span className="text-xs text-gray-400">由 {bank.adminUsername} 提供</span>}
        </div>
        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isOwn && (
            <>
              <button
                type="button"
                onClick={() => onToggleShared(bank.id, bank.isShared)}
                className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
              >
                {bank.isShared ? '取消共用' : '設為共用'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`確定要刪除題庫「${bank.name}」及其所有 ${bank.questions.length} 題嗎？`)) {
                    onDeleteBank(bank.id)
                  }
                }}
                className="text-xs text-red-400 hover:text-red-600 whitespace-nowrap"
              >
                刪除題庫
              </button>
            </>
          )}
          <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        bank.questions.length > 0 ? (
          <div className="divide-y">
            {bank.questions.map((q) => (
              <div key={q.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      {TYPE_LABEL[q.type] ?? q.type}
                    </span>
                    <span className="text-xs text-gray-400">{q.points} 分</span>
                    {q.isBonus && <span className="text-xs text-amber-600 font-medium">⭐ 加分</span>}
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-1">{q.text}</p>
                </div>
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => handleDeleteQ(q.id)}
                    disabled={deletingQId === q.id}
                    className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 shrink-0 mt-0.5"
                  >
                    {deletingQId === q.id ? '…' : '刪除'}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-3 text-sm text-gray-400">（尚無題目）</p>
        )
      )}
    </div>
  )
}

export default function QuestionList({ banks: initial, currentAdmin }: Props) {
  const router = useRouter()
  const [banks, setBanks] = useState<BankData[]>(initial)

  function handleDeleteQuestion(bankId: string, questionId: string) {
    setBanks((prev) => prev.map((b) =>
      b.id === bankId ? { ...b, questions: b.questions.filter((q) => q.id !== questionId) } : b
    ))
  }

  async function handleToggleShared(bankId: string, current: boolean) {
    await toggleBankSharedAction(bankId, !current)
    setBanks((prev) => prev.map((b) => b.id === bankId ? { ...b, isShared: !current } : b))
    router.refresh()
  }

  async function handleDeleteBank(bankId: string) {
    await deleteBankAction(bankId)
    setBanks((prev) => prev.filter((b) => b.id !== bankId))
    router.refresh()
  }

  const myBanks = banks.filter((b) => b.adminUsername === currentAdmin)
  const sharedBanks = banks.filter((b) => b.adminUsername !== currentAdmin)

  if (banks.length === 0) return null

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">考題庫</h2>

      {myBanks.length > 0 && (
        <div className={sharedBanks.length > 0 ? 'mb-6' : ''}>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">我建立的</h3>
          <div className="space-y-2">
            {myBanks.map((bank) => (
              <BankCard
                key={bank.id}
                bank={bank}
                isOwn
                onDeleteQuestion={handleDeleteQuestion}
                onToggleShared={handleToggleShared}
                onDeleteBank={handleDeleteBank}
              />
            ))}
          </div>
        </div>
      )}

      {sharedBanks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">他人共用的</h3>
          <div className="space-y-2">
            {sharedBanks.map((bank) => (
              <BankCard
                key={bank.id}
                bank={bank}
                isOwn={false}
                onDeleteQuestion={handleDeleteQuestion}
                onToggleShared={handleToggleShared}
                onDeleteBank={handleDeleteBank}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
