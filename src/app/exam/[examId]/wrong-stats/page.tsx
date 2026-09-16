import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { QUESTIONS, Question, Option } from '@/lib/questions'
import { computeWrongStats } from '@/lib/wrongStats'
import { ExamStatus, Member, Submission } from '@prisma/client'
import WrongStatsPanel from '@/components/WrongStatsPanel'

type MemberWithSubmission = Member & { submission: Submission | null }

export default async function WrongStatsPage({
  params,
}: {
  params: Promise<{ examId: string }>
}) {
  const { examId } = await params
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      members: {
        include: { submission: true },
        orderBy: { name: 'asc' },
      },
      questionBank: { include: { questions: { orderBy: { sortOrder: 'asc' } } } },
    },
  })

  if (!exam) notFound()

  if (exam.status !== ExamStatus.PUBLISHED) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
          <div className="animate-pulse text-4xl mb-4">📊</div>
          <h2 className="text-xl font-bold mb-2">成績尚未發佈</h2>
          <p className="text-gray-500 text-sm">Admin 發佈成績後即可查看答錯狀況統計</p>
        </div>
      </div>
    )
  }

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

  const membersWithSubs = exam.members.filter(
    (m: MemberWithSubmission) => m.submission
  ) as (MemberWithSubmission & { submission: Submission })[]

  const wrongStats = computeWrongStats(
    questions,
    membersWithSubs.map((m) => ({
      id: m.id,
      name: m.name,
      answers: m.submission.answers as Record<string, string | string[]>,
    }))
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h1 className="text-lg font-semibold mb-4">答錯狀況統計</h1>
          <WrongStatsPanel wrongStats={wrongStats} />
        </div>
      </div>
    </div>
  )
}
