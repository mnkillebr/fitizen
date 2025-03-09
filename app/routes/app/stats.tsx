import { ActionFunctionArgs, LoaderFunctionArgs, data } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { z } from "zod";
import { LineChartComponent } from "~/components/LineChartComponent";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "~/components/ui/carousel";
import { Select, SelectContent, SelectGroup, SelectLabel, SelectTrigger, SelectValue, SelectItem } from "~/components/ui/select";
import db from "~/db.server";
import { requireLoggedInUser } from "~/utils/auth.server";
import { calculateAverageEntriesPerWeek, calculateWeeklyStreak } from "~/utils/misc";
import { validateForm } from "~/utils/validation";

const metricOptions = [
  { label: "Time Load (pounds)", value: "timeLoad" },
  { label: "Volume Load (pounds)", value: "volumeLoad" },
  { label: "Time Load (kilograms)", value: "timeLoadMetric" },
  { label: "Volume Load (kilograms)", value: "volumeLoadMetric" },
]

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireLoggedInUser(request);
  const allPrograms = await db.program.findMany({
    select: {
      id: true,
      name: true,
    }
  })
  const allProgramOptions = allPrograms ? allPrograms.map(p => ({
    label: p.name,
    value: p.id,
  })) : []
  const allUserWorkouts = await db.routine.findMany({
    where: {
      userId: user.id
    },
    select: {
      id: true,
      name: true,
    }
  })
  const allUserWorkoutOptions = allUserWorkouts ? allUserWorkouts.map(uw => ({ label: uw.name, value: uw.id })) : []
  const allExercises = await db.exercise.findMany({
    select: {
      id: true,
      name: true,
    }
  })
  const allExerciseOptions = allExercises ? allExercises.map(e => ({ label: e.name, value: e.id })) : []
  const userLogs = await db.user.findUnique({
    where: {
      id: user.id
    },
    select: {
      programLogs: {
        include: {
          program: {
            select: {
              name: true,
            }
          },
          exerciseLogs: {
            select: {
              sets: true,
              blockExercise: {
                include: {
                  exercise: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      workoutLogs: {
        include: {
          routine: {
            select: {
              name: true,
            },
          },
          exerciseLogs: {
            include: {
              sets: true,
              exercise: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  })
  // todo make sure to specify volume load and time load by units
  const userProgramLogs = userLogs ? userLogs.programLogs.map((programLog: any) => ({
    ...programLog,
    exerciseLogs: programLog.exerciseLogs.reduce((result: any, curr: { sets: any[]; blockExercise: { exerciseId: string }}) => {
      let resultArr = result
      if (resultArr.find((log: { blockExercise: { exerciseId: string }}) => log.blockExercise.exerciseId === curr.blockExercise.exerciseId)) {
        resultArr = resultArr.map((log: any) => {
          if (log.blockExercise.exerciseId === curr.blockExercise.exerciseId) {
            return {
              ...log,
              sets: log.sets.concat(curr.sets),
            }
          } else {
            return log
          }
        })
      } else {
        resultArr = resultArr.concat(curr)
      }
      return resultArr
    }, []).map((log: any) => ({
      ...log,
      volumeLoadMetric: log.sets.reduce((result: any, curr: any) => {
        if (curr.actualReps && (curr.unit === "kilogram")) {
          if (curr.load) {
            return result + parseInt(curr.actualReps) * curr.load
          } else {
            return result + parseInt(curr.actualReps)
          }
        } else if (curr.actualReps && (curr.unit === "pound" || curr.unit === "bodyweight")) {
          if (curr.load) {
            return result + parseInt(curr.actualReps) * curr.load * 0.45
          } else {
            return result + parseInt(curr.actualReps)
          }
        } else {
          return result
        }
      }, 0),
      timeLoadMetric: log.sets.reduce((result: any, curr: any) => {
        if (log.blockExercise.time && (curr.unit === "kilogram")) {
          if (curr.load) {
            return result + log.blockExercise.time * curr.load
          } else {
            return result + log.blockExercise.time
          }
        } else if (log.blockExercise.time && (curr.unit === "pound" || curr.unit === "bodyweight")) {
          if (curr.load) {
            return result + log.blockExercise.time * curr.load * 0.45
          } else {
            return result + log.blockExercise.time
          }
        } else {
          return result
        }
      }, 0),
      volumeLoad: log.sets.reduce((result: any, curr: any) => {
        if (curr.actualReps && (curr.unit === "pound" || curr.unit === "bodyweight")) {
          if (curr.load) {
            return result + parseInt(curr.actualReps) * curr.load
          } else {
            return result + parseInt(curr.actualReps)
          }
        } else if (curr.actualReps && (curr.unit === "kilogram")) {
          if (curr.load) {
            return result + parseInt(curr.actualReps) * curr.load * 2.2
          } else {
            return result + parseInt(curr.actualReps)
          }
        } else {
          return result
        }
      }, 0),
      timeLoad: log.sets.reduce((result: any, curr: any) => {
        if (log.blockExercise.time && (curr.unit === "pound" || curr.unit === "bodyweight")) {
          if (curr.load) {
            return result + log.blockExercise.time * curr.load
          } else {
            return result + log.blockExercise.time
          }
        } else if (log.blockExercise.time && (curr.unit === "kilogram")) {
          if (curr.load) {
            return result + log.blockExercise.time * curr.load * 2.2
          } else {
            return result + log.blockExercise.time
          }
        } else {
          return result
        }
      }, 0),
      exerciseName: log.blockExercise.exercise.name,
    }))
  })) : []
  const userWorkoutLogs = userLogs ? userLogs.workoutLogs.map((workoutLog: any) => ({
    ...workoutLog,
    exerciseLogs: workoutLog.exerciseLogs.map((exerciseLog: any) => ({
      ...exerciseLog,
      volumeLoadMetric: exerciseLog.sets.reduce((result: any, curr: any) => {
        if (curr.actualReps && (curr.unit === "kilogram")) {
          if (curr.load) {
            return result + parseInt(curr.actualReps) * curr.load
          } else {
            return result + parseInt(curr.actualReps)
          }
        } else if (curr.actualReps && (curr.unit === "pound" || curr.unit === "bodyweight")) {
          if (curr.load) {
            return result + parseInt(curr.actualReps) * curr.load * 0.45
          } else {
            return result + parseInt(curr.actualReps)
          }
        } else {
          return result
        }
      }, 0),
      timeLoadMetric: exerciseLog.sets.reduce((result: any, curr: any) => {
        if (exerciseLog.time && (curr.unit === "kilogram")) {
          if (curr.load) {
            return result + parseInt(exerciseLog.time) * curr.load
          } else {
            return result + parseInt(exerciseLog.time)
          }
        } else if (exerciseLog.time && (curr.unit === "pound" || curr.unit === "bodyweight")) {
          if (curr.load) {
            return result + parseInt(exerciseLog.time) * curr.load * 0.45
          } else {
            return result + parseInt(exerciseLog.time)
          }
        } else {
          return result
        }
      }, 0),
      volumeLoad: exerciseLog.sets.reduce((result: any, curr: any) => {
        if (curr.actualReps && (curr.unit === "pound" || curr.unit === "bodyweight")) {
          if (curr.load) {
            return result + parseInt(curr.actualReps) * curr.load
          } else {
            return result + parseInt(curr.actualReps)
          }
        } else if (curr.actualReps && (curr.unit === "kilogram")) {
          if (curr.load) {
            return result + parseInt(curr.actualReps) * curr.load * 2.2
          } else {
            return result + parseInt(curr.actualReps)
          }
        } else {
          return result
        }
      }, 0),
      timeLoad: exerciseLog.sets.reduce((result: any, curr: any) => {
        if (exerciseLog.time && (curr.unit === "pound" || curr.unit === "bodyweight")) {
          if (curr.load) {
            return result + parseInt(exerciseLog.time) * curr.load
          } else {
            return result + parseInt(exerciseLog.time)
          }
        } else if (exerciseLog.time && (curr.unit === "kilogram")) {
          if (curr.load) {
            return result + parseInt(exerciseLog.time) * curr.load * 2.2
          } else {
            return result + parseInt(exerciseLog.time)
          }
        } else {
          return result
        }
      }, 0),
      exerciseName: exerciseLog.exercise.name,
    }))
  })) : []
  return {
    userProgramLogs,
    userWorkoutLogs,
    allProgramOptions,
    allUserWorkoutOptions,
    allExerciseOptions,
  }
}

const themeSchema = z.object({
  darkMode: z.string(),
})

export const action = async ({ request }: ActionFunctionArgs) => {
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
    default: {
      return null;
    }
  }
}

export default function Stats() {
  const {
    userProgramLogs,
    userWorkoutLogs,
    allProgramOptions,
    allUserWorkoutOptions,
    allExerciseOptions,
  } = useLoaderData<typeof loader>();
  const mostRecentWorkoutLog = userWorkoutLogs.sort((a,b) => b.date - a.date)[0]
  const defaultWorkout = mostRecentWorkoutLog ? allUserWorkoutOptions.find(workout => workout.label === mostRecentWorkoutLog.routine.name)?.value : undefined
  const defaultWorkoutExercise = mostRecentWorkoutLog ? mostRecentWorkoutLog.exerciseLogs[0].exerciseId : undefined
  const defaultWorkoutMetric = mostRecentWorkoutLog && mostRecentWorkoutLog.exerciseLogs[0].volumeLoad ? "volumeLoad" : "timeLoad"
  const mostRecentProgramLog = userProgramLogs.sort((a,b) => b.date - a.date)[0]
  const defaultProgram = mostRecentProgramLog ? allProgramOptions.find(program => program.label === mostRecentProgramLog.program.name)?.value : undefined
  const defaultProgramExercise = mostRecentProgramLog ? mostRecentProgramLog.exerciseLogs[2].blockExercise.exerciseId : undefined
  const defaultProgramMetric = mostRecentProgramLog && mostRecentProgramLog.exerciseLogs[2].volumeLoad ? "volumeLoad" : "timeLoad"

  const [selectedProgram, setSelectedProgram] = useState<string | undefined>(defaultProgram ?? undefined)
  const [selectedWorkout, setSelectedWorkout] = useState<string | undefined>(defaultWorkout ?? undefined)
  const [selectedWorkoutExercise, setSelectedWorkoutExercise] = useState<string | undefined>(defaultWorkoutExercise ?? undefined)
  const [selectedProgramExercise, setSelectedProgramExercise] = useState<string | undefined>(defaultProgramExercise ?? undefined)
  const [selectedWorkoutMetric, setSelectedWorkoutMetric] = useState<string | undefined>(defaultWorkoutMetric ?? undefined)
  const [selectedProgramMetric, setSelectedProgramMetric] = useState<string | undefined>(defaultProgramMetric ?? undefined)

  const uniqueWorkoutExerciseIds = useMemo(() => {
    const uniqueExerciseIds = new Set();
    const uniqueExerciseObjects = userWorkoutLogs.filter(wLog => wLog.routineId === selectedWorkout).flatMap(wl => wl.exerciseLogs).filter(wl => {
      if (!uniqueExerciseIds.has(wl.exerciseId)) {
        uniqueExerciseIds.add(wl.exerciseId);
        return true;
      }
      return false;
    });
    return uniqueExerciseObjects.map(obj => obj.exerciseId)
  }, [
    selectedWorkout,
    userWorkoutLogs,
  ])
  const currentProgramExerciseIds = useMemo(() => {
    if (selectedProgram) {
      return userProgramLogs.find(pLog => pLog.programId === selectedProgram).exerciseLogs.map((eLog: { blockExercise: { exerciseId: string }}) => eLog.blockExercise.exerciseId)
    } else {
      return []
    }
  }, [
    selectedProgram,
    userProgramLogs,
  ])
  const workoutData = useMemo(() => {
    if (selectedWorkoutExercise && selectedWorkoutMetric) {
      return userWorkoutLogs.filter(wLog => wLog.routineId === selectedWorkout).map(wl => {
        const currentExercise = wl.exerciseLogs.find((el: any) => el.exerciseId === selectedWorkoutExercise) ? wl.exerciseLogs.find((el: any) => el.exerciseId === selectedWorkoutExercise) : {} 
        return {
          date: wl.date,
          formattedDate: format(wl.date, "M/d/yy"),
          [selectedWorkoutMetric]: selectedWorkoutMetric && currentExercise[selectedWorkoutMetric] ? Math.round(currentExercise[selectedWorkoutMetric]) : null
        }
      })
    } else {
      return []
    }
  }, [
    selectedWorkoutExercise,
    selectedWorkoutMetric,
    userWorkoutLogs,
  ])
  const programData = useMemo(() => {
    if (selectedProgramExercise && selectedProgramMetric) {
      return userProgramLogs.filter(pLog => pLog.programId === selectedProgram).map(pl => {
        const currentExercise = pl.exerciseLogs.find((el: any) => el.blockExercise.exerciseId === selectedProgramExercise) ? pl.exerciseLogs.find((el: any) => el.blockExercise.exerciseId === selectedProgramExercise) : {}
        return {
          date: pl.date,
          formattedDate: format(pl.date, "M/d/yy"),
          [selectedProgramMetric]: selectedProgramMetric && currentExercise[selectedProgramMetric] ? Math.round(currentExercise[selectedProgramMetric]) : null
        }
      })
    } else {
      return []
    }
  }, [
    selectedProgramExercise,
    selectedProgramMetric,
    userProgramLogs,
  ])

  return (
    <div className="px-2 md:px-3 flex flex-col gap-y-4 bg-background text-foreground h-[calc(100vh-4rem)]">
      <div className="flex flex-col">
        <div className="flex-none text-base font-semibold md:text-lg text-foreground mb-2">Current Streaks</div>
        <Carousel className="w-full max-w-xs self-center md:hidden">
          <CarouselContent>
            <CarouselItem>
              <Card>
                <CardContent className="flex flex-col items-center">
                  <div className="flex justify-center font-bold text-[64px] sm:text-[80px] md:text-[96px]">{0}</div>
                  <div className="font-semibold leading-none tracking-tight">Weekly Average</div>
                  <div className="text-muted-foreground text-sm mt-1.5">Average number of workouts completed per week</div>
                </CardContent>
              </Card>
            </CarouselItem>
            <CarouselItem>
              <Card>
                <CardContent className="flex flex-col items-center">
                  <div className="relative">
                    <div className="flex justify-center font-bold text-[64px] sm:text-[80px] md:text-[96px]">{calculateWeeklyStreak([...userProgramLogs, ...userWorkoutLogs])}</div>
                    {/* <div className="absolute inset-[90px] inset-x-2/3 text-sm">weeks</div> */}
                  </div>
                  <div className="font-semibold leading-none tracking-tight">Weekly Streak</div>
                  <div className="text-muted-foreground text-sm mt-1.5">Complete at least one workout per week to keep your streak</div>
                </CardContent>
              </Card>
            </CarouselItem>
            <CarouselItem>
              <Card>
                <CardContent className="flex flex-col items-center">
                  <div className="flex justify-center font-bold text-[64px] sm:text-[80px] md:text-[96px]">{userProgramLogs.length + userWorkoutLogs.length}</div>
                  <div className="font-semibold leading-none tracking-tight">Total Workouts Completed</div>
                  <div className="text-muted-foreground text-sm mt-1.5">Tracks all-time workouts completed</div>
                </CardContent>
              </Card>
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
        <div className="hidden md:grid grid-cols-3 gap-2 w-full">
          <Card>
            <CardContent className="flex flex-col items-center">
              <div className="flex justify-center font-bold text-[64px] sm:text-[80px] md:text-[96px]">{calculateAverageEntriesPerWeek([...userProgramLogs, ...userWorkoutLogs], new Date(2025,1,8)).toFixed(1)}</div>
              <div className="font-semibold leading-none tracking-tight">Weekly Average</div>
              <div className="text-muted-foreground text-sm mt-1.5">Average number of workouts completed per week</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center">
              <div className="relative">
                <div className="flex justify-center font-bold text-[64px] sm:text-[80px] md:text-[96px]">{calculateWeeklyStreak([...userProgramLogs, ...userWorkoutLogs], new Date(2025,1,8))}</div>
                {/* <div className="absolute inset-[90px] inset-x-2/3 text-sm">weeks</div> */}
              </div>
              <div className="font-semibold leading-none tracking-tight">Weekly Streak</div>
              <div className="text-muted-foreground text-sm mt-1.5">Complete at least one workout per week to keep your streak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center">
              <div className="flex justify-center font-bold text-[64px] sm:text-[80px] md:text-[96px]">{userProgramLogs.length + userWorkoutLogs.length}</div>
              <div className="font-semibold leading-none tracking-tight">Total Workouts Completed</div>
              <div className="text-muted-foreground text-sm mt-1.5">Tracks all-time workouts completed</div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="flex flex-col gap-y-4 xl:grid grid-cols-2 gap-x-2">
        <div className="flex-1 flex flex-col gap-y-2">
          <div className="flex-none text-base font-semibold md:text-lg text-foreground">Workout Statistics</div>
          <div className="flex flex-col sm:flex-row gap-x-3 gap-y-1">
            <div className="sm:w-1/3 flex flex-col">
              <label className="text-sm font-semibold text-muted-foreground">Workout</label>
              <Select onValueChange={setSelectedWorkout} value={selectedWorkout}>
                <SelectTrigger className="text-sm bg-background dark:border-border-muted">
                  <SelectValue placeholder="Select Workout" />
                </SelectTrigger>
                <SelectContent className="dark:border-border-muted">
                  <SelectGroup>
                    <SelectLabel>Workout</SelectLabel>
                    {allUserWorkoutOptions.map((workout, workout_idx) => (
                      <SelectItem
                        className="px-3"
                        key={workout_idx}
                        value={workout.value}
                      >
                        {workout.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:w-1/3 flex flex-col">
              <label className="text-sm font-semibold text-muted-foreground">Exercise</label>
              <Select onValueChange={setSelectedWorkoutExercise} value={selectedWorkoutExercise} disabled={!selectedWorkout}>
                <SelectTrigger className="text-sm bg-background dark:border-border-muted">
                  <SelectValue placeholder="Select Exercise" />
                </SelectTrigger>
                <SelectContent className="dark:border-border-muted">
                  <SelectGroup>
                    <SelectLabel>Exercise</SelectLabel>
                    {allExerciseOptions.filter(exercise => uniqueWorkoutExerciseIds.includes(exercise.value)).map((exercise, exercise_idx) => (
                      <SelectItem
                        className="px-3"
                        key={exercise_idx}
                        value={exercise.value}
                        // disabled={!uniqueWorkoutExerciseIds.includes(exercise.value)}
                      >
                        {exercise.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:w-1/3 flex flex-col">
              <label className="text-sm font-semibold text-muted-foreground">Metric</label>
              <Select onValueChange={setSelectedWorkoutMetric} value={selectedWorkoutMetric} disabled={!selectedWorkoutExercise}>
                <SelectTrigger className="text-sm bg-background dark:border-border-muted">
                  <SelectValue placeholder="Select Metric" />
                </SelectTrigger>
                <SelectContent className="dark:border-border-muted">
                  <SelectGroup>
                    <SelectLabel>Metric</SelectLabel>
                    {metricOptions.map((metric, metric_idx) => (
                      <SelectItem
                        className="px-3"
                        key={metric_idx}
                        value={metric.value}
                      >
                        {metric.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <LineChartComponent
            data={workoutData}
            metric={metricOptions.find(opt => opt.value === selectedWorkoutMetric)?.value}
            title={allExerciseOptions.find(opt => opt.value === selectedWorkoutExercise)?.label}
            description={selectedWorkoutMetric ? `${metricOptions.find(opt => opt.value === selectedWorkoutMetric)?.label} trend over time` : undefined}
          />
        </div>
        <div className="flex-1 flex flex-col gap-y-2">
          <div className="flex-none text-base font-semibold md:text-lg text-foreground">Program Statistics</div>
          <div className="flex flex-col sm:flex-row gap-x-3 gap-y-1">
            <div className="sm:w-1/3 flex flex-col">
              <label className="text-sm font-semibold text-muted-foreground">Program</label>
              <Select onValueChange={setSelectedProgram} value={selectedProgram}>
                <SelectTrigger className="text-sm bg-background dark:border-border-muted">
                  <SelectValue placeholder="Select Program" />
                </SelectTrigger>
                <SelectContent className="dark:border-border-muted">
                  <SelectGroup>
                    <SelectLabel>Program</SelectLabel>
                    {allProgramOptions.map((program, program_idx) => (
                      <SelectItem
                        className="px-3"
                        key={program_idx}
                        value={program.value}
                      >
                        {program.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:w-1/3 flex flex-col">
              <label className="text-sm font-semibold text-muted-foreground">Exercise</label>
              <Select onValueChange={setSelectedProgramExercise} value={selectedProgramExercise} disabled={!selectedProgram}>
                <SelectTrigger className="text-sm bg-background dark:border-border-muted">
                  <SelectValue placeholder="Select Exercise" />
                </SelectTrigger>
                <SelectContent className="dark:border-border-muted">
                  <SelectGroup>
                    <SelectLabel>Exercise</SelectLabel>
                    {allExerciseOptions.filter(exercise => currentProgramExerciseIds.includes(exercise.value)).map((exercise, exercise_idx) => (
                      <SelectItem
                        className="px-3"
                        key={exercise_idx}
                        value={exercise.value}
                        // disabled={!currentProgramExerciseIds.includes(exercise.value)}
                      >
                        {exercise.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:w-1/3 flex flex-col">
              <label className="text-sm font-semibold text-muted-foreground">Metric</label>
              <Select onValueChange={setSelectedProgramMetric} value={selectedProgramMetric} disabled={!selectedProgramExercise}>
                <SelectTrigger className="text-sm bg-background dark:border-border-muted">
                  <SelectValue placeholder="Select Metric" />
                </SelectTrigger>
                <SelectContent className="dark:border-border-muted">
                  <SelectGroup>
                    <SelectLabel>Metric</SelectLabel>
                    {metricOptions.map((metric, metric_idx) => (
                      <SelectItem
                        className="px-3"
                        key={metric_idx}
                        value={metric.value}
                      >
                        {metric.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <LineChartComponent
            data={programData}
            metric={metricOptions.find(opt => opt.value === selectedProgramMetric)?.value}
            title={allExerciseOptions.find(opt => opt.value === selectedProgramExercise)?.label}
            description={selectedProgramMetric ? `${metricOptions.find(opt => opt.value === selectedProgramMetric)?.label} trend over time` : undefined}
          />
        </div>
      </div>
    </div>
  )
}