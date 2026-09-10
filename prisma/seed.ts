import { PrismaClient } from '@prisma/client'
import { QUESTIONS } from '../src/lib/questions'

const prisma = new PrismaClient()

async function main() {
  const ADMIN = 'admin'
  const BANK_NAME = 'Jira 工作指南'

  const bank = await prisma.questionBank.upsert({
    where: { adminUsername_name: { adminUsername: ADMIN, name: BANK_NAME } },
    update: {},
    create: {
      adminUsername: ADMIN,
      name: BANK_NAME,
      isShared: false,
      questionOrder: 'random',
    },
  })

  console.log(`題庫「${bank.name}」(${bank.id})`)

  const existing = await prisma.question.count({ where: { bankId: bank.id } })
  if (existing > 0) {
    console.log(`已有 ${existing} 道題目，跳過匯入`)
    return
  }

  await prisma.question.createMany({
    data: QUESTIONS.map((q) => ({
      bankId: bank.id,
      type: q.type,
      text: q.text,
      points: q.points,
      isBonus: q.isBonus,
      options: q.options ?? undefined,
      gradingHint: q.gradingHint ?? null,
    })),
  })

  console.log(`已匯入 ${QUESTIONS.length} 道題目`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
