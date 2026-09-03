import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { status: true, publishedAt: true },
  })
  if (!exam) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(exam)
}
