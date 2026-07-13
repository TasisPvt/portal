// Lightweight user-agent describer — enough to label a login ("Chrome on
// Windows") and pick a device icon, without pulling in a parsing dependency.

export type DeviceKind = "Desktop" | "Mobile" | "Tablet"

export type UaInfo = {
   browser: string
   os: string
   device: DeviceKind
   label: string
}

export function describeUserAgent(ua: string | null | undefined): UaInfo {
   if (!ua) return { browser: "Unknown", os: "Unknown", device: "Desktop", label: "Unknown device" }

   let os = "Unknown"
   if (/iPhone|iPad|iPod/.test(ua)) os = "iOS"
   else if (/Android/.test(ua)) os = "Android"
   else if (/Windows/.test(ua)) os = "Windows"
   else if (/Mac OS X|Macintosh/.test(ua)) os = "macOS"
   else if (/CrOS/.test(ua)) os = "ChromeOS"
   else if (/Linux/.test(ua)) os = "Linux"

   // Order matters: Edge/Opera masquerade as Chrome; Chrome contains "Safari".
   let browser = "Unknown"
   if (/Edg\//.test(ua)) browser = "Edge"
   else if (/OPR\/|Opera/.test(ua)) browser = "Opera"
   else if (/Chrome\//.test(ua)) browser = "Chrome"
   else if (/Firefox\//.test(ua)) browser = "Firefox"
   else if (/Safari\//.test(ua)) browser = "Safari"

   let device: DeviceKind = "Desktop"
   if (/iPad|Tablet/.test(ua)) device = "Tablet"
   else if (/Mobile|iPhone|Android/.test(ua)) device = "Mobile"

   const label =
      browser !== "Unknown" && os !== "Unknown"
         ? `${browser} on ${os}`
         : browser !== "Unknown"
           ? browser
           : os !== "Unknown"
             ? os
             : "Unknown device"

   return { browser, os, device, label }
}
