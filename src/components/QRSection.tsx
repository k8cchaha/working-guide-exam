'use client'

import { QRCodeSVG } from 'qrcode.react'

export default function QRSection({ examUrl }: { examUrl: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center gap-4">
      <h2 className="text-lg font-semibold self-start">QR Code</h2>
      <QRCodeSVG value={examUrl} size={180} />
      <p className="text-xs text-gray-500 text-center">掃描後可直接進入測驗頁面</p>
    </div>
  )
}
