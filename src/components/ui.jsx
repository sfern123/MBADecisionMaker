import { useState, useEffect, useRef } from "react";
import { C, MONO, card, th, td } from "../theme.js";
import { CURRENCIES } from "../data/loanPresets.js";

/* ── Formatting ───────────────────────────────────────────────────────── */

export function makeFormatters(currencyCode = "USD") {
  const sym = CURRENCIES.find(c => c.code === currencyCode)?.symbol ?? "$";
  const money = n => sym + Math.round(n).toLocaleString();
  const compact = n => {
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1e6) return `${sign}${sym}${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1000) return `${sign}${sym}${Math.round(abs / 1000)}k`;
    return `${sign}${sym}${Math.round(abs)}`;
  };
  return { sym, money, compact, pct: n => (n * 100).toFixed(1) + "%" };
}

/* ── Inputs ───────────────────────────────────────────────────────────── */

/**
 * Slider with a debounced commit. The simulation is expensive enough that
 * running it on every pointer frame makes dragging feel sticky, so the thumb
 * tracks immediately while the committed value settles behind it.
 */
export function Slider({ label, value, min, max, step, onChange, format, description, debounceMs = 90 }) {
  const [local, setLocal] = useState(value);
  const timer = useRef(null);

  useEffect(() => { setLocal(value); }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const handle = next => {
    setLocal(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), debounceMs);
  };

  const pct = max > min ? ((local - min) / (max - min)) * 100 : 0;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, gap: 8 }}>
        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: C.text }}>{format(local)}</span>
      </div>
      {description && <div style={{ fontSize: 11, color: C.faint, marginBottom: 6, lineHeight: 1.45 }}>{description}</div>}
      <div style={{ position: "relative", height: 36, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 6, borderRadius: 3, background: C.borderSoft }}>
          <div style={{ width: pct + "%", height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${C.accent}, ${C.accent2})` }} />
        </div>
        <input
          type="range" min={min} max={max} step={step} value={local}
          aria-label={label}
          onChange={e => handle(Number(e.target.value))}
          style={{ position: "absolute", left: 0, right: 0, width: "100%", height: 36, opacity: 0, cursor: "pointer", zIndex: 2 }}
        />
        <div style={{ position: "absolute", left: `calc(${pct}% - 10px)`, width: 20, height: 20, borderRadius: "50%", background: C.accent, boxShadow: `0 0 12px ${C.accent}66`, border: `2px solid ${C.bg}`, pointerEvents: "none", zIndex: 1 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.fainter, marginTop: 2 }}>
        <span>{format(min)}</span><span>{format(max)}</span>
      </div>
    </div>
  );
}

export function NumberField({ label, value, onChange, prefix, suffix, step = 1, min, max, hint, width }) {
  return (
    <label style={{ display: "block", marginBottom: 12, width }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: C.muted, marginBottom: 5 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "0 10px" }}>
        {prefix && <span style={{ color: C.faint, fontSize: 13, marginRight: 4 }}>{prefix}</span>}
        <input
          type="number" value={value} step={step} min={min} max={max}
          onChange={e => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, fontFamily: MONO, fontSize: 14, padding: "9px 0", width: "100%" }}
        />
        {suffix && <span style={{ color: C.faint, fontSize: 12, marginLeft: 4 }}>{suffix}</span>}
      </div>
      {hint && <div style={{ fontSize: 10, color: C.faint, marginTop: 4, lineHeight: 1.4 }}>{hint}</div>}
    </label>
  );
}

export function TextField({ label, value, onChange, hint }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: C.muted, marginBottom: 5 }}>{label}</div>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 14, padding: "9px 10px", outline: "none" }}
      />
      {hint && <div style={{ fontSize: 10, color: C.faint, marginTop: 4 }}>{hint}</div>}
    </label>
  );
}

export function Select({ label, value, onChange, options, hint }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      {label && <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: C.muted, marginBottom: 5 }}>{label}</div>}
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 13, padding: "9px 10px", outline: "none", cursor: "pointer" }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <div style={{ fontSize: 10, color: C.faint, marginTop: 4, lineHeight: 1.4 }}>{hint}</div>}
    </label>
  );
}

