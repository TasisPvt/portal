import { Suspense } from "react"
import { ShieldCheck, Microscope, BadgeCheck, Check } from "lucide-react"
import Logo from "@/src/components/logo"
import { Card } from "@/src/components/ui/card"

const trustPills = [
   { icon: ShieldCheck, label: "Rooted in Faith" },
   { icon: Microscope, label: "Powered by Research" },
   { icon: BadgeCheck, label: "Committed to Integrity" },
]

const features = [
   "Trusted Shariah Compliance Screening for Stocks, Mutual Funds, ETFs, FOFs and IPOs across India's Capital Market.",
   "Research-driven screening",
   "Compliance monitoring",
   "Purging Solutions",
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
   return (
      <div className="relative min-h-dvh overflow-hidden bg-linear-to-br from-blue-600 via-blue-700 to-indigo-800">
         {/* Dot grid overlay */}
         <div className="auth-dot-grid absolute inset-0" />
         {/* Glow blobs */}
         <div className="absolute -left-24 top-12 size-96 rounded-full bg-white/5 blur-3xl" />
         <div className="absolute -right-20 bottom-12 size-80 rounded-full bg-indigo-400/15 blur-3xl" />

         <div className="container relative z-10 mx-auto grid min-h-dvh lg:grid-cols-2">
            {/* ── Brand panel (desktop only) ── */}
            <aside className="hidden flex-col justify-between p-12 lg:flex">
               {/* Headline + messaging */}
               <div className="my-auto max-w-lg animate-slide-up">
                  <Logo white priority width={88} height={100} className="justify-start" />
                  <h1 className="mt-5 font-heading text-2xl font-bold leading-tight text-white">
                     Where Ethical Investing Meets
                     <br />
                     Intelligent Research.
                  </h1>

                  <ul className="mt-5 flex flex-col gap-2.5">
                     {features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-blue-50">
                           <Check className="size-4 shrink-0 text-emerald-300" aria-hidden />
                           <span>{f}</span>
                        </li>
                     ))}
                  </ul>

                  <div className="mt-8 flex flex-wrap gap-2.5">
                     {trustPills.map(({ icon: Icon, label }) => (
                        <span
                           key={label}
                           className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm"
                        >
                           <Icon className="size-3.5" aria-hidden />
                           {label}
                        </span>
                     ))}
                  </div>
               </div>

               {/* Footer */}
               <p className="text-xs text-blue-200/60">
                  © {new Date().getFullYear()} Tasis Pvt Ltd. All rights reserved.
               </p>
            </aside>

            {/* ── Form panel ── */}
            <main className="flex flex-col items-center justify-center px-6 py-12">
               {/* Logo for mobile (no brand panel) */}
               <div className="mb-8 lg:hidden">
                  <Logo white priority width={64} height={72} />
               </div>

               <div className="w-full max-w-md">
                  <Card className="px-8 py-9">
                     <Suspense>{children}</Suspense>
                  </Card>

                  <p className="mt-8 text-center text-xs text-blue-100/70 lg:hidden">
                     © {new Date().getFullYear()} Tasis Pvt Ltd. All rights reserved.
                  </p>
               </div>
            </main>
         </div>
      </div>
   )
}
