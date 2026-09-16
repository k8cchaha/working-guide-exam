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

    if (question.type === 'multiple') {
      // 每個選項：選對或不選錯各得 1 分，共 5 分
      const selected = Array.isArray(userAnswer) ? userAnswer : []
      for (const option of question.options) {
        const wasSelected = selected.includes(option.id)
        if (option.isCorrect && wasSelected) score += 1
        if (!option.isCorrect && !wasSelected) score += 1
      }
    }
  }

  return score
}

export function calculateTotal(autoScore: number, manualScore: number | null): number {
  return autoScore + (manualScore ?? 0)
}
