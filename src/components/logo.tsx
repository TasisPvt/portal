import Image from "next/image"
import { cn } from "@/src/lib/utils"
interface LogoProps {
   className?: string
   imgClassName?: string
   white?: boolean
   width?: number
   height?: number
   priority?: boolean
}

const Logo = ({
   className,
   imgClassName,
   white = false,
   width = 60,
   height = 150,
   priority = false,
}: LogoProps) => {
   return (
      <div className={cn('flex justify-center', className)}>
         <Image
            src="/assets/images/logo.png"
            alt="Tasis Logo"
            width={width}
            height={height}
            priority={priority}
            className={imgClassName}
         />
      </div>
   )
}

export default Logo
