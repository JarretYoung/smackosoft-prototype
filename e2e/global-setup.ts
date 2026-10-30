const SERVICES = [
  { name: "the app", url: "http://127.0.0.1:3000/auth/login", start: "pnpm dev" },
  { name: "the Supabase API", url: "http://127.0.0.1:54321/auth/v1/health", start: "pnpm supabase start" },
  { name: "Mailpit", url: "http://127.0.0.1:54324/api/v1/info", start: "pnpm supabase start" },
];

async function reachable(url: string): Promise<boolean> {
  try {
    // Any HTTP answer, even a 401, means something is listening.
    await fetch(url, { signal: AbortSignal.timeout(5_000) });
    return true;
  } catch {
    return false;
  }
}

/** Fails fast with a plain message. The tests do not start servers and do not reset the database. */
export default async function globalSetup() {
  const down = [];
  for (const service of SERVICES) {
    if (!(await reachable(service.url))) down.push(service);
  }
  if (down.length === 0) return;
  const lines = down.map((s) => `  - ${s.name} is not reachable at ${s.url}. Start it with: ${s.start}`);
  throw new Error(`The e2e tests need running servers.\n${lines.join("\n")}`);
}
