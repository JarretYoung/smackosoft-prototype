/** A handle for a guest made from a name, like "guest_aadit_k3f9". Handles must be 3 to 30 characters of a-z, 0-9, _. */
export function guestHandle(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "player";
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 4);
  return `guest_${slug}_${suffix}`;
}
