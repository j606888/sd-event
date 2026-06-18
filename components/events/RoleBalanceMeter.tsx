"use client";

/**
 * RoleBalanceMeter — the product's signature element.
 *
 * Partner dance lives or dies on Leader/Follower balance, so the one number an
 * organizer checks most often gets the boldest treatment: a split bar in the two
 * role colors (Leader blue / Follower coral) with the counts called out. Three
 * sizes so the same idea reads on a stats hero, an event card, and a list header.
 */

type RoleBalanceMeterProps = {
  leader: number;
  follower: number;
  /** Attendees who haven't picked a role yet — shown as a side note, not in the bar. */
  notSure?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
};

function balanceLabel(leader: number, follower: number) {
  const pairTotal = leader + follower;
  const diff = leader - follower;
  if (pairTotal === 0) return "尚無資料";
  if (diff === 0) return "已平衡";
  return diff > 0 ? `Leader 多 ${diff} 位` : `Follower 多 ${-diff} 位`;
}

export function RoleBalanceMeter({
  leader,
  follower,
  notSure = 0,
  size = "lg",
  className = "",
}: RoleBalanceMeterProps) {
  const pairTotal = leader + follower;
  const leaderPct = pairTotal > 0 ? (leader / pairTotal) * 100 : 50;
  const label = balanceLabel(leader, follower);
  const empty = pairTotal === 0;

  // Compact single-line meter for cards and list headers.
  if (size === "sm") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="font-display text-sm font-semibold text-leader tabular-nums">
          {leader}
        </span>
        <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
          <div style={{ width: `${leaderPct}%`, backgroundColor: "var(--leader)" }} />
          <div className="flex-1" style={{ backgroundColor: "var(--follower)" }} />
        </div>
        <span className="font-display text-sm font-semibold text-follower tabular-nums">
          {follower}
        </span>
      </div>
    );
  }

  const big = size === "lg";

  return (
    <div className={className}>
      <div className="mb-2 flex items-end justify-between">
        <div className="leading-none">
          <div className="text-xs font-medium uppercase tracking-wide text-leader">
            Leader
          </div>
          <div
            className={`font-display font-semibold text-leader tabular-nums ${
              big ? "text-4xl" : "text-2xl"
            }`}
          >
            {leader}
          </div>
        </div>
        <div className="pb-1.5 text-center">
          <span className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-muted-ink">
            {label}
          </span>
        </div>
        <div className="text-right leading-none">
          <div className="text-xs font-medium uppercase tracking-wide text-follower">
            Follower
          </div>
          <div
            className={`font-display font-semibold text-follower tabular-nums ${
              big ? "text-4xl" : "text-2xl"
            }`}
          >
            {follower}
          </div>
        </div>
      </div>
      <div
        className={`flex w-full overflow-hidden rounded-full bg-gray-100 ${
          big ? "h-3.5" : "h-2.5"
        }`}
      >
        {empty ? (
          <div className="flex-1" />
        ) : (
          <>
            <div
              className="transition-all duration-500"
              style={{ width: `${leaderPct}%`, backgroundColor: "var(--leader)" }}
            />
            <div
              className="flex-1 transition-all duration-500"
              style={{ backgroundColor: "var(--follower)" }}
            />
          </>
        )}
      </div>
      {notSure > 0 && (
        <p className="mt-2 text-xs text-muted-ink">尚未選擇角色 {notSure} 位</p>
      )}
    </div>
  );
}
