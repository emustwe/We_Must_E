// Turns a partner role into the same pattern as the real job: a Test of 25
// questions and a Video interview of 7 questions (the Survey is the real
// job's, shared by every role). Questions 16 and 18-25 and videos 1, 6 and 7
// are the same for every role; the rest come from the role.
import { ROLES_A } from "./roles-a.mjs";
import { ROLES_B } from "./roles-b.mjs";
import { ROLES_C } from "./roles-c.mjs";
import { ROLES_D } from "./roles-d.mjs";
import { ROLES_E } from "./roles-e.mjs";
import { ROLES_F } from "./roles-f.mjs";
import { ROLES_G } from "./roles-g.mjs";
import { ROLES_H } from "./roles-h.mjs";
import { ROLES_I } from "./roles-i.mjs";
import type { Role } from "./types.mjs";

export type { Role };
// The pattern itself lives in the app (the admin Question builder uses it too).
export { buildTest, buildVideos, type TestQ } from "../../src/lib/question-builder/template.js";

export const ROLES: Role[] = [
  ...ROLES_A,
  ...ROLES_B,
  ...ROLES_C,
  ...ROLES_D,
  ...ROLES_E,
  ...ROLES_F,
  ...ROLES_G,
  ...ROLES_H,
  ...ROLES_I,
]
  .slice()
  .sort((a, b) => a.title.localeCompare(b.title));
