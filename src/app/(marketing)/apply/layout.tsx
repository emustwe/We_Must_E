// The application pages use the light Wemuste design, like the map.
export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return <div className="wm-ui min-h-dvh bg-wm-land font-sans text-wm-ink">{children}</div>;
}
