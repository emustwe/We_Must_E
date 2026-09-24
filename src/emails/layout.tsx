import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// Shared layout. Emails never contain personal data: no names, no profile
// details, no job titles. They only say "log in to see it".
export function EmailLayout({
  preview,
  heading,
  body,
  cta,
  href,
}: {
  preview: string;
  heading: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: "32px 16px",
          backgroundColor: "#f8fafc",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
          color: "#0f172a",
        }}
      >
        <Container
          style={{
            maxWidth: 480,
            margin: "0 auto",
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 32,
          }}
        >
          <Text style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 600, color: "#1E3A8A" }}>
            Wemuste
          </Text>
          <Heading as="h1" style={{ margin: "0 0 12px", fontSize: 22, lineHeight: 1.3 }}>
            {heading}
          </Heading>
          <Text style={{ margin: "0 0 24px", fontSize: 16, lineHeight: 1.6, color: "#334155" }}>
            {body}
          </Text>
          <Section>
            <Button
              href={href}
              style={{
                backgroundColor: "#1E3A8A",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: 16,
                padding: "14px 22px",
                borderRadius: 12,
                textDecoration: "none",
              }}
            >
              {cta}
            </Button>
          </Section>
          <Text style={{ margin: "24px 0 0", fontSize: 13, lineHeight: 1.6, color: "#64748b" }}>
            For your privacy we never put details in emails. Wemuste will never ask for your
            password by email or phone.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
