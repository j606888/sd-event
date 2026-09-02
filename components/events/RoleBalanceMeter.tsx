"use client";

/**
 * RoleBalanceMeter — the product's signature element.
 *
 * Partner dance lives or dies on Leader/Follower balance, so the one number an
 * organizer checks most often gets the boldest treatment: a split bar in the two
 * role colors (Leader blue / Follower coral) with the counts called out. Three
 * sizes so the same idea reads on a stats hero, an event card, and a list header.
 *
 * 比例的分母是「報名總人數」，尚未選角色的人以中性灰佔一段 —— 讓「還有多少人沒決定」
 * 一眼看得到，而不是被擠出畫面。平衡判定（多幾位）仍只比 Leader 與 Follower。
 */

type RoleBalanceMeterProps = {
  leader: number;
  follower: number;
  /** Attendees who haven't picked a role yet — a neutral third segment in the bar. */
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

/**
 * 三段 bar。寬度為 0 的段不渲染 —— 否則 flex 的 gap 會在只有一種角色時
 * 留下一條看起來像破圖的細縫。
 */
function segments(leader: number, follower: number, notSure: number) {
  const total = leader + follower + notSure;
  if (total === 0) return [];
  return (
    [
      { key: "leader", count: leader, color: "var(--leader)" },
      { key: "follower", count: follower, color: "var(--follower)" },
      { key: "notSure", count: notSure, color: "#b4b4b4" },
    ] as const
  )
    .filter((s) => s.count > 0)
    .map((s) => ({ ...s, pct: (s.count / total) * 100 }));
}

export function RoleBalanceMeter({
  leader,
  follower,
  notSure = 0,
  size = "lg",
  className = "",
}: RoleBalanceMeterProps) {
  const parts = segments(leader, follower, notSure);
  const label = balanceLabel(leader, follower);

  // Compact single-line meter for cards and list headers.
  if (size === "sm") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="font-display text-sm font-semibold text-leader tabular-nums">
          {leader}
        </span>
        <div className="flex h-1.5 flex-1 gap-0.5 overflow-hidden rounded-full bg-gray-200">
          {parts.map((part) => (
            <div
              key={part.key}
              className="transition-all duration-500"
              style={{ width: `${part.pct}%`, backgroundColor: part.color }}
            />
          ))}
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
      <div className="mb-2.5 flex items-end justify-between">
        <div className="leading-none">
          <div className="text-xs font-medium uppercase tracking-wide text-leader">
            Leader
          </div>
          <div
            className={`mt-1.5 font-display font-semibold text-leader tabular-nums ${
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
            className={`mt-1.5 font-display font-semibold text-follower tabular-nums ${
              big ? "text-4xl" : "text-2xl"
            }`}
          >
            {follower}
          </div>
        </div>
      </div>
      <div
        className={`flex w-full gap-0.5 overflow-hidden rounded-full bg-gray-100 ${
          big ? "h-3.5" : "h-2.5"
        }`}
      >
        {parts.map((part) => (
          <div
            key={part.key}
            className="transition-all duration-500"
            style={{ width: `${part.pct}%`, backgroundColor: part.color }}
          />
        ))}
      </div>
    </div>
  );
}
