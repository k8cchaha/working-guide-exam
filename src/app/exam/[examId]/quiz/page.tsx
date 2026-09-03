import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import QuizClient from '@/components/QuizClient'
import { QUESTIONS } from '@/lib/questions'

export default async function QuizPage({
  params,
}: {
  params: Promise<{ examId: string }>
}) {
  const { examId } = await params
  const exam = await prisma.exam.findUnique({ where: { id: examId } })
  if (!exam) notFound()
  if (exam.status === 'PUBLISHED') redirect(`/exam/${examId}/result`)

  return <QuizClient examId={examId} questions={QUESTIONS} />
}
