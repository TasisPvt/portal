'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { useMutation } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2Icon, Eye, EyeOff } from "lucide-react"

import {
   Field,
   FieldDescription,
   FieldGroup,
   FieldLabel,
} from "@/src/components/ui/field"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { AlertDestructive } from "@/src/components/alerts/alertDestructive"
import { Spinner } from "@/src/components/ui/spinner"

type LoginType = {
   email: string
   password: string
}

export function LoginForm() {
   const router = useRouter()
   const searchParams = useSearchParams()
   const passwordChanged = searchParams.get("passwordChanged") === "1"
   const [isRedirecting, setIsRedirecting] = useState(false)
   const [formError, setFormError] = useState<string | null>(null)
   const [showPassword, setShowPassword] = useState(false)

   const { register, handleSubmit, formState: { errors } } = useForm<LoginType>()

   const loginMutation = useMutation({
      mutationFn: async (data: LoginType) => {
         const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         })
         const json = await res.json()
         if (!res.ok) throw json
         return json
      },
      onSuccess: () => {
         setIsRedirecting(true)
         router.push("/")
      },
      onError: (err: any) => {
         setFormError(err.message || "Something went wrong")
      },
   })

   const isLoading = loginMutation.isPending || isRedirecting

   const onSubmit = (data: LoginType) => {
      setFormError(null)
      loginMutation.mutate(data)
   }

   return (
      <div className="w-full animate-fade-in">
         {/* Heading */}
         <div className="mb-6 text-center">
            <h1 className="mb-1 text-2xl font-bold text-primary">
               Welcome Back!
            </h1>
            <p className="text-sm text-muted-foreground">
               Sign in to continue to your portal.
            </p>
         </div>

         {passwordChanged && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300">
               <CheckCircle2Icon className="size-4 shrink-0" />
               Password updated. Sign in with your new password.
            </div>
         )}

         {formError && (
            <AlertDestructive className="mb-5" title={formError} />
         )}

         <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup className="gap-4">

               <Field className="gap-1.5">
                  <FieldLabel className="text-sm font-medium">Email</FieldLabel>
                  <Input
                     type="email"
                     placeholder="Enter your email"
                     autoComplete="email"
                     className={errors.email ? "border-destructive" : ""}
                     {...register("email", {
                        required: "Email address is required",
                        pattern: {
                           value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                           message: "Enter a valid email address",
                        },
                     })}
                  />
                  {errors.email && (
                     <FieldDescription className="text-xs text-destructive">
                        {errors.email.message}
                     </FieldDescription>
                  )}
               </Field>

               <Field className="gap-1.5">
                  <div className="flex items-center justify-between">
                     <FieldLabel className="text-sm font-medium">Password</FieldLabel>
                     <Link
                        href="/forgot-password"
                        className="text-xs text-primary hover:underline"
                     >
                        Forgot password?
                     </Link>
                  </div>
                  <div className="relative">
                     <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className={errors.password ? "border-destructive pr-10" : "pr-10"}
                        {...register("password", {
                           required: "Password is required",
                        })}
                     />
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent hover:text-foreground"
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                     >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                     </Button>
                  </div>
                  {errors.password && (
                     <FieldDescription className="text-xs text-destructive">
                        {errors.password.message}
                     </FieldDescription>
                  )}
               </Field>

               <Field className="mt-1">
                  <Button
                     type="submit"
                     className="w-full font-semibold"
                     disabled={isLoading}
                  >
                     {isRedirecting ? "Preparing dashboard…" : isLoading ? "Signing in…" : "Sign In"}
                     {isLoading && <Spinner className="ml-2" />}
                  </Button>
               </Field>

               <p className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="font-semibold text-primary hover:underline">
                     Sign up
                  </Link>
               </p>

            </FieldGroup>
         </form>
      </div>
   )
}
