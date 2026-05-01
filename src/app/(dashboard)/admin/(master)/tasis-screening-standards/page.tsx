import { getScreeningStandards } from "./_actions"
import { StandardsForm } from "./_components/standards-form"

export default async function TasisScreeningStandardsPage() {
   const standards = await getScreeningStandards()

   return (
      <div className="flex flex-col gap-6 p-6">
         <div>
            <h1 className="text-xl font-semibold">TASIS Screening Standards</h1>
            <p className="mt-1 text-sm text-muted-foreground">
               Set the standard screening text for each shariah status. This text is shown on the stock snapshot page when no company-specific remark is available.
            </p>
         </div>
         <StandardsForm data={standards} />
      </div>
   )
}
