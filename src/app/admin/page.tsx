import { getAdminSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminLoginForm from '@/components/AdminLoginForm'

export default async function AdminLoginPage() {
  const session = await getAdminSession()
  if (session) redirect('/admin/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2 text-indigo-700">Admin 登入</h1>
        <p className="text-sm text-center text-gray-500 mb-6">Jira Working Guide 測驗系統</p>
        <AdminLoginForm />
      </div>
    </div>
  )
}
