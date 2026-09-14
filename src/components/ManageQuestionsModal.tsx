'use client'

import { useState } from 'react'
import {
  createQuestionAction,
  updateQuestionAction,
  deleteQuestionAction,
  updateQuestionOrdersAction,
} from '@/actions/admin'
import type { OptionInput } from '@/actions/admin'
import type { BankData, QuestionData } from './BankManagerPanel'

type QuestionType = 'single' | 'multiple' | 'true_false' | 'short_answer'

const TYPE_LABELS: Record<QuestionType, string> = {
  single: '單選題', multiple: '複選題', true_false: '是非題', short_answer: '問答題',
}
const TYPE_BADGE: Record<string, string> = {
  single: '單選', multiple: '複選', true_false: '是非', short_answer: '問答',
}
const DEFAULT_POINTS: Record<QuestionType, number> = {
  single: 3, multiple: 5, true_false: 3, short_answer: 15,
}

interface OptionRow { text: string; isCorrect: boolean }
type StoredOption = { id: string; text: string; isCorrect: boolean }

function getOptions(raw: unknown): StoredOption[] {
  return Array.isArray(raw) ? (raw as StoredOption[]) : []
}

function QuestionReadView({ q }: { q: QuestionData }) {
  const opts = getOptions(q.options)

  if (q.type === 'short_answer') {
    return (
      <div className="text-sm text-gray-600">
        <span className="font-medium text-gray-700">評分參考：</span>
        {q.gradingHint || <span className="text-gray-400">（未填寫）</span>}
      </div>
    )
  }

  if (opts.length === 0) return <p className="text-xs text-gray-400">（無選項資料）</p>

  return (
    <div className="space-y-1.5">
      {opts.map((opt) => (
        <div key={opt.id} className={`flex items-center gap-2 text-sm ${opt.isCorrect ? 'text-green-700' : 'text-gray-500'}`}>
          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 text-[9px] font-bold ${
            opt.isCorrect ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
          }`}>
            {opt.isCorrect ? '✓' : ''}
          </span>
          <span className={opt.isCorrect ? 'font-medium' : ''}>
            {q.type !== 'true_false' && <span className="text-xs text-gray-400 mr-1">{opt.id}.</span>}
            {opt.text}
          </span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  bank: BankData
  readOnly?: boolean
  onClose: (updatedQuestions: QuestionData[]) => void
}

export default function ManageQuestionsModal({ bank, readOnly = false, onClose }: Props) {
  const [questions, setQuestions] = useState<QuestionData[]>(bank.questions)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState('')

  // Reorder mode
  const [reorderMode, setReorderMode] = useState(false)
  const [dragItemId, setDragItemId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Form state (shared between inline edit and add-new)
  const [type, setType] = useState<QuestionType>('single')
  const [text, setText] = useState('')
  const [points, setPoints] = useState(3)
  const [isBonus, setIsBonus] = useState(false)
  const [options, setOptions] = useState<OptionRow[]>([
    { text: '', isCorrect: false }, { text: '', isCorrect: false },
  ])
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<'是' | '否' | ''>('')
  const [gradingHint, setGradingHint] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')

  function toggleReorderMode() {
    const next = !reorderMode
    setReorderMode(next)
    if (next) {
      // entering reorder mode: collapse & cancel any editing
      setExpandedId(null)
      setEditingId(null)
      resetForm()
    }
  }

  function resetForm() {
    setType('single')
    setText('')
    setPoints(3)
    setIsBonus(false)
    setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }])
    setTrueFalseAnswer('')
    setGradingHint('')
    setFormError('')
  }

  function handleStartEdit(q: QuestionData) {
    setEditingId(q.id)
    setExpandedId(null)
    setFormError('')
    setType(q.type as QuestionType)
    setText(q.text)
    setPoints(q.points)
    setIsBonus(q.isBonus)
    setGradingHint(q.gradingHint ?? '')
    const rawOpts = getOptions(q.options)
    if (q.type === 'true_false') {
      setTrueFalseAnswer((rawOpts.find(o => o.isCorrect)?.text ?? '') as '是' | '否' | '')
      setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }])
    } else if (rawOpts.length > 0) {
      setOptions(rawOpts.map(o => ({ text: o.text, isCorrect: o.isCorrect })))
      setTrueFalseAnswer('')
    } else {
      setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }])
      setTrueFalseAnswer('')
    }
  }

  function handleCancelEdit() {
    setEditingId(null)
    resetForm()
  }

  function handleTypeChange(t: QuestionType) {
    setType(t)
    setPoints(DEFAULT_POINTS[t])
    setTrueFalseAnswer('')
    setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }])
    setFormError('')
  }

  function setOptionField(i: number, field: keyof OptionRow, value: string | boolean) {
    setOptions(prev => prev.map((o, j) => j === i ? { ...o, [field]: value } : o))
  }
  function setSingleCorrect(i: number) {
    setOptions(prev => prev.map((o, j) => ({ ...o, isCorrect: j === i })))
  }

  const needsOptions = type === 'single' || type === 'multiple'
  const filledOptions = options.filter(o => o.text.trim())
  const hasCorrect = filledOptions.some(o => o.isCorrect)
  const canSubmit =
    text.trim().length > 0 &&
    (type === 'true_false' ? trueFalseAnswer !== '' :
     type === 'short_answer' ? true :
     filledOptions.length >= 2 && hasCorrect)

  function buildOptionData(): OptionInput[] | undefined {
    if (type === 'true_false') return [
      { id: 'A', text: '是', isCorrect: trueFalseAnswer === '是' },
      { id: 'B', text: '否', isCorrect: trueFalseAnswer === '否' },
    ]
    if (needsOptions) return filledOptions.map((o, i) => ({
      id: String.fromCharCode(65 + i), text: o.text.trim(), isCorrect: o.isCorrect,
    }))
    return undefined
  }

  async function handleSaveEdit() {
    if (!canSubmit || !editingId) return
    setSubmitting(true)
    setFormError('')
    const optionData = buildOptionData()
    const result = await updateQuestionAction(editingId, {
      type, text: text.trim(), points, isBonus, options: optionData, gradingHint: gradingHint || undefined,
    })
    if (result?.error) { setFormError(result.error); setSubmitting(false); return }
    setQuestions(prev => prev.map(q =>
      q.id === editingId
        ? { ...q, type, text: text.trim(), points, isBonus, options: optionData ?? null, gradingHint: gradingHint || null }
        : q
    ))
    setEditingId(null)
    resetForm()
    setSubmitting(false)
  }

  async function handleAddQuestion() {
    if (!canSubmit) return
    setSubmitting(true)
    setFormError('')
    setAddSuccess('')
    const optionData = buildOptionData()
    const result = await createQuestionAction({
      bankId: bank.id, type, text: text.trim(), points, isBonus,
      options: optionData, gradingHint: gradingHint || undefined,
    })
    if (result?.error) { setFormError(result.error); setSubmitting(false); return }
    if (result.question) setQuestions(prev => [...prev, result.question as QuestionData])
    resetForm()
    setAddSuccess('✓ 考題已新增')
    setTimeout(() => setAddSuccess(''), 2000)
    setSubmitting(false)
  }

  async function handleDelete(qId: string) {
    setDeletingId(qId)
    await deleteQuestionAction(qId)
    setQuestions(prev => prev.filter(q => q.id !== qId))
    if (editingId === qId) { setEditingId(null); resetForm() }
    if (expandedId === qId) setExpandedId(null)
    setDeletingId('')
  }

  // Drag-and-drop handlers
  function handleDragStart(qId: string) {
    setDragItemId(qId)
  }

  function handleDragOver(e: React.DragEvent, qId: string) {
    e.preventDefault()
    if (qId !== dragItemId) setDragOverId(qId)
  }

  async function handleDrop(targetId: string) {
    if (!dragItemId || dragItemId === targetId) {
      setDragItemId(null)
      setDragOverId(null)
      return
    }
    const from = questions.findIndex(q => q.id === dragItemId)
    const to = questions.findIndex(q => q.id === targetId)
    const reordered = [...questions]
    const [item] = reordered.splice(from, 1)
    reordered.splice(to, 0, item)
    setQuestions(reordered)
    setDragItemId(null)
    setDragOverId(null)
    // Persist order silently
    updateQuestionOrdersAction(bank.id, reordered.map(q => q.id))
  }

  function handleDragEnd() {
    setDragItemId(null)
    setDragOverId(null)
  }

  function renderFormFields(compact = false) {
    const inputCls = `w-full border border-gray-300 rounded-lg px-3 py-2 text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none transition`
    return (
      <>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(TYPE_LABELS) as QuestionType[]).map(t => (
            <button key={t} type="button" onClick={() => handleTypeChange(t)}
              className={`px-2.5 py-1 rounded-lg font-medium border transition ${compact ? 'text-xs' : 'text-sm'} ${
                type === t
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
              }`}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <textarea rows={compact ? 2 : 3} value={text} onChange={e => setText(e.target.value)}
          placeholder="輸入題目文字…" className={inputCls} />

        {needsOptions && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">
                {type === 'single' ? '（點選正確答案）' : '（勾選所有正確答案）'}
              </span>
              <button type="button" onClick={() => setOptions(p => [...p, { text: '', isCorrect: false }])}
                className="text-xs text-indigo-600 hover:underline">+ 新增選項</button>
            </div>
            <div className="space-y-1.5">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  {type === 'single'
                    ? <input type="radio" checked={opt.isCorrect} onChange={() => setSingleCorrect(i)} className="accent-indigo-600 shrink-0" />
                    : <input type="checkbox" checked={opt.isCorrect} onChange={e => setOptionField(i, 'isCorrect', e.target.checked)} className="accent-indigo-600 shrink-0" />
                  }
                  <span className="text-xs text-gray-400 shrink-0 w-4">{String.fromCharCode(65 + i)}.</span>
                  <input type="text" value={opt.text} onChange={e => setOptionField(i, 'text', e.target.value)}
                    placeholder={`選項 ${String.fromCharCode(65 + i)}`}
                    className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition" />
                  {options.length > 2 && (
                    <button type="button" onClick={() => setOptions(p => p.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 text-base leading-none shrink-0">×</button>
                  )}
                </div>
              ))}
            </div>
            {filledOptions.length >= 2 && !hasCorrect && (
              <p className="text-xs text-amber-600 mt-1">請標示至少一個正確答案</p>
            )}
          </div>
        )}

        {type === 'true_false' && (
          <div className="flex gap-3">
            {(['是', '否'] as const).map(val => (
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
        )}

        {type === 'short_answer' && (
          <textarea rows={2} value={gradingHint} onChange={e => setGradingHint(e.target.value)}
            placeholder="評分參考（選填）" className={inputCls} />
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 shrink-0">配分</span>
            <input type="number" value={points} min={1} max={50} onChange={e => setPoints(Number(e.target.value))}
              className="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 transition" />
            <span className="text-xs text-gray-400">分</span>
          </div>
          <label className="flex items-center gap-1.5 text-sm text-gray-700 select-none">
            <input type="checkbox" checked={isBonus} onChange={e => setIsBonus(e.target.checked)} className="accent-amber-500" />
            ⭐ 加分題
          </label>
        </div>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{readOnly ? '題目列表' : '管理題目'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{bank.name}</p>
          </div>
          <button type="button" onClick={() => onClose(questions)}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-1">×</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* Section header: count + reorder toggle */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              現有題目（{questions.length} 題）
            </p>
            {!readOnly && questions.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">調整順序</span>
                <button
                  type="button"
                  onClick={toggleReorderMode}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                    reorderMode ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                  aria-label="調整順序模式"
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    reorderMode ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  }`} />
                </button>
              </div>
            )}
          </div>

          {reorderMode && (
            <p className="text-xs text-indigo-600 -mt-3">長按並拖曳題目卡片來調整順序</p>
          )}

          {/* Question list */}
          {questions.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">尚無題目</p>
          ) : (
            <div className="space-y-2">
              {questions.map((q) => {
                const isExpanded = expandedId === q.id
                const isEditing = editingId === q.id
                const isDragging = dragItemId === q.id
                const isDragOver = dragOverId === q.id && dragItemId !== q.id

                return (
                  <div
                    key={q.id}
                    draggable={reorderMode}
                    onDragStart={() => handleDragStart(q.id)}
                    onDragOver={e => handleDragOver(e, q.id)}
                    onDrop={() => handleDrop(q.id)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-xl border overflow-hidden transition-all ${
                      isDragging ? 'opacity-40 scale-[0.98] shadow-lg' :
                      isDragOver ? 'border-indigo-400 shadow-md' :
                      isEditing ? 'border-indigo-300' :
                      'border-gray-200'
                    }`}
                  >
                    {/* Question header row */}
                    <div
                      className={`flex items-start gap-3 p-3 transition ${
                        reorderMode ? 'cursor-grab active:cursor-grabbing bg-white' :
                        isEditing ? 'bg-indigo-50' :
                        'cursor-pointer hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        if (reorderMode || isEditing) return
                        setExpandedId(isExpanded ? null : q.id)
                      }}
                    >
                      {/* Drag handle (reorder mode only) */}
                      {reorderMode && (
                        <div className="flex flex-col gap-[3px] justify-center shrink-0 mt-1 opacity-40">
                          <span className="block w-4 h-0.5 bg-gray-600 rounded" />
                          <span className="block w-4 h-0.5 bg-gray-600 rounded" />
                          <span className="block w-4 h-0.5 bg-gray-600 rounded" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                            {TYPE_BADGE[q.type] ?? q.type}
                          </span>
                          <span className="text-xs text-gray-400">{q.points} 分</span>
                          {q.isBonus && <span className="text-xs text-amber-600">⭐ 加分</span>}
                        </div>
                        <p className={`text-sm text-gray-800 ${!isExpanded && !isEditing ? 'line-clamp-1' : ''}`}>
                          {q.text}
                        </p>
                      </div>

                      {/* Action buttons (hidden in reorder mode) */}
                      {!reorderMode && (
                        <div className="flex items-center gap-2 shrink-0 mt-0.5"
                          onClick={e => e.stopPropagation()}>
                          {!readOnly && !isEditing && (
                            <>
                              <button type="button" onClick={() => handleStartEdit(q)}
                                className="text-xs text-indigo-600 hover:underline">編輯</button>
                              <button type="button" onClick={() => handleDelete(q.id)}
                                disabled={deletingId === q.id}
                                className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50">
                                {deletingId === q.id ? '…' : '刪除'}
                              </button>
                            </>
                          )}
                          {!isEditing && (
                            <span className="text-gray-300 text-xs select-none">
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expanded: read-only options */}
                    {isExpanded && !isEditing && !reorderMode && (
                      <div className="px-4 pb-3 pt-2 bg-gray-50 border-t border-gray-100">
                        <QuestionReadView q={q} />
                      </div>
                    )}

                    {/* Editing: inline form */}
                    {isEditing && !reorderMode && (
                      <div className="px-4 pb-4 pt-3 bg-indigo-50 border-t border-indigo-100 space-y-3">
                        {renderFormFields(true)}
                        {formError && <p className="text-red-500 text-xs">{formError}</p>}
                        <div className="flex gap-2 pt-1">
                          <button type="button" onClick={handleSaveEdit}
                            disabled={!canSubmit || submitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-1.5 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed">
                            {submitting ? '儲存中…' : '儲存'}
                          </button>
                          <button type="button" onClick={handleCancelEdit}
                            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition">
                            取消
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Add new question — hidden while editing or in reorder mode or read-only */}
          {!readOnly && !editingId && !reorderMode && (
            <>
              <div className="border-t" />
              <div className="space-y-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">＋ 新增題目</p>
                {renderFormFields()}
                {formError && <p className="text-red-500 text-sm">{formError}</p>}
                {addSuccess && <p className="text-green-600 text-sm font-medium">{addSuccess}</p>}
                <button type="button" onClick={handleAddQuestion} disabled={!canSubmit || submitting}
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2.5 rounded-lg border border-indigo-200 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  {submitting ? '處理中…' : '＋ 新增考題'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t shrink-0">
          <button type="button" onClick={() => onClose(questions)}
            className="bg-gray-800 hover:bg-gray-900 text-white font-semibold px-6 py-2 rounded-lg transition">
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}
