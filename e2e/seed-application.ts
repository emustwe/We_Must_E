import { psql, uploadObject } from "./db";

export const JOB = "[SAMPLE] Evening cashier";
const TOKEN = "e2e-review-token-0123456789-0123456789";
export const PHONE = "+971502223344";
const WEBM = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01]);

// Builds a submitted application through the same database functions the
// public server module uses (the apply UI itself is covered in apply.spec).
export async function seedApplication(name: string) {
  const job = psql(`select id from public.jobs where title = '${JOB}'`);
  const q = (sql: string) =>
    psql(sql.replaceAll("$JOB", `'${job}'`).replaceAll("$TOK", `'${TOKEN}'`));
  q(`select public.app_start($JOB, $TOK, 'ip')`);
  q(`select public.app_start_test($JOB, $TOK)`);
  q(
    `select public.app_save_test_answer($JOB, $TOK, '20000000-0000-0000-0000-000000000003', '{"options":[1]}')`,
  );
  q(
    `select public.app_save_test_answer($JOB, $TOK, '20000000-0000-0000-0000-000000000004', '{"options":[0]}')`,
  );
  q(
    `select public.app_save_test_answer($JOB, $TOK, '20000000-0000-0000-0000-000000000005', '{"text":"I love serving people"}')`,
  );
  q(`select public.app_submit_test($JOB, $TOK)`);
  const appId = q(`select id from public.applications where draft_token_hash = $TOK`);
  // One video explains all the test answers.
  const path = `${appId}/answer/answer.webm`;
  await uploadObject("application-videos", path, WEBM, "video/webm");
  q(`select public.app_record_video($JOB, $TOK, '${path}', 12, ${WEBM.length}, 'video/webm')`);
  const paths = [path];
  q(`select public.app_finish_videos($JOB, $TOK)`);
  q(`select public.app_submit($JOB, $TOK, '${name}', '${PHONE}', '', (
       select jsonb_object_agg(id::text, case type
         when 'single_choice' then '{"options":[0]}'::jsonb
         when 'multi_choice' then '{"options":[0,1]}'::jsonb
         else '{"text":"Latte art"}'::jsonb end)
       from public.survey_questions where survey_id = (select survey_id from public.applications where id = '${appId}')),
     'v1', 'ip', true)`);
  return { appId, paths };
}
