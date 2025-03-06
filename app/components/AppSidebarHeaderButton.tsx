import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "~/components/ui/sidebar"
import { useNavigate } from "@remix-run/react"
import logo from "images/fitizen_logo.svg?url";

export function SidebarHeaderButton() {
  const navigate = useNavigate();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          onClick={() => navigate("/")}
        >
          <img
            className="size-12 rounded-full"
            src={logo}
            alt="Fitizen"
          />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">
              Fitizen
            </span>
            <span className="truncate text-xs">Free tier</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}