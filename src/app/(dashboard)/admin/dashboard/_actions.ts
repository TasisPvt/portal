import "server-only"

import { and, count, eq, gte, lt, sum, sql } from "drizzle-orm"

import { db } from "@/src/db/client"
import { user, subscription, payment, pricingPlan } from "@/src/db/schema"
import { MONTHS_SHORT } from "@/src/lib/format"

export type ByPlanType = { list: number; snapshot: number }

export type ClientShare = { id: string; name: string; total: number; share: number }

// Top-5 clients + the remainder, for one timeframe.
export type ClientDistribution = {
   periodTotal: number
   clients: ClientShare[]
   othersTotal: number
   othersShare: number
}

export type TopClientsByPeriod = {
   overall: ClientDistribution
   currentMonth: ClientDistribution
   lastMonth: ClientDistribution
}

export type TrendPoint = { label: string; total: number }

export type ClientsGrowth = {
   lastMonthTotal: number
   pct: number | null
}

export type AdminDashboardData = {
   totalClients: number
   clientsGrowth: ClientsGrowth
   clientsTrend: TrendPoint[]
   adminUsers: number
   subscriptionsThisMonth: ByPlanType
   revenueThisMonth: ByPlanType
   topClients: TopClientsByPeriod
}

function intoByType(rows: { type: string | null; value: number }[]): ByPlanType {
   const out: ByPlanType = { list: 0, snapshot: 0 }
   for (const r of rows) {
      if (r.type === "list" || r.type === "snapshot") out[r.type] = r.value
   }
   return out
}

// Top-5 paid-revenue clients for an optional date range (omit = all-time).
async function clientDistribution(range?: { start: Date; end: Date }): Promise<ClientDistribution> {
   const base = eq(payment.status, "paid")
   const where = range
      ? and(base, gte(payment.createdAt, range.start), lt(payment.createdAt, range.end))
      : base

   const [totalRow, topRows] = await Promise.all([
      db.select({ value: sum(payment.amount) }).from(payment).where(where),
      db
         .select({ id: user.id, name: user.name, total: sum(payment.amount) })
         .from(payment)
         .innerJoin(user, eq(payment.clientId, user.id))
         .where(where)
         .groupBy(user.id, user.name)
         .orderBy(sql`sum(${payment.amount}) desc`)
         .limit(5),
   ])

   const periodTotal = Number(totalRow[0]?.value ?? 0) / 100
   const clients = topRows.map((r) => {
      const total = Number(r.total ?? 0) / 100
      return { id: r.id, name: r.name, total, share: periodTotal > 0 ? (total / periodTotal) * 100 : 0 }
   })
   const top5Sum = clients.reduce((a, c) => a + c.total, 0)
   const othersTotal = Math.max(periodTotal - top5Sum, 0)
   const othersShare = periodTotal > 0 ? (othersTotal / periodTotal) * 100 : 0

   return { periodTotal, clients, othersTotal, othersShare }
}

// Cumulative total clients at the end of each of the last 6 months.
async function clientsTrend(now: Date): Promise<TrendPoint[]> {
   const rows = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
         const k = 5 - i
         const end = new Date(now.getFullYear(), now.getMonth() - k + 1, 1)
         return db
            .select({ value: count() })
            .from(user)
            .where(and(eq(user.userType, "client"), lt(user.createdAt, end)))
      }),
   )
   return rows.map((row, i) => {
      const k = 5 - i
      const labelDate = new Date(now.getFullYear(), now.getMonth() - k, 1)
      return { label: MONTHS_SHORT[labelDate.getMonth()], total: row[0]?.value ?? 0 }
   })
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
   const now = new Date()
   const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
   const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
   const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

   const [base, dists, trend] = await Promise.all([
      Promise.all([
         db.select({ value: count() }).from(user).where(eq(user.userType, "client")),
         db
            .select({ value: count() })
            .from(user)
            .where(and(eq(user.userType, "client"), gte(user.createdAt, monthStart), lt(user.createdAt, monthEnd))),
         db.select({ value: count() }).from(user).where(eq(user.userType, "admin")),
         db
            .select({ type: pricingPlan.type, value: count() })
            .from(subscription)
            .innerJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
            .where(and(gte(subscription.startDate, monthStart), lt(subscription.startDate, monthEnd)))
            .groupBy(pricingPlan.type),
         db
            .select({ type: pricingPlan.type, value: sum(payment.amount) })
            .from(payment)
            .innerJoin(pricingPlan, eq(payment.planId, pricingPlan.id))
            .where(and(eq(payment.status, "paid"), gte(payment.createdAt, monthStart), lt(payment.createdAt, monthEnd)))
            .groupBy(pricingPlan.type),
      ]),
      Promise.all([
         clientDistribution(),
         clientDistribution({ start: monthStart, end: monthEnd }),
         clientDistribution({ start: prevMonthStart, end: monthStart }),
      ]),
      clientsTrend(now),
   ])

   const [clientsRow, newThisMonthRow, adminsRow, subRows, revRows] = base
   const [overall, currentMonth, lastMonth] = dists

   const totalClients = clientsRow[0]?.value ?? 0
   const newThisMonth = newThisMonthRow[0]?.value ?? 0
   const lastMonthTotal = totalClients - newThisMonth
   const pct = lastMonthTotal === 0 ? null : (newThisMonth / lastMonthTotal) * 100

   return {
      totalClients,
      clientsGrowth: { lastMonthTotal, pct },
      clientsTrend: trend,
      adminUsers: adminsRow[0]?.value ?? 0,
      subscriptionsThisMonth: intoByType(subRows.map((r) => ({ type: r.type, value: Number(r.value) }))),
      revenueThisMonth: intoByType(revRows.map((r) => ({ type: r.type, value: Number(r.value ?? 0) / 100 }))),
      topClients: { overall, currentMonth, lastMonth },
   }
}
