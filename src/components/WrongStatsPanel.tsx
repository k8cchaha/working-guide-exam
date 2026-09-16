'use client'

import { Suspense, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Question, Option } from '@/lib/questions'

interface MemberRef {
  id: string
  name: string
}

interface OptionBreakdown {
  option: Option
  wrongMembers: MemberRef[]
}

interface WrongStat {
  question: Question
  displayIndex: number
  wrongCount: number
  correctOptions: Option[]
  optionBreakdown: OptionBreakdown[]
  unanswered: MemberRef[]
}

function WrongStatsPanelInner({ wrongStats }: { wrongStats: WrongStat[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedMemberId = searchParams.get('member')

  const allMembers = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of wrongStats) {
      for (const { wrongMembers } of s.optionBreakdown) {
        for (const m of wrongMembers) map.set(m.id, m.name)
      }
      for (const m of s.unanswered) map.set(m.id, m.name)
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [wrongStats])

  function selectMember(id: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (id) params.set('member', id)
    else params.delete('member')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  if (wrongStats.length === 0) {
    return <p className="text-sm text-gray-500">🎉 所有人都答對了每一題！</p>
  }

  const displayedStats = selectedMemberId
    ? wrongStats
        .map((s) => ({
          ...s,
          optionBreakdown: s.optionBreakdown
            .map((ob) => ({
              ...ob,
              wrongMembers: ob.wrongMembers.filter((m) => m.id === selectedMemberId),
            }))
            .filter((ob) => ob.wrongMembers.length > 0),
          unanswered: s.unanswered.filter((m) => m.id === selectedMemberId),
        }))
        .filter((s) => s.optionBreakdown.length > 0 || s.unanswered.length > 0)
    : wrongStats

  const selectedName = selectedMemberId
    ? allMembers.find((m) => m.id === selectedMemberId)?.name
    : null

  return (
    <div>
      {selectedMemberId && (
        <div className="mb-3 flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
          <p className="text-sm text-indigo-700">
            正在檢視 <strong>{selectedName ?? '未知成員'}</strong> 的答錯題目
          </p>
          <button
            type="button"
            onClick={() => selectMember(null)}
            className="text-xs text-indigo-600 hover:underline shrink-0"
          >
            清除篩選
          </button>
        </div>
      )}

      {displayedStats.length === 0 ? (
        <p className="text-sm text-gray-500">這位成員全部答對了！</p>
      ) : (
        <div className="space-y-3">
          {displayedStats.map(({ question, displayIndex, wrongCount, correctOptions, optionBreakdown, unanswered }) => (
            <details key={question.id} className="border rounded-xl p-3 group" open={!!selectedMemberId}>
              <summary className="cursor-pointer flex items-center justify-between gap-3">
                <span className="text-sm text-gray-800">
                  第 {displayIndex} 題 — {question.text}
                </span>
                <span className="shrink-0 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  {wrongCount} 人答錯
                </span>
              </summary>
              <p className="mt-2 text-xs text-gray-500">
                正確答案：
                <span className="text-green-700 font-medium">
                  {correctOptions.map((o) => o.text).join('、')}
                </span>
              </p>
              <div className="mt-2 pt-2 border-t space-y-2">
                {optionBreakdown.map(({ option, wrongMembers }) => (
                  <div key={option.id} className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        option.isCorrect
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {option.isCorrect ? '✓' : '✗'} {option.text}
                    </span>
                    {wrongMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => selectMember(selectedMemberId === m.id ? null : m.id)}
                        className={`text-xs px-2 py-0.5 rounded-full transition ${
                          selectedMemberId === m.id
                            ? 'bg-indigo-600 text-white font-medium'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                ))}
                {unanswered.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                      （未作答）
                    </span>
                    {unanswered.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => selectMember(selectedMemberId === m.id ? null : m.id)}
                        className={`text-xs px-2 py-0.5 rounded-full transition ${
                          selectedMemberId === m.id
                            ? 'bg-indigo-600 text-white font-medium'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}

      {allMembers.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs font-medium text-gray-500 mb-2">依答錯成員篩選（點擊後網址可直接分享給該成員）：</p>
          <div className="flex flex-wrap gap-2">
            {allMembers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => selectMember(selectedMemberId === m.id ? null : m.id)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                  selectedMemberId === m.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function WrongStatsPanel(props: { wrongStats: WrongStat[] }) {
  return (
    <Suspense fallback={<p className="text-sm text-gray-400 text-center py-6">載入中…</p>}>
      <WrongStatsPanelInner {...props} />
    </Suspense>
  )
}
