import { ChangePasswordForm } from "@/src/app/(auth)/change-password/_components/change-password-form"
import Logo from "@/src/components/logo"
import { KeyRoundIcon, LockKeyholeIcon, ShieldCheckIcon } from "lucide-react"

const securityTips = [
   {
      icon: KeyRoundIcon,
      title: "Choose a strong password",
      description: "Use at least 8 characters with a mix of letters and numbers.",
   },
   {
      icon: LockKeyholeIcon,
      title: "Keep it private",
      description: "Never share your password with anyone, including support staff.",
   },
   {
      icon: ShieldCheckIcon,
      title: "You're protected",
      description: "Your account activity is monitored for suspicious access.",
   },
]

export default function ChangePasswordPage() {
   return (
      <div className="flex min-h-screen bg-background">
         {/* ── Left: form panel ── */}
         <div className="flex flex-1 flex-col justify-between p-8 lg:p-12">
            <Logo />

            <div className="mx-auto w-full max-w-sm">
               <ChangePasswordForm />
            </div>

            <p className="text-center text-sm text-muted-foreground sm:text-left">
               © {new Date().getFullYear()} Tasis Pvt Ltd. All rights reserved.
            </p>
         </div>

         {/* ── Right: decorative panel ── */}
         <div className="relative m-3 hidden overflow-hidden rounded-xl lg:flex lg:flex-1">
            {/* Layered background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800" />
            <div className="auth-dot-grid absolute inset-0" />
            {/* Soft glow blobs */}
            <div className="absolute -right-16 -top-20 size-72 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute bottom-0 left-0 size-80 rounded-full bg-violet-400/15 blur-3xl" />

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
                     Secure your account.
                  </h2>
                  <p className="mb-10 text-lg leading-relaxed text-indigo-100">
                     Set a strong password to protect your portal access and keep your data safe.
                  </p>

                  {/* Security tip cards */}
                  <div className="flex flex-col gap-3">
                     {securityTips.map((tip, i) => (
                        <div
                           key={tip.title}
                           className="animate-slide-up flex items-start gap-4 rounded-xl bg-white/10 p-4 backdrop-blur-sm"
                           style={{ animationDelay: `${0.1 + i * 0.12}s` }}
                        >
                           <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                              <tip.icon className="size-4 text-white" />
                           </div>
                           <div>
                              <p className="text-sm font-semibold text-white">{tip.title}</p>
                              <p className="text-sm text-indigo-100">{tip.description}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Bottom attribution */}
               <p className="text-sm text-indigo-200/60">
                  Tasis Portal · Trusted by your team
               </p>
            </div>
         </div>
      </div>
   )
}
