// Creates an admin account. This is the only way to create one: there is no
// admin signup, and roles can't be changed from the app.
//
//   npm run create-admin -- you@example.com "Your Name"          (local stack)
//   npm run create-admin -- you@example.com "Your Name" --prod   (live project)
//
// Prints a one-time password. On first login the admin must set up an
// authenticator app (TOTP MFA); they can change the password with "Forgot password".
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_env.mjs";

const [email, name = "Wemuste Admin"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: npm run create-admin -- <email> ["Full Name"] [--prod]');
  process.exit(1);
}

const { url, key, file } = loadEnv();
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const password = Array.from({ length: 4 }, () =>
  Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join(""),
).join("-");

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (error || !data.user) {
  console.error("Could not create the user:", error?.message);
  process.exit(1);
}
// Service role, no user JWT: the role guard allows setting the admin role here.
const { error: profileError } = await supabase
  .from("profiles")
  .insert({ id: data.user.id, role: "admin", full_name: name.slice(0, 120) });
if (profileError) {
  await supabase.auth.admin.deleteUser(data.user.id);
  console.error("Could not create the admin profile:", profileError.message);
  process.exit(1);
}

console.log(
  `Admin created (${file}):\n  email:    ${email}\n  password: ${password}\nStore it safely; it is shown only once.`,
);
