'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ShieldCheckIcon } from "lucide-react"

import {
   Card,
   CardContent,
   CardFooter,
   CardHeader,
} from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { AlertDestructive } from "@/src/components/alerts/alertDestructive"
import { Spinner } from "@/src/components/ui/spinner"
import Logo from "@/src/components/logo"

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

   const {
      register,
      handleSubmit,
      watch,
      formState: { errors },
   } = useForm<FormValues>()

   const mutation = useMutation({
      mutationFn: async (data: FormValues) => {
         const res = await fetch("/api/auth/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               currentPassword: data.currentPassword,
               newPassword: data.newPassword,
            }),
         })
         const json = await res.json()
         if (!res.ok) throw json
         return json
      },
      onSuccess: () => {
         // Session is still active — proxy routes to the correct dashboard
         router.push("/")
      },
      onError: (err: any) => {
         setFormError(err.message || "Something went wrong")
      },
   })

   const onSubmit = (data: FormValues) => {
      setFormError(null)
      mutation.mutate(data)
   }

   return (
      <div className="w-full max-w-sm animate-fade-in">
         <Card>
            {/* Header */}
            <CardHeader className="flex flex-col items-center gap-2 border-b pb-6">
               <Logo />
               <div className="flex flex-col items-center gap-1">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                     <ShieldCheckIcon className="size-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Set your password</h2>
                  <p className="text-center text-sm text-muted-foreground">
                     Your account uses a temporary password. Please set a new one to continue.
                  </p>
               </div>
            </CardHeader>

            {/* Form */}
            <CardContent className="pt-6">
               {formError && (
                  <AlertDestructive className="mb-5" title={formError} />
               )}

               <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                  {/* Current password */}
                  <div className="space-y-1.5">
                     <Label htmlFor="currentPassword">Temporary Password</Label>
                     <div className="relative">
                        <Input
                           id="currentPassword"
                           type={show.current ? "text" : "password"}
                           placeholder="Password from your email"
                           className={errors.currentPassword ? "border-red-500 pr-10" : "pr-10"}
                           {...register("currentPassword", {
                              required: "Enter the temporary password from your email",
                           })}
                        />
                        <Button
                           type="button" variant="ghost" size="icon"
                           className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                           onClick={() => toggle("current")}
                        >
                           {show.current ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                     </div>
                     {errors.currentPassword && (
                        <p className="text-xs text-red-500">{errors.currentPassword.message}</p>
                     )}
                  </div>

                  {/* New password */}
                  <div className="space-y-1.5">
                     <Label htmlFor="newPassword">New Password</Label>
                     <div className="relative">
                        <Input
                           id="newPassword"
                           type={show.next ? "text" : "password"}
                           placeholder="Min. 8 characters"
                           className={errors.newPassword ? "border-red-500 pr-10" : "pr-10"}
                           {...register("newPassword", {
                              required: "New password is required",
                              minLength: { value: 8, message: "Min. 8 characters" },
                           })}
                        />
                        <Button
                           type="button" variant="ghost" size="icon"
                           className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                           onClick={() => toggle("next")}
                        >
                           {show.next ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                     </div>
                     {errors.newPassword && (
                        <p className="text-xs text-red-500">{errors.newPassword.message}</p>
                     )}
                  </div>

                  {/* Confirm */}
                  <div className="space-y-1.5">
                     <Label htmlFor="confirmPassword">Confirm New Password</Label>
                     <div className="relative">
                        <Input
                           id="confirmPassword"
                           type={show.confirm ? "text" : "password"}
                           placeholder="Re-enter new password"
                           className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                           {...register("confirmPassword", {
                              required: "Please confirm your new password",
                              validate: (v) =>
                                 v === watch("newPassword") || "Passwords do not match",
                           })}
                        />
                        <Button
                           type="button" variant="ghost" size="icon"
                           className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                           onClick={() => toggle("confirm")}
                        >
                           {show.confirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                     </div>
                     {errors.confirmPassword && (
                        <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
                     )}
                  </div>

                  <Button type="submit" className="w-full" disabled={mutation.isPending}>
                     {mutation.isPending ? "Saving…" : "Set New Password"}
                     {mutation.isPending && <Spinner className="ml-2" />}
                  </Button>
               </form>
            </CardContent>

            <CardFooter className="justify-center border-t py-4">
               <p className="text-xs text-muted-foreground">
                  After saving, you&apos;ll be taken to your dashboard.
               </p>
            </CardFooter>
         </Card>
      </div>
   )
}
