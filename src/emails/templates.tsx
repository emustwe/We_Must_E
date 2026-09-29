import { EmailLayout } from "./layout";

// One entry per transactional email. Copy is short and plain for readers of
// English as a second language. No email contains a password or applicants'
// personal data.
export type InviteDetails = { email: string; link: string };
export type ApplicationDetails = { jobTitle: string; supportEmail: string };

export const TEMPLATES = {
  newApplication: {
    subject: "New application on WemustE",
    render: (site: string) => (
      <EmailLayout
        preview="A new application is waiting for review"
        heading="New application"
        body="Someone applied for a job on WemustE. The application went straight to the sponsor, without contact details. Log in to the admin area to see it (or remove it if it is fake)."
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
        body="A company asked to become a sponsor on WemustE. Log in to the admin area to see the request and create their account."
        cta="See sponsor requests"
        href={`${site}/admin/sponsor-requests`}
      />
    ),
  },
  newPayment: {
    subject: "A sponsor paid for Era",
    render: (site: string) => (
      <EmailLayout
        preview="A USDT payment arrived"
        heading="A sponsor paid for Era"
        body="A USDT payment arrived and needs a look, or was added to a sponsor's Era. Log in to the admin area to see the payments."
        cta="See payments"
        href={`${site}/admin/payments`}
      />
    ),
  },
  paymentReceived: {
    subject: "Your Era was added",
    render: (site: string) => (
      <EmailLayout
        preview="Thank you for your payment"
        heading="Your Era was added"
        body="We received your USDT payment and added the Era to your WemustE account. Log in to see your balance and open candidates' contact details."
        cta="See your Era"
        href={`${site}/sponsor/coins`}
      />
    ),
  },
  jobApproved: {
    subject: "Your job is live on WemustE",
    render: (site: string) => (
      <EmailLayout
        preview="Your job is now on the map"
        heading="Your job is live"
        body="The WemustE team approved your job. It is now on the map, and people can apply."
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
        body="The WemustE team couldn't approve your job yet. Log in to see why, edit the job and send it again."
        cta="See your jobs"
        href={`${site}/sponsor`}
      />
    ),
  },
  newCandidate: {
    subject: "You have a new candidate",
    render: (site: string) => (
      <EmailLayout
        preview="The WemustE team shared a candidate with you"
        heading="You have a new candidate"
        body="Someone applied for one of your jobs. Log in to see their application. Their contact details open with Era."
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
            "We shared your application with the employer, without your contact details.",
            "If the employer chooses you, they get your phone number and email.",
            "The employer contacts you directly by phone or email.",
          ],
        }}
        cta="See more jobs"
        href={site}
        footer={`You don't need to do anything else. Your data is deleted automatically when the job closes, or 1 month after you applied. Want it deleted sooner? Email ${app.supportEmail}. WemustE never asks for money: if someone asks you to pay for a job, it isn't us.`}
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
        body={`Thank you again for applying for ${app.jobTitle}. The employer has now closed this position. If you were selected, they have already contacted you or will do so very soon. If not, please don't be discouraged: we truly appreciate the time you put into your application, and new jobs are added to WemustE every day.`}
        cta="Explore more jobs"
        href={site}
        footer={`As promised in our privacy policy, your application for this job is now being deleted. Questions? Email ${app.supportEmail}. WemustE never asks for money: if someone asks you to pay for a job, it isn't us.`}
      />
    ),
  },
  // To a new sponsor (and again with "Resend invite"): choose your own password.
  sponsorInvite: {
    subject: "Set up your WemustE sponsor account",
    render: (_site: string, invite: InviteDetails) => (
      <EmailLayout
        preview="Your sponsor account is ready: choose your password"
        heading="Your sponsor account is ready"
        body="The WemustE team created a sponsor account for your company. Choose your own password to log in, post jobs and meet your candidates."
        steps={{
          title: "How to start",
          items: [
            "Press the button below and then Continue.",
            "Choose your password.",
            `Log in with ${invite.email} and your new password.`,
          ],
        }}
        cta="Set your password"
        href={invite.link}
        footer="This link works for 1 hour and only once. If it has expired, ask the WemustE team to send a new one. WemustE will never ask for your password by email or phone."
      />
    ),
  },
} as const;

export type EmailKind = keyof typeof TEMPLATES;
