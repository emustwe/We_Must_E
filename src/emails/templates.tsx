import { EmailLayout } from "./layout";

// One entry per transactional email. Copy is short and plain for readers of
// English as a second language. No personal data in any of them.
// Employer invites use Supabase's "Invite user" template (supabase/templates/invite.html).
export const TEMPLATES = {
  newApplication: {
    subject: "New application to review",
    render: (site: string) => (
      <EmailLayout
        preview="A new application is waiting for review"
        heading="New application to review"
        body="Someone applied for a job on Wemuste. Log in to the admin area to review it."
        cta="Open applications"
        href={`${site}/admin/applications`}
      />
    ),
  },
} as const;

export type EmailKind = keyof typeof TEMPLATES;
