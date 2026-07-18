'use client'

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { useMutation } from "@tanstack/react-query"
import Link from "next/link"
import { MailCheckIcon, ChevronsUpDown, Check, ArrowLeft, CheckIcon } from "lucide-react"
import {
   Field,
   FieldDescription,
   FieldGroup,
   FieldLabel,
} from "@/src/components/ui/field"
import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
   CommandList,
} from "@/src/components/ui/command"
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@/src/components/ui/popover"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { AlertDestructive } from "@/src/components/alerts/alertDestructive"
import { Spinner } from "@/src/components/ui/spinner"
import { stateData } from "@/src/lib/data/stateData"
import { PhoneInput, validatePhone } from "@/src/components/ui/phone-input"
import { cn } from "@/src/lib/utils"

type SignupType = {
   name: string
   email: string
   phone: string
   aadharNumber: string
   panNumber: string
   state: string
   address: string
   gstNumber: string
}

const STEPS = [
   { id: 1, label: "User Details" },
   { id: 2, label: "Tax Details" },
] as const

// Fields validated before leaving step 1
const STEP_1_FIELDS: (keyof SignupType)[] = [
   "name",
   "email",
   "phone",
   "aadharNumber",
   "panNumber",
]

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ email }: { email: string }) {
   return (
      <div className="flex w-full flex-col items-center gap-5 text-center animate-fade-in py-4">
         <div className="flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <MailCheckIcon className="size-7 text-green-600 dark:text-green-400" />
         </div>
         <div>
            <h2 className="mb-1 text-2xl font-bold text-primary">Check your email</h2>
            <p className="text-sm text-muted-foreground">
               We&apos;ve sent a temporary password to{" "}
               <span className="font-medium text-foreground">{email}</span>.
               Use it to log in and set your own password.
            </p>
         </div>
         <Button asChild className="w-full font-semibold">
            <Link href="/login">Go to Login</Link>
         </Button>
      </div>
   )
}

// ─── Stepper indicator ──────────────────────────────────────────────────────────

