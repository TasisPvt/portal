'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { useMutation } from "@tanstack/react-query"
import Link from "next/link"
import { MailCheckIcon } from "lucide-react"

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

type SignupType = {
   name: string
   username: string
   email: string
   phone: string
   aadharNumber: string
   panNumber: string
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ email }: { email: string }) {
   return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 text-center animate-fade-in">
         <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <MailCheckIcon className="size-8 text-primary" />
         </div>
         <div>
            <h2 className="text-2xl font-bold">Check your email</h2>
            <p className="mt-1 text-sm text-muted-foreground">
               We&apos;ve sent a temporary password to{" "}
               <span className="font-medium text-foreground">{email}</span>.
               Use it to log in and set your own password.
            </p>
         </div>
         <Button asChild className="w-full">
            <Link href="/login">Go to Login</Link>
         </Button>
      </div>
   )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function SignupForm() {
   const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
   const [formError, setFormError] = useState<string | null>(null)

   const {
      register,
      handleSubmit,
      formState: { errors },
   } = useForm<SignupType>()

   const signupMutation = useMutation({
      mutationFn: async (data: SignupType) => {
         const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         })
         const json = await res.json()
         if (!res.ok) throw json
         return json
      },
      onSuccess: (_data, variables) => {
         setSubmittedEmail(variables.email)
      },
      onError: (err: any) => {
         setFormError(err.message || "Something went wrong")
      },
   })

   if (submittedEmail) return <SuccessScreen email={submittedEmail} />

   const onSubmit = (data: SignupType) => {
      setFormError(null)
      signupMutation.mutate(data)
   }

   return (
      <div className="mx-auto w-full max-w-2xl animate-fade-in">
         <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold">Create your account</h1>
            <p className="text-muted-foreground">
               Fill in your details. We&apos;ll email you a temporary password to get started.
            </p>
         </div>

         {formError && (
            <AlertDestructive className="mb-6" title={formError} />
         )}

         <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <FieldGroup className="gap-5">

               {/* Row 1: Name + Username */}
               <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field className="gap-2">
                     <FieldLabel>Full Name</FieldLabel>
                     <Input
                        placeholder="Priya Sharma"
                        className={errors.name ? "border-red-500" : ""}
                        {...register("name", {
                           required: "Full name is required",
                           minLength: { value: 2, message: "Min. 2 characters" },
                        })}
                     />
                     {errors.name && (
                        <FieldDescription className="text-xs text-red-500">
                           {errors.name.message}
                        </FieldDescription>
                     )}
                  </Field>

                  <Field className="gap-2">
                     <FieldLabel>Username</FieldLabel>
                     <Input
                        placeholder="priya_sharma"
                        className={errors.username ? "border-red-500" : ""}
                        {...register("username", {
                           required: "Username is required",
                           minLength: { value: 3, message: "Min. 3 characters" },
                           maxLength: { value: 30, message: "Max. 30 characters" },
                           pattern: {
                              value: /^[a-z0-9_]+$/,
                              message: "Lowercase letters, numbers and underscores only",
                           },
                        })}
                     />
                     {errors.username && (
                        <FieldDescription className="text-xs text-red-500">
                           {errors.username.message}
                        </FieldDescription>
                     )}
                  </Field>
               </div>

               {/* Row 2: Email + Phone */}
               <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field className="gap-2">
                     <FieldLabel>Email</FieldLabel>
                     <Input
                        type="email"
                        placeholder="priya@example.com"
                        className={errors.email ? "border-red-500" : ""}
                        {...register("email", {
                           required: "Email is required",
                           pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                              message: "Invalid email format",
                           },
                        })}
                     />
                     {errors.email && (
                        <FieldDescription className="text-xs text-red-500">
                           {errors.email.message}
                        </FieldDescription>
                     )}
                  </Field>

                  <Field className="gap-2">
                     <FieldLabel>Phone Number</FieldLabel>
                     <Input
                        type="tel"
                        placeholder="9876543210"
                        className={errors.phone ? "border-red-500" : ""}
                        {...register("phone", {
                           required: "Phone number is required",
                           pattern: {
                              value: /^[6-9]\d{9}$/,
                              message: "Enter a valid 10-digit Indian mobile number",
                           },
                        })}
                     />
                     {errors.phone && (
                        <FieldDescription className="text-xs text-red-500">
                           {errors.phone.message}
                        </FieldDescription>
                     )}
                  </Field>
               </div>

               {/* Row 3: Aadhar + PAN */}
               <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field className="gap-2">
                     <FieldLabel>Aadhar Number</FieldLabel>
                     <Input
                        placeholder="234567890123"
                        maxLength={12}
                        className={errors.aadharNumber ? "border-red-500" : ""}
                        {...register("aadharNumber", {
                           required: "Aadhar number is required",
                           pattern: {
                              value: /^\d{12}$/,
                              message: "Must be exactly 12 digits",
                           },
                        })}
                     />
                     {errors.aadharNumber && (
                        <FieldDescription className="text-xs text-red-500">
                           {errors.aadharNumber.message}
                        </FieldDescription>
                     )}
                  </Field>

                  <Field className="gap-2">
                     <FieldLabel>PAN Number</FieldLabel>
                     <Input
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        className={errors.panNumber ? "border-red-500" : ""}
                        {...register("panNumber", {
                           required: "PAN number is required",
                           pattern: {
                              value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
                              message: "Invalid PAN (e.g. ABCDE1234F)",
                           },
                           setValueAs: (v: string) => v.toUpperCase(),
                        })}
                     />
                     {errors.panNumber && (
                        <FieldDescription className="text-xs text-red-500">
                           {errors.panNumber.message}
                        </FieldDescription>
                     )}
                  </Field>
               </div>

               {/* Submit */}
               <Field>
                  <Button
                     type="submit"
                     className="w-full cursor-pointer"
                     disabled={signupMutation.isPending}
                  >
                     {signupMutation.isPending ? "Creating account…" : "Create Account"}
                     {signupMutation.isPending && <Spinner className="ml-2" />}
                  </Button>
               </Field>

               <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium text-primary hover:underline">
                     Log in
                  </Link>
               </p>

            </FieldGroup>
         </form>
      </div>
   )
}
