import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params
  const exam = await prisma.exam.findUnique({ where: { id: examId } })
  if (!exam || exam.status !== 'PUBLISHED') {
    return NextResponse.json({ published: false })
  }

  const submissions = await prisma.submission.findMany({
    where: { examId },
    include: { member: { select: { name: true } } },
    orderBy: { totalScore: 'desc' },
  })

  const leaderboard = submissions.map((s: typeof submissions[number], i: number) => ({
    rank: i + 1,
    memberId: s.memberId,
    name: s.member.name,
    avatarId: s.avatarId,
    totalScore: s.totalScore ?? s.autoScore,
    passed: (s.totalScore ?? s.autoScore) >= exam.passingScore,
  }))

  return NextResponse.json({ published: true, passingScore: exam.passingScore, leaderboard })
}
