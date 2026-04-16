"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateUserRole } from "../_actions"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select"

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
] as const

type AdminRole = "super_admin" | "admin" | "manager"

interface Props {
  id: string
  currentRole: AdminRole | null
}

export function RoleSelect({ id, currentRole }: Props) {
  const [pending, setPending] = React.useState(false)
  const router = useRouter()

  async function handleChange(value: string) {
    setPending(true)
    try {
      await updateUserRole(id, value as AdminRole)
      toast.success("Role updated successfully.")
      router.refresh()
    } catch {
      toast.error("Failed to update role. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Select
      value={currentRole ?? undefined}
      onValueChange={handleChange}
      disabled={pending}
    >
      <SelectTrigger className="w-40 h-8 text-sm">
        <SelectValue placeholder="Select role..." />
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
  )
}
