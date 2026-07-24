import { Check } from "lucide-react"
import { cn } from "@/src/lib/utils"

export const PASSWORD_RULES = [
   { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
   { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
   { label: "One number", test: (p: string) => /[0-9]/.test(p) },
   { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const

// Max length matches better-auth's default `maxPasswordLength` (128), so a valid
// UI password is never silently rejected by the server.
export const PASSWORD_MAX_LENGTH = 128

const STRENGTH = [
   { label: "Too short", bar: "bg-muted-foreground/30", text: "text-muted-foreground" },
   { label: "Weak", bar: "bg-destructive", text: "text-destructive" },
   { label: "Fair", bar: "bg-orange-500", text: "text-orange-500" },
   { label: "Good", bar: "bg-blue-500", text: "text-blue-500" },
   { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-500" },
] as const

// All rules met — reuse in a react-hook-form `validate` so the shown rules block submit.
export const passwordMeetsRules = (p: string) => PASSWORD_RULES.every((r) => r.test(p))

export function PasswordStrength({ value, className }: { value: string; className?: string }) {
   const passed = PASSWORD_RULES.map((r) => r.test(value))
   const score = value ? passed.filter(Boolean).length : 0

   return (
      <div className={className}>
         {/* Strength meter */}
         <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Strength</span>
            <span className={cn("font-semibold", STRENGTH[score].text)}>{STRENGTH[score].label}</span>
         </div>
         <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
               className={cn("h-full rounded-full transition-all duration-300", STRENGTH[score].bar)}
               style={{ width: `${(score / PASSWORD_RULES.length) * 100}%` }}
            />
         </div>

         {/* Requirement checklist */}
         <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
            {PASSWORD_RULES.map((r, i) => (
               <li
                  key={r.label}
                  className={cn(
                     "flex items-center gap-1.5 text-xs",
                     passed[i] ? "text-foreground" : "text-muted-foreground/60",
                  )}
               >
                  <Check className={cn("size-3.5 shrink-0", passed[i] ? "text-emerald-500" : "text-muted-foreground/40")} />
                  {r.label}
               </li>
            ))}
         </ul>
      </div>
   )
}
