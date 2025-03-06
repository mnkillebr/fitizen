import { ActionFunctionArgs, LoaderFunctionArgs, data } from "@remix-run/node";
import { Form, Outlet, useLoaderData, useMatches, useNavigate, useNavigation } from "@remix-run/react";
import clsx from "clsx";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { hash } from "~/cryptography.server";
import { createIntroProgram, getAllPrograms } from "~/models/program.server";
import { requireLoggedInUser } from "~/utils/auth.server";
import { useWindowSize } from "~/utils/misc";
import { validateForm } from "~/utils/validation";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireLoggedInUser(request);
  const role = user.role;

  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const programs = await getAllPrograms(query);
  let introProgram
  if (!query && !programs.length) {
    introProgram = await createIntroProgram();
  }
  const programsEtag = hash(JSON.stringify(programs))

  if (programsEtag === request.headers.get("if-none-match")) {
    return new Response(null, { status: 304 })
  }
  const allPrograms = introProgram ? [...programs, introProgram] : programs
  return data(
    { programs: allPrograms, role },
    { headers: {
        programsEtag,
        "Cache-control": "max-age=60, stale-while-revalidate=3600"
      }
    });
}

const themeSchema = z.object({
  darkMode: z.string(),
})

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  switch (formData.get("_action")) {
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
    case "createIntroProgram": {
      const introProgram = await createIntroProgram()
      return introProgram
    }
    default: {
      return null;
    }
  }
}

export default function Programs() {
  const windowSize = useWindowSize();
  const { programs, role } = useLoaderData<typeof loader>();
  const matches = useMatches();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const inProgramDetailRoute = matches.map(m => m.id).includes("routes/app/programs/$programId");
  const inLogSubRoute = matches.map(m => m.id).includes("routes/app/programs/log");
  const inLogViewSubRoute = matches.map(m => m.id).includes("routes/app/programs/logview");

  if (inProgramDetailRoute || inLogSubRoute || inLogViewSubRoute) {
    return (
      <div className="flex flex-col h-full">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="pb-6 px-2 pt-0 md:px-3 md:pt-0 flex flex-col gap-x-6 gap-y-4 h-[calc(100vh-4rem)] bg-background">
      {/* <h1 className="text-lg font-semibold md:text-2xl text-foreground">Programs</h1> */}
      {role === "admin" ? (
        <Form method="post">
          <Button type="submit" name="_action" value="createIntroProgram">Create Intro Program</Button>
        </Form>
      ) : null}
      <div
        className={clsx(
          "flex-1 h-full flex flex-col gap-y-4 md:gap-4 snap-y snap-mandatory overflow-y-auto",
          "lg:grid lg:grid-cols-2 xl:grid-cols-3",
          windowSize && windowSize.height && windowSize.height > 900 ? "xl:grid-rows-3" : ""
        )}
      >
        {programs.map((program: any, program_idx: number) => (
          <div
            key={program_idx}
            className={clsx(
              "relative h-80 sm:h-96 xl:h-full shadow-md cursor-pointer rounded-lg hover:shadow-primary",
              "dark:border-border-muted dark:shadow-border-muted dark:border",
              "transition duration-150 bg-cover bg-top snap-start text-center",
              navigation.state === "loading" && navigation.location.pathname.includes(program.id) ? "animate-pulse duration-1000" : ""
            )}
            style={{backgroundImage: `url(${program.s3ImageKey})`}}
            onClick={() => navigate(program.id)}
          >
            <div className="absolute top-2 left-2 text-white p-2 flex flex-col items-start">
              <div className="font-bold">{program.name}</div>
              <div className="italic">Difficulty: Beginner</div>
            </div>
            <div className="absolute bottom-0 right-0 w-1/3 h-1/6 bg-transparent flex justify-center">
              <div className="content-center select-none bg-primary text-slate-900 font-bold rounded-tl-lg rounded-br-lg w-full h-full">Go &rarr;</div>
            </div>
          </div>
        ))}
        <div
          className="relative h-80 sm:h-96 xl:h-full shadow-md dark:shadow-border-muted dark:border dark:border-border-muted cursor-pointer rounded-lg hover:shadow-primary transition duration-150 bg-cover bg-center snap-start bg-slate-50 text-center"
          style={{backgroundImage: `url(https://res.cloudinary.com/dqrk3drua/image/upload/f_auto,q_auto/v1/fitizen/s2j4mlhnvppquh8j9jk9)`, opacity: 0.6}}
        >
          <div className="absolute top-2 left-2 text-white p-2 flex flex-col items-start">
            <div className="font-bold">Pre/Post-Natal Program</div>
            <div className="flex gap-2">
              <div>Difficulty:</div>
              <div className="italic">Beginner</div>
            </div>
          </div>
          <div className="absolute inset-0 self-center text-white font-semibold text-[48px]">COMING SOON</div>
          <div className="absolute bottom-0 right-0 w-1/3 h-1/6 bg-transparent flex justify-center">
            <div className="content-center select-none bg-primary text-slate-900 font-bold rounded-tl-lg rounded-br-lg w-full h-full">Go &rarr;</div>
          </div>
        </div>
      </div>
    </div>
  )
}