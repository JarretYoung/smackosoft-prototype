import { DesignVersionSwitcher } from "@/src/components/design-version-switcher";
import { FriendActivityCardV2 } from "@/src/components/home/friend-activity-card-v2";
import { ProfileCardV2 } from "@/src/components/home/profile-card-v2";
import { QuickActionsV2 } from "@/src/components/home/quick-actions-v2";
import { StatsChartCardV2 } from "@/src/components/home/stats-chart-card-v2";

/**
 * Alternative home screen, built on shadcn primitives (Avatar, Badge,
 * Progress, Separator, Skeleton, Tabs). Runs alongside the V1 design at `/`
 * so the two can be compared; see the switcher in the header.
 */
export default function HomeV2() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:gap-6 lg:p-6">
        <header className="flex items-center justify-between gap-3">
          <h1 className="truncate text-xl font-semibold">Smackosoft</h1>
          <DesignVersionSwitcher />
        </header>

        {/* Row 1 — profile and friend activity, 40/60 from lg up. */}
        <section className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-5 lg:gap-6">
          <div className="lg:col-span-2">
            <ProfileCardV2 />
          </div>
          <div className="lg:col-span-3">
            <FriendActivityCardV2 />
          </div>
        </section>

        {/* Row 2 — circular shortcut buttons. */}
        <QuickActionsV2 />

        {/* Row 3 — per-sport stats, tabbed. */}
        <StatsChartCardV2 />
      </div>
    </main>
  );
}
