import { cn } from "@/src/lib/utils"

const Logo = ({ className }: { className?: string }) => {
   return (
      <div className={cn('flex items-center gap-2', className)}>
         <div className="grid grid-cols-2 gap-0.5">
            {[...Array(4)].map((_, i) => (
               <div key={i} className="w-2 h-2 rounded-sm bg-primary" />
            ))}
         </div>
         <span className="font-heading text-xl font-bold text-hero-foreground">
            PORTAL
         </span>
      </div>
   )
}

export default Logo