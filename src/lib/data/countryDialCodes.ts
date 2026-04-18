import countries from "i18n-iso-countries"
import enLocale from "i18n-iso-countries/langs/en.json"
import { getCountryCallingCode, type CountryCode } from "libphonenumber-js"

countries.registerLocale(enLocale)

export interface CountryDialEntry {
  iso: CountryCode
  label: string
  dial: string
}

// Build list from i18n-iso-countries + libphonenumber-js, India pinned first
const allCountries: CountryDialEntry[] = Object.entries(countries.getNames("en"))
  .map(([iso, name]) => {
    try {
      const calling = getCountryCallingCode(iso as CountryCode)
      return { iso: iso as CountryCode, label: name, dial: `+${calling}` }
    } catch {
      return null
    }
  })
  .filter(Boolean) as CountryDialEntry[]

// Pin India at top, rest alphabetical
const india = allCountries.find((c) => c.iso === "IN")!
export const countryDialCodes: CountryDialEntry[] = [
  india,
  ...allCountries.filter((c) => c.iso !== "IN"),
]

/** Convert ISO 3166-1 alpha-2 code to flag emoji */
export function countryCodeToFlag(iso: string): string {
  return [...iso.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("")
}
