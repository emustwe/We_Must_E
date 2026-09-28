# WemustE data-breach plan

Version 2026-09-28 · Owner: the data protection contact (below) · Review: once a year, and after every incident.
For the lawyer: the legal deadlines in step 4 are our understanding and need confirming.

## Who is in charge

**Data protection contact:** the founder, reached at emustwe@gmail.com (the address in the privacy policy).
**Back-up:** the second WemustE admin. Name one before the platform grows.

This person decides whether something is a breach, runs the steps below, and signs every notice.

**Do we need a formal Data Protection Officer (DPO)?** Not yet, as far as we can tell:

- UAE: a DPO is required only for large-scale processing of sensitive data or systematic monitoring.
- India: a DPO is required only for companies the government names as "Significant Data Fiduciaries".
- Pakistan: no data protection law is in force yet.

We name a data protection contact instead, and check this again with the lawyer, and again when WemustE passes about 100,000 applicants or starts paying for Supabase Pro.

## What counts as a breach

A breach is any time applicants' or sponsors' personal data is seen, copied, changed, lost or deleted by someone who shouldn't have it. For example:

- a stranger logs in as an admin or a sponsor
- a secret key leaks: the Supabase service role key, the Resend key, or any key in Vercel
- CVs, videos or answers can be opened without permission, or someone opens far more than their job needs
- an email with applicants' details goes to the wrong person
- a laptop or phone with admin access is lost or stolen

**If you're not sure, treat it as a breach** and start at step 1. You can close it later.

## The steps

### 1. Stop it (first hours)

Do only the steps that fit what happened:

- **Leaked key:** roll the key where it lives:
  - Supabase: API keys
  - Resend: API keys
  - Vercel: tokens

  Then put the new value in Vercel (Settings → Environment Variables) and redeploy. The secrets are `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `APP_TOKEN_SECRET`, `IP_HASH_SECRET`, `CRON_SECRET` and `TURNSTILE_SECRET_KEY`.

- **Someone logged in who shouldn't:**
  - Block the account in Admin → Sponsors → Block.
  - Remove unknown admins (Supabase → Authentication → Users).
  - If it's unclear who is affected, roll the JWT secret in Supabase. This signs out everyone.
- **Broken website:** roll back to the last good version in Vercel (Deployments → Instant Rollback).
- **Lost device:** sign it out:
  - Change that person's password.
  - Reset their two-step verification (Supabase → Authentication → Users → the user → remove the MFA factor), then have them set it up again.

### 2. Keep the evidence (same day)

Logs disappear quickly on the free plans (Supabase keeps about 1 day, Vercel less), so do this straight away:

- **Download:**
  - the Supabase logs: API, Auth and Storage
  - the Vercel logs
- **Save the admin audit log** (Admin → Audit). It shows every video, CV and candidate view (`application.video_viewed`, `application.cv_viewed`, `candidate.viewed`), and every account change.
- **Write down:** when it started, when we found out, and what we did, with times.

Keep the evidence in a private folder, never in the code repository. It contains personal data.

### 3. Work out who is affected (within 48 hours)

- **What data:** contact details, profiles, CVs, videos, answers or sponsor accounts.
- **Which people:** by job, by date range, or everyone.
- **Where they live:** this decides which authorities to tell.
- **Is it harmful?** Harm means someone could be contacted, cheated or embarrassed.

### 4. Tell people (within 72 hours)

We use one rule for every country: **tell the affected people and the authorities within 72 hours of finding out**, even if we don't know everything yet. Send what we know, then an update.

| Applicants in | Tell                                                                                                                                          | Our understanding of the law (lawyer to confirm)                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Pakistan      | Affected people. For hacking or data theft, report to the NCCIA (National Cyber Crime Investigation Agency, formerly the FIA Cybercrime Wing) | No data protection law in force yet; PECA 2016 covers the crime                                                        |
| UAE           | UAE Data Office and affected people                                                                                                           | PDPL (Federal Decree-Law 45 of 2021), Article 9: promptly, when a breach can harm privacy                              |
| India         | Data Protection Board of India and every affected person                                                                                      | DPDP Act 2023, section 8(6), and DPDP Rules 2025: people without delay; the Board at once, full report within 72 hours |
| Bangladesh    | The data protection authority and affected people                                                                                             | Personal Data Protection Ordinance 2025: within 72 hours                                                               |

Also tell our service providers if the breach involves them (Supabase, Vercel, Resend).

**Email to affected people:**

> Subject: Important: a security problem affecting your WemustE application
>
> We are writing to tell you about a security problem at WemustE. On [date], [what happened, in one sentence]. The information involved was [which details]. It did not include [what was safe].
>
> We have [what we did: for example "closed the problem and changed our security keys"].
>
> To protect yourself: [for example "be careful with calls or messages asking for money or passwords in WemustE's name. We will never ask for them."].
>
> If you want your data deleted now, or have questions, email [contact email]. We reply within 7 working days.
>
> [Name], WemustE

**Report to an authority** (use its form if it has one). Include:

- what happened, and when it started and was found
- what data, and roughly how many people from that country
- the likely harm
- what we did and will do
- a contact person

### 5. Fix and learn (within 2 weeks)

- Fix the cause, not just the symptom.
- Add a test or a check so it can't happen the same way again.
- Update this plan if a step was missing or unclear.

## Breach record

Keep a record of **every** incident, even small ones and ones we decided weren't breaches. India's rules and good practice expect it. Keep it in a private spreadsheet, not in the code.

For each incident, record:

- the date found
- what happened
- the data and people affected (numbers, not names)
- the countries involved
- what we did
- who was told, and when
- the date closed
