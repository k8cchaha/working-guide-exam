import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Jira Working Guide 測驗',
  description: '團隊 Jira 操作規範驗證測驗',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
