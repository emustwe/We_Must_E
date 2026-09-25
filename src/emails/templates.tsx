import { EmailLayout } from "./layout";

// One entry per transactional email. Copy is short and plain for readers of
// English as a second language. Only the sponsor login emails carry details
// (their own login email and password, as the Wemuste team chose); none
// contain applicants' personal data.
export type LoginDetails = { email: string; password: string };

const loginFooter =
  'Keep this email private and don\'t forward it. You can change your password any time with "Forgot password" on the login page. Wemuste will never ask for your password by phone.';

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
  sponsorAccount: {
    subject: "Your Wemuste sponsor account",
    render: (site: string, login: LoginDetails) => (
      <EmailLayout
        preview="Your sponsor account is ready"
        heading="Your sponsor account is ready"
        body="The Wemuste team created a sponsor account for your company. Log in with the details below to post jobs and see your candidates."
        details={[
          { label: "Email", value: login.email },
          { label: "Password", value: login.password },
        ]}
        cta="Log in to Wemuste"
        href={`${site}/login`}
        footer={loginFooter}
      />
    ),
  },
  sponsorPassword: {
    subject: "Your new Wemuste password",
    render: (site: string, login: LoginDetails) => (
      <EmailLayout
        preview="Your password was changed"
        heading="Your password was changed"
        body="The Wemuste team set a new password for your sponsor account. Use it the next time you log in."
        details={[
          { label: "Email", value: login.email },
          { label: "New password", value: login.password },
        ]}
        cta="Log in to Wemuste"
        href={`${site}/login`}
        footer={loginFooter}
      />
    ),
  },
} as const;

export type EmailKind = keyof typeof TEMPLATES;
