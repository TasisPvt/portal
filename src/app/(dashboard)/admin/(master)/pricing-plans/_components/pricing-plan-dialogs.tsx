"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PlusIcon, Pencil, Trash2, PowerIcon } from "lucide-react"

import {
   createPricingPlan,
   updatePricingPlan,
   deletePricingPlan,
   togglePricingPlanStatus,
   type PlanInput,
   type PlanType,
} from "../_actions"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Badge } from "@/src/components/ui/badge"
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
   Select,
   SelectContent,
   SelectGroup,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/src/components/ui/select"
import { AlertDestructive } from "@/src/components/alerts/alertDestructive"
import { cn } from "@/src/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IndexOption = { id: string; name: string }

type FormValues = {
   name: string
   type: PlanType
   indexId: string
   // one-time
   oneTimePrice: string
   oneTimeStocksPerDay: string
   oneTimeStocksInDuration: string
   // monthly (snapshot only)
   monthlyPrice: string
   monthlyStocksPerDay: string
   monthlyStocksInDuration: string
   // quarterly
   quarterlyPrice: string
   quarterlyStocksPerDay: string
   quarterlyStocksInDuration: string
   // annual
   annualPrice: string
   annualStocksPerDay: string
   annualStocksInDuration: string
}

export type PricingPlanRow = {
   id: string
   name: string
   type: string
   isActive: boolean
   indexId: string | null
   indexName: string | null
   oneTimePrice: string | null
   monthlyPrice: string | null
   quarterlyPrice: string | null
   annualPrice: string | null
   oneTimeStocksPerDay: number | null
   oneTimeStocksInDuration: number | null
   monthlyStocksPerDay: number | null
   monthlyStocksInDuration: number | null
   quarterlyStocksPerDay: number | null
   quarterlyStocksInDuration: number | null
   annualStocksPerDay: number | null
   annualStocksInDuration: number | null
   createdById: string | null
   createdByName: string | null
   createdAt: Date
}

// ---------------------------------------------------------------------------
// Duration config
// ---------------------------------------------------------------------------

const SNAPSHOT_DURATIONS = [
   { key: "oneTime" as const, label: "One-time" },
   { key: "monthly" as const, label: "Monthly" },
   { key: "quarterly" as const, label: "Quarterly" },
   { key: "annual" as const, label: "Annual" },
]

const LIST_DURATIONS = [
   { key: "oneTime" as const, label: "One-time" },
   { key: "quarterly" as const, label: "Quarterly" },
   { key: "annual" as const, label: "Annual" },
]

type DurationKey = "oneTime" | "monthly" | "quarterly" | "annual"

function priceField(key: DurationKey): keyof FormValues {
   return `${key}Price` as keyof FormValues
}
function spd(key: DurationKey): keyof FormValues {
   return `${key}StocksPerDay` as keyof FormValues
}
function sid(key: DurationKey): keyof FormValues {
   return `${key}StocksInDuration` as keyof FormValues
}

// ---------------------------------------------------------------------------
// Shared form
// ---------------------------------------------------------------------------

