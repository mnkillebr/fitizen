import { HeartIcon as HeartOutline, MagnifyingGlassIcon as SearchIcon, } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid, PlusIcon, TrashIcon, ArrowDownTrayIcon, Bars3Icon } from "@heroicons/react/24/solid";

import { ActionFunctionArgs, LoaderFunctionArgs, data } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigation } from "@remix-run/react";
import { DeleteButton, ErrorMessage, } from "~/components/form";
import { createExercise, deleteExercise, getAllExercisesPaginated, updateExerciseName } from "~/models/exercise.server";
import { z } from "zod";
import { validateForm } from "~/utils/validation";
import { useIsHydrated, useWindowSize } from "~/utils/misc";
import clsx from "clsx";
import { requireLoggedInUser } from "~/utils/auth.server";
import { BodyFocus, Exercise as ExerciseType, Role as RoleType } from "@prisma/client";
import { useOpenDialog } from "~/components/Dialog";
import { CheckCircleIcon, ChevronLeft, ChevronRight, PlusCircleIcon } from "images/icons";
import { generateMuxThumbnailToken, generateMuxVideoToken } from "~/mux-tokens.server";
import { hash } from "~/cryptography.server";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "~/components/ui/pagination";
import { EXERCISE_ITEMS_PER_PAGE } from "~/utils/magicNumbers";
import { ExerciseDialog, exerciseDialogOptions } from "~/components/ExerciseDialog";
import { AppPagination } from "~/components/AppPagination";
import { Video } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "~/components/ui/skeleton";
import { Label } from "~/components/ui/label";

