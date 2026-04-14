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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/src/components/ui/input-otp"

type Step = "email" | "otp" | "password" | "done"

function EmailStep({ onSuccess }: { onSuccess: (email: string) => void }) {
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
      <div className="w-full animate-fade-in">
         <div className="mb-6 text-center">
            <h1 className="mb-1 text-2xl font-bold text-primary">Forgot Password?</h1>
            <p className="text-sm text-muted-foreground">
               Enter your email and we&apos;ll send you a verification code.
            </p>
         </div>

         {formError && <AlertDestructive className="mb-5" title={formError} />}

         <form
            onSubmit={handleSubmit((data) => { setFormError(null); mutation.mutate(data) })}
            className="space-y-4"
            noValidate
         >
            <div className="space-y-1.5">
               <Label htmlFor="fp-email" className="text-sm font-medium">Email address</Label>
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

            <Button type="submit" className="w-full font-semibold" disabled={mutation.isPending}>
               {mutation.isPending ? "Sending…" : "Send OTP"}
               {mutation.isPending && <Spinner className="ml-2" />}
            </Button>
         </form>

         <p className="mt-5 text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">Back to Login</Link>
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
   const [otp, setOtp] = useState("")
   const [otpError, setOtpError] = useState<string | null>(null)
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

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (otp.length < 6) {
         setOtpError("Enter all 6 digits")
         return
      }
      setOtpError(null)
      setFormError(null)
      mutation.mutate({ otp })
   }

   return (
      <div className="w-full animate-fade-in">
         <div className="mb-6 text-center">
            <div className="mb-3 flex justify-center">
               <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
                  <ShieldCheckIcon className="size-5 text-primary" />
               </div>
            </div>
            <h1 className="mb-1 text-2xl font-bold text-primary">Enter OTP</h1>
            <p className="text-sm text-muted-foreground">
               We sent a 6-digit code to{" "}
               <span className="font-medium text-foreground">{email}</span>.
            </p>
         </div>

         {formError && <AlertDestructive className="mb-5" title={formError} />}

         <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
               <Label className="block text-center text-sm font-medium">Verification code</Label>
               <div className="flex justify-center">
                  <InputOTP
                     maxLength={6}
                     value={otp}
                     onChange={(val) => { setOtp(val); setOtpError(null) }}
                     autoFocus
                     containerClassName="gap-2"
                  >
                     {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPGroup key={i}>
                           <InputOTPSlot index={i} aria-invalid={!!otpError} />
                        </InputOTPGroup>
                     ))}
                  </InputOTP>
               </div>
               {otpError && (
                  <p className="text-center text-xs text-destructive">{otpError}</p>
               )}
            </div>

            <Button type="submit" className="w-full font-semibold" disabled={mutation.isPending}>
               {mutation.isPending ? "Verifying…" : "Verify Code"}
               {mutation.isPending && <Spinner className="ml-2" />}
            </Button>
         </form>

         <button
            type="button"
            onClick={onBack}
            className="mt-5 flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
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
      <div className="w-full animate-fade-in">
         <div className="mb-6 text-center">
            <h1 className="mb-1 text-2xl font-bold text-primary">Set New Password</h1>
            <p className="text-sm text-muted-foreground">Choose a strong password for your account.</p>
         </div>

         {formError && <AlertDestructive className="mb-5" title={formError} />}

         <form
            onSubmit={handleSubmit((data) => { setFormError(null); mutation.mutate(data) })}
            className="space-y-4"
            noValidate
         >
            <div className="space-y-1.5">
               <Label htmlFor="fp-new-password" className="text-sm font-medium">New password</Label>
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
                     onClick={() => setShowPassword((s) => !s)} tabIndex={-1}
                     aria-label={showPassword ? "Hide password" : "Show password"}>
                     {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
               </div>
               {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
            </div>

            <div className="space-y-1.5">
               <Label htmlFor="fp-confirm-password" className="text-sm font-medium">Confirm new password</Label>
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
                     onClick={() => setShowConfirm((s) => !s)} tabIndex={-1}
                     aria-label={showConfirm ? "Hide password" : "Show password"}>
                     {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
               </div>
               {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>

            <Button type="submit" className="w-full font-semibold" disabled={mutation.isPending}>
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
         <div className="w-full animate-fade-in text-center">
            <div className="mb-5 flex justify-center">
               <div className="flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2Icon className="size-7 text-green-600 dark:text-green-400" />
               </div>
            </div>
            <h1 className="mb-1 text-2xl font-bold text-primary">Password Updated!</h1>
            <p className="mb-6 text-sm text-muted-foreground">
               Your password has been reset. You can now log in with your new password.
            </p>
            <Button asChild className="w-full font-semibold">
               <Link href="/login">Go to Login</Link>
            </Button>
         </div>
      )
   }

   if (step === "email") {
      return <EmailStep onSuccess={(e) => { setEmail(e); setStep("otp") }} />
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
