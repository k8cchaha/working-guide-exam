import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { QUESTIONS, Question, Option } from '@/lib/questions'

export async function GET(req: Request, { params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params
  const memberId = new URL(req.url).searchParams.get('memberId')
  if (!memberId) return NextResponse.json({ error: '缺少 memberId' }, { status: 400 })

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questionBank: { include: { questions: { orderBy: { sortOrder: 'asc' } } } } },
  })
  if (!exam || exam.status !== 'PUBLISHED') {
    return NextResponse.json({ error: '成績尚未發佈' }, { status: 404 })
  }

  const submission = await prisma.submission.findFirst({ where: { examId, memberId } })
  if (!submission) return NextResponse.json({ error: '找不到作答記錄' }, { status: 404 })

  const questions: Question[] = exam.questionBank
    ? exam.questionBank.questions.map((q) => ({
        id: q.id,
        type: q.type as Question['type'],
        isBonus: q.isBonus,
        points: q.points,
        text: q.text,
        options: q.options ? (q.options as unknown as Option[]) : undefined,
        gradingHint: q.gradingHint ?? undefined,
      }))
    : QUESTIONS

  const answers = submission.answers as Record<string, string | string[]>

  const wrong = questions
    .filter((q) => q.type !== 'short_answer' && q.options)
    .map((q) => {
      const userAnswer = answers[q.id]
      const options = q.options as Option[]
      const correctIds = options.filter((o) => o.isCorrect).map((o) => o.id)

      let selectedIds: string[]
      let isCorrect: boolean
      if (q.type === 'multiple') {
        selectedIds = Array.isArray(userAnswer) ? userAnswer : []
        const selSet = new Set(selectedIds)
        const corSet = new Set(correctIds)
        isCorrect = selSet.size === corSet.size && [...selSet].every((id) => corSet.has(id))
      } else {
        selectedIds = userAnswer ? [userAnswer as string] : []
        isCorrect = selectedIds[0] === correctIds[0]
      }

      if (isCorrect) return null

      const idToText = new Map(options.map((o) => [o.id, o.text]))
      return {
        id: q.id,
        text: q.text,
        selected:
          selectedIds.length > 0
            ? selectedIds.map((id) => idToText.get(id) ?? id)
            : ['（未作答）'],
        correct: correctIds.map((id) => idToText.get(id) ?? id),
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  return NextResponse.json({ wrong })
}
