import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert"
import { AlertCircleIcon } from "lucide-react"
import { cn } from "@/src/lib/utils"

export function AlertDestructive({ title, description, className }: { title: string, description?: string, className?: string }) {
   return (
      <Alert className={cn(className, "max-w-md bg-red-500/80 text-white")}>
         <AlertCircleIcon />
         <AlertTitle>{title}</AlertTitle>
         {description &&
            <AlertDescription>
               {description}
            </AlertDescription>
         }
      </Alert>
   )
}