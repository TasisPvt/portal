"use client"

import { Badge } from "@/src/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card"
import {
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  UsersIcon,
  ActivityIcon,
  BarChart3Icon,
} from "lucide-react"

const cards = [
  {
    label: "Total Revenue",
    value: "$1,250.00",
    trend: "+12.5%",
    trendUp: true,
    footer: "Trending up this month",
    sub: "Visitors for the last 6 months",
    icon: DollarSignIcon,
    iconBg: "bg-blue-100 dark:bg-blue-950",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    label: "New Customers",
    value: "1,234",
    trend: "-20%",
    trendUp: false,
    footer: "Down 20% this period",
    sub: "Acquisition needs attention",
    icon: UsersIcon,
    iconBg: "bg-violet-100 dark:bg-violet-950",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    label: "Active Accounts",
    value: "45,678",
    trend: "+12.5%",
    trendUp: true,
    footer: "Strong user retention",
    sub: "Engagement exceeds targets",
    icon: ActivityIcon,
    iconBg: "bg-emerald-100 dark:bg-emerald-950",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "Growth Rate",
    value: "4.5%",
    trend: "+4.5%",
    trendUp: true,
    footer: "Steady performance increase",
    sub: "Meets growth projections",
    icon: BarChart3Icon,
    iconBg: "bg-amber-100 dark:bg-amber-950",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
]

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="@container/card">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                <card.icon className={`size-5 ${card.iconColor}`} />
              </div>
              <CardAction>
                <Badge
                  variant="outline"
                  className={
                    card.trendUp
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                      : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
                  }
                >
                  {card.trendUp
                    ? <TrendingUpIcon className="size-3" />
                    : <TrendingDownIcon className="size-3" />
                  }
                  {card.trend}
                </Badge>
              </CardAction>
            </div>
            <CardDescription className="mt-3">{card.label}</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums @[250px]/card:text-3xl">
              {card.value}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-sm">
            <div className="flex items-center gap-1.5 font-medium">
              {card.footer}
              {card.trendUp
                ? <TrendingUpIcon className="size-3.5 text-emerald-500" />
                : <TrendingDownIcon className="size-3.5 text-red-500" />
              }
            </div>
            <div className="text-muted-foreground">{card.sub}</div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
