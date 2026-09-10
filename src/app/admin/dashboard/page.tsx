import { getAdminSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { logoutAction } from '@/actions/admin'
import { ExamStatus, Exam, SavedList, SavedListMember } from '@prisma/client'
import Link from 'next/link'
import CreateExamForm from '@/components/CreateExamForm'
import BankManagerPanel from '@/components/BankManagerPanel'
import type { SavedListData } from '@/components/CreateExamForm'

export default async function DashboardPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin')

  const [exams, savedLists, banks] = await Promise.all([
    prisma.exam.findMany({
      where: { adminUsername: session.username },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true, submissions: true } } },
    }),
    prisma.savedList.findMany({
      where: { adminUsername: session.username },
      orderBy: { createdAt: 'desc' },
      include: { members: { select: { name: true, password: true } } },
    }),
    prisma.questionBank.findMany({
      where: { OR: [{ adminUsername: session.username }, { isShared: true }] },
      orderBy: { createdAt: 'desc' },
      include: { questions: { orderBy: { createdAt: 'asc' } } },
    }),
  ])

  type SavedListWithMembers = SavedList & { members: Pick<SavedListMember, 'name' | 'password'>[] }
  const savedListsData: SavedListData[] = savedLists.map((l: SavedListWithMembers) => ({
    id: l.id,
    name: l.name,
    authMode: l.authMode,
    members: l.members,
  }))


  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-indigo-700">測驗系統｜Admin</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">👤 {session.username}</span>
          <form action={logoutAction}>
            <button className="text-sm text-red-500 hover:underline">登出</button>
          </form>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-6 space-y-8">

        {/* 並排：建立新測驗 + 建立新考題 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">建立新測驗</h2>
            <CreateExamForm savedLists={savedListsData} />
          </section>

          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">題庫管理</h2>
            <BankManagerPanel banks={banks} currentAdmin={session.username} />
          </section>
        </div>

        {/* 我的測驗 */}
        {exams.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">我的測驗</h2>
            <div className="space-y-3">
              {exams.map((exam: Exam & { _count: { members: number; submissions: number } }) => (
                <Link
                  key={exam.id}
                  href={`/admin/dashboard/${exam.id}`}
                  className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="font-medium text-gray-800">
                      測驗 — 合格 {exam.passingScore} 分
                      <span className="ml-2 text-xs text-gray-400">
                        {exam.authMode === 'NAME_PASSWORD' ? '🔑 密碼驗證' : exam.authMode === 'GOOGLE' ? '🔒 Google' : ''}
                      </span>
                    </p>
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
