import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Clean existing seed data
  await prisma.churnEvent.deleteMany({})
  await prisma.healthScore.deleteMany({})
  await prisma.event.deleteMany({})
  await prisma.mRRSnapshot.deleteMany({})
  await prisma.subscription.deleteMany({})
  await prisma.customer.deleteMany({})
  await prisma.adminUser.deleteMany({})
  await prisma.company.deleteMany({})

  console.log('Seeding fresh demo data…')

  const company = await prisma.company.create({
    data: {
      name: 'Acme SaaS Corp',
      stripe_id: 'cus_demo_acme',
      admins: {
        create: {
          email: 'admin@pulse.example',
          password_hash: await bcrypt.hash('changeme123', 12),
        },
      },
    },
  })

  // Create 20 realistic customer accounts
  const plans = ['starter', 'pro', 'enterprise'] as const
  const statuses = ['active', 'active', 'active', 'active', 'trialing', 'past_due', 'canceled'] as const
  const mrrMap = { starter: 4900, pro: 14900, enterprise: 49900 }

  const customerNames = [
    'TechFlow Solutions', 'Vortex Analytics', 'Hyperion Cloud', 'Pulse Labs', 'Nova Dynamics',
    'Apex Systems', 'Stratum Digital', 'Nexus Software', 'Zenith Global', 'Beacon Tech',
    'Catalyst Media', 'Prism Operations', 'Orbit Networks', 'Vanguard Data', 'Summit Interactive',
    'Echo Studios', 'Quantum Labs', 'Horizon Media', 'Velocity Works', 'Frontier AI',
  ]

  const createdCustomers = []
  for (let i = 0; i < customerNames.length; i++) {
    const name = customerNames[i]
    const plan = plans[i % plans.length]
    const status = statuses[i % statuses.length]
    const mrr_cents = status === 'canceled' ? 0 : mrrMap[plan]

    const cust = await prisma.customer.create({
      data: {
        company_id: company.id,
        external_id: `cus_${i + 100}`,
        email: `contact@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.io`,
        name,
        plan,
        status,
        mrr_cents,
        billing_cycle: i % 4 === 0 ? 'yearly' : 'monthly',
        trial_ends_at: status === 'trialing' ? new Date(Date.now() + 7 * 86400000) : null,
      },
    })
    createdCustomers.push(cust)
  }

  // Create Health Scores for all 20 customers (14 healthy >= 70, 4 at-risk 40-69, 2 critical < 40)
  const healthScores = [95, 92, 88, 85, 84, 82, 80, 78, 76, 75, 74, 72, 71, 70, 62, 55, 48, 42, 32, 25]
  for (let i = 0; i < createdCustomers.length; i++) {
    const cust = createdCustomers[i]
    const score = healthScores[i]
    await prisma.healthScore.create({
      data: {
        company_id: company.id,
        customer_id: cust.id,
        score,
        signals: JSON.stringify({
          dailyActiveUsers: Math.floor(score * 1.5),
          loginFrequency: score > 70 ? 'daily' : 'weekly',
          supportTickets: score < 40 ? 5 : 1,
          npsScore: Math.min(10, Math.floor(score / 10)),
        }),
      },
    })
  }

  // Create Funnel Events (visitor, signup, activation, trial_started, subscription_created)
  console.log('Seeding funnel events…')
  const eventCounts = [
    { name: 'visitor', count: 4250 },
    { name: 'signup', count: 840 },
    { name: 'activation', count: 510 },
    { name: 'trial_started', count: 290 },
    { name: 'subscription_created', count: 135 },
  ]

  for (const item of eventCounts) {
    const batch = Array.from({ length: item.count }).map((_, i) => ({
      company_id: company.id,
      name: item.name,
      occurred_at: new Date(Date.now() - Math.floor(Math.random() * 30 * 86400000)),
      properties: JSON.stringify({ source: 'organic_search', campaign: 'saas_growth' }),
    }))
    // Create in chunks of 500 to prevent query parameter limits
    for (let c = 0; c < batch.length; c += 500) {
      await prisma.event.createMany({
        data: batch.slice(c, c + 500),
      })
    }
  }

  // Create 12 Months of MRR Snapshots
  const today = new Date()
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today)
    date.setMonth(date.getMonth() - i)
    date.setUTCHours(0, 0, 0, 0)

    const baseMrr = 450000 + (11 - i) * 35000  // Growth from $4.5k to $8.35k
    await prisma.mRRSnapshot.create({
      data: {
        company_id: company.id,
        date,
        mrr_cents: baseMrr,
        new_mrr_cents: 35000,
        customer_count: 14 + (11 - i),
      },
    })
  }

  // Create 2 recent Churn Events (within last 30 days)
  const churnedCusts = createdCustomers.filter(c => c.status === 'canceled')
  for (const c of churnedCusts) {
    await prisma.churnEvent.create({
      data: {
        company_id: company.id,
        customer_id: c.id,
        mrr_lost_cents: 14900,
        reason: 'Price sensitivity / downgraded',
        churned_at: new Date(Date.now() - 10 * 86400000),
      },
    })
  }

  console.log(`✅ Seed completed successfully! Company ID: ${company.id}`)
  console.log(`🔑 Login Credentials: admin@pulse.example / changeme123`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
