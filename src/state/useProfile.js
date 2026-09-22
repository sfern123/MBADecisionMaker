import { useState, useEffect, useCallback, useRef } from "react";
import { makeDefaultProfile, migrateV1toV2, PROFILE_VERSION } from "./defaults.js";

/**
 * Brings a stored profile up to the current schema.
 *
 * Saved scenarios are the user's own work, so a schema change must upgrade
 * them rather than discard them. An unrecognised future version is left
 * alone and merged over defaults — better to render something slightly odd
 * than to wipe data written by a newer build.
 */
function migrate(stored) {
  if (!stored) return null;
  let p = stored;
  if ((p.version ?? 1) === 1) p = migrateV1toV2(p);
  return p;
}

const STORAGE_KEY = "mba-finance-simulator:profile:v1";

/**
 * Reads a profile shared via URL fragment. The fragment never reaches a
 * server -- browsers do not transmit it -- but it is still visible to anyone
 * holding the link, which is why sharing is explicitly opt-in in the UI.
 */
function readFromHash() {
  if (typeof window === "undefined" || !window.location.hash) return null;
  const match = window.location.hash.match(/^#p=(.+)$/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(escape(atob(match[1]))));
  } catch {
    return null;
  }
}

function readFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function encodeProfile(profile) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(profile))));
}

/**
 * Profile state with local-only persistence.
 *
 * Everything lives in localStorage on this device. There is no account, no
 * sync, and no network request anywhere in this app -- which matters, because
 * people type their actual net worth into it.
 */
export function useProfile() {
  const [profile, setProfile] = useState(() => {
    const defaults = makeDefaultProfile();
    const shared = migrate(readFromHash());
    if (shared) return { ...defaults, ...shared };
    const stored = migrate(readFromStorage());
    if (stored) return { ...defaults, ...stored };
    return defaults;
  });

  const skipWrite = useRef(false);

  useEffect(() => {
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Private browsing or a full quota. Losing persistence is acceptable;
      // the app still works for the current session.
    }
  }, [profile]);

  const update = useCallback(patch => {
    setProfile(prev => (typeof patch === "function" ? patch(prev) : { ...prev, ...patch }));
  }, []);

  const setField = useCallback(
    key => value => setProfile(prev => ({ ...prev, [key]: value })),
    []
  );

  const reset = useCallback(() => {
    skipWrite.current = false;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* nothing to clean up */ }
    if (typeof window !== "undefined" && window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    setProfile(makeDefaultProfile());
  }, []);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mba-scenario.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [profile]);

  const importJson = useCallback(file => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = migrate(JSON.parse(String(reader.result)));
        setProfile({ ...makeDefaultProfile(), ...parsed });
      } catch {
        alert("That file could not be read as a saved scenario.");
      }
    };
    reader.readAsText(file);
  }, []);

  return { profile, update, setField, reset, exportJson, importJson };
}
