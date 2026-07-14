"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PlusIcon, Pencil, CircleOff, CircleCheck, ChevronsUpDown, Check, ListOrderedIcon, CalendarIcon } from "lucide-react"

import { createCompany, updateCompany, toggleCompanyStatus, getCompanyIndexes, type CompanyInput } from "../_actions"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Spinner } from "@/src/components/ui/spinner"
import { Calendar } from "@/src/components/ui/calendar"
import { formatDate } from "@/src/lib/format"
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

// Bounds for the calendar's year dropdown — listing dates can be decades old.
const CAL_START = new Date(1950, 0)
const CAL_END = new Date(new Date().getFullYear() + 1, 11)

/** Parse a "yyyy-mm-dd" form value into a local Date (no timezone shift). */
function parseDateValue(value?: string | null): Date | undefined {
   if (!value) return undefined
   const [y, m, d] = value.split("-").map(Number)
   if (!y || !m || !d) return undefined
   return new Date(y, m - 1, d)
}

/** Serialize a Date back to a "yyyy-mm-dd" string in local time. */
function formatDateValue(date: Date): string {
   const y = date.getFullYear()
   const m = String(date.getMonth() + 1).padStart(2, "0")
   const d = String(date.getDate()).padStart(2, "0")
   return `${y}-${m}-${d}`
}

/**
 * Single-date picker backed by the shared Calendar, storing its value as a
 * "yyyy-mm-dd" string so it drops into the existing form/server contract.
 */
function DateField({ value, onChange }: { value?: string; onChange: (value: string) => void }) {
   const [open, setOpen] = React.useState(false)
   const selected = parseDateValue(value)

   return (
      <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
            <Button
               type="button"
               variant="outline"
               className={cn("w-full justify-start gap-2 font-normal", !selected && "text-muted-foreground")}
            >
               <CalendarIcon className="size-4 opacity-60" />
               {selected ? formatDate(selected) : "Select date"}
            </Button>
         </PopoverTrigger>
         <PopoverContent className="w-auto p-0" align="start">
            <Calendar
               mode="single"
               captionLayout="dropdown"
               startMonth={CAL_START}
               endMonth={CAL_END}
               defaultMonth={selected}
               selected={selected}
               onSelect={(d) => {
                  onChange(d ? formatDateValue(d) : "")
                  setOpen(false)
               }}
               autoFocus
            />
            {selected && (
               <div className="flex justify-end border-t p-2">
                  <Button
                     type="button"
                     variant="ghost"
                     size="sm"
                     className="text-xs"
                     onClick={() => {
                        onChange("")
                        setOpen(false)
                     }}
                  >
                     Clear
                  </Button>
               </div>
            )}
         </PopoverContent>
      </Popover>
   )
}

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
         <div className="@container flex-1 overflow-y-auto no-scrollbar px-1">
            {serverError && <AlertDestructive className="mb-4" title={serverError} />}
            <div className="grid grid-cols-1 gap-4 py-2 @lg:grid-cols-2">

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
                  <Controller
                     name="nseListingDate"
                     control={control}
                     render={({ field }) => <DateField value={field.value} onChange={field.onChange} />}
                  />
               </FormField>

               <FormField label="NSE Delisting Date" optional>
                  <Controller
                     name="nseDelistingDate"
                     control={control}
                     render={({ field }) => <DateField value={field.value} onChange={field.onChange} />}
                  />
               </FormField>

               <FormField label="BSE Listing Date" optional>
                  <Controller
                     name="bseListingDate"
                     control={control}
                     render={({ field }) => <DateField value={field.value} onChange={field.onChange} />}
                  />
               </FormField>

               <FormField label="BSE Delisting Date" optional>
                  <Controller
                     name="bseDelistingDate"
                     control={control}
                     render={({ field }) => <DateField value={field.value} onChange={field.onChange} />}
                  />
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

export function ToggleCompanyStatusButton({
   id,
   name,
   isActive,
}: {
   id: string
   name: string
   isActive: boolean
}) {
   const [open, setOpen] = React.useState(false)
   const [indexes, setIndexes] = React.useState<{ id: string; name: string }[]>([])
   const [isFetching, setIsFetching] = React.useState(false)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   async function handleClick() {
      if (isActive) {
         setIsFetching(true)
         try {
            const result = await getCompanyIndexes(id)
            setIndexes(result)
         } finally {
            setIsFetching(false)
         }
      }
      setOpen(true)
   }

   function handleConfirm() {
      startTransition(async () => {
         const result = await toggleCompanyStatus(id, !isActive)
         if (result.success) {
            toast.success(`"${name}" ${isActive ? "deactivated" : "activated"}.`)
            setOpen(false)
            router.refresh()
         } else {
            toast.error(result.message)
         }
      })
   }

   return (
      <>
         <Button
            variant="ghost"
            size="icon"
            className={cn(
               "size-7",
               isActive
                  ? "text-muted-foreground hover:text-destructive"
                  : "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400",
            )}
            onClick={handleClick}
            disabled={isFetching}
            title={isActive ? "Deactivate" : "Activate"}
         >
            {isFetching
               ? <Spinner className="size-3.5" />
               : isActive
                  ? <CircleOff className="size-3.5" />
                  : <CircleCheck className="size-3.5" />}
         </Button>

         <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-sm">
               <DialogHeader>
                  <DialogTitle>{isActive ? "Deactivate Company" : "Activate Company"}</DialogTitle>
               </DialogHeader>

               <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">
                     {isActive
                        ? <>Are you sure you want to deactivate <span className="font-medium text-foreground">&quot;{name}&quot;</span>?</>
                        : <>Are you sure you want to activate <span className="font-medium text-foreground">&quot;{name}&quot;</span>?</>}
                  </p>

                  {isActive && indexes.length > 0 && (
                     <div className="rounded-lg border bg-muted/40 p-3 flex flex-col gap-2">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                           This company will be removed from {indexes.length} index{indexes.length !== 1 ? "es" : ""}:
                        </p>
                        <ul className="flex flex-col gap-1">
                           {indexes.map((idx) => (
                              <li key={idx.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                                 <ListOrderedIcon className="size-3.5 shrink-0" />
                                 {idx.name}
                              </li>
                           ))}
                        </ul>
                     </div>
                  )}
               </div>

               <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                     Cancel
                  </Button>
                  <Button
                     variant={isActive ? "destructive" : "default"}
                     onClick={handleConfirm}
                     disabled={isPending}
                  >
                     {isPending ? (isActive ? "Deactivating…" : "Activating…") : (isActive ? "Deactivate" : "Activate")}
                     {isPending && <Spinner className="ml-2" />}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </>
   )
}
