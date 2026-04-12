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
   email: string;
   password: string;
};

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
      <div className="mx-auto w-full max-w-md animate-fade-in">
         <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
               Welcome back
            </h1>
            <p className="text-base text-muted-foreground">
               Sign in to your account to continue.
            </p>
         </div>

         {passwordChanged && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300">
               <CheckCircle2Icon className="size-4 shrink-0" />
               Password updated successfully. Sign in with your new password.
            </div>
         )}

         {formError && (
            <AlertDestructive className="mb-6" title={formError} />
         )}

         <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <FieldGroup className="gap-5">

               <Field className="gap-1.5">
                  <FieldLabel className="text-sm font-medium">Email address</FieldLabel>
                  <Input
                     type="email"
                     placeholder="you@example.com"
                     autoComplete="email"
                     className={errors.email ? "border-destructive focus-visible:ring-destructive/30" : ""}
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
                  <div className="flex items-center">
                     <FieldLabel className="text-sm font-medium">Password</FieldLabel>
                     <Link
                        href="/forgot-password"
                        className="ml-auto inline-block text-sm text-primary hover:underline">
                        Forgot your password?
                     </Link>
                  </div>
                  <div className="relative">
                     <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className={errors.password ? "border-destructive pr-10 focus-visible:ring-destructive/30" : "pr-10"}
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

               <Field>
                  <Button
                     type="submit"
                     className="w-full cursor-pointer font-semibold"
                     disabled={isLoading}
                  >
                     {isRedirecting ? "Preparing dashboard…" : isLoading ? "Signing in…" : "Sign in"}
                     {isLoading && <Spinner className="ml-2" />}
                  </Button>
               </Field>

               <div className="flex flex-col items-center gap-1.5 text-center text-sm text-muted-foreground">
                  <span>
                     Don&apos;t have an account?{" "}
                     <Link href="/signup" className="font-semibold text-primary hover:underline">
                        Create one
                     </Link>
                  </span>
               </div>

            </FieldGroup>
         </form>
      </div>
   )
}
