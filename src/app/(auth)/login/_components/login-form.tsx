'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"

import {
   Field,
   FieldDescription,
   FieldGroup,
   FieldLabel,
} from "@/src/components/ui/field"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
// import { AlertDestructive } from "../../../../components/alerts/alertDestructive"

import { LoginType } from "@/src/types/loginType"
import { Spinner } from "@/src/components/ui/spinner"

export function LoginForm() {
   const router = useRouter()
   const [isRedirecting, setIsRedirecting] = useState(false);
   const [formError, setFormError] = useState<string | null>(null)

   const { register, handleSubmit, formState: { errors }, } = useForm<LoginType>()

   // const loginMutation = useMutation({
   //    mutationFn: async (data: LoginType) => {
   //       const res = await fetch("/api/auth/login", {
   //          method: "POST",
   //          headers: { "Content-Type": "application/json" },
   //          body: JSON.stringify(data),
   //       })

   //       const json = await res.json()

   //       if (!res.ok) {
   //          throw json
   //       }

   //       return json
   //    },

   //    onSuccess: () => {
   //       setIsRedirecting(true);
   //       router.push("/dashboard")
   //    },

   //    onError: (err: any) => {
   //       setFormError(err.message || "Something went wrong")
   //    },
   // })
   // const isLoading = loginMutation.isPending || isRedirecting;

   // const onSubmit = (data: LoginType) => {
   //    setFormError(null)
   //    loginMutation.mutate(data)
   // }

   return (
      <div className="mx-auto w-full max-w-md animate-fade-in">
         <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold">Welcome Back</h1>
            <p className="text-muted-foreground">
               Enter your email and password to access your account.
            </p>
         </div>

         {/* {formError && (
            <AlertDestructive className="mb-6" title={formError} />
         )} */}

         {/* <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate> */}
         <FieldGroup className="gap-6">
            <Field className="gap-2">
               <FieldLabel>Email</FieldLabel>
               <Input
                  type="email"
                  className={errors.email ? "border-red-500" : ""}
                  {...register("email", {
                     required: "Email address is required",
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
               <FieldLabel>Password</FieldLabel>
               <Input
                  type="password"
                  className={errors.password ? "border-red-500" : ""}
                  {...register("password", {
                     required: "Password is required",
                  })}
               />
               {errors.password && (
                  <FieldDescription className="text-xs text-red-500">
                     {errors.password.message}
                  </FieldDescription>
               )}
            </Field>

            <Field>
               <Button
                  type="submit"
                  className="w-full cursor-pointer"
               // disabled={isLoading}
               >
                  {isRedirecting ? 'Preparing Dashboard' : 'Login'}
                  {/* {isLoading && (
                        <Spinner className="ml-2" />
                     )} */}
               </Button>
            </Field>
         </FieldGroup>
         {/* </form> */}
      </div>
   )
}