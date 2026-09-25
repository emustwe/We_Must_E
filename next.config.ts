import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Static security headers. The Content-Security-Policy needs a per-request
// nonce, so it is set in src/proxy.ts instead.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Sponsor logos (up to 1 MB) are sent to a server action.
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  turbopack: { root: __dirname },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // "Employer" is now called "Sponsor": keep old links (and bookmarks) working.
  async redirects() {
    return [
      { source: "/employer", destination: "/sponsor", permanent: true },
      { source: "/employer/:path*", destination: "/sponsor/:path*", permanent: true },
      { source: "/admin/employers", destination: "/admin/sponsors", permanent: true },
      { source: "/admin/employers/:path*", destination: "/admin/sponsors/:path*", permanent: true },
      { source: "/for-employers", destination: "/for-sponsors", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