function PricingPlanForm({
   defaultValues,
   onSubmit,
   isPending,
   serverError,
   submitLabel,
   indexes,
   lockType,
}: {
   defaultValues?: Partial<FormValues>
   onSubmit: (input: PlanInput) => void
   isPending: boolean
   serverError: string | null
   submitLabel: string
   indexes: IndexOption[]
   lockType?: PlanType
}) {
   const {
      register,
      handleSubmit,
      watch,
      setValue,
      formState: { errors },
   } = useForm<FormValues>({
      // Unregister fields when they're unmounted (e.g. monthly fields when
      // switching to list). This keeps validation planType-independent below.
      shouldUnregister: true,
      defaultValues: {
         name: "",
         type: "snapshot",
         indexId: "",
         oneTimePrice: "", oneTimeStocksPerDay: "", oneTimeStocksInDuration: "",
         monthlyPrice: "", monthlyStocksPerDay: "", monthlyStocksInDuration: "",
         quarterlyPrice: "", quarterlyStocksPerDay: "", quarterlyStocksInDuration: "",
         annualPrice: "", annualStocksPerDay: "", annualStocksInDuration: "",
         ...defaultValues,
      },
   })

   const planType = lockType ?? watch("type") ?? "snapshot"

   // Validation helpers — planType-independent because shouldUnregister: true
   // ensures these rules only run when the field is actually rendered.
   const reqPosInt = (v: string) =>
      (!!v && Number.isInteger(Number(v)) && Number(v) > 0) || "Required"
   const reqPosNum = (v: string) =>
      (!!v && parseFloat(v) > 0) || "Required (> 0)"

   function buildInput(data: FormValues): PlanInput {
      const isSnapshot = planType === "snapshot"
      return {
         name: data.name.trim(),
         type: planType,
         indexId: !isSnapshot ? data.indexId : null,
         oneTimePrice: data.oneTimePrice,
         monthlyPrice: isSnapshot ? data.monthlyPrice : null,
         quarterlyPrice: data.quarterlyPrice,
         annualPrice: data.annualPrice,
         oneTimeStocksPerDay: isSnapshot ? parseInt(data.oneTimeStocksPerDay) : null,
         oneTimeStocksInDuration: isSnapshot ? parseInt(data.oneTimeStocksInDuration) : null,
         monthlyStocksPerDay: isSnapshot ? parseInt(data.monthlyStocksPerDay) : null,
         monthlyStocksInDuration: isSnapshot ? parseInt(data.monthlyStocksInDuration) : null,
         quarterlyStocksPerDay: isSnapshot ? parseInt(data.quarterlyStocksPerDay) : null,
         quarterlyStocksInDuration: isSnapshot ? parseInt(data.quarterlyStocksInDuration) : null,
         annualStocksPerDay: isSnapshot ? parseInt(data.annualStocksPerDay) : null,
         annualStocksInDuration: isSnapshot ? parseInt(data.annualStocksInDuration) : null,
      }
   }

   const durations = planType === "snapshot" ? SNAPSHOT_DURATIONS : LIST_DURATIONS

   return (
      <form onSubmit={handleSubmit((d) => onSubmit(buildInput(d)))} noValidate className="flex flex-col gap-5">
         {serverError && <AlertDestructive title={serverError} />}

         {/* Name */}
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="pp-name">Plan Name</Label>
            <Input
               id="pp-name"
               placeholder="e.g. Basic Snapshot"
               className={errors.name ? "border-destructive" : ""}
               {...register("name", { required: "Name is required", minLength: { value: 2, message: "Min. 2 characters" } })}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
         </div>

         {/* Type */}
         {lockType ? (
            <div className="flex flex-col gap-1.5">
               <Label>Plan Type</Label>
               <div>
                  <TypeBadge type={lockType} />
                  <p className="mt-1 text-xs text-muted-foreground">Plan type cannot be changed after creation.</p>
               </div>
            </div>
         ) : (
            <div className="flex flex-col gap-1.5">
               <Label>Plan Type</Label>
               <div className="grid grid-cols-2 gap-2">
                  {(["snapshot", "list"] as PlanType[]).map((t) => (
                     <button
                        key={t}
                        type="button"
                        onClick={() => setValue("type", t)}
                        className={cn(
                           "rounded-lg border px-4 py-3 text-sm font-medium capitalize transition-colors text-left",
                           planType === t
                              ? t === "snapshot"
                                 ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                 : "border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-300"
                              : "border-border text-muted-foreground hover:bg-muted/50",
                        )}
                     >
                        {t}
                     </button>
                  ))}
               </div>
            </div>
         )}

         {/* Index (list only) */}
         {planType === "list" && (
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="pp-index">Index</Label>
               <Select value={watch("indexId")} onValueChange={(v) => setValue("indexId", v)}>
                  <SelectTrigger id="pp-index" className={errors.indexId ? "border-destructive" : ""}>
                     <SelectValue placeholder="Select an index…" />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectGroup>
                        {indexes.map((idx) => (
                           <SelectItem key={idx.id} value={idx.id}>{idx.name}</SelectItem>
                        ))}
                     </SelectGroup>
                  </SelectContent>
               </Select>
               <input type="hidden" {...register("indexId", {
                  validate: (v) => !!v || "Index is required",
               })} />
               {errors.indexId && <p className="text-xs text-destructive">{errors.indexId.message}</p>}
            </div>
         )}

         {/* Duration rows */}
         <div className="flex flex-col gap-2">
            <Label>Durations &amp; Pricing</Label>

            {/* Header */}
            <div className={cn(
               "grid gap-2 px-1 text-xs font-medium text-muted-foreground",
               planType === "snapshot" ? "grid-cols-[120px_1fr_1fr_1fr]" : "grid-cols-[120px_1fr]",
            )}>
               <span>Duration</span>
               {planType === "snapshot" && <span>Stocks / Day</span>}
               {planType === "snapshot" && <span>Stocks in Duration</span>}
               <span>Price (₹)</span>
            </div>

            <div className="flex flex-col gap-2">
               {durations.map(({ key, label }) => {
                  const pf = priceField(key)
                  const spdF = spd(key)
                  const sidF = sid(key)
                  return (
                     <div
                        key={key}
                        className={cn(
                           "grid items-start gap-2",
                           planType === "snapshot" ? "grid-cols-[120px_1fr_1fr_1fr]" : "grid-cols-[120px_1fr]",
                        )}
                     >
                        <div className="flex h-9 items-center">
                           <span className="text-sm text-muted-foreground">{label}</span>
                        </div>

                        {planType === "snapshot" && (
                           <>
                              <div className="flex flex-col gap-1">
                                 <Input
                                    type="number" min="1" step="1" placeholder="e.g. 10"
                                    className={cn("tabular-nums", errors[spdF] ? "border-destructive" : "")}
                                    {...register(spdF, { validate: reqPosInt })}
                                 />
                                 {errors[spdF] && <p className="text-xs text-destructive">{errors[spdF]?.message}</p>}
                              </div>
                              <div className="flex flex-col gap-1">
                                 <Input
                                    type="number" min="1" step="1" placeholder="e.g. 300"
                                    className={cn("tabular-nums", errors[sidF] ? "border-destructive" : "")}
                                    {...register(sidF, { validate: reqPosInt })}
                                 />
                                 {errors[sidF] && <p className="text-xs text-destructive">{errors[sidF]?.message}</p>}
                              </div>
                           </>
                        )}

                        <div className="flex flex-col gap-1">
                           <Input
                              type="number" min="0" step="0.01" placeholder="0.00"
                              className={cn("tabular-nums", errors[pf] ? "border-destructive" : "")}
                              {...register(pf, { validate: reqPosNum })}
                           />
                           {errors[pf] && <p className="text-xs text-destructive">{errors[pf]?.message}</p>}
                        </div>
                     </div>
                  )
               })}
            </div>
         </div>

         <DialogFooter>
            <Button type="submit" disabled={isPending}>
               {isPending ? "Saving…" : submitLabel}
               {isPending && <Spinner className="ml-2" />}
            </Button>
         </DialogFooter>
      </form>
   )
}

