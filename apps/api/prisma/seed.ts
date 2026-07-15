import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const company = await prisma.company.create({
    data: {
      name: 'Demo Company',
      stripe_id: 'cus_demo',
      admins: {
        create: {
          email: 'admin@pulse.example',
          password_hash: await bcrypt.hash('changeme123', 12),
        },
      },
      customers: {
        create: Array.from({ length: 20 }).map((_, i) => ({
          external_id: `cus_${i}`,
          email: `user${i}@example.com`,
          name: `Customer ${i}`,
          plan: ['starter', 'pro', 'enterprise'][i % 3],
          status: ['active', 'active', 'trialing', 'past_due', 'canceled'][i % 5],
          mrr_cents: [4900, 14900, 49900][i % 3],
          billing_cycle: 'monthly',
        })),
      },
    },
  })

  const today = new Date()
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today)
    date.setMonth(date.getMonth() - i)
    await prisma.mRRSnapshot.create({
      data: {
        company_id: company.id,
        date,
        mrr_cents: 40000 + (11 - i) * 3000,
        new_mrr_cents: 3000,
        customer_count: 20,
      },
    })
  }

  console.log('Seed data created for company', company.id)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
