import { getAdminSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { getAvatarById } from '@/lib/avatars'
import { QUESTIONS, Question, Option } from '@/lib/questions'
import { computeWrongStats } from '@/lib/wrongStats'
import { logoutAction } from '@/actions/admin'
import { ExamStatus, Member, Submission } from '@prisma/client'
import Link from 'next/link'
import QRSection from '@/components/QRSection'
import GradeForm from '@/components/GradeForm'
import PublishButton from '@/components/PublishButton'

type MemberWithSubmission = Member & { submission: Submission | null }

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>
}) {
  const session = await getAdminSession()
  if (!session) redirect('/admin')

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

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const examUrl = `${baseUrl}/exam/${examId}`

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

  const saQuestion = questions.find((q) => q.type === 'short_answer')

  const membersWithSubs = exam.members.filter(
    (m: MemberWithSubmission) => m.submission
  ) as (MemberWithSubmission & { submission: Submission })[]

  const wrongStatsCount = computeWrongStats(
    questions,
    membersWithSubs.map((m) => ({
      id: m.id,
      name: m.name,
      answers: m.submission.answers as Record<string, string | string[]>,
    }))
  ).length

  const passedCount = membersWithSubs.filter(
    (m) => (m.submission.totalScore ?? m.submission.autoScore) >= exam.passingScore
  ).length
  const failedCount = membersWithSubs.length - passedCount
  const averageScore =
    membersWithSubs.length > 0
      ? membersWithSubs.reduce(
          (sum, m) => sum + (m.submission.totalScore ?? m.submission.autoScore),
          0
        ) / membersWithSubs.length
      : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="text-indigo-600 hover:underline text-sm">
            ← 返回
          </Link>
          <h1 className="text-lg font-bold text-indigo-700">測驗管理</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">👤 {session.username}</span>
          <form action={logoutAction}>
            <button className="text-sm text-red-500 hover:underline">登出</button>
          </form>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* 測驗資訊 + QR Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
            <h2 className="text-lg font-semibold">測驗資訊</h2>
            <p className="text-sm text-gray-600">合格分數：<strong>{exam.passingScore} 分</strong></p>
            <p className="text-sm text-gray-600">
              狀態：
              <span
                className={`ml-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                  exam.status === ExamStatus.PUBLISHED
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {exam.status === ExamStatus.PUBLISHED ? '已發佈' : '進行中'}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              已交卷：{exam.members.filter((m: MemberWithSubmission) => m.submission).length} / {exam.members.length} 人
            </p>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-1">測驗連結</p>
              <code className="block bg-gray-100 rounded px-3 py-2 text-xs break-all">{examUrl}</code>
            </div>
          </div>
          <QRSection examUrl={examUrl} />
        </div>

        {/* 成員狀態 & 批改 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">成員答題狀態</h2>
          <div className="space-y-4">
            {exam.members.map((member: MemberWithSubmission) => {
              const sub = member.submission
              const avatar = sub ? getAvatarById(sub.avatarId) : null
              return (
                <div key={member.id} className="border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{avatar?.emoji ?? '❓'}</span>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-gray-500">
                          {sub
                            ? `交卷時間：${new Date(sub.submittedAt).toLocaleString('zh-TW')}`
                            : '尚未作答'}
                        </p>
                      </div>
                    </div>
                    {sub && (
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          選擇題自動得分：<strong>{sub.autoScore}</strong>
                        </p>
                        <p className="text-sm text-gray-600">
                          問答題：
                          <strong>
                            {sub.manualScore != null ? `${sub.manualScore} 分` : '待評分'}
                          </strong>
                        </p>
                        <p className="text-sm font-semibold text-indigo-700">
                          總分：{sub.totalScore ?? sub.autoScore}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 問答題批改 */}
                  {sub && saQuestion && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-600 mb-1">
                        {saQuestion.text}
                      </p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap mb-2">
                        {(sub.answers as Record<string, string>)[saQuestion.id] || '（未作答）'}
                      </p>
                      {saQuestion.gradingHint && (
                        <details className="text-xs text-gray-500 mb-2">
                          <summary className="cursor-pointer hover:text-gray-700">查看評分參考</summary>
                          <pre className="mt-1 whitespace-pre-wrap text-gray-600 font-sans">
                            {saQuestion.gradingHint}
                          </pre>
                        </details>
                      )}
                      {exam.status !== ExamStatus.PUBLISHED && (
                        <GradeForm
                          submissionId={sub.id}
                          currentScore={sub.manualScore}
                          maxScore={saQuestion.points}
                          examId={examId}
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 發佈成績 */}
        {exam.status !== ExamStatus.PUBLISHED && (
          <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">發佈成績</h2>
              <p className="text-sm text-gray-500">發佈後所有成員頁面將顯示排名，且無法再修改分數</p>
            </div>
            <PublishButton examId={examId} />
          </div>
        )}

        {/* 已發佈 */}
        {exam.status === ExamStatus.PUBLISHED && (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-green-600">✅ 成績已發佈</h2>
                <p className="text-sm mt-1">
                  合格數：<strong className="text-green-600">{passedCount}</strong>
                  <span className="mx-2 text-gray-300">|</span>
                  不合格數：<strong className="text-red-600">{failedCount}</strong>
                  <span className="mx-2 text-gray-300">|</span>
                  平均分數：<strong className="text-indigo-700">{averageScore.toFixed(1)}</strong>
                </p>
              </div>
              <Link
                href={`/exam/${examId}/result`}
                target="_blank"
                className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
              >
                前往排名 ↗
              </Link>
            </div>

            {/* 答錯狀況統計 */}
            <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">答錯狀況統計</h2>
                <p className="text-sm text-gray-500">
                  {wrongStatsCount === 0
                    ? '🎉 所有人都答對了每一題！'
                    : `共 ${wrongStatsCount} 題有人答錯，可篩選特定成員並分享連結給對方檢討`}
                </p>
              </div>
              <Link
                href={`/exam/${examId}/wrong-stats`}
                target="_blank"
                className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
              >
                查看統計 ↗
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
