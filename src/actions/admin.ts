'use server'

import { redirect } from 'next/navigation'
import {
  validateAdminCredentials,
  signAdminToken,
  setAdminCookie,
  clearAdminCookie,
  getAdminSession,
} from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calculateTotal } from '@/lib/scoring'

export type MemberInput = { name: string; password?: string }

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function loginAction(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  if (!validateAdminCredentials(username, password)) return { error: '帳號或密碼錯誤' }
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
  members: MemberInput[]
) {
  const session = await getAdminSession()
  if (!session) return { error: '未授權' }
  if (members.length === 0) return { error: '請至少輸入一位成員' }

  const exam = await prisma.exam.create({
    data: {
      adminUsername: session.username,
      authMode,
      passingScore,
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
  const session = await getAdminSession()
  if (!session) return { error: '未授權' }

  const submission = await prisma.submission.findUnique({ where: { id: submissionId } })
  if (!submission) return { error: '找不到作答記錄' }

  const total = calculateTotal(submission.autoScore, manualScore)
  await prisma.submission.update({
    where: { id: submissionId },
    data: { manualScore, totalScore: total },
  })
  return { ok: true }
}

export async function publishResultsAction(examId: string) {
  const session = await getAdminSession()
  if (!session) return { error: '未授權' }

  await prisma.exam.update({
    where: { id: examId },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  })
  return { ok: true }
}

// ── SavedList ──────────────────────────────────────────────────────────────────

export async function saveListAction(
  listName: string,
  authMode: string,
  members: MemberInput[]
) {
  const session = await getAdminSession()
  if (!session) return { error: '未授權' }
  if (!listName.trim()) return { error: '請輸入清單名稱' }
  if (members.length === 0) return { error: '成員清單不可為空' }

  // Upsert: 同名清單直接覆蓋
  const existing = await prisma.savedList.findUnique({
    where: { adminUsername_name: { adminUsername: session.username, name: listName.trim() } },
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
  const session = await getAdminSession()
  if (!session) return { error: '未授權' }

  await prisma.savedList.deleteMany({
    where: { id: savedListId, adminUsername: session.username },
  })
  return { ok: true }
}
