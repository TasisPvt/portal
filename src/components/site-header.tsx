import { Separator } from "@/src/components/ui/separator"
import { SidebarTrigger } from "@/src/components/ui/sidebar"
import { BellIcon, SearchIcon } from "lucide-react"
import { Button } from "@/src/components/ui/button"

interface SiteHeaderProps {
  title?: string
  breadcrumb?: string
}

export function SiteHeader({ title = "Dashboard", breadcrumb }: SiteHeaderProps) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <div className="flex items-center gap-2 text-sm">
            {breadcrumb && (
              <>
                <span className="text-muted-foreground">{breadcrumb}</span>
                <span className="text-muted-foreground">/</span>
              </>
            )}
            <h1 className="font-semibold text-foreground">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" aria-label="Search">
            <SearchIcon className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" aria-label="Notifications">
            <BellIcon className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
