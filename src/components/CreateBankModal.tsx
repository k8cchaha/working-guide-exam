'use client'

import { useState } from 'react'
import { createBankAction, createQuestionAction } from '@/actions/admin'
import type { OptionInput } from '@/actions/admin'

type QuestionType = 'single' | 'multiple' | 'true_false' | 'short_answer'

const TYPE_LABELS: Record<QuestionType, string> = {
  single: '單選題',
  multiple: '複選題',
  true_false: '是非題',
  short_answer: '問答題',
}

const DEFAULT_POINTS: Record<QuestionType, number> = {
  single: 3,
  multiple: 5,
  true_false: 3,
  short_answer: 15,
}

interface OptionRow { text: string; isCorrect: boolean }

interface Props {
  onDone: () => void
  onClose: () => void
}

export default function CreateBankModal({ onDone, onClose }: Props) {
  // Step 1
  const [bankName, setBankName] = useState('')
  const [isShared, setIsShared] = useState(false)
  const [questionOrder, setQuestionOrder] = useState<'sequential' | 'random'>('random')
  const [step1Submitting, setStep1Submitting] = useState(false)
  const [step1Error, setStep1Error] = useState('')

  // Wizard state
  const [step, setStep] = useState<1 | 2>(1)
  const [createdBank, setCreatedBank] = useState<{ id: string; name: string } | null>(null)

  // Step 2 running score
  const [totalScore, setTotalScore] = useState(0)
  const [questionsAdded, setQuestionsAdded] = useState(0)

  // Question form
  const [type, setType] = useState<QuestionType>('single')
  const [text, setText] = useState('')
  const [points, setPoints] = useState(3)
  const [isBonus, setIsBonus] = useState(false)
  const [options, setOptions] = useState<OptionRow[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ])
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<'是' | '否' | ''>('')
  const [gradingHint, setGradingHint] = useState('')
  const [qSubmitting, setQSubmitting] = useState(false)
  const [qError, setQError] = useState('')
  const [qSuccess, setQSuccess] = useState(false)

  // ── Step 1 ────────────────────────────────────────────────────────────────

  async function handleNextStep() {
    if (!bankName.trim()) { setStep1Error('請輸入題庫名稱'); return }
    setStep1Submitting(true)
    setStep1Error('')
    const result = await createBankAction(bankName.trim(), isShared, questionOrder)
    if (result.error || !result.bank) {
      setStep1Error(result.error ?? '建立題庫失敗')
      setStep1Submitting(false)
      return
    }
    setCreatedBank({ id: result.bank.id, name: result.bank.name })
    setStep(2)
    setStep1Submitting(false)
  }

  // ── Step 2 ────────────────────────────────────────────────────────────────

  function handleTypeChange(t: QuestionType) {
    setType(t)
    setPoints(DEFAULT_POINTS[t])
    setTrueFalseAnswer('')
    setQError('')
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

  const canAdd =
    text.trim().length > 0 &&
    (type === 'true_false' ? trueFalseAnswer !== '' :
     type === 'short_answer' ? true :
     filledOptions.length >= 2 && hasCorrect)

  async function handleAddQuestion() {
    if (!canAdd || !createdBank) return
    setQSubmitting(true)
    setQError('')

    let optionData: OptionInput[] | undefined
    if (type === 'true_false') {
      optionData = [
        { id: 'A', text: '是', isCorrect: trueFalseAnswer === '是' },
        { id: 'B', text: '否', isCorrect: trueFalseAnswer === '否' },
      ]
    } else if (needsOptions) {
      optionData = filledOptions.map((o, i) => ({
        id: String.fromCharCode(65 + i),
        text: o.text.trim(),
        isCorrect: o.isCorrect,
      }))
    }

    const result = await createQuestionAction({
      bankId: createdBank.id,
      type, text, points, isBonus,
      options: optionData,
      gradingHint: gradingHint || undefined,
    })

    if (result?.error) {
      setQError(result.error)
      setQSubmitting(false)
      return
    }

    if (!isBonus) setTotalScore((s) => s + points)
    setQuestionsAdded((n) => n + 1)

    setText('')
    setGradingHint('')
    setTrueFalseAnswer('')
    setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }])
    setIsBonus(false)
    setQSuccess(true)
    setTimeout(() => setQSuccess(false), 2000)
    setQSubmitting(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">建立新題庫</h2>
            <p className="text-xs text-gray-400 mt-0.5">步驟 {step} / 2</p>
          </div>
          <button type="button" onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-1">
            ×
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-6 pt-4 gap-2 shrink-0">
          {([1, 2] as const).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${
                step > s ? 'bg-green-500 text-white' :
                step === s ? 'bg-indigo-600 text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
                {step > s ? '✓' : s}
              </div>
              <span className={`text-xs ${step === s ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                {s === 1 ? '題庫設定' : '新增題目'}
              </span>
              {s < 2 && <div className="w-8 h-px bg-gray-200 mx-1" />}
            </div>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── Step 1 ── */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">題庫名稱</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="例如：Jira 工作指南"
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
                <input type="checkbox" checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
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
                    <button
                      key={value}
                      type="button"
                      onClick={() => setQuestionOrder(value)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${
                        questionOrder === value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {step1Error && <p className="text-red-500 text-sm">{step1Error}</p>}
            </>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && createdBank && (
            <>
              {/* Score banner */}
              <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-indigo-400 font-medium">題庫</p>
                  <p className="text-sm font-semibold text-indigo-700">{createdBank.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-indigo-400 font-medium">累計分數（不含加分題）</p>
                  <p className="text-2xl font-bold text-indigo-700 leading-tight">
                    {totalScore} <span className="text-sm font-normal">分</span>
                  </p>
                  <p className="text-xs text-gray-400">{questionsAdded} 道題目</p>
                </div>
              </div>

              {/* 題型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">題型</label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                    <button key={t} type="button" onClick={() => handleTypeChange(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                        type === t
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                      }`}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 題目文字 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">題目內容</label>
                <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="輸入題目文字…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none transition" />
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
                    <button type="button"
                      onClick={() => setOptions((p) => [...p, { text: '', isCorrect: false }])}
                      className="text-xs text-indigo-600 hover:underline">
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
                        <input type="text" value={opt.text}
                          onChange={(e) => setOptionField(i, 'text', e.target.value)}
                          placeholder={`選項 ${String.fromCharCode(65 + i)}`}
                          className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition" />
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

              {/* 是非題 */}
              {type === 'true_false' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">正確答案</label>
                  <div className="flex gap-3">
                    {(['是', '否'] as const).map((val) => (
                      <button key={val} type="button" onClick={() => setTrueFalseAnswer(val)}
                        className={`px-8 py-2 rounded-lg text-sm font-medium border transition ${
                          trueFalseAnswer === val
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                        }`}>
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 問答評分參考 */}
              {type === 'short_answer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    評分參考
                    <span className="text-gray-400 font-normal ml-1">（選填）</span>
                  </label>
                  <textarea rows={2} value={gradingHint}
                    onChange={(e) => setGradingHint(e.target.value)}
                    placeholder="填入建議答案或評分重點…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none transition" />
                </div>
              )}

              {/* 配分 + 加分 */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 shrink-0">配分</label>
                  <input type="number" value={points} min={1} max={50}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
                  <span className="text-xs text-gray-400">分</span>
                </div>
                <label className="flex items-center gap-1.5 text-sm text-gray-700 select-none">
                  <input type="checkbox" checked={isBonus}
                    onChange={(e) => setIsBonus(e.target.checked)}
                    className="accent-amber-500" />
                  ⭐ 加分題
                </label>
              </div>

              {qError && <p className="text-red-500 text-sm">{qError}</p>}
              {qSuccess && <p className="text-green-600 text-sm font-medium">✓ 考題已新增</p>}

              <button type="button" onClick={handleAddQuestion}
                disabled={!canAdd || qSubmitting}
                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2.5 rounded-lg border border-indigo-200 transition disabled:opacity-40 disabled:cursor-not-allowed">
                {qSubmitting ? '新增中…' : '＋ 新增考題'}
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0">
          {step === 1 ? (
            <>
              <button type="button" onClick={onClose}
                className="text-sm text-gray-500 hover:text-gray-700">
                取消
              </button>
              <button type="button" onClick={handleNextStep}
                disabled={step1Submitting || !bankName.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed">
                {step1Submitting ? '建立中…' : '下一步 →'}
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400">可繼續新增，或直接完成</p>
              <button type="button" onClick={onDone}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition">
                完成 ✓
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
