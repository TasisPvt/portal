import Image from "next/image"
import { cn } from "@/src/lib/utils"
interface LogoProps {
   className?: string
   white?: boolean
}

const Logo = ({ className, white = false }: LogoProps) => {
   return (
      <div className={cn('flex justify-center w-full', className)}>
         {/* <div className="grid grid-cols-2 gap-0.5">
            {[...Array(4)].map((_, i) => (
               <div
                  key={i}
                  className={cn("size-2 rounded-sm", white ? "bg-white" : "bg-primary")}
               />
            ))}
         </div>
         <span className={cn("font-heading text-xl font-bold", white ? "text-white" : "text-hero-foreground")}>
            PORTAL
         </span> */}
         <Image src="/assets/images/logo.jpg" alt="Tasis Logo" width={150} height={300} />
      </div>
   )
}

export default Logo