function Stepper({ current }: { current: number }) {
   return (
      <div className="mb-6 flex items-center">
         {STEPS.map((s, i) => {
            const done = current > s.id
            const active = current === s.id
            return (
               <div key={s.id} className="flex flex-1 items-center last:flex-none">
                  <div className="flex items-center gap-2">
                     <span
                        className={cn(
                           "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                           done && "bg-primary text-primary-foreground",
                           active && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                           !done && !active && "bg-muted text-muted-foreground",
                        )}
                     >
                        {done ? <CheckIcon className="size-3.5" /> : s.id}
                     </span>
                     <span
                        className={cn(
                           "text-xs font-medium",
                           active || done ? "text-foreground" : "text-muted-foreground",
                        )}
                     >
                        {s.label}
                     </span>
                  </div>
                  {i < STEPS.length - 1 && (
                     <div className={cn("mx-3 h-px flex-1", done ? "bg-primary" : "bg-border")} />
                  )}
               </div>
            )
         })}
      </div>
   )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function SignupForm() {
   const [step, setStep] = useState(1)
   const [direction, setDirection] = useState<"forward" | "back">("forward")
   // Only animate after the first step transition - not on initial page load.
   const [animate, setAnimate] = useState(false)
   const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
   const [formError, setFormError] = useState<string | null>(null)
   const [statePopoverOpen, setStatePopoverOpen] = useState(false)

   const {
      register,
      handleSubmit,
      control,
      trigger,
      formState: { errors },
   } = useForm<SignupType>({ mode: "onTouched" })

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

   async function goNext() {
      setFormError(null)
      const valid = await trigger(STEP_1_FIELDS)
      if (valid) {
         setDirection("forward")
         setAnimate(true)
         setStep(2)
      }
   }

   function goBack() {
      setFormError(null)
      setDirection("back")
      setAnimate(true)
      setStep(1)
   }

   const onSubmit = (data: SignupType) => {
      setFormError(null)
      signupMutation.mutate(data)
   }

   // Step-aware submit: Enter / submit on step 1 advances instead of submitting.
   function handleFormSubmit(e: React.FormEvent) {
      e.preventDefault()
      if (step === 1) {
         goNext()
      } else {
         handleSubmit(onSubmit)()
      }
   }

   return (
      <div className="w-full animate-fade-in">
         <div className="mb-6 text-center">
            <h1 className="mb-1 text-2xl font-bold text-primary">Create your account</h1>
            <p className="text-sm text-muted-foreground">
               Fill in your details. We&apos;ll email you a temporary password to get started.
            </p>
         </div>

         <Stepper current={step} />

         {formError && <AlertDestructive className="mb-6" title={formError} />}

         <form onSubmit={handleFormSubmit} className="space-y-5" noValidate>
            <FieldGroup className="gap-5">

           {/*<div className="overflow-hidden">*/}
              <div
                 key={step}
                 className={cn(
                    animate && "animate-in fade-in-0 duration-300 ease-out",
                    animate && (direction === "back" ? "slide-in-from-left-10" : "slide-in-from-right-10"),
                 )}
              >

               {/* ── Step 1: User details ── */}
               <div className={cn("flex flex-col gap-5", step !== 1 && "hidden")}>
                  <Field className="gap-2">
                     <FieldLabel>Full Name</FieldLabel>
                     <Input
                        className={errors.name ? "border-red-500" : ""}
                        {...register("name", {
                           required: "Full name is required",
                           minLength: { value: 2, message: "Min. 2 characters" },
                        })}
                     />
                     {errors.name && (
                        <FieldDescription className="text-xs text-red-500">{errors.name.message}</FieldDescription>
                     )}
                  </Field>

                  <Field className="gap-2">
                     <FieldLabel>Email</FieldLabel>
                     <Input
                        type="email"
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
                        <FieldDescription className="text-xs text-red-500">{errors.email.message}</FieldDescription>
                     )}
                  </Field>

                  <Field className="gap-2">
                     <FieldLabel>Phone Number</FieldLabel>
                     <Controller
                        name="phone"
                        control={control}
                        rules={{ validate: validatePhone }}
                        render={({ field, fieldState }) => (
                           <>
                              <PhoneInput
                                 value={field.value}
                                 onChange={field.onChange}
                                 error={fieldState.error?.message}
                              />
                              {fieldState.error && (
                                 <FieldDescription className="text-xs text-red-500">
                                    {fieldState.error.message}
                                 </FieldDescription>
                              )}
                           </>
                        )}
                     />
                  </Field>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                     <Field className="gap-2">
                        <FieldLabel>Aadhar Number</FieldLabel>
                        <Input
                           placeholder="234567890123"
                           maxLength={12}
                           className={errors.aadharNumber ? "border-red-500" : ""}
                           {...register("aadharNumber", {
                              required: "Aadhar number is required",
                              pattern: { value: /^\d{12}$/, message: "Must be exactly 12 digits" },
                           })}
                        />
                        {errors.aadharNumber && (
                           <FieldDescription className="text-xs text-red-500">{errors.aadharNumber.message}</FieldDescription>
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
                              pattern: { value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: "Invalid PAN (e.g. ABCDE1234F)" },
                              setValueAs: (v: string) => v.toUpperCase(),
                           })}
                        />
                        {errors.panNumber && (
                           <FieldDescription className="text-xs text-red-500">{errors.panNumber.message}</FieldDescription>
                        )}
                     </Field>
                  </div>

                  <Field>
                     <Button type="submit" className="w-full cursor-pointer font-semibold">
                        Continue
                     </Button>
                  </Field>
               </div>

               {/* ── Step 2: Tax details ── */}
               <div className={cn("flex flex-col gap-5", step !== 2 && "hidden")}>
                  <Field className="gap-2">
                     <FieldLabel>State</FieldLabel>
                     <Controller
                        name="state"
                        control={control}
                        rules={{ required: "State is required" }}
                        render={({ field }) => (
                           <Popover open={statePopoverOpen} onOpenChange={setStatePopoverOpen}>
                              <PopoverTrigger asChild>
                                 <Button
                                    type="button"
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={statePopoverOpen}
                                    className={cn(
                                       "w-full justify-between font-normal",
                                       errors.state ? "border-red-500" : "",
                                       !field.value && "text-muted-foreground",
                                    )}
                                 >
                                    <span className="truncate">
                                       {field.value
                                          ? stateData.find((s) => s.value === field.value)?.label
                                          : "Select state..."}
                                    </span>
                                    <ChevronsUpDown className="ml-2 shrink-0 opacity-50" />
                                 </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                 <Command>
                                    <CommandInput placeholder="Search state..." className="h-9" />
                                    <CommandList>
                                       <CommandEmpty>No state found.</CommandEmpty>
                                       <CommandGroup>
                                          {stateData.map((s) => (
                                             <CommandItem
                                                key={s.value}
                                                value={s.value}
                                                onSelect={(currentValue) => {
                                                   field.onChange(currentValue === field.value ? "" : currentValue)
                                                   setStatePopoverOpen(false)
                                                }}
                                             >
                                                {s.label}
                                                <Check
                                                   className={cn(
                                                      "ml-auto",
                                                      field.value === s.value ? "opacity-100" : "opacity-0",
                                                   )}
                                                />
                                             </CommandItem>
                                          ))}
                                       </CommandGroup>
                                    </CommandList>
                                 </Command>
                              </PopoverContent>
                           </Popover>
                        )}
                     />
                     {errors.state && (
                        <FieldDescription className="text-xs text-red-500">{errors.state.message}</FieldDescription>
                     )}
                  </Field>

                  <Field className="gap-2">
                     <FieldLabel>Address</FieldLabel>
                     <Input
                        placeholder="Building, street, city, PIN"
                        className={errors.address ? "border-red-500" : ""}
                        {...register("address", {
                           required: "Address is required",
                           minLength: { value: 5, message: "Min. 5 characters" },
                        })}
                     />
                     {errors.address && (
                        <FieldDescription className="text-xs text-red-500">{errors.address.message}</FieldDescription>
                     )}
                  </Field>

                  <Field className="gap-2">
                     <FieldLabel>
                        GST Number <span className="font-normal text-muted-foreground">(optional)</span>
                     </FieldLabel>
                     <Input
                        placeholder="22AAAAA0000A1Z5"
                        maxLength={15}
                        className={errors.gstNumber ? "border-red-500" : ""}
                        {...register("gstNumber", {
                           setValueAs: (v: string) => v.toUpperCase(),
                           validate: (v) =>
                              !v ||
                              /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v) ||
                              "Invalid GST number",
                        })}
                     />
                     {errors.gstNumber && (
                        <FieldDescription className="text-xs text-red-500">{errors.gstNumber.message}</FieldDescription>
                     )}
                  </Field>

                  <div className="flex gap-3">
                     <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={goBack}
                        disabled={signupMutation.isPending}
                     >
                        <ArrowLeft className="mr-1.5 size-4" />
                        Back
                     </Button>
                     <Button
                        type="submit"
                        className="flex-1 cursor-pointer font-semibold"
                        disabled={signupMutation.isPending}
                     >
                        {signupMutation.isPending ? "Creating account…" : "Create Account"}
                        {signupMutation.isPending && <Spinner className="ml-2" />}
                     </Button>
                  </div>
               </div>

              </div>
            {/* </div>*/}

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
