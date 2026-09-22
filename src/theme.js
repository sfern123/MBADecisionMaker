// Single source of truth for colours and shared style fragments.
export const C = {
  bg: "#0a0e17",
  panel: "#111827",
  panelAlt: "#0f172a",
  border: "#2a3450",
  borderSoft: "#1e293b",
  text: "#e2e8f0",
  muted: "#8892a8",
  faint: "#6b7a94",
  fainter: "#556178",
  accent: "#38bdf8",
  accent2: "#818cf8",
  green: "#34d399",
  red: "#f87171",
  orange: "#fb923c",
  yellow: "#fbbf24",
};

export const MONO = "'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace";
export const SANS = "'Segoe UI', 'Helvetica Neue', system-ui, sans-serif";

export const card = {
  background: C.panel,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: 18,
};

export const tooltipStyle = {
  contentStyle: {
    background: "#1a2235",
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 12,
    color: C.text,
  },
  itemStyle: { color: C.text },
};

// Shared <th> styling for the many small tables in the app.
export const th = {
  textAlign: "left",
  padding: "7px 10px",
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: C.muted,
  fontWeight: 600,
};

export const td = { padding: "7px 10px", fontFamily: MONO };
