import Link from "next/link";
import type { ReactNode } from "react";

// Renderer for <terms>/<privacy> tags in translated consent text.
export const legalLink = (href: string) =>
  function LegalLink(chunks: ReactNode) {
    return (
      <Link
        href={href}
        target="_blank"
        className="font-medium text-primary underline-offset-2 hover:underline"
      >
        {chunks}
      </Link>
    );
  };
