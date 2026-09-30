"use client";

import { useEffect, useRef } from "react";
import { outreachPageOpened } from "@/actions/outreach";

// Tells the server the page was really opened in a browser (link checkers in
// mail apps load the page but don't run it, so they aren't counted). Once per
// page view.
export function OpenedBeacon({ token }: { token: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void outreachPageOpened(token);
  }, [token]);
  return null;
}
