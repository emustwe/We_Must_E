import { expect, test } from "@playwright/test";
import { createUser, psql, uploadObject } from "./db";
import { login, unique } from "./helpers";

test("a job seeker deletes their account: data, files and grants are gone", async ({ page }) => {
  const email = `delete${unique()}@example.test`;
  const password = "Delete-Me-Please-2026";
  const id = createUser(email, password, {
    full_name: "Delete Tester",
    consents: { terms: "1", privacy: "1", data_sharing: "1" },
  });
  const cvPath = `${id}/${crypto.randomUUID()}.pdf`;
  await uploadObject(
    "cv-documents",
    cvPath,
    new TextEncoder().encode("%PDF-1.4\n%%EOF\n"),
    "application/pdf",
  );
  psql(`
    update public.employee_profiles set status = 'approved' where user_id = '${id}';
    insert into public.cv_documents (employee_id, storage_path, mime_type, size_bytes) values ('${id}', '${cvPath}', 'application/pdf', 15);
    insert into public.access_grants (employer_id, employee_id, scopes) values ('10000000-0000-0000-0000-000000000002', '${id}', '{profile}');`);

  await login(page, email, password);
  await expect(page).toHaveURL(/\/employee$/);
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await page.getByRole("button", { name: "Delete my account" }).click();
  const confirm = page.getByRole("button", { name: "Delete forever" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await confirm.click();
  await expect(page).toHaveURL(/\/login\?deleted=1$/);
  await expect(page.getByText("Your account and data were deleted.")).toBeVisible();

  expect(psql(`select count(*) from auth.users where id = '${id}'`)).toBe("0");
  expect(psql(`select count(*) from public.profiles where id = '${id}'`)).toBe("0");
  expect(psql(`select count(*) from public.access_grants where employee_id = '${id}'`)).toBe("0");
  expect(psql(`select count(*) from storage.objects where name like '${id}/%'`)).toBe("0");
  // Only a pseudonymous audit entry remains.
  expect(
    psql(
      `select metadata::text from public.audit_logs where action = 'account.deleted' and target_id = '${id}'`,
    ),
  ).toBe('{"role": "employee"}');

  // The old session is dead.
  await page.goto("/employee");
  await expect(page).toHaveURL(/\/login$/);
});
