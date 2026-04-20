"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PlusIcon, Pencil, Trash2, ChevronsUpDown, Check } from "lucide-react"

import { createCompany, updateCompany, deleteCompany, type CompanyInput } from "../_actions"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Spinner } from "@/src/components/ui/spinner"
import {
   Dialog,
   DialogContent,
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
import { AlertDestructive } from "@/src/components/alerts/alertDestructive"
import { cn } from "@/src/lib/utils"

type IndustryGroupOption = { id: string; name: string }

function FormField({ label, error, optional, children }: {
   label: string
   error?: string
   optional?: boolean
   children: React.ReactNode
}) {
   return (
      <div className="flex flex-col gap-1.5">
         <Label className="text-sm font-medium">
            {label}
            {optional && <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>}
         </Label>
         {children}
         {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
   )
}

function CompanyForm({
   defaultValues,
   onSubmit,
   isPending,
   serverError,
   submitLabel,
   industryGroups,
}: {
   defaultValues?: Partial<CompanyInput>
   onSubmit: (data: CompanyInput) => void
   isPending: boolean
   serverError: string | null
   submitLabel: string
   industryGroups: IndustryGroupOption[]
}) {
   const [igOpen, setIgOpen] = React.useState(false)
   const { register, handleSubmit, control, formState: { errors } } = useForm<CompanyInput>({
      defaultValues,
   })

   return (
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
         <div className="flex-1 overflow-y-auto no-scrollbar px-1">
            {serverError && <AlertDestructive className="mb-4" title={serverError} />}
            <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">

               <FormField label="Prowess ID" error={errors.prowessId?.message}>
                  <Input
                     placeholder="e.g. 10001"
                     className={errors.prowessId ? "border-destructive" : ""}
                     {...register("prowessId", { required: "Prowess ID is required" })}
                  />
               </FormField>

               <FormField label="Company Name" error={errors.companyName?.message}>
                  <Input
                     placeholder="e.g. Infosys Ltd"
                     className={errors.companyName ? "border-destructive" : ""}
                     {...register("companyName", { required: "Company name is required" })}
                  />
               </FormField>

               <FormField label="ISIN Code" optional error={errors.isinCode?.message}>
                  <Input
                     placeholder="e.g. INE009A01021"
                     className={errors.isinCode ? "border-destructive" : ""}
                     {...register("isinCode", {
                        pattern: { value: /^[A-Z]{2}[A-Z0-9]{10}$/, message: "Invalid ISIN format" },
                        setValueAs: (v: string) => v ? v.toUpperCase() : v,
                     })}
                  />
               </FormField>

               <FormField label="Service Group" optional error={errors.serviceGroup?.message}>
                  <Input
                     placeholder="e.g. IT Services"
                     {...register("serviceGroup")}
                  />
               </FormField>

               <FormField label="Industry Group" optional>
                  <Controller
                     name="industryGroupId"
                     control={control}
                     render={({ field }) => (
                        <Popover open={igOpen} onOpenChange={setIgOpen}>
                           <PopoverTrigger asChild>
                              <Button
                                 variant="outline"
                                 role="combobox"
                                 aria-expanded={igOpen}
                                 className={cn(
                                    "w-full justify-between font-normal",
                                    !field.value && "text-muted-foreground",
                                 )}
                              >
                                 <span className="truncate">
                                    {field.value
                                       ? industryGroups.find((g) => g.id === field.value)?.name
                                       : "Select industry group…"}
                                 </span>
                                 <ChevronsUpDown className="ml-2 shrink-0 opacity-50" />
                              </Button>
                           </PopoverTrigger>
                           <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                 <CommandInput placeholder="Search…" className="h-9" />
                                 <CommandList>
                                    <CommandEmpty>No groups found.</CommandEmpty>
                                    <CommandGroup>
                                       <CommandItem
                                          value=""
                                          onSelect={() => { field.onChange(undefined); setIgOpen(false) }}
                                       >
                                          <span className="text-muted-foreground">None</span>
                                       </CommandItem>
                                       {industryGroups.map((g) => (
                                          <CommandItem
                                             key={g.id}
                                             value={g.name}
                                             onSelect={() => { field.onChange(g.id); setIgOpen(false) }}
                                          >
                                             {g.name}
                                             <Check className={cn("ml-auto", field.value === g.id ? "opacity-100" : "opacity-0")} />
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

               <FormField label="BSE Scrip Code" optional error={errors.bseScripCode?.message}>
                  <Input
                     placeholder="e.g. 500209"
                     {...register("bseScripCode")}
                  />
               </FormField>

               <FormField label="BSE Scrip ID" optional error={errors.bseScripId?.message}>
                  <Input
                     placeholder="e.g. INFY"
                     {...register("bseScripId")}
                  />
               </FormField>

               <FormField label="BSE Group" optional error={errors.bseGroup?.message}>
                  <Input
                     placeholder="e.g. A"
                     {...register("bseGroup")}
                  />
               </FormField>

               <FormField label="NSE Symbol" optional error={errors.nseSymbol?.message}>
                  <Input
                     placeholder="e.g. INFY"
                     {...register("nseSymbol")}
                  />
               </FormField>

               <FormField label="NSE Listing Date" optional>
                  <Input type="date" {...register("nseListingDate")} />
               </FormField>

               <FormField label="NSE Delisting Date" optional>
                  <Input type="date" {...register("nseDelistingDate")} />
               </FormField>

               <FormField label="BSE Listing Date" optional>
                  <Input type="date" {...register("bseListingDate")} />
               </FormField>

               <FormField label="BSE Delisting Date" optional>
                  <Input type="date" {...register("bseDelistingDate")} />
               </FormField>

            </div>
         </div>

         <DialogFooter className="mt-4 shrink-0">
            <Button type="submit" disabled={isPending}>
               {isPending ? `${submitLabel}…` : submitLabel}
               {isPending && <Spinner className="ml-2" />}
            </Button>
         </DialogFooter>
      </form>
   )
}

export function AddCompanyDialog({ industryGroups }: { industryGroups: IndustryGroupOption[] }) {
   const [open, setOpen] = React.useState(false)
   const [serverError, setServerError] = React.useState<string | null>(null)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   function handleOpenChange(val: boolean) {
      if (!val) setServerError(null)
      setOpen(val)
   }

   function onSubmit(data: CompanyInput) {
      setServerError(null)
      startTransition(async () => {
         const result = await createCompany(data)
         if (result.success) {
            toast.success(`Company "${data.companyName}" created.`)
            setOpen(false)
            router.refresh()
         } else {
            setServerError(result.message)
         }
      })
   }

   return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
         <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
               <PlusIcon className="size-3.5" />
               Add Company
            </Button>
         </DialogTrigger>
         <DialogContent className="flex max-h-[90dvh] w-full flex-col overflow-hidden sm:max-w-2xl">
            <DialogHeader>
               <DialogTitle>Add Company</DialogTitle>
            </DialogHeader>
            <CompanyForm
               onSubmit={onSubmit}
               isPending={isPending}
               serverError={serverError}
               submitLabel="Create Company"
               industryGroups={industryGroups}
            />
         </DialogContent>
      </Dialog>
   )
}

export function EditCompanyDialog({
   company,
   industryGroups,
}: {
   company: {
      id: string
      prowessId: string
      companyName: string
      isinCode: string | null
      bseScripCode: string | null
      bseScripId: string | null
      bseGroup: string | null
      nseSymbol: string | null
      serviceGroup: string | null
      nseListingDate: string | null
      nseDelistingDate: string | null
      bseListingDate: string | null
      bseDelistingDate: string | null
      industryGroupId: string | null
   }
   industryGroups: IndustryGroupOption[]
}) {
   const [open, setOpen] = React.useState(false)
   const [serverError, setServerError] = React.useState<string | null>(null)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   function handleOpenChange(val: boolean) {
      if (!val) setServerError(null)
      setOpen(val)
   }

   function onSubmit(data: CompanyInput) {
      setServerError(null)
      startTransition(async () => {
         const result = await updateCompany(company.id, data)
         if (result.success) {
            toast.success(`"${data.companyName}" updated.`)
            setOpen(false)
            router.refresh()
         } else {
            setServerError(result.message)
         }
      })
   }

   return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
         <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7">
               <Pencil className="size-3.5" />
            </Button>
         </DialogTrigger>
         <DialogContent className="flex max-h-[90dvh] w-full flex-col overflow-hidden sm:max-w-2xl">
            <DialogHeader>
               <DialogTitle>Edit Company</DialogTitle>
            </DialogHeader>
            <CompanyForm
               defaultValues={{
                  prowessId: company.prowessId,
                  companyName: company.companyName,
                  isinCode: company.isinCode ?? "",
                  bseScripCode: company.bseScripCode ?? "",
                  bseScripId: company.bseScripId ?? "",
                  bseGroup: company.bseGroup ?? "",
                  nseSymbol: company.nseSymbol ?? "",
                  serviceGroup: company.serviceGroup ?? "",
                  nseListingDate: company.nseListingDate ?? "",
                  nseDelistingDate: company.nseDelistingDate ?? "",
                  bseListingDate: company.bseListingDate ?? "",
                  bseDelistingDate: company.bseDelistingDate ?? "",
                  industryGroupId: company.industryGroupId ?? "",
               }}
               onSubmit={onSubmit}
               isPending={isPending}
               serverError={serverError}
               submitLabel="Save Changes"
               industryGroups={industryGroups}
            />
         </DialogContent>
      </Dialog>
   )
}

export function DeleteCompanyButton({ id, name }: { id: string; name: string }) {
   const [open, setOpen] = React.useState(false)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   function handleDelete() {
      startTransition(async () => {
         const result = await deleteCompany(id)
         if (result.success) {
            toast.success(`"${name}" deleted.`)
            setOpen(false)
            router.refresh()
         } else {
            toast.error(result.message)
         }
      })
   }

   return (
      <Dialog open={open} onOpenChange={setOpen}>
         <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive">
               <Trash2 className="size-3.5" />
            </Button>
         </DialogTrigger>
         <DialogContent className="sm:max-w-sm">
            <DialogHeader>
               <DialogTitle>Delete Company</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
               Are you sure you want to delete <span className="font-medium text-foreground">&quot;{name}&quot;</span>?
               This action cannot be undone.
            </p>
            <DialogFooter>
               <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
               <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                  {isPending ? "Deleting…" : "Delete"}
                  {isPending && <Spinner className="ml-2" />}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   )
}
