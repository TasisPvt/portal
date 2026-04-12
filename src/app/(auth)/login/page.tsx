import { Suspense } from "react"
import { LoginForm } from "@/src/app/(auth)/login/_components/login-form"
import Logo from "@/src/components/logo"
import { ShieldCheckIcon, ZapIcon, UsersIcon } from "lucide-react"

const features = [
   {
      icon: ZapIcon,
      title: "Real-time Operations",
      description: "Monitor and manage your team's activity as it happens.",
   },
   {
      icon: UsersIcon,
      title: "Team Collaboration",
      description: "Assign tasks, track progress, and keep everyone aligned.",
   },
   {
      icon: ShieldCheckIcon,
      title: "Secure & Compliant",
      description: "Enterprise-grade security with full audit trail support.",
   },
]

export default function LoginPage() {
   return (
      <div className="flex min-h-screen bg-background">
         {/* ── Left: form panel ── */}
         <div className="flex flex-1 flex-col justify-between p-8 lg:p-12">
            <Logo />

            <Suspense>
               <LoginForm />
            </Suspense>

            <p className="text-center text-sm text-muted-foreground sm:text-left">
               © {new Date().getFullYear()} Tasis Pvt Ltd. All rights reserved.
            </p>
         </div>

         {/* ── Right: decorative panel ── */}
         <div className="relative m-3 hidden overflow-hidden rounded-xl lg:flex lg:flex-1">
            {/* Layered background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
            <div className="auth-dot-grid absolute inset-0" />
            {/* Soft glow blobs */}
            <div className="absolute -right-20 -top-20 size-80 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 size-72 rounded-full bg-indigo-400/20 blur-3xl" />

            {/* Content */}
            <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16">
               {/* Top logo mark */}
               {/* <div className="flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <div className="grid grid-cols-2 gap-0.5">
                     {[...Array(4)].map((_, i) => (
                        <div key={i} className="size-1.5 rounded-[2px] bg-white" />
                     ))}
                  </div>
               </div> */}

               {/* Hero copy */}
               <div className="animate-fade-in">
                  <h2 className="mb-4 text-4xl font-bold leading-tight text-white xl:text-5xl">
                     Effortlessly manage your team and operations.
                  </h2>
                  <p className="mb-10 text-lg leading-relaxed text-blue-100">
                     Log in to access your CRM dashboard and keep your business moving forward.
                  </p>

                  {/* Feature cards */}
                  <div className="flex flex-col gap-3">
                     {features.map((feat, i) => (
                        <div
                           key={feat.title}
                           className="animate-slide-up flex items-start gap-4 rounded-xl bg-white/10 p-4 backdrop-blur-sm"
                           style={{ animationDelay: `${0.1 + i * 0.12}s` }}
                        >
                           <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                              <feat.icon className="size-4 text-white" />
                           </div>
                           <div>
                              <p className="text-sm font-semibold text-white">{feat.title}</p>
                              <p className="text-sm text-blue-100">{feat.description}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Bottom attribution */}
               <p className="text-sm text-blue-200/60">
                  Tasis Portal · Trusted by your team
               </p>
            </div>
         </div>
      </div>
   )
}
