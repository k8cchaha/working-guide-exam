'use client'

import { useEffect, useRef, useState } from 'react'
import { getAvatarById } from '@/lib/avatars'

interface LeaderboardEntry {
  rank: number
  memberId: string
  name: string
  avatarId: string
  totalScore: number
  passed: boolean
}

interface ApiResponse {
  published: boolean
  passingScore?: number
  leaderboard?: LeaderboardEntry[]
}

interface WrongQuestion {
  id: string
  text: string
  selected: string[]
  correct: string[]
}

const MEDALS = ['🏆', '🥈', '🥉']
const RANK_COLORS = [
  'from-yellow-50 to-amber-50 border-yellow-300',
  'from-gray-50 to-slate-100 border-gray-300',
  'from-orange-50 to-amber-50 border-orange-300',
]

export default function ResultClient({ examId }: { examId: string }) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [myMemberId, setMyMemberId] = useState('')
  const myRowRef = useRef<HTMLDivElement>(null)
  const [showReview, setShowReview] = useState(false)
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[] | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(`exam_${examId}`)
    if (stored) {
      const parsed = JSON.parse(stored)
      setMyMemberId(parsed.memberId ?? '')
    }
  }, [examId])

  useEffect(() => {
    let mounted = true

    async function poll() {
      try {
        const res = await fetch(`/api/exam/${examId}/leaderboard`, { cache: 'no-store' })
        const json: ApiResponse = await res.json()
        if (!mounted) return
        setData(json)
        if (!json.published) setTimeout(poll, 3000)
      } catch {
        if (mounted) setTimeout(poll, 5000)
      }
    }

    poll()
    return () => { mounted = false }
  }, [examId])

  // 成績發佈後自動捲到自己的位置
  useEffect(() => {
    if (data?.published && myRowRef.current) {
      setTimeout(() => {
        myRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 600)
    }
  }, [data?.published, myMemberId])

  async function openReview() {
    setShowReview(true)
    if (wrongQuestions !== null) return
    setReviewLoading(true)
    setReviewError('')
    try {
      const res = await fetch(`/api/exam/${examId}/review?memberId=${myMemberId}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) {
        setReviewError(json.error ?? '載入失敗')
        return
      }
      setWrongQuestions(json.wrong ?? [])
    } catch {
      setReviewError('載入失敗，請重試')
    } finally {
      setReviewLoading(false)
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-500">等待成績發佈中…</p>
        </div>
      </div>
    )
  }

  if (!data.published) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
          <div className="animate-pulse text-4xl mb-4">📊</div>
          <h2 className="text-xl font-bold mb-2">等待成績發佈</h2>
          <p className="text-gray-500 text-sm">Admin 批改完問答題後會發佈成績，此頁面將自動更新</p>
          <div className="mt-4 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const { leaderboard = [], passingScore } = data

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-10">
      {/* Header */}
      <div className="text-center pt-10 pb-6 px-4">
        <h1 className="text-3xl font-bold text-indigo-800">🎊 成績排名</h1>
        <p className="text-gray-500 text-sm mt-1">合格分數：{passingScore} 分</p>
      </div>

      <div className="max-w-xl mx-auto px-4 space-y-3">
        {leaderboard.map((entry) => {
          const isMe = entry.memberId === myMemberId
          const isTop3 = entry.rank <= 3
          const avatar = getAvatarById(entry.avatarId)

          return (
            <div
              key={entry.memberId}
              ref={isMe ? myRowRef : undefined}
              className={`relative rounded-2xl border-2 p-4 transition-all ${
                isTop3
                  ? `bg-gradient-to-r ${RANK_COLORS[entry.rank - 1]} shadow-md`
                  : 'bg-white border-gray-200'
              } ${isMe ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
            >
              {/* 我的標記箭頭 */}
              {isMe && (
                <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-indigo-600 font-bold animate-bounce-x text-lg hidden sm:block">
                  ▶
                </div>
              )}

              <div className="flex items-center gap-4">
                {/* 排名 */}
                <div className="w-10 text-center shrink-0">
                  {isTop3 ? (
                    <span className="text-2xl">{MEDALS[entry.rank - 1]}</span>
                  ) : (
                    <span className="text-lg font-bold text-gray-400">#{entry.rank}</span>
                  )}
                </div>

                {/* 頭像 */}
                <div className={`text-3xl ${isTop3 ? 'animate-wiggle' : ''}`}>
                  {avatar.emoji}
                </div>

                {/* 姓名 */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${isMe ? 'text-indigo-700' : 'text-gray-800'}`}>
                    {entry.name}
                    {isMe && <span className="ml-1 text-xs text-indigo-500">（你）</span>}
                  </p>
                  {isTop3 && (
                    <div className="flex gap-1 mt-0.5">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <span key={i} className="text-xs">✨</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 分數 */}
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-gray-800">{entry.totalScore}</p>
                  <p className="text-xs text-gray-400">分</p>
                </div>

                {/* 合格標記 */}
                <div className="shrink-0 w-16 text-right">
                  {entry.passed ? (
                    <span className="text-green-600 font-semibold text-sm">
                      ✅ 合格
                    </span>
                  ) : (
                    <span className="text-red-500 font-semibold text-sm">
                      ❌ 不合格
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {myMemberId && (
        <div className="text-center mt-6">
          <button
            onClick={openReview}
            className="text-sm text-indigo-600 hover:text-indigo-700 underline"
          >
            查看錯誤的題目
          </button>
        </div>
      )}

      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h2 className="text-lg font-semibold text-gray-800">錯誤的題目</h2>
              <button
                onClick={() => setShowReview(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-1"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {reviewLoading && <p className="text-sm text-gray-400 text-center py-6">載入中…</p>}
              {reviewError && <p className="text-sm text-red-500 text-center py-6">{reviewError}</p>}
              {!reviewLoading && !reviewError && wrongQuestions?.length === 0 && (
                <p className="text-sm text-green-600 text-center py-6">🎉 全對！沒有錯誤的題目</p>
              )}
              {!reviewLoading && wrongQuestions && wrongQuestions.length > 0 && (
                <div className="space-y-4">
                  {wrongQuestions.map((q, i) => (
                    <div key={q.id} className="border rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-800 mb-2">
                        {i + 1}. {q.text}
                      </p>
                      <p className="text-xs text-red-500 mb-1">
                        你的答案：{q.selected.join('、')}
                      </p>
                      <p className="text-xs text-green-600">
                        正確答案：{q.correct.join('、')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        .animate-wiggle { animation: wiggle 0.8s ease-in-out infinite; }
        @keyframes bounceX {
          0%, 100% { transform: translateX(0) translateY(-50%); }
          50% { transform: translateX(4px) translateY(-50%); }
        }
        .animate-bounce-x { animation: bounceX 0.8s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
