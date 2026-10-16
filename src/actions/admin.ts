'use server'

import { redirect } from 'next/navigation'
import {
  validateAdminCredentials,
  signAdminToken,
  setAdminCookie,
  clearAdminCookie,
  getManagementSession,
  validateManagementPassword,
} from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calculateTotal } from '@/lib/scoring'
import { QUESTIONS } from '@/lib/questions'
import { readableBankWhere } from '@/lib/session-token'

export type MemberInput = { name: string; password?: string }

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function loginAction(formData: FormData) {
  const username = formData.get('username')
  const password = formData.get('password')
  if (typeof username !== 'string' || typeof password !== 'string' ||
      !validateAdminCredentials(username, password)) return { error: '帳號或密碼錯誤' }
  const token = await signAdminToken(username)
  await setAdminCookie(token)
  redirect('/admin/dashboard')
}

export async function logoutAction() {
  await clearAdminCookie()
  redirect('/admin')
}

// ── Exam ──────────────────────────────────────────────────────────────────────

export async function createExamAction(
  passingScore: number,
  authMode: string,
  members: MemberInput[],
  bankId?: string,
  questionOrder = 'random'
) {
  const session = await getManagementSession()
  if (!session) return { error: '未授權' }
  if (authMode !== 'GOOGLE' && members.length === 0) return { error: '請至少輸入一位成員' }
  if (bankId) {
    const bank = await prisma.questionBank.findFirst({
      where: { id: bankId, ...readableBankWhere(session.ownerKey) },
      select: { id: true },
    })
    if (!bank) return { error: '題庫不存在或未開放共用' }
  }

  const exam = await prisma.exam.create({
    data: {
      adminUsername: session.username,
      ownerKey: session.ownerKey,
      authMode,
      passingScore,
      questionOrder,
      questionBankId: bankId || null,
      members: {
        create: members.map((m) => ({
          name: m.name.trim(),
          password: m.password?.trim() || null,
        })),
      },
    },
  })

  redirect(`/admin/dashboard/${exam.id}`)
}

export async function gradeSubmissionAction(submissionId: string, manualScore: number) {
  const session = await getManagementSession()
  if (!session) return { error: '未授權' }

  const submission = await prisma.submission.findFirst({
    where: { id: submissionId, exam: { ownerKey: session.ownerKey } },
  })
  if (!submission) return { error: '找不到作答記錄' }

  const exam = await prisma.exam.findUnique({
    where: { id: submission.examId, ownerKey: session.ownerKey },
    include: {
      questionBank: { include: { questions: { orderBy: { sortOrder: 'asc' } } } },
    },
  })
  if (!exam) return { error: '找不到測驗' }

  const saQuestion = exam.questionBank
    ? exam.questionBank.questions.find((q) => q.type === 'short_answer')
    : QUESTIONS.find((q) => q.type === 'short_answer')
  const maxScore = saQuestion?.points ?? 0

  if (!Number.isInteger(manualScore) || manualScore < 0 || manualScore > maxScore) {
    return { error: `分數必須介於 0 到 ${maxScore} 之間` }
  }

  const total = calculateTotal(submission.autoScore, manualScore)
  await prisma.submission.update({
    where: { id: submissionId },
    data: { manualScore, totalScore: total },
  })
  return { ok: true }
}

export async function deleteExamAction(examId: string, password: string) {
  const session = await getManagementSession()
  if (!session) return { error: '未授權' }
  if (!(await validateManagementPassword(session, password))) return { error: '密碼錯誤' }

  const result = await prisma.exam.deleteMany({
    where: { id: examId, ownerKey: session.ownerKey },
  })
  if (result.count === 0) return { error: '找不到測驗' }
  return { ok: true }
}

export async function publishResultsAction(examId: string) {
  const session = await getManagementSession()
  if (!session) return { error: '未授權' }

  const result = await prisma.exam.updateMany({
    where: { id: examId, ownerKey: session.ownerKey },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  })
  if (result.count === 0) return { error: '找不到測驗' }
  return { ok: true }
}

export async function reopenExamAction(examId: string) {
  const session = await getManagementSession()
  if (!session) return { error: '未授權' }

  const result = await prisma.exam.updateMany({
    where: {
      id: examId,
      ownerKey: session.ownerKey,
      status: 'PUBLISHED',
    },
    data: { status: 'ACTIVE', publishedAt: null },
  })

  if (result.count === 0) return { error: '找不到可重新開啟的測驗' }
  return { ok: true }
}

// ── SavedList ──────────────────────────────────────────────────────────────────

export async function saveListAction(
  listName: string,
  authMode: string,
  members: MemberInput[]
) {
  const session = await getManagementSession()
  if (!session) return { error: '未授權' }
  if (!listName.trim()) return { error: '請輸入清單名稱' }
  if (members.length === 0) return { error: '成員清單不可為空' }

  // Upsert: 同名清單直接覆蓋
  const existing = await prisma.savedList.findUnique({
    where: { ownerKey_name: { ownerKey: session.ownerKey, name: listName.trim() } },
  })

  const memberData = members.map((m) => ({
    name: m.name.trim(),
    password: m.password?.trim() || null,
  }))

  let saved
  if (existing) {
    await prisma.savedListMember.deleteMany({ where: { savedListId: existing.id } })
    saved = await prisma.savedList.update({
      where: { id: existing.id },
      data: { authMode, members: { create: memberData } },
      include: { members: { select: { name: true, password: true } } },
    })
  } else {
    saved = await prisma.savedList.create({
      data: {
        adminUsername: session.username,
        ownerKey: session.ownerKey,
        name: listName.trim(),
        authMode,
        members: { create: memberData },
      },
      include: { members: { select: { name: true, password: true } } },
    })
  }

  return { ok: true, list: { id: saved.id, name: saved.name, authMode: saved.authMode, members: saved.members } }
}

