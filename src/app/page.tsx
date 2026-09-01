import { DesignVersionSwitcher } from "@/src/components/design-version-switcher";
import { FriendActivityCard } from "@/src/components/home/friend-activity-card";
import { ProfileCard } from "@/src/components/home/profile-card";
import { QuickActions } from "@/src/components/home/quick-actions";
import { StatsChartCard } from "@/src/components/home/stats-chart-card";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:gap-6 lg:p-6">
        <header className="flex items-center justify-between gap-3">
          <h1 className="truncate text-xl font-semibold">Smackosoft</h1>
          <DesignVersionSwitcher />
        </header>

        {/*
          Row 1 — profile and friend activity.
          Stacks on mobile; splits 30/70 across a 10-column grid from lg up.
        */}
        <section className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-10 lg:gap-6">
          <div className="lg:col-span-3">
            <ProfileCard />
          </div>
          <div className="lg:col-span-7">
            <FriendActivityCard />
          </div>
        </section>

        {/* Row 2 — circular shortcut buttons. */}
        <QuickActions />

        {/* Row 3 — stats chart, links through to the full stats page. */}
        <StatsChartCard />
      </div>
    </main>
  );
}
