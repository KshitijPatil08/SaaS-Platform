import { prisma } from '../shared/lib/prisma'
import type { AccountsQuery } from './accounts.schema'

export interface PaginatedAccounts {
  data: unknown[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export const accountsService = {
  // Build the Prisma where-clause from validated query params
  buildWhere(query: AccountsQuery, companyId: string) {
    const where: Record<string, unknown> = { company_id: companyId }
    if (query.status) where.status = query.status
    if (query.plan) where.plan = query.plan
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ]
    }
    return where
  },

  async list(query: AccountsQuery, companyId: string): Promise<PaginatedAccounts> {
    const page = Math.max(1, query.page)
    const pageSize = Math.min(100, query.pageSize)
    const where = this.buildWhere(query, companyId)

    const [accounts, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
      prisma.customer.count({ where }),
    ])

    return {
      data: accounts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  },
}
