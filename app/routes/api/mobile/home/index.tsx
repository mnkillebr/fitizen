import { LoaderFunctionArgs } from "@remix-run/node";
import db from "~/db.server";
import { requireAuth } from "~/utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  const userLogs = await db.user.findUnique({
    where: {
      id: user.id
    },
    select: {
      programLogs: true,
      workoutLogs: true,
    },
  })
  return userLogs;
};