const updateExerciseNameSchema = z.object({
  exerciseId: z.string(),
  exerciseName: z.string().min(1, "Exercise name cannot be blank"),
})
const deleteExerciseSchema = z.object({
  exerciseId: z.string(),
})
const themeSchema = z.object({
  darkMode: z.string(),
})

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireLoggedInUser(request);
  const role = user.role;

  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const tagsQuery = url.searchParams.get("tags");
  const tagsArray = tagsQuery ? tagsQuery.split(",") : undefined
  const bodyFocus = tagsArray ? tagsArray.filter(tag => tag.includes(" body")).map(body => body.includes("upper") ? BodyFocus.upper : body.includes("lower") ? BodyFocus.lower : body.includes("full") ? BodyFocus.full : BodyFocus.core) : undefined
  const tags = tagsArray ? tagsArray.filter(tag => !tag.includes(" body")) : undefined
  // console.log("page", page)
  const skip = (page - 1) * EXERCISE_ITEMS_PER_PAGE;
  // const exercises = await getAllExercises(query);
  const pageExercises = await getAllExercisesPaginated(query, skip, EXERCISE_ITEMS_PER_PAGE, tags, bodyFocus) as { exercises: ExerciseType[]; count: number }
  const totalPages = Math.ceil(pageExercises.count / EXERCISE_ITEMS_PER_PAGE);
  const tokenMappedExercises = pageExercises ? pageExercises.exercises.map(ex_item => {
    const smartCrop = () => {
      let crop = ["Lateral Lunge", "Band Assisted Leg Lowering", "Ankle Mobility", "Kettlebell Swing", "Half Kneel Kettlebell Press"]
      if (crop.includes(ex_item.name)) {
        return "smartcrop"
      } else {
        return undefined
      }
    }
    const heightAdjust = () => {
      let adjustments = ["Pushup", "Kettlebell Swing", "Kettlebell Renegade Row", "Half Kneel Kettlebell Press"]
      let expand = ["Lateral Bound", "Mini Band Walks"]
      if (adjustments.includes(ex_item.name)) {
        return "481"
      } else if (expand.includes(ex_item.name)) {
        return "1369"
      } else {
        return undefined
      }
    }
    const videoToken = generateMuxVideoToken(ex_item.muxPlaybackId)
    const thumbnailToken = generateMuxThumbnailToken(ex_item.muxPlaybackId, smartCrop(), heightAdjust())
    return {
      ...ex_item,
      videoToken,
      thumbnail: thumbnailToken ? `https://image.mux.com/${ex_item.muxPlaybackId}/thumbnail.png?token=${thumbnailToken}` : undefined,
    }
  }) : []
  const exercisesEtag = hash(JSON.stringify(tokenMappedExercises))
  return data(
    {
      exercises: tokenMappedExercises,
      exercisesCount: pageExercises.count,
      page,
      totalPages,
      role,
    },
    {
      headers: {
        exercisesEtag,
        "Cache-control": "max-age=3300, stale-while-revalidate=3600"
      }
    })
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  switch (formData.get("_action")) {
    case "createExercise": {
      return createExercise();
    }
    case "deleteExercise": {
      return validateForm(
        formData,
        deleteExerciseSchema,
        (data) => deleteExercise(data.exerciseId),
        (errors) => data({ errors }, { status: 400 })
      )
    }
    case "updateExerciseName": {
      return validateForm(
        formData,
        updateExerciseNameSchema,
        (data) => updateExerciseName(data.exerciseId, data.exerciseName),
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

interface updateNameFetcherType extends ActionFunctionArgs{
  errors?: {
    exerciseId?: string
    exerciseName?: string
  }
}

interface deleteExerciseFetcherType extends ActionFunctionArgs{
  errors?: {
    exerciseId?: string
  }
}

export default function ExerciseLibrary() {
  const windowSize = useWindowSize();
  const { exercises, role, exercisesCount, totalPages, page } = useLoaderData<typeof loader>();
  const createExerciseFetcher = useFetcher();
  const navigation = useNavigation();
  const openDialog = useOpenDialog();
  const isSearching = navigation.formData?.has("q");
  const isCreatingExercise = createExerciseFetcher.formData?.get("_action") === "createExercise";

  return (
    <div className="px-1 pt-0 md:px-2 md:pt-0 pb-2 flex flex-col bg-background h-[calc(100vh-4rem)]">
      {/* <div className="flex flex-col gap-y-4">
        <h1 className="text-lg font-semibold md:text-2xl text-foreground px-1">Exercises</h1>
        {role === "admin" ? (
          <createExerciseFetcher.Form method="post">
            <PrimaryButton
              className="w-full sm:w-1/2 md:w-fit md:active:scale-95"
              name="_action"
              value="createExercise"
              isLoading={isCreatingExercise}
            >
              <PlusIcon className="size-6 pr-1" />
              <span>Add Exercise</span>
            </PrimaryButton>
          </createExerciseFetcher.Form>
        ) : null}
      </div> */}
      {/* <div className="flex flex-col gap-y-4 xl:grid xl:grid-cols-2 xl:gap-4 snap-y snap-mandatory overflow-y-auto px-1 pb-1"> */}
      {exercises.length ? (
        <div
          className={clsx(
            "flex-1 flex flex-col gap-y-3 pb-2 snap-y snap-mandatory overflow-y-auto gap-x-3 px-1",
            "lg:grid lg:grid-cols-2 xl:grid-cols-3",
            windowSize && windowSize.height && windowSize.height > 900 ? "xl:grid-rows-3" : ""
          )}
        >
          {exercises.map((ex_item) => (
            <Exercise key={ex_item.id} exercise={ex_item} role={role} onViewExercise={() => {
              openDialog(
                <ExerciseDialog exercise={ex_item} />,
                exerciseDialogOptions(ex_item.name)
              )
            }} />
          ))}
        </div>
      ) : (
        <div className="flex-1 text-center"><Label>No Exercises</Label></div>
      )}
      <AppPagination page={page} totalPages={totalPages} />
    </div>
  )
}

interface ExerciseItemProps {
  id: string;
  name: string;
  body: string[];
  contraction: string | null;
  thumbnail?: string;
}

type ExerciseProps = {
  exercise: ExerciseItemProps;
  selectable?: boolean;
  selectFn?: (...args: any[]) => void;
  selected?: boolean;
  role?: RoleType;
  onViewExercise?: (exerciseItem: ExerciseItemProps) => void;
  selectCount?: number;
}

export function Exercise({ exercise, selectable, selectFn, selected, role, selectCount, onViewExercise = () => {}}: ExerciseProps) {
  const isHydrated = useIsHydrated();
  const [imageLoaded, setImageLoaded] = useState(false);
  const deleteExerciseFetcher = useFetcher<deleteExerciseFetcherType>();
  const updateExerciseNameFetcher = useFetcher<updateNameFetcherType>();
  const isDeletingExercise =
    deleteExerciseFetcher.formData?.get("_action") === "deleteExercise" &&
    deleteExerciseFetcher.formData?.get("exerciseId") === exercise.id

  return isDeletingExercise ? null : (
    <div
      className={clsx(
        "max-h-fit dark:bg-background-muted text-foreground dark:border dark:border-border-muted",
        "rounded-lg flex flex-col snap-start shadow-md dark:shadow-border-muted",
        selectable ? "bg-background" : "bg-muted hover:shadow-primary"
      )}
    >
      <div
        className="h-80 sm:h-96 flex flex-col overflow-hidden justify-between w-full bg-cover bg-top rounded-lg"
        style={{backgroundImage: `url(${exercise.thumbnail ?? "https://res.cloudinary.com/dqrk3drua/image/upload/f_auto,q_auto/cld-sample-3.jpg"})`}}
        onLoad={() => setImageLoaded(true)}
      >
        <div
          className="flex-1 relative group cursor-pointer"
          onClick={() => onViewExercise(exercise)}
        >
          {!imageLoaded && (
            <Skeleton className="absolute inset-0 w-full h-full" />
          )}
          {/* <img
            src={exercise.thumbnail ?? "https://res.cloudinary.com/dqrk3drua/image/upload/f_auto,q_auto/cld-sample-3.jpg"}
            className={clsx(
              "w-full rounded-t-lg transition-opacity duration-300 group-hover:opacity-85",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
          /> */}
          <Video className="absolute w-full size-8 inset-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        {/* <img
          src={exercise.thumbnail ?? "https://res.cloudinary.com/dqrk3drua/image/upload/f_auto,q_auto/cld-sample-3.jpg"}
          className={clsx("w-full rounded-t-lg flex-1", selectable ? "" : "cursor-pointer")}
          onClick={() => onViewExercise(exercise)}
        /> */}
        <div
          className={clsx(
            "flex-none flex p-4 justify-between items-center dark:bg-background-muted",
            selectable ? "bg-background" : "bg-muted hover:shadow-primary"
          )}
        >
          <div className="flex flex-col w-full">
            {role === "admin" ? (
              <updateExerciseNameFetcher.Form method="post" className="hidden sm:flex justify-between">
                <div className="flex flex-col peer">
                  <input
                    type="text"
                    className={`font-bold bg-background-muted focus:outline-none truncate focus:border-b-2 ${
                      updateExerciseNameFetcher.data?.errors?.exerciseName ? "border-b-2 border-b-red-500" : ""
                    }`}
                    required
                    name="exerciseName"
                    placeholder="Exercise Name"
                    defaultValue={exercise.name}
                    autoComplete="off"
                    onChange={(event) => {
                      event.target.value !== "" &&
                      updateExerciseNameFetcher.submit(
                        {
                          _action: "updateExerciseName",
                          exerciseId: exercise.id,
                          exerciseName: event.target.value,
                        },
                        { method: "post" }
                      );
                    }}
                  />
                  <ErrorMessage>{updateExerciseNameFetcher.data?.errors?.exerciseName}</ErrorMessage>
                </div>
                {isHydrated ? null : (
                  <button
                    name="_action"
                    value="updateExerciseName"
                    className={clsx(
                      "opacity-0 hover:opacity-100 focus:opacity-100",
                      "peer-focus-within:opacity-100"
                    )}
                  >
                    <ArrowDownTrayIcon className="size-6"/>
                  </button>
                )}
                <input type="hidden" name="exerciseId" value={exercise.id} />
              </updateExerciseNameFetcher.Form>
            ) : (
              <p className="font-bold w-full md:max-w-[calc(100%-2rem)] truncate">{exercise.name}</p>
            )}
            <div
              className={clsx(
                "flex text-muted-foreground text-sm",
                (exercise.body && exercise.contraction && [...exercise.body, exercise.contraction].length > 1) || (exercise.body && exercise.body.length > 1) ? "divide-x divide-muted-foreground" : ""
              )}
            >
              {exercise.body.slice(0,2).map((body, body_idx) => (
                <p key={body_idx} className={`${body_idx > 0 ? "px-1" : "pr-1"} text-xs capitalize`}>{`${body} body`}</p>
              ))}
              <p className="px-1 text-xs capitalize">{exercise.contraction}</p>
            </div>
          </div>
          {selectable ? (
            <div
              className="relative flex items-center text-foreground"
              onClick={() => selectFn ? selectFn(exercise) : null}
            >
              <button>
                {selected ? <CheckCircleIcon className="xs:h-8 xs:w-8 text-primary" /> : <PlusCircleIcon className="xs:h-8 xs:w-8" />}
              </button>
              {selectCount && selectCount > 1 ? <p className="absolute -bottom-1 left-7 z-10 text-xs text-primary">{selectCount}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
      {/* <div className="hidden lg:flex self-center pr-2">
        <Bars3Icon className="size-6 cursor-grab active:cursor-grabbing" />
      </div> */}
      {/* {selectable ? (
        <div
          className="border-l-2 h-full group relative content-center hover:bg-secondary-original hover:text-white hover:rounded-r-lg cursor-pointer"
          onClick={() => selectFn ? selectFn(exercise) : null}
        >
          <button
            className={clsx(
              "lg:hidden px-2 flex flex-col",
              selected ? "text-green-600" : ""
            )}
          >
            {selected ? <CheckCircleIcon className="size-6 group-hover:text-white" /> : <PlusIcon className="size-6" />}
          </button>
          {selectCount && selectCount > 1 ? <p className="absolute bottom-2 left-6 z-10 text-xs">{selectCount}</p> : null}
        </div>
      ) : null} */}
      {role === "admin" ? (
        <div className="hidden sm:flex gap-3 items-center p-4">
          <HeartOutline className="size-6 hover:text-rose-500 cursor-pointer"/>
          <deleteExerciseFetcher.Form
            method="post"
            onSubmit={(event) => {
              if(!confirm("Are you sure you want to delete this exercise?")) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="exerciseId" value={exercise.id} />
            <DeleteButton
              name="_action"
              value="deleteExercise"
              >
              <TrashIcon className="size-6" />
            </DeleteButton>
            <ErrorMessage>{deleteExerciseFetcher.data?.errors?.exerciseId}</ErrorMessage>
          </deleteExerciseFetcher.Form>
        </div>
      ) : null}
      {/* <HeartSolid className="size-6 fill-rose-500 hover:fill-rose-600 cursor-pointer"/> */}
    </div>
  )
}