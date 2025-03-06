import {
  Links,
  Link,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useMatches,
  useRouteError,
  isRouteErrorResponse,
  useSubmit,
  useLoaderData,
  data,
} from "@remix-run/react";
import "./tailwind.css";
import { useState, } from "react";
import type { ActionFunctionArgs, LinksFunction, LoaderFunctionArgs, MetaFunction, } from "@remix-run/node";
import globalStyles from "~/tailwind.css?url";
import { Dialog, DialogPanel } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ArrowLeftEndOnRectangleIcon, Bars3Icon, BookOpenIcon, CalendarIcon, FireIcon, TableCellsIcon } from "@heroicons/react/24/solid";
import logo from "images/fitizen_logo.svg?url";
import { getCurrentUser } from "./utils/auth.server";
import { destroySession, getSession } from "./sessions";
import clsx from "clsx";
import { DialogProvider } from "./components/Dialog";
import { Toaster } from "~/components/ui/sonner"
import { ChartIcon, ChevronRight } from "images/icons";
import { AppDashboardLayout } from "./components/DashboardLayout";
import { validateForm } from "./utils/validation";
import { z } from "zod";
import { DarkModeToggle } from "./components/DarkModeToggle";
import { getAllBodyFocusTypes, getUniqueExerciseTags } from "./models/exercise.server";

const navigation = [
  { name: "Settings", href: "settings" },
  { name: "About", href: "about" },
]

const dashNavigation = [
  {
    name: "Programs",
    href: "app/programs",
    icon: <TableCellsIcon />,
    label: "Programs",
  },
  {
    name: "Workouts",
    href: "app/workouts",
    icon: <FireIcon />,
    label: "Workouts"
  },
  {
    name: "Exercise Library",
    href: "app/exercises",
    icon: <BookOpenIcon />,
    label: "Library",
  },
  {
    name: "Calendar",
    href: "app/calendar",
    icon: <CalendarIcon />,
    label: "Calendar",
  },
  {
    name: "Statistics",
    href: "app/stats",
    icon: <ChartIcon className="h-4 w-4"/>,
    label: "Statistics",
  },
]

export const meta: MetaFunction = () => {
  return [
    { title: "Fitizen" },
    { name: "description", content: "Are you a fitizen?" },
  ];
};

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: globalStyles },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getCurrentUser(request);
  const exerciseTags = await getUniqueExerciseTags();
  const bodyFocus = await getAllBodyFocusTypes();
  return {
    user,
    isLoggedIn: user !== null,
    exerciseTags: [...exerciseTags, ...bodyFocus.map(focus => `${focus} body`)],
  }
}

const themeSchema = z.object({
  darkMode: z.string(),
})


export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  switch (formData.get("_action")) {
    case "logout": {
      const cookieHeader = request.headers.get("cookie")
      const session = await getSession(cookieHeader)
      return data("logging out", {
        headers: {
          "Set-Cookie": await destroySession(session)
        }
      });
    }
    case "toggleDarkMode": {
      return validateForm(
        formData,
        themeSchema,
        async ({ darkMode }) => data(
          { success: true },
          {
            headers: {
              "Set-Cookie": `fitizen__darkMode=${darkMode}; SameSite=Strict; Path=/`,
            },
          }
        ),
        (errors) => data({ errors }, { status: 400 })
      )
    }
    default: {
      return null;
    }
  }
}