export async function deleteSavedListAction(savedListId: string) {
  const session = await getManagementSession()
  if (!session) return { error: '未授權' }

  const result = await prisma.savedList.deleteMany({
    where: { id: savedListId, ownerKey: session.ownerKey },
  })
  if (result.count === 0) return { error: '找不到清單' }
  return { ok: true }
}

// ── QuestionBank ──────────────────────────────────────────────────────────────

export async function createBankAction(name: string, isShared = false) {
  const session = await getManagementSession()
  if (!session) return { error: '未授權' }
  if (!name.trim()) return { error: '請輸入題庫名稱' }

  const bank = await prisma.questionBank.upsert({
    where: { ownerKey_name: { ownerKey: session.ownerKey, name: name.trim() } },
    update: {},
    create: { adminUsername: session.username, ownerKey: session.ownerKey, name: name.trim(), isShared },
  })
  return { ok: true, bank }
}

export async function toggleBankSharedAction(bankId: string, isShared: boolean) {
  const session = await getManagementSession()
  if (!session) return { error: '未授權' }

  const result = await prisma.questionBank.updateMany({
    where: { id: bankId, ownerKey: session.ownerKey },
    data: { isShared },
  })
  if (result.count === 0) return { error: '題庫不存在' }
  return { ok: true }
}

export async function updateBankAction(
  bankId: string,
  params: { name: string; isShared: boolean }
) {
  const session = await getManagementSession()
  if (!session) return { error: '未授權' }
  if (!params.name.trim()) return { error: '請輸入題庫名稱' }

  const bank = await prisma.questionBank.findFirst({
    where: { id: bankId, ownerKey: session.ownerKey },
  })
  if (!bank) return { error: '題庫不存在' }

  try {
    const updated = await prisma.questionBank.update({
      where: { id: bankId },
      data: { name: params.name.trim(), isShared: params.isShared },
    })
    return { ok: true, bank: updated }
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2002') return { error: '題庫名稱已存在' }
    throw e
  }
}

export async function deleteBankAction(bankId: string, password: string) {
  const session = await getManagementSession()
  if (!session) return { error: '未授權' }
  if (!(await validateManagementPassword(session, password))) return { error: '密碼錯誤' }

  const result = await prisma.questionBank.deleteMany({
    where: { id: bankId, ownerKey: session.ownerKey },
  })
  if (result.count === 0) return { error: '題庫不存在' }
  return { ok: true }
}

// ── Question ──────────────────────────────────────────────────────────────────

export type OptionInput = { id: string; text: string; isCorrect: boolean }

export async function createQuestionAction(params: {
  bankId: string
  type: string
  text: string
  points: number
  isBonus: boolean
  options?: OptionInput[]
  gradingHint?: string
}) {
  const session = await getManagementSession()
  if (!session) return { error: '未授權' }
  if (!params.text.trim()) return { error: '請輸入題目內容' }

  // Verify the bank belongs to the current account
  const bank = await prisma.questionBank.findFirst({
    where: { id: params.bankId, ownerKey: session.ownerKey },
  })
  if (!bank) return { error: '題庫不存在' }

  const agg = await prisma.question.aggregate({
    where: { bankId: params.bankId },
    _max: { sortOrder: true },
  })
  const sortOrder = (agg._max.sortOrder ?? -1) + 1

  const q = await prisma.question.create({
    data: {
      bankId: params.bankId,
      type: params.type,
      text: params.text.trim(),
      points: params.points,
      isBonus: params.isBonus,
      options: params.options ?? undefined,
      gradingHint: params.gradingHint?.trim() || null,
      sortOrder,
    },
  })
  return { ok: true, question: q }
}

export async function updateQuestionAction(
  questionId: string,
  params: {
    type: string
    text: string
    points: number
    isBonus: boolean
    options?: OptionInput[]
    gradingHint?: string
  }
) {
  const session = await getManagementSession()
  if (!session) return { error: '未授權' }
  if (!params.text.trim()) return { error: '請輸入題目內容' }

  const existing = await prisma.question.findFirst({
    where: { id: questionId, bank: { ownerKey: session.ownerKey } },
  })
  if (!existing) return { error: '題目不存在' }

  const q = await prisma.question.update({
    where: { id: questionId },
    data: {
      type: params.type,
      text: params.text.trim(),
      points: params.points,
      isBonus: params.isBonus,
      options: params.options ?? undefined,
      gradingHint: params.gradingHint?.trim() || null,
    },
  })
  return { ok: true, question: q }
}

export async function updateQuestionOrdersAction(bankId: string, orderedIds: string[]) {
  const session = await getManagementSession()
  if (!session) return { error: '未授權' }

  const bank = await prisma.questionBank.findFirst({
    where: { id: bankId, ownerKey: session.ownerKey },
  })
  if (!bank) return { error: '題庫不存在' }

  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.question.updateMany({
        where: { id, bankId },
        data: { sortOrder: i },
      })
    )
  )
  return { ok: true }
}

export async function deleteQuestionAction(questionId: string) {
  const session = await getManagementSession()
  if (!session) return { error: '未授權' }

  const result = await prisma.question.deleteMany({
    where: { id: questionId, bank: { ownerKey: session.ownerKey } },
  })
  if (result.count === 0) return { error: '題目不存在' }
  return { ok: true }
}
