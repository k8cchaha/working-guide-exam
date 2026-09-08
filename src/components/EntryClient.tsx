'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AVATARS } from '@/lib/avatars'
import { startExamAction } from '@/actions/exam'

interface Member { id: string; name: string }
interface Props {
  examId: string
  members: Member[]
  examStatus: string
  authMode: string
}

export default function EntryClient({ examId, members, examStatus, authMode }: Props) {
  const router = useRouter()
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [starting, setStarting] = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(`exam_${examId}`)
    if (stored) {
      const data = JSON.parse(stored)
      if (data.submitted) setAlreadySubmitted(true)
    }
  }, [examId])

  if (examStatus === 'PUBLISHED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
          <p className="text-2xl mb-2">🏁</p>
          <h2 className="text-xl font-bold mb-2">測驗已結束</h2>
          <p className="text-gray-500 text-sm mb-4">成績已發佈，請前往查看排名</p>
          <button
            onClick={() => router.push(`/exam/${examId}/result`)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            查看排名
          </button>
        </div>
      </div>
    )
  }

  if (alreadySubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
          <p className="text-3xl mb-3">✅</p>
          <h2 className="text-xl font-bold mb-2">你已完成作答</h2>
          <p className="text-gray-500 text-sm mb-4">等待 Admin 發佈成績後，刷新此頁查看排名</p>
          <button
            onClick={() => router.push(`/exam/${examId}/result`)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            前往結果頁
          </button>
        </div>
      </div>
    )
  }

  async function handleStart() {
    if (!selectedMemberId || !selectedAvatar) return
    if (authMode === 'NAME_PASSWORD' && !password.trim()) {
      setPasswordError('請輸入密碼')
      return
    }
    setStarting(true)
    setPasswordError('')

    const result = await startExamAction(
      examId,
      selectedMemberId,
      selectedAvatar,
      authMode === 'NAME_PASSWORD' ? password : undefined
    )

    if ('error' in result && result.error) {
      if (result.error === 'already_submitted') {
        localStorage.setItem(
          `exam_${examId}`,
          JSON.stringify({ memberId: selectedMemberId, avatarId: selectedAvatar, submitted: true })
        )
        router.push(`/exam/${examId}/result`)
        return
      }
      if (result.error === '密碼錯誤') {
        setPasswordError('密碼錯誤，請再試一次')
        setStarting(false)
        return
      }
      setPasswordError(result.error)
      setStarting(false)
      return
    }

    localStorage.setItem(
      `exam_${examId}`,
      JSON.stringify({ memberId: selectedMemberId, avatarId: selectedAvatar, submitted: false })
    )
    router.push(`/exam/${examId}/quiz`)
  }

  const canStart = selectedMemberId && selectedAvatar && (authMode !== 'NAME_PASSWORD' || password.trim())

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-indigo-700">Jira Working Guide 測驗</h1>
          <p className="text-sm text-gray-500 mt-1">請選擇你的名稱與頭像後開始作答</p>
        </div>

        {/* 選名字 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">我是</label>
          <select
            value={selectedMemberId}
            onChange={(e) => { setSelectedMemberId(e.target.value); setPasswordError('') }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">— 請選擇 —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* 密碼（NAME_PASSWORD 模式） */}
        {authMode === 'NAME_PASSWORD' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError('') }}
              placeholder="請輸入 Admin 設定的密碼"
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
                passwordError ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'
              }`}
            />
            {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
          </div>
        )}

        {/* 選 Avatar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">選一個頭像</label>
          <div className="grid grid-cols-8 gap-2">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                title={a.label}
                type="button"
                onClick={() => setSelectedAvatar(a.id)}
                className={`text-2xl p-1 rounded-lg transition border-2 ${
                  selectedAvatar === a.id
                    ? 'border-indigo-500 bg-indigo-50 scale-110'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                {a.emoji}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={!canStart || starting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed text-lg"
        >
          {starting ? '驗證中…' : '開始測驗 🚀'}
        </button>
      </div>
    </div>
  )
}
