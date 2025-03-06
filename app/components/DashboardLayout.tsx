import { User } from "@prisma/client";
import { Link, Outlet, useLocation, useMatches, useSubmit } from "@remix-run/react";
import { AppSidebar } from "~/components/AppSidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb"
import { Separator } from "~/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar"
import {
  BookOpen,
  Calendar,
  ChartLine,
  Flame,
  MoonStar,
  Sun,
  Table,
} from "lucide-react"
import { useMemo, } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { DarkModeToggle } from "./DarkModeToggle";

const navLinks = [
  {
    title: "Programs",
    url: "app/programs",
    icon: Table,
  },
  {
    title: "Workouts",
    url: "app/workouts",
    icon: Flame,
  },
  {
    title: "Exercise Library",
    url: "app/exercises",
    icon: BookOpen,
  },
  {
    title: "Calendar",
    url: "app/calendar",
    icon: Calendar,
  },
  {
    title: "Statistics",
    url: "app/stats",
    icon: ChartLine,
  },
]

interface DashboardLayoutProps {
  user: User;
  tags: string[];
}
export function AppDashboardLayout({ tags, user }: DashboardLayoutProps) {
  const location = useLocation();
  const matches = useMatches();
  const headerTitle = useMemo(() => {
    if (location.pathname === "/app/profile") {
      return {
        title: "Profile",
        link: location.pathname,
      }
    }

    const route = navLinks.find(navLink => location.pathname.includes(`/${navLink.url}`))?.title
    const matchData: any = matches.find(match => match.pathname === location.pathname)?.data
    switch (route) {
      case "Programs": {
        const subTitle = matchData.program ? matchData.program.name : matchData.userLog ? matchData.userLog.program.name : ""
        const subId = matchData.program ? matchData.program.id : matchData.userLog ? matchData.userLog.programId : ""
        const nestedSubTitle = matchData.program && location.search ? `New Program Log - Week ${matchData.programWeek} - Day ${matchData.programDay}` : matchData.userLog && location.search ? `Program Log - Week ${matchData.userLog.programWeek} - Day ${matchData.userLog.programDay}` : ""
        return {
          title: route,
          link: location.pathname.split("/").slice(0,3).join("/"),
          subTitle,
          subId,
          nestedSubTitle,
          search: location.search
        }
      }
      case "Workouts": {
        const subTitle = location.pathname === "/app/workouts/create" ? "Create Workout" : matchData.workout ? matchData.workout.name : matchData.userLog ? matchData.userLog.routine.name : ""
        const subId = matchData.workout ? matchData.workout.id : matchData.userLog ? matchData.userLog.routineId : ""
        const nestedSubTitle =
          matchData.workout && location.search && location.pathname === "/app/workouts/edit" ?
            "Edit Workout" :
            matchData.workout && location.search ?
              "New Workout Log" :
              matchData.userLog && location.search ?
                "Workout Log" : ""
        return {
          title: route,
          link: location.pathname.split("/").slice(0,3).join("/"),
          subTitle,
          subId,
          nestedSubTitle,
          search: location.search
        }
      }
      default: {
        return {
          title: route
        }
      }
    }
  }, [
    location,
    navLinks,
    matches,
  ])

  return (
    <SidebarProvider>
      <AppSidebar user={user} navLinks={navLinks} tags={tags} />
      <SidebarInset className="max-w-8xl mx-auto">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 justify-between">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 hover:text-primary" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  {headerTitle?.subTitle ? (
                    <Link
                      className="transition-colors hover:text-foreground"
                      to={headerTitle?.link ?? ""}
                    >
                      {headerTitle?.title}
                    </Link>
                  ) : <BreadcrumbPage>{headerTitle?.title}</BreadcrumbPage>}
                </BreadcrumbItem>
                {headerTitle?.subTitle && headerTitle?.search ? (
                  <>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <Link
                      className="transition-colors hover:text-foreground"
                      to={`${headerTitle.link}/${headerTitle.subId}`}
                    >
                      {headerTitle?.subTitle}
                    </Link>
                  </>
                ) : headerTitle?.subTitle ? (
                  <>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{headerTitle?.subTitle}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                ) : null}
                {headerTitle?.nestedSubTitle ? (
                  <>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{headerTitle?.nestedSubTitle}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                ) : null}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <DarkModeToggle />
        </header>
        <div className="flex flex-1 flex-col gap-4 px-4 pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
