import { Question, Option } from '@/lib/questions'

export interface MemberRef {
  id: string
  name: string
}

export interface OptionBreakdown {
  option: Option
  wrongMembers: MemberRef[]
}

export interface WrongStat {
  question: Question
  displayIndex: number
  wrongCount: number
  optionBreakdown: OptionBreakdown[]
  unanswered: MemberRef[]
}

export interface MemberAnswers {
  id: string
  name: string
  answers: Record<string, string | string[]>
}

export function computeWrongStats(
  questions: Question[],
  membersWithAnswers: MemberAnswers[]
): WrongStat[] {
  return questions
    .filter((q) => q.type !== 'short_answer' && q.options)
    .map((q) => {
      const options = q.options as Option[]
      const correctIds = options.filter((o) => o.isCorrect).map((o) => o.id)
      const optionWrongMembers = new Map<string, MemberRef[]>(options.map((o) => [o.id, []]))
      const unanswered: MemberRef[] = []
      let wrongCount = 0

      for (const m of membersWithAnswers) {
        const userAnswer = m.answers[q.id]
        const ref: MemberRef = { id: m.id, name: m.name }
        let isCorrect: boolean

        if (q.type === 'multiple') {
          const selected = Array.isArray(userAnswer) ? userAnswer : []
          const selSet = new Set(selected)
          const corSet = new Set(correctIds)
          isCorrect = selSet.size === corSet.size && [...selSet].every((id) => corSet.has(id))
          if (!isCorrect) {
            for (const o of options) {
              const isSelected = selSet.has(o.id)
              if ((o.isCorrect && !isSelected) || (!o.isCorrect && isSelected)) {
                optionWrongMembers.get(o.id)?.push(ref)
              }
            }
          }
        } else {
          isCorrect = userAnswer === correctIds[0]
          if (!isCorrect) {
            if (userAnswer) optionWrongMembers.get(userAnswer as string)?.push(ref)
            else unanswered.push(ref)
          }
        }

        if (!isCorrect) wrongCount++
      }

      const optionBreakdown = options
        .map((o) => ({ option: o, wrongMembers: optionWrongMembers.get(o.id) ?? [] }))
        .filter((s) => s.wrongMembers.length > 0)

      const displayIndex = questions.indexOf(q) + 1
      return { question: q, displayIndex, wrongCount, optionBreakdown, unanswered }
    })
    .filter((s) => s.wrongCount > 0)
    .sort((a, b) => b.wrongCount - a.wrongCount)
}
