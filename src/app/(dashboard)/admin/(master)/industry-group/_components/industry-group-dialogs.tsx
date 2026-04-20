"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PlusIcon, Pencil, Trash2 } from "lucide-react"

import { createIndustryGroup, updateIndustryGroup, deleteIndustryGroup } from "../_actions"
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
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from "@/src/components/ui/tooltip"
import { AlertDestructive } from "@/src/components/alerts/alertDestructive"

// ── Shared form ───────────────────────────────────────────────────────────────

type FormValues = { name: string }

function IndustryGroupForm({
   defaultValues,
   onSubmit,
   isPending,
   serverError,
   submitLabel,
}: {
   defaultValues?: FormValues
   onSubmit: (data: FormValues) => void
   isPending: boolean
   serverError: string | null
   submitLabel: string
}) {
   const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ defaultValues })

   return (
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
         {serverError && <AlertDestructive title={serverError} />}
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="ig-name">Name</Label>
            <Input
               id="ig-name"
               placeholder="e.g. Technology"
               className={errors.name ? "border-destructive" : ""}
               {...register("name", { required: "Name is required", minLength: { value: 2, message: "Min. 2 characters" } })}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
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

// ── Add ───────────────────────────────────────────────────────────────────────

export function AddIndustryGroupDialog() {
   const [open, setOpen] = React.useState(false)
   const [serverError, setServerError] = React.useState<string | null>(null)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   function handleOpenChange(val: boolean) {
      if (!val) setServerError(null)
      setOpen(val)
   }

   function onSubmit(data: FormValues) {
      setServerError(null)
      startTransition(async () => {
         const result = await createIndustryGroup(data)
         if (result.success) {
            toast.success(`Industry group "${data.name}" created.`)
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
               Add Industry Group
            </Button>
         </DialogTrigger>
         <DialogContent className="sm:max-w-sm">
            <DialogHeader>
               <DialogTitle>Add Industry Group</DialogTitle>
            </DialogHeader>
            <IndustryGroupForm
               onSubmit={onSubmit}
               isPending={isPending}
               serverError={serverError}
               submitLabel="Create"
            />
         </DialogContent>
      </Dialog>
   )
}

// ── Edit ──────────────────────────────────────────────────────────────────────

export function EditIndustryGroupDialog({ id, name }: { id: string; name: string }) {
   const [open, setOpen] = React.useState(false)
   const [serverError, setServerError] = React.useState<string | null>(null)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   function handleOpenChange(val: boolean) {
      if (!val) setServerError(null)
      setOpen(val)
   }

   function onSubmit(data: FormValues) {
      setServerError(null)
      startTransition(async () => {
         const result = await updateIndustryGroup(id, data)
         if (result.success) {
            toast.success("Industry group updated.")
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
         <DialogContent className="sm:max-w-sm">
            <DialogHeader>
               <DialogTitle>Edit Industry Group</DialogTitle>
            </DialogHeader>
            <IndustryGroupForm
               defaultValues={{ name }}
               onSubmit={onSubmit}
               isPending={isPending}
               serverError={serverError}
               submitLabel="Save"
            />
         </DialogContent>
      </Dialog>
   )
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function DeleteIndustryGroupButton({ id, name, locked }: { id: string; name: string; locked?: boolean }) {
   const [open, setOpen] = React.useState(false)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   function handleDelete() {
      startTransition(async () => {
         const result = await deleteIndustryGroup(id)
         if (result.success) {
            toast.success(`"${name}" deleted.`)
            setOpen(false)
            router.refresh()
         } else {
            toast.error(result.message)
         }
      })
   }

   if (locked) {
      return (
         <Tooltip>
            <TooltipTrigger asChild>
               <span className="inline-flex size-7 cursor-not-allowed items-center justify-center">
                  <Trash2 className="size-3.5 text-muted-foreground/40" />
               </span>
            </TooltipTrigger>
            <TooltipContent>
               <p>Remove companies before deleting</p>
            </TooltipContent>
         </Tooltip>
      )
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
               <DialogTitle>Delete Industry Group</DialogTitle>
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
