'use server'

import { prisma } from '@/lib/db'
import { calculateAutoScore, calculateTotal } from '@/lib/scoring'

export async function startExamAction(examId: string, memberId: string, avatarId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, examId },
    include: { submission: true },
  })
  if (!member) return { error: '找不到成員' }
  if (member.submission) return { error: 'already_submitted' }
  return { ok: true, memberId: member.id, memberName: member.name }
}

export async function submitAnswersAction(
  examId: string,
  memberId: string,
  avatarId: string,
  answers: Record<string, string | string[]>
) {
  const existing = await prisma.submission.findUnique({ where: { memberId } })
  if (existing) return { error: 'already_submitted' }

  const exam = await prisma.exam.findUnique({ where: { id: examId } })
  if (!exam || exam.status === 'PUBLISHED') return { error: '考試不存在或已結束' }

  const autoScore = calculateAutoScore(answers)

  await prisma.submission.create({
    data: {
      examId,
      memberId,
      avatarId,
      answers,
      autoScore,
      totalScore: autoScore,
    },
  })

  return { ok: true, autoScore }
}
