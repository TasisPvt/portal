import { Suspense } from "react"
import { ShieldCheck, Scale, BarChart3 } from "lucide-react"
import { LoginForm } from "@/src/app/(auth)/login/_components/login-form"
import Logo from "@/src/components/logo"

const trustPills = [
   { icon: ShieldCheck, label: "Rooted in Faith" },
   { icon: Scale, label: "Shariah-Compliant" },
   { icon: BarChart3, label: "Data-Driven" },
]

export default function LoginPage() {
   return (
      <div className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
         {/* Dot grid overlay */}
         <div className="auth-dot-grid absolute inset-0" />
         {/* Glow blobs */}
         <div className="absolute -left-24 top-12 size-96 rounded-full bg-white/5 blur-3xl" />
         <div className="absolute -right-20 bottom-12 size-80 rounded-full bg-indigo-400/15 blur-3xl" />

         <div className="relative z-10 grid min-h-dvh lg:grid-cols-2">
            {/* ── Brand panel (desktop only) ── */}
            <aside className="hidden flex-col justify-between p-12 lg:flex">
               {/* Logo */}

               {/* Headline + messaging */}
               <div className="my-auto max-w-md animate-slide-up">
                 <Logo white priority width={88} height={100} className="justify-start" />
                  <h1 className="mt-5 font-heading text-4xl font-bold leading-tight text-white">
                     Halal Investing,
                     <br />
                     made simple.
                  </h1>
                  <p className="mt-4 text-base leading-relaxed text-blue-100/80">
                     Invest with confidence in a curated universe of
                     Shariah-compliant opportunities — transparent, ethical,
                     and built around your values.
                  </p>

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

               <div className="w-full max-w-sm">
                  <div className="rounded-2xl border border-white/40 bg-white/85 px-8 py-9 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-card/80">
                     <Suspense>
                        <LoginForm />
                     </Suspense>
                  </div>

                  <p className="mt-8 text-center text-xs text-blue-100/70 lg:hidden">
                     © {new Date().getFullYear()} Tasis Pvt Ltd. All rights reserved.
                  </p>
               </div>
            </main>
         </div>
      </div>
   )
}
