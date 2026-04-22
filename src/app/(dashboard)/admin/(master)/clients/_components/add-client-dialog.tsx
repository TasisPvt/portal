"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PlusIcon, ChevronsUpDown, Check } from "lucide-react"

import { createClient } from "../_actions"
import { AlertDestructive } from "@/src/components/alerts/alertDestructive"

import { stateData } from "@/src/lib/data/stateData"
import { cn } from "@/src/lib/utils"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { PhoneInput, validatePhone } from "@/src/components/ui/phone-input"
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/src/components/ui/dialog"
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
import { Spinner } from "@/src/components/ui/spinner"

type CreateClientInput = {
   name: string
   email: string
   username: string
   phone: string
   aadharNumber: string
   panNumber: string
   state: string
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
   return (
      <div className="flex flex-col gap-1.5">
         <Label className="text-sm font-medium">{label}</Label>
         {children}
         {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
   )
}

export function AddClientDialog() {
   const [open, setOpen] = React.useState(false)
   const [statePopoverOpen, setStatePopoverOpen] = React.useState(false)
   const [serverError, setServerError] = React.useState<string | null>(null)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   const { register, handleSubmit, control, reset, setError, formState: { errors } } = useForm<CreateClientInput>()

   function handleOpenChange(val: boolean) {
      if (!val) {
         reset()
         setServerError(null)
      }
      setOpen(val)
   }

   function onSubmit(data: CreateClientInput) {
      setServerError(null)
      startTransition(async () => {
         const result = await createClient(data)
         if (result.success) {
            toast.success(`Client "${data.name}" created. Credentials sent to ${data.email}.`)
            setOpen(false)
            router.refresh()
         } else if (result.field && result.field in data) {
            setError(result.field as keyof CreateClientInput, { message: result.message })
         } else {
            setServerError(result.message ?? "Failed to create client")
         }
      })
   }

   return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
         <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
               <PlusIcon className="size-3.5" />
               Add Client
            </Button>
         </DialogTrigger>

         <DialogContent className="flex max-h-[90dvh] w-full flex-col overflow-hidden sm:max-w-2xl">
            <DialogHeader>
               <DialogTitle>Add New Client</DialogTitle>
               <DialogDescription>
                  A temporary password will be generated and sent to the client&apos;s email address.
               </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
               <div className="flex-1 no-scrollbar overflow-y-auto px-1">
                  {serverError && (
                     <AlertDestructive className="mb-4" title={serverError} />
                  )}
                  <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">

                     <FormField label="Full Name" error={errors.name?.message}>
                        <Input
                           placeholder=""
                           {...register("name", { required: "Full name is required", minLength: { value: 2, message: "Min. 2 characters" } })}
                           className={errors.name ? "border-destructive" : ""}
                        />
                     </FormField>

                     <FormField label="Username" error={errors.username?.message}>
                        <Input
                           placeholder=""
                           {...register("username", {
                              required: "Username is required",
                              minLength: { value: 3, message: "Min. 3 characters" },
                              maxLength: { value: 30, message: "Max. 30 characters" },
                              pattern: { value: /^[a-z0-9_]+$/, message: "Lowercase, digits and underscores only" },
                           })}
                           className={errors.username ? "border-destructive" : ""}
                        />
                     </FormField>

                     <FormField label="Email Address" error={errors.email?.message}>
                        <Input
                           type="email"
                           placeholder=""
                           {...register("email", {
                              required: "Email is required",
                              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email format" },
                           })}
                           className={errors.email ? "border-destructive" : ""}
                        />
                     </FormField>

                     <FormField label="Phone Number" error={errors.phone?.message}>
                        <Controller
                           name="phone"
                           control={control}
                           rules={{ validate: validatePhone }}
                           render={({ field }) => (
                              <PhoneInput
                                 value={field.value}
                                 onChange={field.onChange}
                                 error={errors.phone?.message}
                              />
                           )}
                        />
                     </FormField>

                     <FormField label="Aadhar Number" error={errors.aadharNumber?.message}>
                        <Input
                           placeholder="234567890123"
                           maxLength={12}
                           {...register("aadharNumber", {
                              required: "Aadhar number is required",
                              pattern: { value: /^\d{12}$/, message: "Must be exactly 12 digits" },
                           })}
                           className={errors.aadharNumber ? "border-destructive" : ""}
                        />
                     </FormField>

                     <FormField label="PAN Number" error={errors.panNumber?.message}>
                        <Input
                           placeholder="ABCDE1234F"
                           maxLength={10}
                           {...register("panNumber", {
                              required: "PAN number is required",
                              pattern: { value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: "Invalid PAN (e.g. ABCDE1234F)" },
                              setValueAs: (v: string) => v.toUpperCase(),
                           })}
                           className={errors.panNumber ? "border-destructive" : ""}
                        />
                     </FormField>

                     <FormField label="State" error={errors.state?.message}>
                        <Controller
                           name="state"
                           control={control}
                           rules={{ required: "State is required" }}
                           render={({ field }) => (
                              <Popover open={statePopoverOpen} onOpenChange={setStatePopoverOpen}>
                                 <PopoverTrigger asChild>
                                    <Button
                                       variant="outline"
                                       role="combobox"
                                       aria-expanded={statePopoverOpen}
                                       className={cn(
                                          "w-full justify-between font-normal",
                                          errors.state ? "border-destructive" : "",
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
                                 <PopoverContent className="w-[--radix-popover-trigger-width] p-0" onWheel={(e) => e.stopPropagation()}>
                                    <Command>
                                       <CommandInput placeholder="Search state..." className="h-9" />
                                       <CommandList>
                                          <CommandEmpty>No state found.</CommandEmpty>
                                          <CommandGroup>
                                             {stateData.map((s) => (
                                                <CommandItem
                                                   key={s.value}
                                                   value={s.value}
                                                   onSelect={(val) => {
                                                      field.onChange(val === field.value ? "" : val)
                                                      setStatePopoverOpen(false)
                                                   }}
                                                >
                                                   {s.label}
                                                   <Check className={cn("ml-auto", field.value === s.value ? "opacity-100" : "opacity-0")} />
                                                </CommandItem>
                                             ))}
                                          </CommandGroup>
                                       </CommandList>
                                    </Command>
                                 </PopoverContent>
                              </Popover>
                           )}
                        />
                     </FormField>

                  </div>
               </div>

               <DialogFooter className="mt-4 shrink-0">
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
                     Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                     {isPending ? "Creating…" : "Create Client"}
                     {isPending && <Spinner className="ml-2" />}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   )
}