export function Toggle({ label, checked, onChange, hint }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <div
          onClick={() => onChange(!checked)}
          role="switch" aria-checked={checked} tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(!checked); } }}
          style={{ width: 38, height: 21, borderRadius: 11, background: checked ? C.accent : C.borderSoft, border: `1px solid ${checked ? C.accent : C.border}`, position: "relative", transition: "background .15s", flexShrink: 0 }}
        >
          <div style={{ position: "absolute", top: 2, left: checked ? 19 : 2, width: 15, height: 15, borderRadius: "50%", background: checked ? C.bg : C.muted, transition: "left .15s" }} />
        </div>
        <span style={{ fontSize: 12, color: C.text }}>{label}</span>
      </label>
      {hint && <div style={{ fontSize: 10, color: C.faint, marginTop: 4, marginLeft: 48, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

export function Button({ children, onClick, variant = "default", size = "md", title }) {
  const palette = {
    default: { bg: "transparent", border: C.border, color: C.text },
    primary: { bg: C.accent + "1a", border: C.accent, color: C.accent },
    danger: { bg: C.red + "12", border: C.red + "88", color: C.red },
  }[variant];
  const pad = size === "sm" ? "5px 10px" : "9px 16px";
  return (
    <button
      onClick={onClick} title={title}
      style={{ background: palette.bg, border: `1px solid ${palette.border}`, color: palette.color, borderRadius: 7, padding: pad, fontSize: size === "sm" ? 11 : 13, fontWeight: 600, cursor: "pointer" }}
    >
      {children}
    </button>
  );
}

/* ── Display ──────────────────────────────────────────────────────────── */

export function MetricCard({ label, value, sub, color = C.text }) {
  return (
    <div style={{ ...card, padding: "15px 17px" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 21, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.faint, marginTop: 3, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

export function SectionTitle({ children, id }) {
  return (
    <div id={id} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: C.accent, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}`, marginTop: 38, scrollMarginTop: 16 }}>
      {children}
    </div>
  );
}

export function Card({ title, subtitle, children, style }) {
  return (
    <div style={{ ...card, ...style }}>
      {title && <div style={{ fontSize: 13, fontWeight: 600, marginBottom: subtitle ? 4 : 12, color: C.text }}>{title}</div>}
      {subtitle && <div style={{ fontSize: 11, color: C.faint, marginBottom: 12, lineHeight: 1.5 }}>{subtitle}</div>}
      {children}
    </div>
  );
}

export function Grid({ cols, gap = 14, children, style }) {
  return <div style={{ display: "grid", gridTemplateColumns: cols, gap, ...style }}>{children}</div>;
}

/** Compact table. `rows` are arrays of cells; `highlight` marks a row. */
export function DataTable({ headers, rows, highlight }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
          {headers.map((h, i) => <th key={i} style={th}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${C.borderSoft}`, background: highlight?.(i) ? C.accent + "0d" : "transparent" }}>
            {row.map((cell, j) => (
              <td key={j} style={{ ...td, fontFamily: j === 0 ? "inherit" : MONO }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Callout({ tone = "info", title, children, style }) {
  const tones = {
    info: C.accent, warn: C.yellow, danger: C.red, good: C.green, alt: C.accent2,
  };
  const col = tones[tone] ?? C.accent;
  return (
    <div style={{ background: col + "0d", border: `1px solid ${col}55`, borderRadius: 10, padding: "14px 18px", ...style }}>
      {title && <div style={{ fontSize: 12, fontWeight: 700, color: col, marginBottom: 6 }}>{title}</div>}
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

export function Badge({ tone = "info", children, title }) {
  const tones = { info: C.accent, warn: C.yellow, danger: C.red, good: C.green, muted: C.muted };
  const col = tones[tone] ?? C.accent;
  return (
    <span title={title} style={{ display: "inline-block", padding: "1px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", background: col + "1f", color: col, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}
