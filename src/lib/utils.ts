import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The type role tokens in globals.css (`text-caption`, `text-footnote`, `text-subhead`, `text-body`)
// are font sizes. Without this, twMerge reads them as colors and drops them next to a real text color.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["caption", "footnote", "subhead", "body"] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
