import { NextResponse } from "next/server"
import { headers } from "next/headers"

import { auth } from "@/src/lib/auth"
import { getInvoicePdfForClient } from "@/src/lib/invoice/generate"

// GET /api/payments/:id/invoice → streams the tax invoice PDF for a paid payment
// the logged-in client owns. Ownership + paid status are enforced in the query.
export async function GET(
   _req: Request,
   { params }: { params: Promise<{ id: string }> },
) {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
   }

   const { id } = await params

   let result: Awaited<ReturnType<typeof getInvoicePdfForClient>>
   try {
      result = await getInvoicePdfForClient(id, session.user.id)
   } catch (err) {
      console.error("[GET invoice] render failed", err)
      return NextResponse.json({ message: "Could not generate the invoice." }, { status: 500 })
   }

   if (!result) {
      return NextResponse.json({ message: "Invoice not available" }, { status: 404 })
   }

   return new NextResponse(new Uint8Array(result.pdf), {
      status: 200,
      headers: {
         "Content-Type": "application/pdf",
         "Content-Disposition": `attachment; filename="Invoice-${result.invoiceNumber}.pdf"`,
         "Cache-Control": "private, no-store",
      },
   })
}
