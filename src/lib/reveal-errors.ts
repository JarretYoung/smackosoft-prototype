"use client";

import { useEffect } from "react";

/**
 * When a submit is rejected, scroll to the first invalid field and focus it, so the
 * person never presses a button that seems to do nothing. Pass a counter that the form
 * bumps on each rejected submit. Errors that change while typing must not move the page,
 * which is why this keys on the counter and not on the errors. Fields opt in with `aria-invalid`.
 */
export function useRevealFirstError(rejections: number) {
  useEffect(() => {
    if (rejections === 0) return;
    const frame = requestAnimationFrame(() => {
      const field = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      if (!field) return;
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      field.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
      field.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [rejections]);
}
