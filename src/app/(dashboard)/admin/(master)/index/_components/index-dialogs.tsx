"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PlusIcon, Pencil, Trash2 } from "lucide-react"

import { createIndex, updateIndex, deleteIndex, type IndexInput } from "../_actions"
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
   Popover,
   PopoverContent,
   PopoverDescription,
   PopoverHeader,
   PopoverTitle,
   PopoverTrigger,
} from "@/src/components/ui/popover"
import { AlertDestructive } from "@/src/components/alerts/alertDestructive"

function IndexForm({
   defaultValues,
   onSubmit,
   isPending,
   serverError,
   submitLabel,
}: {
   defaultValues?: Partial<IndexInput>
   onSubmit: (data: IndexInput) => void
   isPending: boolean
   serverError: string | null
   submitLabel: string
}) {
   const { register, handleSubmit, formState: { errors } } = useForm<IndexInput>({ defaultValues })

   return (
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
         {serverError && <AlertDestructive title={serverError} />}

         <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Index Name</Label>
            <Input
               placeholder="e.g. Nifty 50"
               className={errors.name ? "border-destructive" : ""}
               {...register("name", { required: "Index name is required" })}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
         </div>

         <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">
               Description
               <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
               placeholder="e.g. Top 50 large-cap companies on NSE"
               {...register("description")}
            />
         </div>

         <DialogFooter>
            <Button type="submit" disabled={isPending}>
               {isPending ? `${submitLabel}…` : submitLabel}
               {isPending && <Spinner className="ml-2" />}
            </Button>
         </DialogFooter>
      </form>
   )
}

export function AddIndexDialog() {
   const [open, setOpen] = React.useState(false)
   const [serverError, setServerError] = React.useState<string | null>(null)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   function handleOpenChange(val: boolean) {
      if (!val) setServerError(null)
      setOpen(val)
   }

   function onSubmit(data: IndexInput) {
      setServerError(null)
      startTransition(async () => {
         const result = await createIndex(data)
         if (result.success) {
            toast.success(`Index "${data.name}" created.`)
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
               Add Index
            </Button>
         </DialogTrigger>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Add Index</DialogTitle>
            </DialogHeader>
            <IndexForm onSubmit={onSubmit} isPending={isPending} serverError={serverError} submitLabel="Create Index" />
         </DialogContent>
      </Dialog>
   )
}

export function EditIndexDialog({ index }: { index: { id: string; name: string; description: string | null } }) {
   const [open, setOpen] = React.useState(false)
   const [serverError, setServerError] = React.useState<string | null>(null)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   function handleOpenChange(val: boolean) {
      if (!val) setServerError(null)
      setOpen(val)
   }

   function onSubmit(data: IndexInput) {
      setServerError(null)
      startTransition(async () => {
         const result = await updateIndex(index.id, data)
         if (result.success) {
            toast.success(`"${data.name}" updated.`)
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
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Edit Index</DialogTitle>
            </DialogHeader>
            <IndexForm
               defaultValues={{ name: index.name, description: index.description ?? "" }}
               onSubmit={onSubmit}
               isPending={isPending}
               serverError={serverError}
               submitLabel="Save Changes"
            />
         </DialogContent>
      </Dialog>
   )
}

export function DeleteIndexButton({
   id,
   name,
   planNames = [],
}: {
   id: string
   name: string
   planNames?: string[]
}) {
   const [open, setOpen] = React.useState(false)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   function handleDelete() {
      startTransition(async () => {
         const result = await deleteIndex(id)
         if (result.success) {
            toast.success(`"${name}" deleted.`)
            setOpen(false)
            router.refresh()
         } else {
            toast.error(result.message)
         }
      })
   }

   // The index is attached to one or more pricing plans - block the delete up
   // front. The trigger looks disabled but still opens a popover explaining why,
   // so the user learns the reason without opening the dialog and confirming.
   if (planNames.length > 0) {
      return (
         <Popover>
            <PopoverTrigger asChild>
               <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Cannot delete "${name}" - in use by a pricing plan`}
                  className="size-7 text-muted-foreground/50 hover:text-muted-foreground/50"
               >
                  <Trash2 className="size-3.5" />
               </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 gap-2">
               <PopoverHeader>
                  <PopoverTitle className="text-sm">Can&apos;t delete this index</PopoverTitle>
                  <PopoverDescription className="text-xs">
                     It&apos;s used by {planNames.length === 1 ? "the pricing plan" : `${planNames.length} pricing plans`}{" "}
                     {planNames.map((n) => `"${n}"`).join(", ")}. Remove it from{" "}
                     {planNames.length === 1 ? "that plan" : "those plans"} first.
                  </PopoverDescription>
               </PopoverHeader>
            </PopoverContent>
         </Popover>
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
               <DialogTitle>Delete Index</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
               Are you sure you want to delete <span className="font-medium text-foreground">&quot;{name}&quot;</span>?
               All company memberships in this index will also be removed.
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
