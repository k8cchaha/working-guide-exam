import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import EntryClient from '@/components/EntryClient'

export default async function ExamEntryPage({
  params,
}: {
  params: Promise<{ examId: string }>
}) {
  const { examId } = await params
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { members: { orderBy: { name: 'asc' }, select: { id: true, name: true } } },
  })
  if (!exam) notFound()

  return (
    <EntryClient
      examId={examId}
      members={exam.members}
      examStatus={exam.status}
      authMode={exam.authMode}
    />
  )
}
