import { EmailLayout } from "./layout";

// One entry per transactional email. Copy is short and plain for readers of
// English as a second language. No personal data in any of them.
export const TEMPLATES = {
  employerAccountReady: {
    subject: "Your Wemuste employer account is ready",
    render: (site: string) => (
      <EmailLayout
        preview="Your employer account is ready"
        heading="Your employer account is ready"
        body="Our team has set up your company on Wemuste. Log in with the details we shared with you, then choose your own password."
        cta="Log in"
        href={`${site}/login`}
      />
    ),
  },
  candidatesShared: {
    subject: "New candidates were shared with you",
    render: (site: string) => (
      <EmailLayout
        preview="New candidates on Wemuste"
        heading="You have new candidates"
        body="Our team shared new job seekers with you. Log in to view them."
        cta="View candidates"
        href={`${site}/employer/candidates`}
      />
    ),
  },
  meetingRequested: {
    subject: "You have a new meeting request",
    render: (site: string) => (
      <EmailLayout
        preview="You have a new meeting request"
        heading="You have a new meeting request"
        body="An employer wants to meet you. Log in to pick a time."
        cta="See the request"
        href={`${site}/employee/requests`}
      />
    ),
  },
  meetingAnswered: {
    subject: "A candidate replied to your meeting request",
    render: (site: string) => (
      <EmailLayout
        preview="A candidate replied to your meeting request"
        heading="You have a reply"
        body="A candidate replied to your meeting request. Log in to see their answer."
        cta="See meetings"
        href={`${site}/employer/meetings`}
      />
    ),
  },
  jobRequestAccepted: {
    subject: "Good news about your job request",
    render: (site: string) => (
      <EmailLayout
        preview="An employer replied to your job request"
        heading="An employer said yes"
        body="An employer accepted one of your job requests. Log in to see the details."
        cta="See my requests"
        href={`${site}/employee/requests`}
      />
    ),
  },
} as const;

export type EmailKind = keyof typeof TEMPLATES;
