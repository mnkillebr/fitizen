import { BalanceLevel, BalanceType, BodyFocus, ContractionType, Equipment, Joint, LiftType, MovementPattern, MovementPlane, MuscleGroup, Prisma, StretchType } from "@prisma/client";
import db from "~/db.server";

export function getAllExercises(query: string | null) {
  return db.exercise.findMany({
    where: {
      name: {
        contains: query || "",
        mode: "insensitive",
      },
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        name: "desc",
      }
    ],
  });
};

export async function getAllExercisesPaginated(
  query: string | null,
  skip?: number,
  take?: number,
  tags?: string[],
  body?: BodyFocus[],
  contractions?: ContractionType[],
  equipment?: Equipment[],
  joints?: Joint[],
  lifts?: LiftType[],
  muscles?: MuscleGroup[],
  patterns?: MovementPattern[],
  planes?: MovementPlane[],
  stretches?: StretchType[],
) {
  try {
    const whereClause: any = {
      name: {
        contains: query || "",
        mode: "insensitive",
      }
    };
    if (tags && tags.length > 0) {
      whereClause.tags = {
        hasSome: tags
      };
    }
    if (body && body.length > 0) {
      whereClause.body = {
        hasSome: body
      };
    }
    if (contractions && contractions.length > 0) {
      whereClause.contraction = {
        in: contractions
      };
    }
    if (equipment && equipment.length > 0) {
      whereClause.equipment = {
        hasSome: equipment
      };
    }
    if (joints && joints.length > 0) {
      whereClause.joint = {
        hasSome: joints
      };
    }
    if (lifts && lifts.length > 0) {
      whereClause.lift = {
        in: lifts
      };
    }
    if (muscles && muscles.length > 0) {
      whereClause.muscles = {
        hasSome: muscles
      };
    }
    if (patterns && patterns.length > 0) {
      whereClause.pattern = {
        hasSome: patterns
      };
    }
    if (planes && planes.length > 0) {
      whereClause.plane = {
        hasSome: planes
      };
    }
    if (stretches && stretches.length > 0) {
      whereClause.stretch = {
        in: stretches
      };
    }
    const [exercises, count] = await Promise.all([
      db.exercise.findMany({
        where: whereClause,
        orderBy: [
          { createdAt: "desc" },
          { name: "desc" },
        ],
        skip,
        take,
      }),
      db.exercise.count({
        where: whereClause,
      })
    ])
    return { exercises, count }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2011") {
        return error.message
      }
      if (error.code === "P2025") {
        return error.message
      }
    }
    throw error
  };
};

export function getExercise(exerciseId: string) {
  return db.exercise.findUnique({
    where: {
      id: exerciseId
    }
  });
};

export function getExercisesById(exerciseIds: string[]) {
  return db.exercise.findMany({
    where: {
      id: {
        in: exerciseIds
      }
    }
  });
};

export function createExercise() {
  return db.exercise.create({
    data: {
      name: "Fake exercise",
    }
  });
};

export async function deleteExercise(exerciseId: string) {
  try {
    const deletedExercise = await db.exercise.delete({
      where: {
        id: exerciseId,
      }
    })
    return deletedExercise
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return error.message
      }
    }
    throw error
  };
};

export function updateExerciseName(exerciseId: string, exerciseName: string) {
  return db.exercise.update({
    where: {
      id: exerciseId,
    },
    data: {
      name: exerciseName,
    }
  });
};

type RawTagResult = {
  tag: string;
}[]

export async function getUniqueExerciseTags(): Promise<string[]> {
  const exerciseTagsResult = await db.$queryRaw<RawTagResult>`
    SELECT DISTINCT unnest(tags) as tag
    FROM "Exercise"
    ORDER BY tag
  `
  return exerciseTagsResult.map((item: { tag: string }) => item.tag);
}

export function getAllBodyFocusTypes() {
  return Object.values(BodyFocus) as string[];
}

export function getAllContractionTypes() {
  return Object.values(ContractionType) as string[];
}

export function getAllEquipmentTypes() {
  return Object.values(Equipment) as string[];
}

export function getAllJointTypes() {
  return Object.values(Joint) as string[];
}

export function getAllLiftTypes() {
  return Object.values(LiftType) as string[];
}

export function getAllMuscleGroups() {
  return Object.values(MuscleGroup) as string[];
}

export function getAllMovementPatterns() {
  return Object.values(MovementPattern) as string[];
}

export function getAllMovementPlanes() {
  return Object.values(MovementPlane) as string[];
}

export function getAllStretchTypes() {
  return Object.values(StretchType) as string[];
}

export function getAllBalanceTypes() {
  return Object.values(BalanceType) as string[];
}

export function getAllBalanceLevels() {
  return Object.values(BalanceLevel) as string[];
}
