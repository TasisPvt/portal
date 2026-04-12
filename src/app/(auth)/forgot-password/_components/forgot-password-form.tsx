'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { useMutation } from "@tanstack/react-query"
import Link from "next/link"
import { ArrowLeftIcon, CheckCircle2Icon, Eye, EyeOff, ShieldCheckIcon } from "lucide-react"

import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { AlertDestructive } from "@/src/components/alerts/alertDestructive"
import { Spinner } from "@/src/components/ui/spinner"

type Step = "email" | "otp" | "password" | "done"

// ── Each step is its own component so React fully unmounts/remounts
// the DOM inputs on transition — prevents value bleed-through between steps.

function EmailStep({
   onSuccess,
}: {
   onSuccess: (email: string) => void
}) {
   const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>()
   const [formError, setFormError] = useState<string | null>(null)

   const mutation = useMutation({
      mutationFn: async ({ email }: { email: string }) => {
         const res = await fetch("/api/auth/forgot-password/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
         })
         const json = await res.json()
         if (!res.ok) throw json
         return json
      },
      onSuccess: (_, { email }) => onSuccess(email),
      onError: (err: any) => setFormError(err.message || "Something went wrong"),
   })

   return (
      <div className="mx-auto w-full max-w-md animate-fade-in">
         <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold">Forgot password?</h1>
            <p className="text-muted-foreground">
               Enter your registered email and we&apos;ll send you a verification code.
            </p>
         </div>

         {formError && <AlertDestructive className="mb-6" title={formError} />}

         <form
            onSubmit={handleSubmit((data) => { setFormError(null); mutation.mutate(data) })}
            className="space-y-5"
            noValidate
         >
            <div className="space-y-1.5">
               <Label htmlFor="fp-email">Email address</Label>
               <Input
                  id="fp-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={errors.email ? "border-destructive" : ""}
                  {...register("email", {
                     required: "Email address is required",
                     pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email format" },
                  })}
               />
               {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
               {mutation.isPending ? "Sending…" : "Send OTP"}
               {mutation.isPending && <Spinner className="ml-2" />}
            </Button>
         </form>

         <p className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">Back to Login</Link>
         </p>
      </div>
   )
}

