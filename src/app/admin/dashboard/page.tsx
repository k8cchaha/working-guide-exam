import { getAdminSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { logoutAction } from '@/actions/admin'
import { Exam, ExamStatus } from '@prisma/client'
import Link from 'next/link'
import CreateExamForm from '@/components/CreateExamForm'

type ExamWithCount = Exam & { _count: { members: number; submissions: number } }

export default async function DashboardPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin')

  const exams: ExamWithCount[] = await prisma.exam.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { members: true, submissions: true } } },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-indigo-700">Jira 考試系統｜Admin</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">👤 {session.username}</span>
          <form action={logoutAction}>
            <button className="text-sm text-red-500 hover:underline">登出</button>
          </form>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">建立新考試</h2>
          <CreateExamForm />
        </section>

        {exams.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">歷史考試</h2>
            <div className="space-y-3">
              {exams.map((exam: ExamWithCount) => (
                <Link
                  key={exam.id}
                  href={`/admin/dashboard/${exam.id}`}
                  className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="font-medium text-gray-800">考試 — 合格 {exam.passingScore} 分</p>
                    <p className="text-sm text-gray-500">
                      {new Date(exam.createdAt).toLocaleString('zh-TW')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                        exam.status === ExamStatus.PUBLISHED
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {exam.status === ExamStatus.PUBLISHED ? '已發佈' : '進行中'}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      {exam._count.submissions} / {exam._count.members} 人已交卷
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
