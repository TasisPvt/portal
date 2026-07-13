"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PowerIcon } from "lucide-react"
import { toggleUserStatus } from "../_actions"
import { Button } from "@/src/components/ui/button"
import { Label } from "@/src/components/ui/label"
import { Textarea } from "@/src/components/ui/textarea"
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
  const [reason, setReason] = React.useState("")
  const router = useRouter()

  const action = isActive ? "deactivate" : "activate"
  const actionLabel = isActive ? "Deactivate" : "Activate"

  function handleOpenChange(val: boolean) {
    if (!val) setReason("")
    setOpen(val)
  }

  async function handleConfirm() {
    if (!reason.trim()) return
    setPending(true)
    try {
      await toggleUserStatus(id, !isActive, reason)
      toast.success(`${name} has been ${action}d successfully.`)
      handleOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="user-status-reason">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="user-status-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`Why are you ${action.replace(/e$/, "")}ing this account?`}
            rows={3}
            autoFocus
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">This reason is recorded in the account history.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={pending || !reason.trim()}
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