function OtpStep({
   email,
   onSuccess,
   onBack,
}: {
   email: string
   onSuccess: (otp: string) => void
   onBack: () => void
}) {
   const { register, handleSubmit, formState: { errors } } = useForm<{ otp: string }>()
   const [formError, setFormError] = useState<string | null>(null)

   const mutation = useMutation({
      mutationFn: async ({ otp }: { otp: string }) => {
         const res = await fetch("/api/auth/forgot-password/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp }),
         })
         const json = await res.json()
         if (!res.ok) throw json
         return json
      },
      onSuccess: (_, { otp }) => onSuccess(otp),
      onError: (err: any) => setFormError(err.message || "Something went wrong"),
   })

   return (
      <div className="mx-auto w-full max-w-md animate-fade-in">
         <div className="mb-8">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10">
               <ShieldCheckIcon className="size-5 text-primary" />
            </div>
            <h1 className="mb-2 text-3xl font-bold">Enter OTP</h1>
            <p className="text-muted-foreground">
               We sent a 6-digit code to{" "}
               <span className="font-medium text-foreground">{email}</span>.
               It expires in 10 minutes.
            </p>
         </div>

         {formError && <AlertDestructive className="mb-6" title={formError} />}

         <form
            onSubmit={handleSubmit((data) => { setFormError(null); mutation.mutate(data) })}
            className="space-y-5"
            noValidate
         >
            <div className="space-y-1.5">
               <Label htmlFor="fp-otp">Verification code</Label>
               <Input
                  id="fp-otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  className={`text-center text-lg tracking-widest ${errors.otp ? "border-destructive" : ""}`}
                  {...register("otp", {
                     required: "OTP is required",
                     pattern: { value: /^\d{6}$/, message: "Enter the 6-digit code" },
                  })}
               />
               {errors.otp && <p className="text-xs text-destructive">{errors.otp.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
               {mutation.isPending ? "Verifying…" : "Verify Code"}
               {mutation.isPending && <Spinner className="ml-2" />}
            </Button>
         </form>

         <button
            type="button"
            onClick={onBack}
            className="mt-6 flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
         >
            <ArrowLeftIcon className="size-3.5" />
            Use a different email
         </button>
      </div>
   )
}

function PasswordStep({
   email,
   otp,
   onSuccess,
}: {
   email: string
   otp: string
   onSuccess: () => void
}) {
   const { register, handleSubmit, watch, formState: { errors } } = useForm<{ newPassword: string; confirmPassword: string }>()
   const [formError, setFormError] = useState<string | null>(null)
   const [showPassword, setShowPassword] = useState(false)
   const [showConfirm, setShowConfirm] = useState(false)

   const mutation = useMutation({
      mutationFn: async ({ newPassword }: { newPassword: string; confirmPassword: string }) => {
         const res = await fetch("/api/auth/forgot-password/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp, newPassword }),
         })
         const json = await res.json()
         if (!res.ok) throw json
         return json
      },
      onSuccess: () => onSuccess(),
      onError: (err: any) => setFormError(err.message || "Something went wrong"),
   })

   return (
      <div className="mx-auto w-full max-w-md animate-fade-in">
         <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold">Set new password</h1>
            <p className="text-muted-foreground">Choose a strong password for your account.</p>
         </div>

         {formError && <AlertDestructive className="mb-6" title={formError} />}

         <form
            onSubmit={handleSubmit((data) => { setFormError(null); mutation.mutate(data) })}
            className="space-y-5"
            noValidate
         >
            <div className="space-y-1.5">
               <Label htmlFor="fp-new-password">New password</Label>
               <div className="relative">
                  <Input
                     id="fp-new-password"
                     type={showPassword ? "text" : "password"}
                     placeholder="Min. 8 characters"
                     autoComplete="new-password"
                     className={errors.newPassword ? "border-destructive pr-10" : "pr-10"}
                     {...register("newPassword", {
                        required: "New password is required",
                        minLength: { value: 8, message: "Password must be at least 8 characters" },
                     })}
                  />
                  <Button type="button" variant="ghost" size="icon"
                     className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent hover:text-foreground"
                     onClick={() => setShowPassword((s) => !s)} tabIndex={-1}>
                     {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
               </div>
               {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
            </div>

            <div className="space-y-1.5">
               <Label htmlFor="fp-confirm-password">Confirm new password</Label>
               <div className="relative">
                  <Input
                     id="fp-confirm-password"
                     type={showConfirm ? "text" : "password"}
                     placeholder="Re-enter new password"
                     autoComplete="new-password"
                     className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                     {...register("confirmPassword", {
                        required: "Please confirm your password",
                        validate: (v) => v === watch("newPassword") || "Passwords do not match",
                     })}
                  />
                  <Button type="button" variant="ghost" size="icon"
                     className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent hover:text-foreground"
                     onClick={() => setShowConfirm((s) => !s)} tabIndex={-1}>
                     {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
               </div>
               {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
               {mutation.isPending ? "Saving…" : "Reset Password"}
               {mutation.isPending && <Spinner className="ml-2" />}
            </Button>
         </form>
      </div>
   )
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export function ForgotPasswordForm() {
   const [step, setStep] = useState<Step>("email")
   const [email, setEmail] = useState("")
   const [otp, setOtp] = useState("")

   if (step === "done") {
      return (
         <div className="mx-auto w-full max-w-md animate-fade-in text-center">
            <div className="mb-6 flex justify-center">
               <div className="flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2Icon className="size-7 text-green-600 dark:text-green-400" />
               </div>
            </div>
            <h1 className="mb-2 text-2xl font-bold">Password updated</h1>
            <p className="mb-8 text-muted-foreground">
               Your password has been reset. You can now log in with your new password.
            </p>
            <Button asChild className="w-full">
               <Link href="/login">Go to Login</Link>
            </Button>
         </div>
      )
   }

   if (step === "email") {
      return (
         <EmailStep
            onSuccess={(e) => { setEmail(e); setStep("otp") }}
         />
      )
   }

   if (step === "otp") {
      return (
         <OtpStep
            email={email}
            onSuccess={(o) => { setOtp(o); setStep("password") }}
            onBack={() => setStep("email")}
         />
      )
   }

   return (
      <PasswordStep
         email={email}
         otp={otp}
         onSuccess={() => setStep("done")}
      />
   )
}
