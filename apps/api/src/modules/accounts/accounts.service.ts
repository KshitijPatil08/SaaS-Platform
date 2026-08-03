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
      const isPostgres = process.env.DATABASE_URL?.startsWith('postgres')
      const searchFilter = isPostgres
        ? (term: string) => ({ contains: term, mode: 'insensitive' as const })
        : (term: string) => ({ contains: term })

      where.OR = [
        { name: searchFilter(query.search) },
        { email: searchFilter(query.search) },
      ]
    }
    return where
  },

  async getById(id: string, companyId: string) {
    return prisma.customer.findFirst({ where: { id, company_id: companyId } })
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

  async getEvents(customerId: string, companyId: string, limit = 50) {
    return prisma.event.findMany({
      where: { customer_id: customerId, company_id: companyId },
      orderBy: { occurred_at: 'desc' },
      take: limit,
    })
  },

  /**
   * Partially updates a customer record.
   * Always scopes the update to (id, company_id) to prevent cross-tenant writes.
   * Returns the updated record or null if not found.
   */
  async updateById(
    id: string,
    companyId: string,
    data: Partial<{
      name: string
      plan: string
      status: string
      mrr_cents: number
      billing_cycle: string
    }>
  ) {
    // First verify the customer belongs to this company (prevents cross-tenant writes)
    const exists = await prisma.customer.findFirst({
      where: { id, company_id: companyId },
      select: { id: true },
    })
    if (!exists) return null

    return prisma.customer.update({
      where: { id },
      data,
    })
  },
}
