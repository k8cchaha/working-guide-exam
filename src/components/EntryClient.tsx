'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AVATARS } from '@/lib/avatars'

interface Member { id: string; name: string }

interface Props {
  examId: string
  members: Member[]
  examStatus: string
}

export default function EntryClient({ examId, members, examStatus }: Props) {
  const router = useRouter()
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('')
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
          <h2 className="text-xl font-bold mb-2">考試已結束</h2>
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

  function handleStart() {
    if (!selectedMemberId || !selectedAvatar) return
    localStorage.setItem(
      `exam_${examId}`,
      JSON.stringify({ memberId: selectedMemberId, avatarId: selectedAvatar, submitted: false })
    )
    router.push(`/exam/${examId}/quiz`)
  }

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
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">— 請選擇 —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* 選 Avatar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">選一個頭像</label>
          <div className="grid grid-cols-8 gap-2">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                title={a.label}
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
          onClick={handleStart}
          disabled={!selectedMemberId || !selectedAvatar}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed text-lg"
        >
          開始測驗 🚀
        </button>
      </div>
    </div>
  )
}
