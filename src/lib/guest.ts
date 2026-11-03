/**
 * A handle for a guest made from a name, like "guest_aadit_k3f9". Handles must be 3 to 30 characters of a-z, 0-9, _.
 * Pass the same suffix to get a handle that follows the name as it is typed.
 */
export function guestHandle(name: string, suffix: string = randomSuffix()): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "player";
  return `guest_${slug}_${suffix}`;
}

export function randomSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 4);
}
