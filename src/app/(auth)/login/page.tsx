import { Suspense } from "react"
import { LoginForm } from "@/src/app/(auth)/login/_components/login-form"
import Logo from "@/src/components/logo"

export default function LoginPage() {
   return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-4 py-12">
         {/* Dot grid overlay */}
         <div className="auth-dot-grid absolute inset-0" />
         {/* Glow blobs */}
         <div className="absolute -left-24 top-16 size-96 rounded-full bg-white/5 blur-3xl" />
         <div className="absolute -right-24 bottom-16 size-80 rounded-full bg-indigo-400/15 blur-3xl" />

         {/* Logo above card */}
         <div className="relative z-10 mb-7 flex flex-col items-center gap-1.5">
            <Logo white className="text-2xl" />
         </div>

         {/* Card */}
         <div className="relative z-10 w-full max-w-sm">
            <div className="rounded-xl bg-white px-8 py-8 shadow-2xl ring-1 ring-black/5 dark:bg-card dark:ring-white/5">
               <Suspense>
                  <LoginForm />
               </Suspense>
            </div>
         </div>

         {/* Footer */}
         <p className="relative z-10 mt-8 text-center text-xs text-blue-200/60">
            © {new Date().getFullYear()} Tasis Pvt Ltd. All rights reserved.
         </p>
      </div>
   )
}
