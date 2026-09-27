import { EmailLayout } from "./layout";

// One entry per transactional email. Copy is short and plain for readers of
// English as a second language. Only the sponsor login emails carry details
// (their own login email and password, as the Wemuste team chose); none
// contain applicants' personal data.
export type LoginDetails = { email: string; password: string };
export type ApplicationDetails = { jobTitle: string; supportEmail: string };

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
  newJob: {
    subject: "New job to review",
    render: (site: string) => (
      <EmailLayout
        preview="A sponsor posted a job that needs your review"
        heading="New job to review"
        body="A sponsor posted a job. It appears on the map after you approve it."
        cta="Review jobs"
        href={`${site}/admin/jobs?status=pending`}
      />
    ),
  },
  newSponsorRequest: {
    subject: "New request to become a sponsor",
    render: (site: string) => (
      <EmailLayout
        preview="A company asked to become a sponsor"
        heading="New sponsor request"
        body="A company asked to become a sponsor on Wemuste. Log in to the admin area to see the request and create their account."
        cta="See sponsor requests"
        href={`${site}/admin/sponsor-requests`}
      />
    ),
  },
  jobApproved: {
    subject: "Your job is live on Wemuste",
    render: (site: string) => (
      <EmailLayout
        preview="Your job is now on the map"
        heading="Your job is live"
        body="The Wemuste team approved your job. It is now on the map, and people can apply."
        cta="See your jobs"
        href={`${site}/sponsor`}
      />
    ),
  },
  jobRejected: {
    subject: "Your job needs changes",
    render: (site: string) => (
      <EmailLayout
        preview="Your job was not approved yet"
        heading="Your job needs changes"
        body="The Wemuste team couldn't approve your job yet. Log in to see why, edit the job and send it again."
        cta="See your jobs"
        href={`${site}/sponsor`}
      />
    ),
  },
  newCandidate: {
    subject: "You have a new candidate",
    render: (site: string) => (
      <EmailLayout
        preview="The Wemuste team shared a candidate with you"
        heading="You have a new candidate"
        body="The Wemuste team approved an application for one of your jobs. Log in to see the candidate."
        cta="See candidates"
        href={`${site}/sponsor`}
      />
    ),
  },
  // To the applicant, right after they send their application.
  applicationReceived: {
    subject: "We received your application",
    render: (site: string, app: ApplicationDetails) => (
      <EmailLayout
        preview={`Thank you for applying for ${app.jobTitle}`}
        heading="Thank you for applying"
        body={`We received your application for ${app.jobTitle}. Thank you for taking the time to complete it.`}
        steps={{
          title: "What happens next",
          items: [
            "Our team reviews every application carefully.",
            "If you are shortlisted, we share your application with the employer.",
            "The employer contacts you directly by phone or email.",
          ],
        }}
        cta="See more jobs"
        href={site}
        footer={`You don't need to do anything else. Your data is deleted automatically when the job closes, or 1 month after you applied. Want it deleted sooner? Email ${app.supportEmail}. Wemuste never asks for money: if someone asks you to pay for a job, it isn't us.`}
      />
    ),
  },
  // To everyone who applied, when the job is closed (by the sponsor or the team).
  jobClosed: {
    subject: "An update on your application",
    render: (site: string, app: ApplicationDetails) => (
      <EmailLayout
        preview={`${app.jobTitle} is now closed`}
        heading="This job is now closed"
        body={`Thank you again for applying for ${app.jobTitle}. The employer has now closed this position. If you were selected, they have already contacted you or will do so very soon. If not, please don't be discouraged: we truly appreciate the time you put into your application, and new jobs are added to Wemuste every day.`}
        cta="Explore more jobs"
        href={site}
        footer={`As promised in our privacy policy, your application for this job is now being deleted. Questions? Email ${app.supportEmail}. Wemuste never asks for money: if someone asks you to pay for a job, it isn't us.`}
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
