// The design's own icons (reference/*.html), so sizes and strokes match exactly.
// Each is a list of SVG child elements on a 24x24 grid, stroked in currentColor.

type Shape =
  | ["path", string]
  | ["circle", number, number, number]
  | ["line", number, number, number, number]
  | ["rect", number, number, number, number, number]
  | ["polyline", string]
  | ["polygon", string];

export const ICONS = {
  search: [
    ["circle", 11, 11, 7],
    ["line", 20, 20, 16, 16],
  ],
  briefcase: [
    ["rect", 3, 7, 18, 13, 2],
    ["path", "M9 7V5h6v2M3 13h18"],
  ],
  nearMe: [
    ["circle", 12, 12, 4],
    ["line", 12, 2, 12, 5],
    ["line", 12, 19, 12, 22],
    ["line", 2, 12, 5, 12],
    ["line", 19, 12, 22, 12],
  ],
  pin: [
    ["path", "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"],
    ["circle", 12, 9.5, 2.5],
  ],
  route: [
    ["circle", 6, 18, 2.5],
    ["circle", 18, 6, 2.5],
    ["path", "M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"],
  ],
  bolt: [["path", "M13 3L5 13h6l-1 8 8-10h-6z"]],
  video: [
    ["rect", 3, 6, 13, 12, 2],
    ["path", "M16 10l5-3v10l-5-3z"],
  ],
  list: [
    ["line", 9, 7, 20, 7],
    ["line", 9, 12, 20, 12],
    ["line", 9, 17, 20, 17],
    ["circle", 5, 7, 1],
    ["circle", 5, 12, 1],
    ["circle", 5, 17, 1],
  ],
  bookmark: [["path", "M6 4h12v17l-6-4-6 4z"]],
  share: [
    ["path", "M12 3v13M7 8l5-5 5 5"],
    ["path", "M5 13v6h14v-6"],
  ],
  close: [
    ["line", 6, 6, 18, 18],
    ["line", 18, 6, 6, 18],
  ],
  chevronLeft: [["polyline", "15 6 9 12 15 18"]],
  chevronRight: [["polyline", "9 6 15 12 9 18"]],
  chevronDown: [["polyline", "6 9 12 15 18 9"]],
  shieldCheck: [
    ["path", "M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"],
    ["polyline", "9 12 11 14 15 10"],
  ],
  layers: [
    ["path", "M12 3l9 5-9 5-9-5z"],
    ["path", "M3 13l9 5 9-5"],
  ],
  navigate: [["polygon", "3 11 21 3 13 21 11 13 3 11"]],
  plus: [
    ["line", 12, 5, 12, 19],
    ["line", 5, 12, 19, 12],
  ],
  minus: [["line", 5, 12, 19, 12]],
  home: [
    ["path", "M3 11l9-7 9 7"],
    ["path", "M5 10v10h14V10"],
  ],
  inbox: [
    ["path", "M3 13l3-8h12l3 8v6H3z"],
    ["path", "M3 13h5l1 2h6l1-2h5"],
  ],
  building: [
    ["rect", 4, 3, 16, 18, 2],
    ["path", "M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"],
  ],
  fileText: [
    ["rect", 4, 3, 16, 18, 2],
    ["path", "M8 8h8M8 12h8M8 16h5"],
  ],
  shieldClock: [
    ["path", "M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"],
    ["polyline", "12 8 12 12 14.5 13.5"],
  ],
  external: [
    ["path", "M14 4h6v6M20 4l-9 9"],
    ["path", "M18 14v6H4V6h6"],
  ],
  logout: [
    ["path", "M15 4h4v16h-4"],
    ["path", "M10 8l-4 4 4 4M6 12h10"],
  ],
  clipboardCheck: [
    ["rect", 5, 4, 14, 17, 2],
    ["path", "M9 4V3h6v1M9 12l2 2 4-4"],
  ],
  car: [
    ["path", "M5 16V11l2-5h10l2 5v5"],
    ["path", "M3 16h18v3H3z"],
  ],
  download: [
    ["path", "M12 4v11M7 10l5 5 5-5"],
    ["path", "M5 20h14"],
  ],
  calendar: [
    ["rect", 3, 5, 18, 16, 2],
    ["path", "M3 10h18M8 3v4M16 3v4"],
  ],
  more: [
    ["circle", 5, 12, 1.2],
    ["circle", 12, 12, 1.2],
    ["circle", 19, 12, 1.2],
  ],
  flask: [
    ["path", "M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2l-5-10V3"],
    ["path", "M7.5 15h9"],
  ],
  play: [["polygon", "8 5 19 12 8 19 8 5"]],
  checklist: [
    ["rect", 4, 3, 16, 18, 2],
    ["path", "M8 8l1.5 1.5L12 7M8 14l1.5 1.5L12 13M14 8h2M14 14h2"],
  ],
  check: [["polyline", "5 12 10 17 19 7"]],
  lock: [
    ["rect", 5, 11, 14, 10, 2],
    ["path", "M8 11V8a4 4 0 0 1 8 0v3"],
  ],
  pencil: [
    ["path", "M4 20h4L19 9l-4-4L4 16z"],
    ["path", "M13 7l4 4"],
  ],
  trash: [["path", "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"]],
  eyeOff: [
    ["path", "M3 3l18 18"],
    [
      "path",
      "M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.3",
    ],
  ],
  mail: [
    ["rect", 3, 5, 18, 14, 2],
    ["path", "M3 7l9 6 9-6"],
  ],
  info: [
    ["circle", 12, 12, 9],
    ["path", "M12 11v5M12 8h.01"],
  ],
  eye: [
    ["path", "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"],
    ["circle", 12, 12, 3],
  ],
  phone: [
    [
      "path",
      "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
    ],
  ],
  key: [
    ["circle", 8, 15, 4],
    ["path", "M10.8 12.2L20 3M17 6l3 3M14 9l2 2"],
  ],
  coin: [
    ["circle", 12, 12, 9],
    ["path", "M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"],
  ],
  menu: [
    ["line", 4, 7, 20, 7],
    ["line", 4, 12, 20, 12],
    ["line", 4, 17, 20, 17],
  ],
  arrowLeft: [["path", "M19 12H5M11 6l-6 6 6 6"]],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof ICONS;

export function WmIcon({
  name,
  size = 17,
  stroke = 2.2,
  fill = "none",
  className,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  fill?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {(ICONS[name] as Shape[]).map((s, i) => {
        switch (s[0]) {
          case "path":
            return <path key={i} d={s[1]} />;
          case "circle":
            return <circle key={i} cx={s[1]} cy={s[2]} r={s[3]} />;
          case "line":
            return <line key={i} x1={s[1]} y1={s[2]} x2={s[3]} y2={s[4]} />;
          case "rect":
            return <rect key={i} x={s[1]} y={s[2]} width={s[3]} height={s[4]} rx={s[5]} />;
          case "polyline":
            return <polyline key={i} points={s[1]} />;
          case "polygon":
            return <polygon key={i} points={s[1]} />;
        }
      })}
    </svg>
  );
}

// The same icons as DOM nodes, for map markers built outside React.
export function iconNode(name: IconName, size: number, stroke: number) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  for (const [k, v] of Object.entries({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": stroke,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  }))
    svg.setAttribute(k, String(v));
  for (const s of ICONS[name] as Shape[]) {
    const el = document.createElementNS(ns, s[0]);
    const attrs: Record<string, string | number> =
      s[0] === "path"
        ? { d: s[1] }
        : s[0] === "circle"
          ? { cx: s[1], cy: s[2], r: s[3] }
          : s[0] === "line"
            ? { x1: s[1], y1: s[2], x2: s[3], y2: s[4] }
            : s[0] === "rect"
              ? { x: s[1], y: s[2], width: s[3], height: s[4], rx: s[5] }
              : { points: s[1] };
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    svg.append(el);
  }
  return svg;
}
