import { MagnifyingGlassIcon as SearchIcon } from "@heroicons/react/24/outline";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { ActionFunctionArgs, LoaderFunctionArgs, data } from "@remix-run/node";
import { Form, Link, Outlet, isRouteErrorResponse, useFetcher, useLoaderData, useMatches, useNavigation, useRouteError, useSearchParams } from "@remix-run/react";
import { PrimaryButton } from "~/components/form";
import { z } from "zod";
import { validateForm } from "~/utils/validation";
import { createWorkoutWithExercise, getAllUserWorkouts, deleteWorkout, getWorkout, updateUserWorkoutWithExercises } from "~/models/workout.server";
import { Exercise as ExerciseType, Role as RoleType, Routine as RoutineType } from "@prisma/client";
import clsx from "clsx";
import { requireLoggedInUser } from "~/utils/auth.server";
import { ArrowRight, ChevronLeft } from "images/icons";
import { useState } from "react";
import { useWindowSize } from "~/utils/misc";

const deleteWorkoutSchema = z.object({
  workoutId: z.string(),
})
const themeSchema = z.object({
  darkMode: z.string(),
})

interface deleteWorkoutFetcherType extends ActionFunctionArgs{
  errors?: {
    workoutId?: string
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireLoggedInUser(request);
  const role = user.role;

  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const workouts = await getAllUserWorkouts(user.id, query);

  let sampleWorkout
  if (!query && !workouts.length) {
    sampleWorkout = await createWorkoutWithExercise();
  }
  const allWorkouts = sampleWorkout ? [...workouts, sampleWorkout] : workouts
  return { workouts: allWorkouts, role }
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireLoggedInUser(request);
  const formData = await request.formData();
  switch (formData.get("_action")) {
    case "createWorkout": {
      return createWorkoutWithExercise();
    }
    case "updateCustomWorkout": {
      const updatedExercisesString = formData.get("updatedExercises") as string;
      const newExercisesString = formData.get("newExercises") as string;
      const deletedExercisesString = formData.get("deletedExercises") as string;
      const workoutId = formData.get("id") as string;
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const updatedExercisesArray = JSON.parse(updatedExercisesString);
      const newExercisesArray = JSON.parse(newExercisesString);
      const deletedExercisesArray = JSON.parse(deletedExercisesString);

      const updatedMappedExercises = updatedExercisesArray.map((ex_item: any) => ({
        exerciseId: ex_item.id,
        groupId: ex_item.groupId,
        target: ex_item.target,
        reps: ex_item.reps,
        sets: ex_item.sets,
        rounds: ex_item.rounds,
        rest: ex_item.rest,
        notes: ex_item.notes,
        time: ex_item.time,
        orderInRoutine: ex_item.orderInRoutine
      }))
      const newMappedExercises = newExercisesArray.map((ex_item: any) => ({
        exerciseId: ex_item.id,
        groupId: ex_item.id,
        target: ex_item.target,
        reps: ex_item.reps,
        sets: ex_item.sets,
        rounds: ex_item.rounds,
        rest: ex_item.rest,
        notes: ex_item.notes,
        time: ex_item.time,
        orderInRoutine: ex_item.orderInRoutine
      }))
      const deletedExerciseIds = deletedExercisesArray.map((ex_item: any) => ex_item.id)

      return updateUserWorkoutWithExercises(user.id, workoutId, name, description, updatedMappedExercises, newMappedExercises, deletedExerciseIds)
    }
    case "deleteWorkout": {
      return validateForm(
        formData,
        deleteWorkoutSchema,
        async ({ workoutId }) => {
          const workout = await getWorkout(workoutId);

          if (workout !== null && workout.userId && workout.userId !== user.id) {
            throw data(
              { message: "This workout routine is not yours, so you cannot delete it."},
              { status: 401 }
            )
          }
          return deleteWorkout(workoutId);
        },
        (errors) => data({ errors }, { status: 400 })
      )
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

export default function Workouts() {
  const windowSize = useWindowSize();
  const data = useLoaderData<typeof loader>();
  const createWorkoutFetcher = useFetcher();
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();
  const matches = useMatches();
  const [openPanel, setOpenPanel] = useState<boolean>(false)

  const isSearching = navigation.formData?.has("q");
  const isCreatingWorkout = createWorkoutFetcher.formData?.get("_action") === "createWorkout";
  // const inCreateSubRoute = matches.map(m => m.id).some(id => createSubRoutes.includes(id));
  const inCreateSubRoute = matches.map(m => m.id).includes("routes/app/workouts/create");
  const inWorkoutDetailRoute = matches.map(m => m.id).includes("routes/app/workouts/$workoutId");
  const inEditSubRoute = matches.map(m => m.id).includes("routes/app/workouts/edit");
  const inLogSubRoute = matches.map(m => m.id).includes("routes/app/workouts/log");
  const inLogViewSubRoute = matches.map(m => m.id).includes("routes/app/workouts/logview");
  const isNavigatingCreate =
    navigation.state === "loading" &&
    navigation.location.pathname === "/app/workouts/create" &&
    navigation.formData === undefined;

  if (inCreateSubRoute || inWorkoutDetailRoute || inEditSubRoute || inLogSubRoute || inLogViewSubRoute) {
    return (
      <div className="flex flex-col h-full">
        <Outlet />
      </div>
    )
  }

  // if (inWorkoutDetailRoute) {
  //   return (
  //     <div className="flex flex-col h-full">
  //       <Outlet />
  //     </div>
  //   )
  // }

  return (
    <div className="md:px-1 flex flex-col gap-y-4 h-[calc(100vh-4rem)] bg-background text-foreground">
      <div className="flex flex-col gap-y-4 px-2">
        {/* <Form
          className={`flex content-center border-2 rounded-md focus-within:border-primary md:w-1/2 ${
            isSearching ? "animate-pulse" : ""
          }`}
        >
          <button type="submit">
            <SearchIcon className="size-6 ml-2" />
          </button>
          <input
            defaultValue={searchParams.get("q") ?? ""}
            type="text"
            name="q"
            placeholder="Search workouts ..."
            autoComplete="off"
            className="w-full p-2 outline-none rounded-md"
          />
        </Form> */}
        {/* <h1 className="text-lg font-semibold md:text-2xl">Workouts</h1> */}
        {data.role === "admin" ? (
          <createWorkoutFetcher.Form method="post">
            <PrimaryButton
              className="w-full sm:w-1/2 xl:w-1/3 md:active:scale-95"
              name="_action"
              value="createWorkout"
              isLoading={isCreatingWorkout}
            >
              <PlusIcon className="size-6 pr-1" />
              <span>Add Workout</span>
            </PrimaryButton>
          </createWorkoutFetcher.Form>
        ) : null}
        <Link
          to="create"
          className={clsx(
            "w-full sm:w-1/2 xl:w-1/3 md:active:scale-95 md:px-3 font-medium",
            "text-foreground bg-primary hover:bg-yellow-300 rounded-md text-center py-2",
            isNavigatingCreate ? "animate-pulse" : ""
          )}
          // onClick={() => setOpenPanel(!openPanel)}
        >
          Create Workout
        </Link>
      </div>
      <div
        className={clsx(
          "flex-1 flex flex-col gap-y-4 md:gap-4 snap-y snap-mandatory overflow-y-auto px-2 pb-6",
          "lg:grid lg:grid-cols-2 xl:grid-cols-3 xl:grid-rows-3",
          windowSize && windowSize.height && windowSize.height > 900 ? "xl:grid-rows-3" : ""
        )}
      >
        {data.workouts.map((workout) => (
          <Workout
            key={workout.id}
            workout={workout}
            role={data.role}
            loading={navigation.state === "loading" && navigation.location.pathname.includes(workout.id)}
          />
        ))}
      </div>
    </div>
  )
}

type WorkoutProps = {
  workout: {
    id: string;
    name: string;
    description: string | null;
    userId: string | null;
    isFree: boolean;
    exercises: ExerciseType[];
    createdAt: string;
  };
  role?: RoleType;
  loading?: boolean;
}

function Workout({ workout, role, loading }: WorkoutProps) {
  const deleteWorkoutFetcher = useFetcher<deleteWorkoutFetcherType>();

  return (
    <Link
      to={workout.id}
      className={clsx(
        "h-80 sm:h-96 bg-muted text-foreground hover:shadow-primary rounded-lg flex flex-col snap-start shadow-md",
        "dark:bg-background-muted dark:border dark:border-border-muted dark:shadow-border-muted",
        loading ? "animate-pulse" : ""
      )}
    >
      <div
        className="flex-1 flex flex-col-reverse bg-cover bg-top rounded-lg overflow-hidden"
        style={{backgroundImage: `url("https://res.cloudinary.com/dqrk3drua/image/upload/f_auto,q_auto/cld-sample-3.jpg")`}}
      >
        {/* <img
          src="https://res.cloudinary.com/dqrk3drua/image/upload/f_auto,q_auto/cld-sample-3.jpg"
          className={clsx("flex-1 w-full rounded-t-lg")}
        /> */}
        <div className="flex-none flex justify-between bg-muted dark:bg-background-muted">
          <div className="flex flex-col p-4">
            <p className="font-bold max-w-40 text-foreground xs:max-w-64 truncate sm:overflow-visible md:overflow-hidden">{workout.name}</p>
            <p className="text-sm max-w-40 xs:max-w-64 truncate sm:overflow-visible md:overflow-hidden">{workout.description}</p>
          </div>
          <div className="px-4 border-l border-border-muted h-full flex flex-col justify-center hover:bg-primary rounded-r-lg">
            {/* <ArrowRight className=""/> */}
            <ChevronLeft className="rotate-180" />
          </div>
        </div>
      </div>
      {/* {role === "admin" || workout.userId ? (
        <deleteWorkoutFetcher.Form
          method="post"
          onSubmit={(event) => {
            if(!confirm("Are you sure you want to delete this workout?")) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="workoutId" value={workout.id} />
          <DeleteButton
            name="_action"
            value="deleteWorkout"
            >
            <TrashIcon className="size-6" />
          </DeleteButton>
          <ErrorMessage>{deleteWorkoutFetcher.data?.errors?.workoutId}</ErrorMessage>
        </deleteWorkoutFetcher.Form>
      ) : null} */}
    </Link>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="p-4 bg-red-500 text-white rounded-md">
        <h1 className="text-2xl pb-2">{error.status} - {error.statusText}</h1>
        <p className="my-2 font-bold">{error.data.message}</p>
        <Link to="/app/workouts" className="text-white underline">Go back to workouts</Link>
      </div>
    )
  }
  return (
    <div className="p-4 bg-red-500 text-white rounded-md">
      <h1>An unexpected error occurred</h1>
    </div>
  );
}
