import { ShieldCheckIcon } from "lucide-react"

import { SiteHeader } from "@/src/components/site-header"
import { BrandedLoader } from "@/src/components/branded-loader"

export default function ConfirmPaymentLoading() {
   return (
      <>
         <SiteHeader title="Payment" />
         <BrandedLoader
            icon={ShieldCheckIcon}
            title="Confirming your payment"
            messages={[
               "Verifying your transaction…",
               "Activating your subscription…",
               "Almost done…",
            ]}
         />
      </>
   )
}
