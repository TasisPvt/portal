// Client-only: lazily injects the Razorpay Checkout script and resolves once ready.

export type RazorpayCheckoutResponse = {
   razorpay_payment_id: string
   razorpay_order_id: string
   razorpay_signature: string
}

export type RazorpayOptions = {
   key: string
   amount: number
   currency: string
   order_id: string
   name?: string
   description?: string
   prefill?: { name?: string; email?: string; contact?: string }
   notes?: Record<string, string>
   theme?: { color?: string }
   handler?: (response: RazorpayCheckoutResponse) => void
   modal?: { ondismiss?: () => void }
}

export type RazorpayInstance = {
   open: () => void
   on: (event: string, handler: (response: { error?: unknown }) => void) => void
}

declare global {
   interface Window {
      Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
   }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js"
let loadPromise: Promise<boolean> | null = null

export function loadRazorpay(): Promise<boolean> {
   if (typeof window === "undefined") return Promise.resolve(false)
   if (window.Razorpay) return Promise.resolve(true)
   if (loadPromise) return loadPromise

   loadPromise = new Promise<boolean>((resolve) => {
      const script = document.createElement("script")
      script.src = SCRIPT_SRC
      script.onload = () => resolve(true)
      script.onerror = () => {
         loadPromise = null
         resolve(false)
      }
      document.body.appendChild(script)
   })
   return loadPromise
}