const DarkModeScript = () => {
  const script = `
    (function() {
      let cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});

      if (cookies['fitizen__darkMode'] === 'true') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <DarkModeScript />
      </head>
      <body className="bg-background">
        <DialogProvider>
          {children}
        </DialogProvider>
        <ScrollRestoration />
        <Scripts />
        <Toaster richColors />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css"/>
      </body>
    </html>
  );
}

export default function App() {
  const { exerciseTags, user } = useLoaderData<typeof loader>();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const matches = useMatches();
  const inAppRoute = matches.map(m => m.id).includes("routes/app");
  const submit = useSubmit();
  const handleLogout = () => {
    return submit({ "_action": "logout" }, { method: "post" })
  }

  if (inAppRoute) {
    return <AppDashboardLayout user={user} tags={exerciseTags} />
  }

  return (
    <div className="*:max-w-8xl *:mx-auto bg-background dark:bg-background">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-50 dark:bg-background">
        <nav className="flex items-center justify-between p-6 md:px-8" aria-label="Global">
          <div className="flex md:flex-1">
            <a href="/" className="-m-1.5 p-1.5">
              <span className="sr-only">Fitizen</span>
              <img
                className="h-12 w-auto rounded-full"
                src={logo}
                alt=""
              />
            </a>
            <div className="ml-2 self-center font-bold text-lg">Fitizen</div>
          </div>
          <div className="flex md:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 dark:text-muted-foreground"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          {/* {inAppRoute ? null : (
            <div className="hidden md:flex md:gap-x-4">
              {navigation.map((item) => (
                <RootNavLink key={item.name} to={item.href}>
                  {item.name}
                </RootNavLink>
              ))}
            </div>
          )}  */}
          <div className="hidden md:flex md:flex-1 md:justify-end">
            {inAppRoute ? (
              <button
                onClick={handleLogout}
                className="text-gray-900 hover:text-primary h-6 w-6"
              >
                <ArrowLeftEndOnRectangleIcon />
              </button>
            ) : (
              <>
                <DarkModeToggle />
                <Link
                  to="login"
                  className={clsx(
                    "flex items-center text-primary-foreground bg-primary",
                    "py-2 pl-3 pr-2 rounded-md hover:bg-primary/90 shadow",
                    "text-sm"
                  )}
                >
                  <div>Log In</div>
                  <ChevronRight className="h-4 w-4"/>
                </Link>
              </>
            )}
          </div>
        </nav>
        <Dialog className="md:hidden" open={mobileMenuOpen} onClose={setMobileMenuOpen}>
          <div className="fixed inset-0 z-50" />
          <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white dark:bg-background border-l dark:border-l-border-muted px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <a href="/" className="-m-1.5 p-1.5">
                <span className="sr-only">Fitizen</span>
                <img
                  className="h-12 w-auto rounded-full"
                  src={logo}
                  alt=""
                />
              </a>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon className="h-6 w-6 dark:text-foreground" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 dark:text-foreground hover:bg-gray-50 dark:hover:bg-background-muted dark:hover:text-muted-foreground hover:text-primary transition duration-100"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                {inAppRoute ? (
                  <button className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 dark:text-foreground hover:bg-gray-50 dark:hover:bg-background-muted dark:hover:text-muted-foreground hover:text-primary transition duration-100">
                    Log Out
                  </button>
                ) : (
                  <div className="py-6">
                    <a
                      href="login"
                      className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 dark:text-foreground hover:bg-gray-50 dark:hover:bg-background-muted dark:hover:text-muted-foreground hover:text-primary transition duration-100"
                    >
                      Log In
                    </a>
                  </div>
                )}
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      </header>
      {/* Main */}
      <div className="relative isolate px-6 md:pt-7 lg:pt-14 lg:px-8">
        {/* Main Content */}
        <div className="mt-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <html lang="en">
      <head>
        <title>Whoops!</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <DarkModeScript />
      </head>
      <body>
        <div className="p-4">
          {isRouteErrorResponse(error) ? (
            <>
              <h1 className="text-2xl pb-2">{error.status} - {error.statusText}</h1>
              <p>You are seeing this page because an error occurred.</p>
              <p className="my-2 font-bold">{error.data.message}</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl pb-2">Uh oh!</h1>
              <p>You are seeing this page because an unexpected error occurred.</p>
              {error instanceof Error ? <p className="my-2 font-bold">{error.message}</p> : null}
            </>
          )}
          <a href="/app" className="text-primary">Home Page</a>
        </div>
      </body>
    </html>
  );
}