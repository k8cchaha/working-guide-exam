import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import ResultClient from '@/components/ResultClient'

export default async function ResultPage({
  params,
}: {
  params: Promise<{ examId: string }>
}) {
  const { examId } = await params
  const exam = await prisma.exam.findUnique({ where: { id: examId } })
  if (!exam) notFound()

  return <ResultClient examId={examId} />
}