// Exported so the table can reuse it
export function TypeBadge({ type }: { type: string }) {
   return (
      <Badge variant="outline" className={cn(
         "text-xs font-normal capitalize",
         type === "snapshot"
            ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400"
            : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400",
      )}>
         {type}
      </Badge>
   )
}

// ---------------------------------------------------------------------------
// Add dialog
// ---------------------------------------------------------------------------

export function AddPricingPlanDialog({ indexes }: { indexes: IndexOption[] }) {
   const [open, setOpen] = React.useState(false)
   const [serverError, setServerError] = React.useState<string | null>(null)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   function handleOpenChange(val: boolean) {
      if (!val) setServerError(null)
      setOpen(val)
   }

   function onSubmit(input: PlanInput) {
      setServerError(null)
      startTransition(async () => {
         const result = await createPricingPlan(input)
         if (result.success) {
            toast.success(`Plan "${input.name}" created.`)
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
               Add Plan
            </Button>
         </DialogTrigger>
         <DialogContent className="sm:max-w-xl">
            <DialogHeader>
               <DialogTitle>Add Pricing Plan</DialogTitle>
            </DialogHeader>
            <PricingPlanForm
               onSubmit={onSubmit}
               isPending={isPending}
               serverError={serverError}
               submitLabel="Create Plan"
               indexes={indexes}
            />
         </DialogContent>
      </Dialog>
   )
}

// ---------------------------------------------------------------------------
// Edit dialog
// ---------------------------------------------------------------------------

export function EditPricingPlanDialog({
   plan,
   indexes,
}: {
   plan: PricingPlanRow
   indexes: IndexOption[]
}) {
   const [open, setOpen] = React.useState(false)
   const [serverError, setServerError] = React.useState<string | null>(null)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   const planType = plan.type as PlanType

   const defaultValues: FormValues = {
      name: plan.name,
      type: planType,
      indexId: plan.indexId ?? "",
      oneTimePrice: plan.oneTimePrice ?? "",
      oneTimeStocksPerDay: plan.oneTimeStocksPerDay != null ? String(plan.oneTimeStocksPerDay) : "",
      oneTimeStocksInDuration: plan.oneTimeStocksInDuration != null ? String(plan.oneTimeStocksInDuration) : "",
      monthlyPrice: plan.monthlyPrice ?? "",
      monthlyStocksPerDay: plan.monthlyStocksPerDay != null ? String(plan.monthlyStocksPerDay) : "",
      monthlyStocksInDuration: plan.monthlyStocksInDuration != null ? String(plan.monthlyStocksInDuration) : "",
      quarterlyPrice: plan.quarterlyPrice ?? "",
      quarterlyStocksPerDay: plan.quarterlyStocksPerDay != null ? String(plan.quarterlyStocksPerDay) : "",
      quarterlyStocksInDuration: plan.quarterlyStocksInDuration != null ? String(plan.quarterlyStocksInDuration) : "",
      annualPrice: plan.annualPrice ?? "",
      annualStocksPerDay: plan.annualStocksPerDay != null ? String(plan.annualStocksPerDay) : "",
      annualStocksInDuration: plan.annualStocksInDuration != null ? String(plan.annualStocksInDuration) : "",
   }

   function handleOpenChange(val: boolean) {
      if (!val) setServerError(null)
      setOpen(val)
   }

   function onSubmit(input: PlanInput) {
      setServerError(null)
      startTransition(async () => {
         const result = await updatePricingPlan(plan.id, input)
         if (result.success) {
            toast.success("Plan updated.")
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
         <DialogContent className="sm:max-w-xl">
            <DialogHeader>
               <DialogTitle>Edit Pricing Plan</DialogTitle>
            </DialogHeader>
            <PricingPlanForm
               defaultValues={defaultValues}
               onSubmit={onSubmit}
               isPending={isPending}
               serverError={serverError}
               submitLabel="Save Changes"
               indexes={indexes}
               lockType={planType}
            />
         </DialogContent>
      </Dialog>
   )
}

// ---------------------------------------------------------------------------
// Status toggle dialog
// ---------------------------------------------------------------------------

export function PlanStatusToggle({ id, name, isActive }: { id: string; name: string; isActive: boolean }) {
   const [open, setOpen] = React.useState(false)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   const action = isActive ? "deactivate" : "activate"
   const label = isActive ? "Deactivate" : "Activate"

   function handleConfirm() {
      startTransition(async () => {
         const result = await togglePricingPlanStatus(id, !isActive)
         if (result.success) {
            toast.success(`"${name}" ${action}d.`)
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
            <Button
               variant="ghost"
               size="icon"
               className={cn(
                  "size-7",
                  isActive
                     ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                     : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-950",
               )}
            >
               <PowerIcon className="size-3.5" />
            </Button>
         </DialogTrigger>
         <DialogContent className="sm:max-w-sm">
            <DialogHeader>
               <DialogTitle>{label} Plan</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
               Are you sure you want to {action}{" "}
               <span className="font-medium text-foreground">&quot;{name}&quot;</span>?
            </p>
            <DialogFooter>
               <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
               <Button
                  onClick={handleConfirm}
                  disabled={isPending}
                  className={isActive
                     ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                     : "bg-emerald-600 text-white hover:bg-emerald-700"}
               >
                  {isPending ? "Updating…" : `Yes, ${label}`}
                  {isPending && <Spinner className="ml-2" />}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   )
}

// ---------------------------------------------------------------------------
// Delete dialog
// ---------------------------------------------------------------------------

export function DeletePricingPlanButton({ id, name }: { id: string; name: string }) {
   const [open, setOpen] = React.useState(false)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   function handleDelete() {
      startTransition(async () => {
         const result = await deletePricingPlan(id)
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
               <DialogTitle>Delete Plan</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
               Are you sure you want to delete{" "}
               <span className="font-medium text-foreground">&quot;{name}&quot;</span>? This action cannot be undone.
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
