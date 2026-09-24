import "server-only";
import { serverEnv } from "@/lib/env.server";
import { parseBounds } from "@/lib/jobs/meta";

export const jobAreaBounds = () => parseBounds(serverEnv.JOB_AREA_BOUNDS);
