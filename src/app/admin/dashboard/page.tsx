import { getAdminSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { logoutAction } from '@/actions/admin'
import { SavedList, SavedListMember } from '@prisma/client'
import CreateExamForm from '@/components/CreateExamForm'
import BankManagerPanel from '@/components/BankManagerPanel'
import ExamList from '@/components/ExamList'
import type { SavedListData, BankSummary } from '@/components/CreateExamForm'

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
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    }),
  ])

  type SavedListWithMembers = SavedList & { members: Pick<SavedListMember, 'name' | 'password'>[] }
  const savedListsData: SavedListData[] = savedLists.map((l: SavedListWithMembers) => ({
    id: l.id,
    name: l.name,
    authMode: l.authMode,
    members: l.members,
  }))

  const banksData: BankSummary[] = banks.map((b) => ({
    id: b.id,
    name: b.name,
    questionCount: b.questions.length,
    adminUsername: b.adminUsername,
    totalScore: b.questions.filter((q) => !q.isBonus).reduce((sum, q) => sum + q.points, 0),
    hasBonus: b.questions.some((q) => q.isBonus),
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
            <CreateExamForm savedLists={savedListsData} banks={banksData} />
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
            <ExamList exams={exams} />
          </section>
        )}
      </div>
    </div>
  )
}
