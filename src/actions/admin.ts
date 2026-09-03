'use server'

import { redirect } from 'next/navigation'
import { validateAdminCredentials, signAdminToken, setAdminCookie, clearAdminCookie, getAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calculateTotal } from '@/lib/scoring'

export async function loginAction(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!validateAdminCredentials(username, password)) {
    return { error: '帳號或密碼錯誤' }
  }

  const token = await signAdminToken(username)
  await setAdminCookie(token)
  redirect('/admin/dashboard')
}

export async function logoutAction() {
  await clearAdminCookie()
  redirect('/admin')
}

export async function createExamAction(formData: FormData) {
  const session = await getAdminSession()
  if (!session) redirect('/admin')

  const passingScore = parseInt(formData.get('passingScore') as string, 10)
  const membersRaw = formData.get('members') as string
  const names = membersRaw
    .split('\n')
    .map((n) => n.trim())
    .filter(Boolean)

  if (names.length === 0) return { error: '請至少輸入一位成員' }
  if (isNaN(passingScore) || passingScore < 0) return { error: '請輸入合法的合格分數' }

  const exam = await prisma.exam.create({
    data: {
      passingScore,
      members: { create: names.map((name) => ({ name })) },
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
