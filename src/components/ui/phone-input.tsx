"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { parsePhoneNumber, isPossiblePhoneNumber } from "libphonenumber-js/max"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
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
import {
  countryDialCodes,
  countryCodeToFlag,
  type CountryDialEntry,
} from "@/src/lib/data/countryDialCodes"
import { cn } from "@/src/lib/utils"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseFullPhone(phone: string | undefined): { country: CountryDialEntry; local: string } {
  if (!phone) return { country: countryDialCodes[0], local: "" }
  try {
    const parsed = parsePhoneNumber(phone)
    const country = countryDialCodes.find((c) => c.iso === parsed.country) ?? countryDialCodes[0]
    return { country, local: parsed.nationalNumber as string }
  } catch {
    return { country: countryDialCodes[0], local: phone }
  }
}

// ─── Validation helper (use in Controller rules) ──────────────────────────────

export function validatePhone(value: string): true | string {
  if (!value) return "Phone number is required"
  try {
    return isPossiblePhoneNumber(value) || "Enter a valid phone number"
  } catch {
    return "Enter a valid phone number"
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface PhoneInputProps {
  /** Full E.164-style value e.g. "+919876543210" — set by Controller */
  value?: string
  /** Called with the full number whenever country or local number changes */
  onChange?: (value: string) => void
  error?: string
  disabled?: boolean
  className?: string
}

export function PhoneInput({
  value,
  onChange,
  error,
  disabled,
  className,
}: PhoneInputProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedCountry, setSelectedCountry] = React.useState<CountryDialEntry>(
    () => parseFullPhone(value).country,
  )
  const [localNumber, setLocalNumber] = React.useState(
    () => parseFullPhone(value).local,
  )

  // Sync internal state when form resets (value becomes empty)
  React.useEffect(() => {
    if (!value) {
      setLocalNumber("")
      setSelectedCountry(countryDialCodes[0])
    }
  }, [value])

  const handleCountryChange = (country: CountryDialEntry) => {
    setSelectedCountry(country)
    onChange?.(`${country.dial}${localNumber}`)
    setOpen(false)
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setLocalNumber(val)
    onChange?.(`${selectedCountry.dial}${val}`)
  }

  return (
    <div className={cn("flex gap-2", className)}>
      {/* Country code picker */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="shrink-0 gap-1.5 px-3 font-normal"
          >
            <span>{countryCodeToFlag(selectedCountry.iso)}</span>
            <span className="text-muted-foreground">{selectedCountry.dial}</span>
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0">
          <Command>
            <CommandInput placeholder="Search country..." className="h-9" />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {countryDialCodes.map((c) => (
                  <CommandItem
                    key={c.iso}
                    value={`${c.label} ${c.dial} ${c.iso}`}
                    onSelect={() => handleCountryChange(c)}
                  >
                    <span className="mr-2">{countryCodeToFlag(c.iso)}</span>
                    <span className="flex-1 truncate">{c.label}</span>
                    <span className="text-muted-foreground">{c.dial}</span>
                    <Check
                      className={cn(
                        "ml-2 size-4 shrink-0",
                        selectedCountry.iso === c.iso ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Local number input */}
      <Input
        type="tel"
        placeholder={selectedCountry.iso === "IN" ? "9876543210" : "Phone number"}
        value={localNumber}
        onChange={handleNumberChange}
        disabled={disabled}
        className={cn("flex-1", error ? "border-destructive border-red-500" : "")}
      />
    </div>
  )
}
