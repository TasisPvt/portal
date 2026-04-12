import { SignupForm } from "@/src/app/(auth)/signup/_components/signup-form"
import Logo from "@/src/components/logo"
import { BadgeCheckIcon, ClipboardListIcon, MailCheckIcon } from "lucide-react"

const steps = [
   {
      icon: ClipboardListIcon,
      title: "Fill your details",
      description: "Provide your name, email, and KYC information.",
   },
   {
      icon: MailCheckIcon,
      title: "Receive credentials",
      description: "We'll email you a secure temporary password instantly.",
   },
   {
      icon: BadgeCheckIcon,
      title: "Access your portal",
      description: "Log in and set your own password to get started.",
   },
]

export default function SignUpPage() {
   return (
      <div className="flex min-h-screen bg-background">
         {/* ── Left: form panel ── */}
         <div className="flex flex-1 flex-col justify-between p-8 lg:p-12">
            <Logo />

            <SignupForm />

            <p className="text-center text-sm text-muted-foreground sm:text-left">
               © {new Date().getFullYear()} Tasis Pvt Ltd. All rights reserved.
            </p>
         </div>

         {/* ── Right: decorative panel ── */}
         <div className="relative m-3 hidden overflow-hidden rounded-xl lg:flex lg:flex-1">
            {/* Layered background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-blue-700 to-blue-800" />
            <div className="auth-dot-grid absolute inset-0" />
            {/* Soft glow blobs */}
            <div className="absolute -right-16 top-10 size-72 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-20 left-10 size-80 rounded-full bg-indigo-300/15 blur-3xl" />

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
                     Get started in minutes.
                  </h2>
                  <p className="mb-10 text-lg leading-relaxed text-blue-100">
                     Create your account to access the portal and manage your operations seamlessly.
                  </p>

                  {/* Step cards */}
                  <div className="flex flex-col gap-3">
                     {steps.map((step, i) => (
                        <div
                           key={step.title}
                           className="animate-slide-up flex items-start gap-4 rounded-xl bg-white/10 p-4 backdrop-blur-sm"
                           style={{ animationDelay: `${0.1 + i * 0.12}s` }}
                        >
                           <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                              <step.icon className="size-4 text-white" />
                           </div>
                           <div>
                              <p className="text-sm font-semibold text-white">{step.title}</p>
                              <p className="text-sm text-blue-100">{step.description}</p>
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
