'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Question } from '@/lib/questions'
import { shuffleQuestions } from '@/lib/questions'
import { submitAnswersAction } from '@/actions/exam'
import { getAvatarById } from '@/lib/avatars'

interface Props {
  examId: string
  questions: Question[]
}

export default function QuizClient({ examId, questions }: Props) {
  const router = useRouter()
  const [memberId, setMemberId] = useState('')
  const [avatarId, setAvatarId] = useState('')
  const [shuffled, setShuffled] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem(`exam_${examId}`)
    if (!stored) { router.replace(`/exam/${examId}`); return }
    const data = JSON.parse(stored)
    if (data.submitted) { router.replace(`/exam/${examId}/result`); return }
    setMemberId(data.memberId)
    setAvatarId(data.avatarId)
    setShuffled(shuffleQuestions(questions, data.memberId))
  }, [examId, questions, router])

  function setSingle(qid: string, optId: string) {
    setAnswers((prev) => ({ ...prev, [qid]: optId }))
  }

  function toggleMultiple(qid: string, optId: string) {
    setAnswers((prev) => {
      const cur = (prev[qid] as string[] | undefined) ?? []
      const next = cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId]
      return { ...prev, [qid]: next }
    })
  }

  function setShortAnswer(qid: string, val: string) {
    setAnswers((prev) => ({ ...prev, [qid]: val }))
  }

  const unanswered = shuffled.filter((q) => {
    const a = answers[q.id]
    if (q.type === 'short_answer') return !a || (a as string).trim() === ''
    if (q.type === 'multiple') return !a || (a as string[]).length === 0
    return !a
  })

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      const result = await submitAnswersAction(examId, memberId, avatarId, answers)
      if ('error' in result && result.error) {
        if (result.error === 'already_submitted') {
          localStorage.setItem(
            `exam_${examId}`,
            JSON.stringify({ memberId, avatarId, submitted: true })
          )
          router.replace(`/exam/${examId}/result`)
          return
        }
        setError(result.error)
        setSubmitting(false)
        return
      }
      localStorage.setItem(
        `exam_${examId}`,
        JSON.stringify({ memberId, avatarId, submitted: true })
      )
      setSubmitted(true)
    } catch {
      setError('提交失敗，請重試')
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
          <p className="text-4xl mb-3">🎉</p>
          <h2 className="text-xl font-bold mb-2">提交成功！</h2>
          <p className="text-gray-500 text-sm mb-4">等待 Admin 發佈成績後可查看排名</p>
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

  if (!shuffled.length) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">載入中…</div>
  }

  const avatar = getAvatarById(avatarId)

  return (
    <div className="min-h-screen bg-gray-50" ref={topRef}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{avatar.emoji}</span>
          <span className="font-medium text-sm text-gray-700">{avatar.label}</span>
        </div>
        <div className="text-sm text-gray-500">
          已作答 {Object.keys(answers).length} / {shuffled.length} 題
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6 pb-32">
        {shuffled.map((q, idx) => (
          <div key={q.id} id={`q-${q.id}`} className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-start gap-2 mb-3">
              <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 leading-relaxed">{q.text}</p>
                {q.isBonus && (
                  <span className="text-xs text-amber-600 font-semibold">⭐ 加分題（{q.points} 分）</span>
                )}
                {!q.isBonus && (
                  <span className="text-xs text-gray-400">（{q.points} 分）</span>
                )}
              </div>
            </div>

            {/* 單選 */}
            {q.type === 'single' && q.options && (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      answers[q.id] === opt.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.id}
                      checked={answers[q.id] === opt.id}
                      onChange={() => setSingle(q.id, opt.id)}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700">
                      <strong className="text-gray-500">{opt.id}.</strong> {opt.text}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* 複選 */}
            {q.type === 'multiple' && q.options && (
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const selected = ((answers[q.id] as string[]) ?? []).includes(opt.id)
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleMultiple(q.id, opt.id)}
                        className="mt-0.5 accent-indigo-600"
                      />
                      <span className="text-sm text-gray-700">
                        <strong className="text-gray-500">{opt.id}.</strong> {opt.text}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}

            {/* 問答 */}
            {q.type === 'short_answer' && (
              <textarea
                rows={6}
                value={(answers[q.id] as string) ?? ''}
                onChange={(e) => setShortAnswer(q.id, e.target.value)}
                placeholder="請在此輸入你的答案…"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none transition"
              />
            )}
          </div>
        ))}
      </div>

      {/* 底部固定提交區 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {unanswered.length > 0 && !showConfirm && (
            <p className="text-xs text-amber-600 mb-2">
              還有 {unanswered.length} 題未作答（{unanswered.map((q) => q.id).join(', ')}）
            </p>
          )}
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <button
            onClick={() => {
              if (unanswered.length > 0 && !showConfirm) {
                setShowConfirm(true)
                return
              }
              handleSubmit()
            }}
            disabled={submitting}
            className={`w-full py-3 rounded-xl font-semibold text-white transition disabled:opacity-50 ${
              showConfirm || unanswered.length === 0
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {submitting
              ? '提交中…'
              : showConfirm
              ? `確認提交（含 ${unanswered.length} 題未作答）`
              : '提交答案'}
          </button>
          {showConfirm && (
            <button
              onClick={() => setShowConfirm(false)}
              className="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              繼續作答
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
