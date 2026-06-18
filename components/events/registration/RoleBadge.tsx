"use client";

const ROLE_STYLES: Record<string, string> = {
  Leader: "bg-leader/10 text-leader",
  Follower: "bg-follower/10 text-follower",
  "Not sure": "bg-gray-100 text-gray-600",
};

const DEFAULT_STYLE = ROLE_STYLES["Not sure"];

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_STYLES[role] ?? DEFAULT_STYLE}`}>
      {role}
    </span>
  );
}
