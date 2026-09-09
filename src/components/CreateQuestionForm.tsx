'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createQuestionAction } from '@/actions/admin'
import type { OptionInput } from '@/actions/admin'

type QuestionType = 'single' | 'multiple' | 'short_answer'

const TYPE_LABELS: Record<QuestionType, string> = {
  single: '單選題',
  multiple: '複選題',
  short_answer: '問答題',
}

const DEFAULT_POINTS: Record<QuestionType, number> = {
  single: 3,
  multiple: 5,
  short_answer: 15,
}

interface OptionRow { text: string; isCorrect: boolean }

export default function CreateQuestionForm() {
  const router = useRouter()
  const [type, setType] = useState<QuestionType>('single')
  const [text, setText] = useState('')
  const [points, setPoints] = useState(3)
  const [isBonus, setIsBonus] = useState(false)
  const [isShared, setIsShared] = useState(false)
  const [options, setOptions] = useState<OptionRow[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ])
  const [gradingHint, setGradingHint] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleTypeChange(t: QuestionType) {
    setType(t)
    setPoints(DEFAULT_POINTS[t])
    setError('')
  }

  function setOptionField(i: number, field: keyof OptionRow, value: string | boolean) {
    setOptions((prev) => prev.map((o, j) => j === i ? { ...o, [field]: value } : o))
  }

  function setSingleCorrect(i: number) {
    setOptions((prev) => prev.map((o, j) => ({ ...o, isCorrect: j === i })))
  }

  const needsOptions = type === 'single' || type === 'multiple'
  const filledOptions = options.filter((o) => o.text.trim())
  const hasCorrect = filledOptions.some((o) => o.isCorrect)

  const canSubmit =
    text.trim().length > 0 &&
    (!needsOptions || (filledOptions.length >= 2 && hasCorrect))

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')

    const optionData: OptionInput[] | undefined = needsOptions
      ? filledOptions.map((o, i) => ({
          id: String.fromCharCode(65 + i),
          text: o.text.trim(),
          isCorrect: o.isCorrect,
        }))
      : undefined

    const result = await createQuestionAction({
      type, text, points, isBonus, isShared,
      options: optionData,
      gradingHint: gradingHint || undefined,
    })

    if (result?.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    // reset form
    setText('')
    setGradingHint('')
    setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }])
    setIsBonus(false)
    setIsShared(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
    setSubmitting(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* 題型 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">題型</label>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                type === t
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* 題目文字 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">題目內容</label>
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="輸入題目文字…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none transition"
        />
      </div>

      {/* 選項（單選/複選） */}
      {needsOptions && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">
              選項
              <span className="text-gray-400 font-normal ml-1">
                （{type === 'single' ? '點選正確答案' : '勾選所有正確答案'}）
              </span>
            </label>
            <button
              type="button"
              onClick={() => setOptions((p) => [...p, { text: '', isCorrect: false }])}
              className="text-xs text-indigo-600 hover:underline"
            >
              + 新增選項
            </button>
          </div>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                {type === 'single' ? (
                  <input type="radio" checked={opt.isCorrect} onChange={() => setSingleCorrect(i)}
                    className="accent-indigo-600 shrink-0" title="設為正確答案" />
                ) : (
                  <input type="checkbox" checked={opt.isCorrect}
                    onChange={(e) => setOptionField(i, 'isCorrect', e.target.checked)}
                    className="accent-indigo-600 shrink-0" title="設為正確答案" />
                )}
                <span className="text-xs text-gray-400 shrink-0 w-5 text-center">
                  {String.fromCharCode(65 + i)}.
                </span>
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => setOptionField(i, 'text', e.target.value)}
                  placeholder={`選項 ${String.fromCharCode(65 + i)}`}
                  className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition"
                />
                {options.length > 2 && (
                  <button type="button"
                    onClick={() => setOptions((p) => p.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 text-base leading-none shrink-0">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {filledOptions.length >= 2 && !hasCorrect && (
            <p className="text-xs text-amber-600 mt-1">請標示至少一個正確答案</p>
          )}
        </div>
      )}

      {/* 評分參考（問答題） */}
      {type === 'short_answer' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            評分參考
            <span className="text-gray-400 font-normal ml-1">（選填）</span>
          </label>
          <textarea
            rows={3}
            value={gradingHint}
            onChange={(e) => setGradingHint(e.target.value)}
            placeholder="填入建議答案或評分重點…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none transition"
          />
        </div>
      )}

      {/* 配分 + 加分題 + 共用 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 shrink-0">配分</label>
          <input
            type="number" value={points} min={1} max={50}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
          <span className="text-xs text-gray-400">分</span>
        </div>
        <label className="flex items-center gap-1.5 text-sm text-gray-700 select-none">
          <input type="checkbox" checked={isBonus} onChange={(e) => setIsBonus(e.target.checked)}
            className="accent-amber-500" />
          ⭐ 加分題
        </label>
        <label className="flex items-center gap-1.5 text-sm text-gray-700 select-none">
          <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)}
            className="accent-indigo-600" />
          🌐 開放共用
        </label>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">✓ 考題已建立</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? '建立中…' : '建立考題 →'}
      </button>
    </div>
  )
}
