import type * as React from "react"

import { ACCOUNT_BLOCKED_MESSAGE, SUPPORT_EMAIL } from "@/src/lib/constants"

// Renders an auth error string for display. The blocked-account message is
// upgraded to include a clickable "TASIS support" mailto link; everything else
// is returned as-is. Keep the wording in sync with ACCOUNT_BLOCKED_MESSAGE.
export function renderAuthError(message: string): React.ReactNode {
   if (message === ACCOUNT_BLOCKED_MESSAGE) {
      return (
         <>
            Your account has been blocked. Contact the{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium underline underline-offset-2">
               TASIS support
            </a>{" "}
            for further details.
         </>
      )
   }
   return message
}
