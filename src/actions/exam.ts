'use server'

import { prisma } from '@/lib/db'
import { calculateAutoScore, calculateTotal } from '@/lib/scoring'
import type { Question, Option } from '@/lib/questions'

export async function startExamAction(
  examId: string,
  memberId: string,
  _avatarId: string,
  password?: string
) {
  const exam = await prisma.exam.findUnique({ where: { id: examId } })
  if (!exam || exam.status === 'PUBLISHED') return { error: '測驗不存在或已結束' }

  const member = await prisma.member.findFirst({
    where: { id: memberId, examId },
    include: { submission: true },
  })
  if (!member) return { error: '找不到成員' }
  if (member.submission) return { error: 'already_submitted' }

  if (exam.authMode === 'NAME_PASSWORD') {
    if (!password || password.trim() !== (member.password ?? '').trim()) {
      return { error: '密碼錯誤' }
    }
  }

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
  if (!exam || exam.status === 'PUBLISHED') return { error: '測驗不存在或已結束' }

  let bankQuestions: Question[] | undefined
  if (exam.questionBankId) {
    const bank = await prisma.questionBank.findUnique({
      where: { id: exam.questionBankId },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    })
    if (bank) {
      bankQuestions = bank.questions.map((q) => ({
        id: q.id,
        type: q.type as Question['type'],
        isBonus: q.isBonus,
        points: q.points,
        text: q.text,
        options: q.options ? (q.options as unknown as Option[]) : undefined,
        gradingHint: q.gradingHint ?? undefined,
      }))
    }
  }

  const autoScore = calculateAutoScore(answers, bankQuestions)
  const total = calculateTotal(autoScore, null)

  await prisma.submission.create({
    data: { examId, memberId, avatarId, answers, autoScore, totalScore: total },
  })

  return { ok: true, autoScore }
}
