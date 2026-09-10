'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteQuestionAction, toggleBankSharedAction, deleteBankAction } from '@/actions/admin'
import CreateBankModal from './CreateBankModal'

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
  questionOrder: string
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
  bank, isOwn, onDeleteQuestion, onToggleShared, onDeleteBank,
}: {
  bank: BankData
  isOwn: boolean
  onDeleteQuestion: (bankId: string, qId: string) => void
  onToggleShared: (bankId: string, current: boolean) => void
  onDeleteBank: (bankId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
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
        className="flex items-center justify-between gap-2 p-3 bg-gray-50 hover:bg-gray-100 transition"
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
          <span className="text-xs text-gray-400">
            {bank.questionOrder === 'sequential' ? '📋 依序' : '🔀 隨機'}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isOwn && (
            <>
              <button type="button"
                onClick={() => onToggleShared(bank.id, bank.isShared)}
                className="text-xs text-indigo-600 hover:underline whitespace-nowrap">
                {bank.isShared ? '取消共用' : '設為共用'}
              </button>
              <button type="button"
                onClick={() => {
                  if (confirm(`確定刪除題庫「${bank.name}」及其所有 ${bank.questions.length} 題？`))
                    onDeleteBank(bank.id)
                }}
                className="text-xs text-red-400 hover:text-red-600 whitespace-nowrap">
                刪除
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
                  <button type="button"
                    onClick={() => handleDeleteQ(q.id)}
                    disabled={deletingQId === q.id}
                    className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 shrink-0 mt-0.5">
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

export default function BankManagerPanel({ banks: initial, currentAdmin }: Props) {
  const router = useRouter()
  const [banks, setBanks] = useState<BankData[]>(initial)
  const [modalOpen, setModalOpen] = useState(false)

  function handleDeleteQuestion(bankId: string, qId: string) {
    setBanks((prev) => prev.map((b) =>
      b.id === bankId ? { ...b, questions: b.questions.filter((q) => q.id !== qId) } : b
    ))
  }

  async function handleToggleShared(bankId: string, current: boolean) {
    await toggleBankSharedAction(bankId, !current)
    setBanks((prev) => prev.map((b) => b.id === bankId ? { ...b, isShared: !current } : b))
  }

  async function handleDeleteBank(bankId: string) {
    await deleteBankAction(bankId)
    setBanks((prev) => prev.filter((b) => b.id !== bankId))
  }

  function handleModalDone() {
    setModalOpen(false)
    router.refresh()
  }

  const myBanks = banks.filter((b) => b.adminUsername === currentAdmin)
  const sharedBanks = banks.filter((b) => b.adminUsername !== currentAdmin)

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => setModalOpen(true)}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl transition">
        ＋ 建立新題庫
      </button>

      {banks.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">尚未建立任何題庫</p>
      ) : (
        <>
          {myBanks.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">我建立的</p>
              <div className="space-y-2">
                {myBanks.map((bank) => (
                  <BankCard key={bank.id} bank={bank} isOwn
                    onDeleteQuestion={handleDeleteQuestion}
                    onToggleShared={handleToggleShared}
                    onDeleteBank={handleDeleteBank}
                  />
                ))}
              </div>
            </div>
          )}

          {sharedBanks.length > 0 && (
            <div className={myBanks.length > 0 ? 'mt-4' : ''}>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">他人共用的</p>
              <div className="space-y-2">
                {sharedBanks.map((bank) => (
                  <BankCard key={bank.id} bank={bank} isOwn={false}
                    onDeleteQuestion={handleDeleteQuestion}
                    onToggleShared={handleToggleShared}
                    onDeleteBank={handleDeleteBank}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <CreateBankModal onDone={handleModalDone} onClose={() => setModalOpen(false)} />
      )}
    </div>
  )
}
