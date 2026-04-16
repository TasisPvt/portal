"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PlusIcon } from "lucide-react"

import { createAdminUser } from "../_actions"
import { AlertDestructive } from "@/src/components/alerts/alertDestructive"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Spinner } from "@/src/components/ui/spinner"
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select"

type CreateAdminInput = {
  name: string
  email: string
  adminRole: "super_admin" | "admin" | "manager"
}

const ROLES = [
  // { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
] as const

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function AddUserDialog() {
  const [open, setOpen] = React.useState(false)
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const router = useRouter()

  const { register, handleSubmit, control, reset, setError, formState: { errors } } =
    useForm<CreateAdminInput>()

  function handleOpenChange(val: boolean) {
    if (!val) {
      reset()
      setServerError(null)
    }
    setOpen(val)
  }

  function onSubmit(data: CreateAdminInput) {
    setServerError(null)
    startTransition(async () => {
      const result = await createAdminUser(data)
      if (result.success) {
        toast.success(`User "${data.name}" created. Credentials sent to ${data.email}.`)
        setOpen(false)
        router.refresh()
      } else if (result.field && result.field in data) {
        setError(result.field as keyof CreateAdminInput, { message: result.message })
      } else {
        setServerError(result.message ?? "Failed to create user")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <PlusIcon className="size-3.5" />
          Add User
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            A temporary password will be generated and sent to the user&apos;s email address.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {serverError && <AlertDestructive className="mb-4" title={serverError} />}

          <div className="grid grid-cols-1 gap-4 py-2">

            <FormField label="Full Name" error={errors.name?.message}>
              <Input
                placeholder="John Smith"
                className={errors.name ? "border-destructive" : ""}
                {...register("name", {
                  required: "Full name is required",
                  minLength: { value: 2, message: "Min. 2 characters" },
                })}
              />
            </FormField>

            <FormField label="Email Address" error={errors.email?.message}>
              <Input
                type="email"
                placeholder="john@example.com"
                className={errors.email ? "border-destructive" : ""}
                {...register("email", {
                  required: "Email is required",
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email format" },
                })}
              />
            </FormField>

            <FormField label="Role" error={errors.adminRole?.message}>
              <Controller
                name="adminRole"
                control={control}
                rules={{ required: "Role is required" }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={`w-full ${errors.adminRole ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Select a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create User"}
              {isPending && <Spinner className="ml-2" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
