import crypto from 'crypto'
import { prisma } from './prisma'

const INSTANCE_ID = crypto.randomUUID()

export async function withJobLock<T>(
  name: string,
  ttlMs: number,
  task: () => Promise<T>,
): Promise<T | null> {
  const client = prisma as any
  const now = new Date()
  const lockedUntil = new Date(Date.now() + ttlMs)

  await client.jobLock.deleteMany({
    where: {
      name,
      locked_until: { lt: now },
    },
  })

  try {
    await client.jobLock.create({
      data: {
        name,
        owner_id: INSTANCE_ID,
        locked_until: lockedUntil,
      },
    })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return null
    }
    throw err
  }

  try {
    return await task()
  } finally {
    await client.jobLock.deleteMany({
      where: {
        name,
        owner_id: INSTANCE_ID,
      },
    })
  }
}
