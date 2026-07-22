import { MessageSquareIcon, LightbulbIcon, ShieldCheckIcon } from "lucide-react"

import { SiteHeader } from "@/src/components/site-header"
import { Card } from "@/src/components/ui/card"
import { FeedbackForm } from "./_components/feedback-form"

const INFO_CARDS = [
   {
      icon: MessageSquareIcon,
      title: "Share Your Feedback",
      desc: "Help us understand your experience.",
      iconClass: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
   },
   {
      icon: LightbulbIcon,
      title: "Suggest Improvements",
      desc: "Your ideas help us serve you better.",
      iconClass: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
   },
   {
      icon: ShieldCheckIcon,
      title: "We Take Action",
      desc: "We review every submission seriously.",
      iconClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
   },
]

export default function FeedbackPage() {
   return (
      <>
         <SiteHeader title="Support" />
         <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            {/* ── Hero ── */}
            <Card className="relative overflow-hidden border-primary/10 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
               <div className="absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
               <div className="relative px-6 py-6 sm:px-8">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                     We&apos;d Love to Hear <span className="text-primary">From You</span>
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                     Your feedback helps us improve our service and provide you with a better experience.
                  </p>
               </div>
            </Card>

            {/* ── Info cards ── */}
            <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
               {INFO_CARDS.map(({ icon: Icon, title, desc, iconClass }) => (
                  <Card key={title} size="sm">
                     <div className="flex items-center gap-3 px-4">
                        <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
                           <Icon className="size-5" />
                        </span>
                        <div className="min-w-0">
                           <p className="text-sm font-semibold">{title}</p>
                           <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                     </div>
                  </Card>
               ))}
            </div>

            {/* ── Form ── */}
            <FeedbackForm />
         </div>
      </>
   )
}
