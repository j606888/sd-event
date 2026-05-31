"use client";

const ROLE_STYLES: Record<string, string> = {
  Leader: "bg-green-100 text-green-700",
  Follower: "bg-gray-100 text-gray-700",
  "Not sure": "bg-blue-100 text-blue-700",
};

const DEFAULT_STYLE = ROLE_STYLES["Not sure"];

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_STYLES[role] ?? DEFAULT_STYLE}`}>
      {role}
    </span>
  );
}
