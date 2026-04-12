import { Suspense } from "react"
import Logo from "@/src/components/logo"
import { ForgotPasswordForm } from "./_components/forgot-password-form"

export default function ForgotPasswordPage() {
   return (
      <div className="flex min-h-screen flex-col justify-between p-8 lg:p-12">
         <Logo />

         <div className="flex flex-1 items-center justify-center py-12">
            <Suspense>
               <ForgotPasswordForm />
            </Suspense>
         </div>

         <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Tasis Pvt Ltd. All rights reserved.
         </p>
      </div>
   )
}
