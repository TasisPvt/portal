"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PowerIcon } from "lucide-react"
import { toggleUserActive } from "../_actions"
import { Button } from "@/src/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog"

interface Props {
  id: string
  name: string
  isActive: boolean
}

export function StatusToggle({ id, name, isActive }: Props) {
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const router = useRouter()

  const action = isActive ? "deactivate" : "activate"
  const actionLabel = isActive ? "Deactivate" : "Activate"

  async function handleConfirm() {
    setPending(true)
    try {
      await toggleUserActive(id, !isActive)
      toast.success(`${name} has been ${action}d successfully.`)
      setOpen(false)
      router.refresh()
    } catch {
      toast.error("Failed to update status. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={
            isActive
              ? "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950"
          }
        >
          <PowerIcon className="size-3.5" />
          {actionLabel}
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{actionLabel} User</DialogTitle>
          <DialogDescription>
            Are you sure you want to {action}{" "}
            <span className="font-medium text-foreground">{name}</span>?
            {isActive
              ? " They will lose access to the platform immediately."
              : " They will regain access to the platform."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={pending}
            className={
              isActive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }
          >
            {pending ? "Updating..." : `Yes, ${actionLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
