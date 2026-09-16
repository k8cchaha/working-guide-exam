'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import { AVATARS } from '@/lib/avatars'
import { startExamAction, startGoogleMemberAction } from '@/actions/exam'

interface Member { id: string; name: string }
interface Props {
  examId: string
  members: Member[]
  examStatus: string
  authMode: string
}

export default function EntryClient({ examId, members, examStatus, authMode }: Props) {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(`exam_${examId}`)
    if (stored) {
      const data = JSON.parse(stored)
      if (data.submitted) setAlreadySubmitted(true)
    }
  }, [examId])

  async function handleStart() {
    if (!selectedMemberId || !selectedAvatar) return
    if (authMode === 'NAME_PASSWORD' && !password.trim()) {
      setError('請輸入密碼')
      return
    }
    setStarting(true)
    setError('')

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
        setError('密碼錯誤，請再試一次')
        setStarting(false)
        return
      }
      setError(result.error)
      setStarting(false)
      return
    }

    localStorage.setItem(
      `exam_${examId}`,
      JSON.stringify({ memberId: selectedMemberId, avatarId: selectedAvatar, submitted: false })
    )
    router.push(`/exam/${examId}/quiz`)
  }

  async function handleGoogleStart() {
    if (!selectedAvatar) return
    setStarting(true)
    setError('')

    const result = await startGoogleMemberAction(examId, selectedAvatar)

    if ('error' in result && result.error) {
      if (result.error === 'already_submitted') {
        router.push(`/exam/${examId}/result`)
        return
      }
      setError(result.error)
      setStarting(false)
      return
    }

    if ('ok' in result && result.ok) {
      localStorage.setItem(
        `exam_${examId}`,
        JSON.stringify({ memberId: result.memberId, avatarId: selectedAvatar, submitted: false })
      )
      router.push(`/exam/${examId}/quiz`)
    }
  }

  const avatarPicker = (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">選擇頭像</label>
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
  )

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

  // ── GOOGLE mode ───────────────────────────────────────────────────────────────
  if (authMode === 'GOOGLE') {
    if (sessionStatus === 'loading') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <p className="text-gray-500">載入中…</p>
        </div>
      )
    }

    if (!session) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md space-y-6 text-center">
            <div>
              <h1 className="text-2xl font-bold text-indigo-700">Jira Working Guide 測驗</h1>
              <p className="text-sm text-gray-500 mt-1">使用 Google 帳號登入以參加測驗</p>
            </div>
            <button
              onClick={() => signIn('google', { callbackUrl: window.location.href })}
              className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              使用 Google 帳號登入
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-indigo-700">Jira Working Guide 測驗</h1>
            <p className="text-sm text-gray-500 mt-1">選擇頭像後開始作答</p>
          </div>

          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
            {session.user?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" className="w-9 h-9 rounded-full" />
            )}
            <div className="text-left min-w-0">
              <p className="text-sm font-medium text-green-800 truncate">{session.user?.name}</p>
              <p className="text-xs text-green-600 truncate">{session.user?.email}</p>
            </div>
          </div>

          {avatarPicker}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="button"
            onClick={handleGoogleStart}
            disabled={!selectedAvatar || starting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed text-lg"
          >
            {starting ? '驗證中…' : '開始測驗 🚀'}
          </button>
        </div>
      </div>
    )
  }

  // ── NAME_ONLY / NAME_PASSWORD ─────────────────────────────────────────────────
  const canStart = selectedMemberId && selectedAvatar && (authMode !== 'NAME_PASSWORD' || password.trim())

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-indigo-700">Jira Working Guide 測驗</h1>
          <p className="text-sm text-gray-500 mt-1">請選擇你的名稱與頭像後開始作答</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">我是</label>
          <select
            value={selectedMemberId}
            onChange={(e) => { setSelectedMemberId(e.target.value); setError('') }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition cursor-pointer"
          >
            <option value="">— 請選擇 —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {authMode === 'NAME_PASSWORD' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="請輸入 Admin 設定的密碼"
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition ${
                error ? 'border-red-400 focus:ring-red-300 hover:border-red-400' : 'border-gray-300 focus:ring-indigo-400 hover:border-gray-400'
              }`}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
        )}

        {avatarPicker}

        {error && authMode !== 'NAME_PASSWORD' && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

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
