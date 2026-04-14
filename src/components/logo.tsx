import { cn } from "@/src/lib/utils"

interface LogoProps {
   className?: string
   white?: boolean
}

const Logo = ({ className, white = false }: LogoProps) => {
   return (
      <div className={cn('flex items-center gap-2', className)}>
         <div className="grid grid-cols-2 gap-0.5">
            {[...Array(4)].map((_, i) => (
               <div
                  key={i}
                  className={cn("size-2 rounded-sm", white ? "bg-white" : "bg-primary")}
               />
            ))}
         </div>
         <span className={cn("font-heading text-xl font-bold", white ? "text-white" : "text-hero-foreground")}>
            PORTAL
         </span>
      </div>
   )
}

export default Logo
