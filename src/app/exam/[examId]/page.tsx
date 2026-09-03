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
    include: { members: { orderBy: { name: 'asc' } } },
  })
  if (!exam) notFound()

  const members = exam.members.map((m: { id: string; name: string }) => ({ id: m.id, name: m.name }))

  return <EntryClient examId={examId} members={members} examStatus={exam.status} />
}
