"use client";

import { useSyncExternalStore } from "react";

const CHANGED = "url-param-change";

const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
};

/**
 * One query parameter of the address as state, for a view a person can come Back to or share: `?q=ian`.
 * It is empty on the server, so the first paint is unfiltered and the browser then applies the address.
 * Setting it replaces the history entry, so Back leaves the page and does not step through every change.
 */
export function useUrlParam(name: string): [string, (value: string) => void] {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  const value = new URLSearchParams(search).get(name) ?? "";
  function set(next: string) {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set(name, next);
    else url.searchParams.delete(name);
    // Next keeps its own state in step with replaceState.
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(CHANGED));
  }
  return [value, set];
}
