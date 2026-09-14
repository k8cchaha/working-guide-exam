import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import QuizClient from '@/components/QuizClient'
import { QUESTIONS, Question, Option } from '@/lib/questions'

export default async function QuizPage({
  params,
}: {
  params: Promise<{ examId: string }>
}) {
  const { examId } = await params
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questionBank: { include: { questions: { orderBy: { sortOrder: 'asc' } } } },
    },
  })
  if (!exam) notFound()
  if (exam.status === 'PUBLISHED') redirect(`/exam/${examId}/result`)

  let questions: Question[] = QUESTIONS
  if (exam.questionBank) {
    questions = exam.questionBank.questions.map((q) => ({
      id: q.id,
      type: q.type as Question['type'],
      isBonus: q.isBonus,
      points: q.points,
      text: q.text,
      options: q.options ? (q.options as unknown as Option[]) : undefined,
      gradingHint: q.gradingHint ?? undefined,
    }))
  }

  return <QuizClient examId={examId} questions={questions} />
}
