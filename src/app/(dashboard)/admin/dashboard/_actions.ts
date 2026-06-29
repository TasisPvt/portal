import "server-only"

import { and, count, eq, gte, lt, sum, sql } from "drizzle-orm"

import { db } from "@/src/db/client"
import { user, subscription, payment, pricingPlan } from "@/src/db/schema"
import { MONTHS_SHORT } from "@/src/lib/format"

export type ByPlanType = { list: number; snapshot: number }

export type ClientShare = { id: string; name: string; total: number; share: number }

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

// Revenue per month, split by plan type. month = "YYYY-MM", amounts in rupees.
export type MonthlyRevenue = { month: string; list: number; snapshot: number }

export type AdminDashboardData = {
   totalClients: number
   customersThisMonth: number
   customersLastMonth: number
   clientsTrend: TrendPoint[]
   revenueMonthly: MonthlyRevenue[]
   subscriptionsThisMonth: ByPlanType
   subscriptionsLastMonthTotal: number
   topClients: TopClientsByPeriod
}

function intoByType(rows: { type: string | null; value: number }[]): ByPlanType {
   const out: ByPlanType = { list: 0, snapshot: 0 }
   for (const r of rows) {
      if (r.type === "list" || r.type === "snapshot") out[r.type] = r.value
   }
   return out
}

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

async function monthlyRevenue(): Promise<MonthlyRevenue[]> {
   const monthExpr = sql<string>`to_char(${payment.createdAt}, 'YYYY-MM')`
   const rows = await db
      .select({ month: monthExpr, type: pricingPlan.type, value: sum(payment.amount) })
      .from(payment)
      .innerJoin(pricingPlan, eq(payment.planId, pricingPlan.id))
      .where(eq(payment.status, "paid"))
      .groupBy(monthExpr, pricingPlan.type)
      .orderBy(monthExpr)

   const byMonth = new Map<string, MonthlyRevenue>()
   for (const r of rows) {
      const m = byMonth.get(r.month) ?? { month: r.month, list: 0, snapshot: 0 }
      const amount = Number(r.value ?? 0) / 100
      if (r.type === "list") m.list += amount
      else if (r.type === "snapshot") m.snapshot += amount
      byMonth.set(r.month, m)
   }
   return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month))
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
   const now = new Date()
   const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
   const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
   const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

   const [base, dists, trend, revMonthly] = await Promise.all([
      Promise.all([
         db.select({ value: count() }).from(user).where(eq(user.userType, "client")),
         db
            .select({ value: count() })
            .from(user)
            .where(and(eq(user.userType, "client"), gte(user.createdAt, monthStart), lt(user.createdAt, monthEnd))),
         db
            .select({ value: count() })
            .from(user)
            .where(and(eq(user.userType, "client"), gte(user.createdAt, prevMonthStart), lt(user.createdAt, monthStart))),
         db
            .select({ type: pricingPlan.type, value: count() })
            .from(subscription)
            .innerJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
            .where(and(gte(subscription.startDate, monthStart), lt(subscription.startDate, monthEnd)))
            .groupBy(pricingPlan.type),
         db
            .select({ value: count() })
            .from(subscription)
            .where(and(gte(subscription.startDate, prevMonthStart), lt(subscription.startDate, monthStart))),
      ]),
      Promise.all([
         clientDistribution(),
         clientDistribution({ start: monthStart, end: monthEnd }),
         clientDistribution({ start: prevMonthStart, end: monthStart }),
      ]),
      clientsTrend(now),
      monthlyRevenue(),
   ])

   const [clientsRow, newThisMonthRow, newPrevMonthRow, subRows, subPrevRow] = base
   const [overall, currentMonth, lastMonth] = dists

   return {
      totalClients: clientsRow[0]?.value ?? 0,
      customersThisMonth: newThisMonthRow[0]?.value ?? 0,
      customersLastMonth: newPrevMonthRow[0]?.value ?? 0,
      clientsTrend: trend,
      revenueMonthly: revMonthly,
      subscriptionsThisMonth: intoByType(subRows.map((r) => ({ type: r.type, value: Number(r.value) }))),
      subscriptionsLastMonthTotal: subPrevRow[0]?.value ?? 0,
      topClients: { overall, currentMonth, lastMonth },
   }
}
