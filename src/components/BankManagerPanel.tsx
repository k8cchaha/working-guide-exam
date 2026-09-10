'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteQuestionAction, deleteBankAction, updateBankAction } from '@/actions/admin'
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

// ── Settings modal (includes delete trigger) ──────────────────────────────────

function BankSettingsModal({
  bank,
  onSave,
  onDelete,
  onClose,
}: {
  bank: BankData
  onSave: (updated: Pick<BankData, 'id' | 'name' | 'isShared' | 'questionOrder'>) => void
  onDelete: (bank: BankData) => void
  onClose: () => void
}) {
  const [name, setName] = useState(bank.name)
  const [isShared, setIsShared] = useState(bank.isShared)
  const [questionOrder, setQuestionOrder] = useState<'sequential' | 'random'>(
    bank.questionOrder === 'sequential' ? 'sequential' : 'random'
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('請輸入題庫名稱'); return }
    setSaving(true)
    setError('')
    const result = await updateBankAction(bank.id, { name: name.trim(), isShared, questionOrder })
    if (result.error) { setError(result.error); setSaving(false); return }
    onSave({ id: bank.id, name: name.trim(), isShared, questionOrder })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b">
          <h2 className="text-lg font-semibold text-gray-800">題庫設定</h2>
          <button type="button" onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-1">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">題庫名稱</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
            <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)}
              className="accent-indigo-600" />
            🌐 開放共用給其他 Admin
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">題目出現順序</label>
            <div className="flex gap-3">
              {([
                { value: 'sequential', label: '📋 依序' },
                { value: 'random', label: '🔀 隨機' },
              ] as const).map(({ value, label }) => (
                <button key={value} type="button" onClick={() => setQuestionOrder(value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                    questionOrder === value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Danger zone */}
          <div className="pt-2 border-t">
            <button type="button"
              onClick={() => { onClose(); onDelete(bank) }}
              className="text-sm text-red-500 hover:text-red-700 hover:underline">
              刪除此題庫…
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t">
          <button type="button" onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700">取消</button>
          <button type="button" onClick={handleSave} disabled={saving || !name.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteBankModal({
  bank,
  onConfirm,
  onClose,
}: {
  bank: BankData
  onConfirm: (bankId: string, password: string) => Promise<string | null>
  onClose: () => void
}) {
  const [password, setPassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    if (!password) { setError('請輸入密碼'); return }
    setDeleting(true)
    setError('')
    const err = await onConfirm(bank.id, password)
    if (err) { setError(err); setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b">
          <h2 className="text-lg font-semibold text-gray-800">確認刪除題庫</h2>
          <button type="button" onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-1">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            即將刪除「<span className="font-semibold text-gray-800">{bank.name}</span>」
            及其所有 <span className="font-semibold">{bank.questions.length}</span> 道題目，此操作無法復原。
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">請輸入你的登入密碼確認</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
              placeholder="登入密碼" autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t">
          <button type="button" onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700">取消</button>
          <button type="button" onClick={handleDelete} disabled={deleting || !password}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed">
            {deleting ? '刪除中…' : '確認刪除'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Bank card ─────────────────────────────────────────────────────────────────

function BankCard({
  bank, isOwn, onDeleteQuestion, onSettings,
}: {
  bank: BankData
  isOwn: boolean
  onDeleteQuestion: (bankId: string, qId: string) => void
  onSettings: (bank: BankData) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [deletingQId, setDeletingQId] = useState('')

  const totalScore = bank.questions
    .filter((q) => !q.isBonus)
    .reduce((sum, q) => sum + q.points, 0)

  async function handleDeleteQ(qId: string) {
    setDeletingQId(qId)
    await deleteQuestionAction(qId)
    onDeleteQuestion(bank.id, qId)
    setDeletingQId('')
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Card header — click to expand */}
      <div
        className="p-3 bg-gray-50 hover:bg-gray-100 transition"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Row 1: name (left) + shared badge (right) */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm text-gray-800 truncate">{bank.name}</span>
            {!isOwn && <span className="text-xs text-gray-400 shrink-0">由 {bank.adminUsername} 提供</span>}
          </div>
          {bank.isShared
            ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">🌐 共用中</span>
            : isOwn && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">🔒 未共用</span>
          }
        </div>

        {/* Row 2: stats + actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <span>總分 <span className="font-medium text-gray-700">{totalScore}</span> 分</span>
            <span>{bank.questions.length} 題</span>
            <span>{bank.questionOrder === 'sequential' ? '📋 依序' : '🔀 隨機'}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {isOwn && (
              <button type="button" onClick={() => onSettings(bank)}
                className="text-xs text-indigo-600 hover:underline whitespace-nowrap">
                設定
              </button>
            )}
            <span className="text-gray-300 text-xs">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {/* Expanded question list */}
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
                  <button type="button" onClick={() => handleDeleteQ(q.id)}
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

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function BankManagerPanel({ banks: initial, currentAdmin }: Props) {
  const router = useRouter()
  const [banks, setBanks] = useState<BankData[]>(initial)
  const [createOpen, setCreateOpen] = useState(false)
  const [settingsBank, setSettingsBank] = useState<BankData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BankData | null>(null)

  function handleDeleteQuestion(bankId: string, qId: string) {
    setBanks((prev) => prev.map((b) =>
      b.id === bankId ? { ...b, questions: b.questions.filter((q) => q.id !== qId) } : b
    ))
  }

  async function handleDeleteConfirm(bankId: string, password: string): Promise<string | null> {
    const result = await deleteBankAction(bankId, password)
    if (result.error) return result.error
    setBanks((prev) => prev.filter((b) => b.id !== bankId))
    setDeleteTarget(null)
    return null
  }

  function handleSettingsSave(updated: Pick<BankData, 'id' | 'name' | 'isShared' | 'questionOrder'>) {
    setBanks((prev) => prev.map((b) => b.id === updated.id ? { ...b, ...updated } : b))
    setSettingsBank(null)
  }

  function handleCreateDone() {
    setCreateOpen(false)
    router.refresh()
  }

  const myBanks = banks.filter((b) => b.adminUsername === currentAdmin)
  const sharedBanks = banks.filter((b) => b.adminUsername !== currentAdmin)

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => setCreateOpen(true)}
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
                    onSettings={setSettingsBank}
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
                    onSettings={setSettingsBank}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {createOpen && (
        <CreateBankModal onDone={handleCreateDone} onClose={() => setCreateOpen(false)} />
      )}

      {settingsBank && (
        <BankSettingsModal
          bank={settingsBank}
          onSave={handleSettingsSave}
          onDelete={(bank) => { setSettingsBank(null); setDeleteTarget(bank) }}
          onClose={() => setSettingsBank(null)}
        />
      )}

      {deleteTarget && (
        <DeleteBankModal
          bank={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
