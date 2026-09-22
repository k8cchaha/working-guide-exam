import { QUESTIONS, Question } from './questions'

/** answers: { questionId: string | string[] } */
export function calculateAutoScore(
  answers: Record<string, string | string[]>,
  questions?: Question[]
): number {
  let score = 0
  const qs = questions ?? QUESTIONS

  for (const question of qs) {
    if (question.type === 'short_answer') continue

    const userAnswer = answers[question.id]
    if (!question.options) continue

    if (question.type === 'single' || question.type === 'true_false') {
      const correct = question.options.find((o) => o.isCorrect)?.id
      if (userAnswer === correct) score += question.points
    }

    if (question.type === 'multiple' && question.options.length > 0) {
      const selected = Array.isArray(userAnswer) ? userAnswer : []
      const correctJudgments = question.options.filter((option) => {
        const wasSelected = selected.includes(option.id)
        return option.isCorrect ? wasSelected : !wasSelected
      }).length
      const partialScore = (correctJudgments / question.options.length) * question.points
      score += Math.round(partialScore)
    }
  }

  return score
}

export function calculateTotal(autoScore: number, manualScore: number | null): number {
  return autoScore + (manualScore ?? 0)
}
