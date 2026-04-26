export function getCurrentMonth(): string {
   const now = new Date()
   return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export function isMonthEditable(month: string): boolean {
   return month === getCurrentMonth()
}

export function formatMonthLabel(month: string): string {
   const [year, m] = month.split("-")
   return new Date(Number(year), Number(m) - 1).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
   })
}
