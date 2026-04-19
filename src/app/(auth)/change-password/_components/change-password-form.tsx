'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ShieldCheckIcon } from "lucide-react"

import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { AlertDestructive } from "@/src/components/alerts/alertDestructive"
import { Spinner } from "@/src/components/ui/spinner"
import { changePasswordAndVerify } from "../_actions"

type FormValues = {
   currentPassword: string
   newPassword: string
   confirmPassword: string
}

export function ChangePasswordForm() {
   const router = useRouter()
   const [show, setShow] = useState({ current: false, next: false, confirm: false })
   const [formError, setFormError] = useState<string | null>(null)

   const toggle = (field: keyof typeof show) =>
      setShow((s) => ({ ...s, [field]: !s[field] }))

   const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>()

   const mutation = useMutation({
      mutationFn: (data: FormValues) =>
         changePasswordAndVerify(data.currentPassword, data.newPassword),
      onSuccess: () => router.push("/"),
      onError: (err: any) => setFormError(err.message || "Something went wrong"),
   })

   const onSubmit = (data: FormValues) => {
      setFormError(null)
      mutation.mutate(data)
   }

   return (
      <div className="w-full animate-fade-in">
         {/* Heading */}
         <div className="mb-6 text-center">
            <div className="mb-3 flex justify-center">
               <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
                  <ShieldCheckIcon className="size-5 text-primary" />
               </div>
            </div>
            <h1 className="mb-1 text-2xl font-bold text-primary">Set Your Password</h1>
            <p className="text-sm text-muted-foreground">
               Your account has a temporary password. Please set a permanent one.
            </p>
         </div>

         {formError && <AlertDestructive className="mb-5" title={formError} />}

         <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
               <Label htmlFor="currentPassword" className="text-sm font-medium">
                  Temporary Password
               </Label>
               <div className="relative">
                  <Input
                     id="currentPassword"
                     type={show.current ? "text" : "password"}
                     placeholder="Password from your email"
                     autoComplete="current-password"
                     className={errors.currentPassword ? "border-destructive pr-10" : "pr-10"}
                     {...register("currentPassword", {
                        required: "Enter the temporary password from your email",
                     })}
                  />
                  <Button type="button" variant="ghost" size="icon"
                     className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent hover:text-foreground"
                     onClick={() => toggle("current")} tabIndex={-1}
                     aria-label={show.current ? "Hide password" : "Show password"}>
                     {show.current ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
               </div>
               {errors.currentPassword && (
                  <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
               )}
            </div>

            <div className="space-y-1.5">
               <Label htmlFor="newPassword" className="text-sm font-medium">New Password</Label>
               <div className="relative">
                  <Input
                     id="newPassword"
                     type={show.next ? "text" : "password"}
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
                     onClick={() => toggle("next")} tabIndex={-1}
                     aria-label={show.next ? "Hide password" : "Show password"}>
                     {show.next ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
               </div>
               {errors.newPassword && (
                  <p className="text-xs text-destructive">{errors.newPassword.message}</p>
               )}
            </div>

            <div className="space-y-1.5">
               <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</Label>
               <div className="relative">
                  <Input
                     id="confirmPassword"
                     type={show.confirm ? "text" : "password"}
                     placeholder="Re-enter new password"
                     autoComplete="new-password"
                     className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                     {...register("confirmPassword", {
                        required: "Please confirm your new password",
                        validate: (v) => v === watch("newPassword") || "Passwords do not match",
                     })}
                  />
                  <Button type="button" variant="ghost" size="icon"
                     className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent hover:text-foreground"
                     onClick={() => toggle("confirm")} tabIndex={-1}
                     aria-label={show.confirm ? "Hide password" : "Show password"}>
                     {show.confirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
               </div>
               {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
               )}
            </div>

            <Button type="submit" className="mt-1 w-full font-semibold" disabled={mutation.isPending}>
               {mutation.isPending ? "Saving…" : "Set New Password"}
               {mutation.isPending && <Spinner className="ml-2" />}
            </Button>
         </form>

         <p className="mt-5 text-center text-sm text-muted-foreground">
            After saving you&apos;ll be taken directly to your dashboard.
         </p>
      </div>
   )
}
