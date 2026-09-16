'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ExamStatus } from '@prisma/client'
import { deleteExamAction } from '@/actions/admin'

export interface ExamData {
  id: string
  passingScore: number
  authMode: string
  status: ExamStatus
  createdAt: Date
  _count: { members: number; submissions: number }
}

function DeleteExamModal({
  exam,
  onConfirm,
  onClose,
}: {
  exam: ExamData
  onConfirm: (examId: string, password: string) => Promise<string | null>
  onClose: () => void
}) {
  const [password, setPassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    if (!password) { setError('請輸入密碼'); return }
    setDeleting(true)
    setError('')
    const err = await onConfirm(exam.id, password)
    if (err) { setError(err); setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b">
          <h2 className="text-lg font-semibold text-gray-800">確認刪除測驗</h2>
          <button type="button" onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-1">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            即將刪除此測驗（合格 {exam.passingScore} 分）
            及其所有 <span className="font-semibold">{exam._count.members}</span> 位成員與作答記錄，此操作無法復原。
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

export default function ExamList({ exams: initial }: { exams: ExamData[] }) {
  const router = useRouter()
  const [exams, setExams] = useState<ExamData[]>(initial)
  const [deleteTarget, setDeleteTarget] = useState<ExamData | null>(null)

  async function handleDeleteConfirm(examId: string, password: string): Promise<string | null> {
    const result = await deleteExamAction(examId, password)
    if (result.error) return result.error
    setExams((prev) => prev.filter((e) => e.id !== examId))
    setDeleteTarget(null)
    router.refresh()
    return null
  }

  if (exams.length === 0) return null

  return (
    <div className="space-y-3">
      {exams.map((exam) => (
        <div
          key={exam.id}
          className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition"
        >
          <Link href={`/admin/dashboard/${exam.id}`} className="flex-1 min-w-0">
            <p className="font-medium text-gray-800">
              測驗 — 合格 {exam.passingScore} 分
              <span className="ml-2 text-xs text-gray-400">
                {exam.authMode === 'NAME_PASSWORD' ? '🔑 密碼驗證' : exam.authMode === 'GOOGLE' ? '🔒 Google' : ''}
              </span>
            </p>
            <p className="text-sm text-gray-500">
              {new Date(exam.createdAt).toLocaleString('zh-TW')}
            </p>
          </Link>
          <div className="flex items-center gap-4 shrink-0">
            <Link href={`/admin/dashboard/${exam.id}`} className="text-right">
              <span
                className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                  exam.status === ExamStatus.PUBLISHED
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {exam.status === ExamStatus.PUBLISHED ? '已發佈' : '進行中'}
              </span>
              <p className="text-sm text-gray-500 mt-1">
                {exam._count.submissions} / {exam._count.members} 人已交卷
              </p>
            </Link>
            <button
              type="button"
              onClick={() => setDeleteTarget(exam)}
              title="刪除此測驗"
              className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}

      {deleteTarget && (
        <DeleteExamModal
          exam={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
