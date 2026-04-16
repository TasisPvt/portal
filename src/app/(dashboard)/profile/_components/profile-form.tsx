"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CameraIcon, HomeIcon, UserIcon } from "lucide-react"
import { Card, CardContent } from "@/src/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/src/components/ui/tabs"
import { updateDisplayName } from "../_actions"

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("")
}

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="flex h-9 items-center rounded-xl border border-input bg-input/50 px-3 text-sm text-muted-foreground">
        {value || <span className="opacity-40">—</span>}
      </div>
    </div>
  )
}

function MaskedField({ label, value }: { label: string; value: string | null | undefined }) {
  const [revealed, setRevealed] = React.useState(false)
  const masked = value ? value.replace(/./g, "•") : null
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      <div
        className="flex h-9 cursor-pointer items-center justify-between rounded-xl border border-input bg-input/50 px-3 text-sm text-muted-foreground select-none"
        onClick={() => setRevealed((r) => !r)}
        title={revealed ? "Click to hide" : "Click to reveal"}
      >
        <span className="font-mono tracking-widest">
          {value ? (revealed ? value : masked) : <span className="opacity-40">—</span>}
        </span>
        {value && (
          <span className="ml-2 shrink-0 text-xs text-muted-foreground/60">
            {revealed ? "hide" : "show"}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ProfileData {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  userType: string
  adminRole: string | null
  phone: string | null
  state: string | null
  username: string | null
  aadharNumber: string | null
  panNumber: string | null
}

type PersonalForm = { name: string }
type SecurityForm = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ProfileForm({
  profile,
  passwordUpdatedAt,
}: {
  profile: ProfileData
  passwordUpdatedAt: Date | null
}) {
  const router = useRouter()
  const isClient = profile.userType === "client"

  // ── Personal form ─────────────────────────────────────────────────────────
  const {
    register: regPersonal,
    handleSubmit: handlePersonal,
    formState: { errors: personalErrors },
  } = useForm<PersonalForm>({ defaultValues: { name: profile.name } })

  const saveMutation = useMutation({
    mutationFn: ({ name }: PersonalForm) => updateDisplayName(name),
    onSuccess: () => {
      toast.success("Profile updated successfully.")
      router.refresh()
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save changes."),
  })

  // ── Security form ─────────────────────────────────────────────────────────
  const {
    register: regSecurity,
    handleSubmit: handleSecurity,
    watch,
    reset: resetSecurity,
    setError: setSecurityError,
    formState: { errors: securityErrors },
  } = useForm<SecurityForm>({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  const passwordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: SecurityForm) => {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Failed to change password.")
    },
    onSuccess: () => {
      toast.success("Password has been changed successfully.")
      resetSecurity()
    },
    onError: (err: Error) => {
      const msg = err.message || "Failed to change password."
      // Surface incorrect-password errors inline on the field
      if (msg.toLowerCase().includes("incorrect") || msg.toLowerCase().includes("invalid")) {
        setSecurityError("currentPassword", { message: "Incorrect password. Please try again." })
      } else {
        toast.error(msg)
      }
    },
  })

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ════════════ Left panel ════════════ */}
      <Card size="sm" className="flex shrink-0 flex-col items-center gap-4 py-10! lg:w-64">

        {/* Avatar with camera button */}
        <div className="relative">
          <Avatar className="size-24 ring-2 ring-border ring-offset-2 ring-offset-card">
            {profile.image ? (
              <AvatarImage src={profile.image} alt={profile.name} />
            ) : (
              <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                {getInitials(profile.name)}
              </AvatarFallback>
            )}
          </Avatar>
          <label className="absolute bottom-0 right-0 flex size-7 cursor-pointer items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-muted">
            <CameraIcon className="size-3.5 text-muted-foreground" />
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif"
              className="sr-only"
            />
          </label>
        </div>

        {/* Name & email */}
        <div className="flex flex-col items-center gap-0.5 text-center">
          <p className="text-sm font-semibold">{profile.name}</p>
          <p className="text-xs text-muted-foreground">{profile.email}</p>
        </div>

        {/* User type badge */}
        {/* <Badge variant="outline" className="capitalize">
          {isClient ? "Client" : (ROLE_LABELS[profile.adminRole ?? ""] ?? "Admin")}
        </Badge> */}

      </Card>

      {/* ════════════ Right panel ════════════ */}
      <Card size="sm" className="min-w-0 flex-1 py-0">
        <Tabs defaultValue="personal" className="gap-0">

          {/* Tab list */}
          <TabsList
            variant="line"
            className="h-auto w-full justify-start gap-0 rounded-none rounded-t-xl border-b px-4"
          >
            <TabsTrigger
              value="personal"
              className="gap-1.5 rounded-none px-4 py-3 text-xs font-medium after:bottom-[-1px] after:bg-primary"
            >
              <HomeIcon className="size-3.5" />
              Personal Details
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="gap-1.5 rounded-none px-4 py-3 text-xs font-medium after:bottom-[-1px] after:bg-primary"
            >
              <UserIcon className="size-3.5" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* ── Personal Details ── */}
          <TabsContent value="personal">
            <form onSubmit={handlePersonal((data) => saveMutation.mutate(data))} noValidate>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">

                  {/* Name — editable for both */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold">Name</Label>
                    <Input
                      id="name"
                      className={personalErrors.name ? "border-destructive" : ""}
                      {...regPersonal("name", {
                        required: "Name is required",
                        minLength: { value: 2, message: "Min. 2 characters" },
                      })}
                    />
                    {personalErrors.name && (
                      <p className="text-xs text-destructive">{personalErrors.name.message}</p>
                    )}
                  </div>

                  {isClient ? (
                    <>
                      {/* Username */}
                      <ReadOnlyField label="Username" value={profile.username ? `@${profile.username}` : null} />

                      {/* State */}
                      <ReadOnlyField label="State" value={profile.state} />

                      {/* Mobile */}
                      <ReadOnlyField label="Mobile" value={profile.phone} />

                      {/* Aadhar Number — masked */}
                      <MaskedField label="Aadhar Number" value={profile.aadharNumber} />

                      {/* PAN Number — masked */}
                      <MaskedField label="PAN Number" value={profile.panNumber} />
                    </>
                  ) : (
                    <>
                      {/* Role — admin only */}
                      <ReadOnlyField
                        label="Role"
                        value={ROLE_LABELS[profile.adminRole ?? ""] ?? "Admin"}
                      />
                    </>
                  )}

                </div>

                <div className="mt-6 flex justify-end">
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </CardContent>
            </form>
          </TabsContent>

          {/* ── Security ── */}
          <TabsContent value="security">
            <form
              onSubmit={handleSecurity((data) => passwordMutation.mutate(data))}
              noValidate
            >
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">

                  {/* Old Password */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="currentPassword" className="text-xs font-semibold">
                      Old Password <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="Enter current password"
                      className={securityErrors.currentPassword ? "border-destructive" : ""}
                      {...regSecurity("currentPassword", { required: "Current password is required" })}
                    />
                    {securityErrors.currentPassword && (
                      <p className="text-xs text-destructive">{securityErrors.currentPassword.message}</p>
                    )}
                  </div>

                  {/* New Password */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="newPassword" className="text-xs font-semibold">
                      New Password <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                      className={securityErrors.newPassword ? "border-destructive" : ""}
                      {...regSecurity("newPassword", {
                        required: "New password is required",
                        minLength: { value: 8, message: "Min. 8 characters" },
                      })}
                    />
                    {securityErrors.newPassword && (
                      <p className="text-xs text-destructive">{securityErrors.newPassword.message}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                      Confirm Password <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm password"
                      className={securityErrors.confirmPassword ? "border-destructive" : ""}
                      {...regSecurity("confirmPassword", {
                        required: "Please confirm your password",
                        validate: (val) =>
                          val === watch("newPassword") || "Passwords do not match",
                      })}
                    />
                    {securityErrors.confirmPassword && (
                      <p className="text-xs text-destructive">{securityErrors.confirmPassword.message}</p>
                    )}
                  </div>

                </div>

                {/* Last updated */}
                {passwordUpdatedAt && (
                  <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    Last Password Updated:
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 font-normal text-primary">
                      {passwordUpdatedAt.toLocaleString()}
                    </Badge>
                  </p>
                )}

                <div className="mt-6 flex justify-end">
                  <Button
                    type="submit"
                    disabled={passwordMutation.isPending}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                  >
                    {passwordMutation.isPending ? "Updating..." : "Change Password"}
                  </Button>
                </div>
              </CardContent>
            </form>
          </TabsContent>

        </Tabs>
      </Card>
    </div>
  )
}
