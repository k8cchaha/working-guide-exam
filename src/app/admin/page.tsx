import { getManagementSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LoginPanel from '@/components/LoginPanel'

export default async function AdminLoginPage() {
  const session = await getManagementSession()
  if (session) redirect('/admin/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <LoginPanel />
    </div>
  )
}
