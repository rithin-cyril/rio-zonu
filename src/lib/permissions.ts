// Shared (client + server safe) permission catalog and built-in roles.

export const PERMISSION_GROUPS = [
  {
    key: "blessings",
    label: "Blessings",
    permissions: [
      ["blessings.view", "View Blessings"],
      ["blessings.approve", "Approve Blessings"],
      ["blessings.reject", "Reject Blessings"],
      ["blessings.edit", "Edit Blessings"],
      ["blessings.delete", "Delete Blessings"],
      ["blessings.hide", "Hide / Restore Blessings"],
      ["blessings.reanalyse", "Re-analyse Blessings"],
    ],
  },
  {
    key: "rankings",
    label: "Rankings",
    permissions: [
      ["rankings.report_cards", "View Report Cards"],
      ["rankings.leaderboards", "View Leaderboards"],
      ["rankings.recalculate", "Recalculate Rankings"],
    ],
  },
  {
    key: "moderation",
    label: "Moderation",
    permissions: [
      ["moderation.discord", "Access Discord Moderation"],
      ["moderation.hidden", "Manage Hidden Blessings"],
      ["moderation.logs", "View Logs"],
    ],
  },
  {
    key: "users",
    label: "User Management",
    permissions: [
      ["users.view", "View Users"],
      ["users.create", "Create Users"],
      ["users.edit", "Edit Users"],
      ["users.delete", "Delete Users"],
      ["users.reset_password", "Reset Passwords"],
      ["users.assign_permissions", "Assign Permissions"],
    ],
  },
  {
    key: "website",
    label: "Website Management",
    permissions: [
      ["website.content", "Edit Website Content"],
      ["website.gallery", "Manage Gallery"],
      ["website.rsvp", "Manage RSVP"],
      ["website.settings", "Manage Settings"],
    ],
  },
  {
    key: "administration",
    label: "Administration",
    permissions: [["admin.full", "Full Administrator"]],
  },
] as const;

export type Permission = string;

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map(([k]) => k as string),
);

export const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.permissions.map(([k, l]) => [k as string, l as string])),
);

export const ROLES = ["super_admin", "administrator", "moderator", "viewer"] as const;
export type AdminRole = (typeof ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  administrator: "Administrator",
  moderator: "Moderator",
  viewer: "Viewer",
  admin: "Super Admin (legacy)",
};

const VIEWER: Permission[] = [
  "blessings.view",
  "rankings.report_cards",
  "rankings.leaderboards",
];

const MODERATOR: Permission[] = [
  ...VIEWER,
  "blessings.approve",
  "blessings.reject",
  "blessings.hide",
  "blessings.reanalyse",
  "moderation.discord",
  "moderation.hidden",
  "moderation.logs",
];

const ADMINISTRATOR: Permission[] = ALL_PERMISSIONS.filter(
  (p) => p !== "admin.full" && p !== "users.delete",
);

/** Baseline permissions each built-in role always carries. */
export const ROLE_PRESETS: Record<string, Permission[]> = {
  super_admin: [...ALL_PERMISSIONS],
  admin: [...ALL_PERMISSIONS], // legacy single-admin role = Super Admin
  administrator: ADMINISTRATOR,
  moderator: MODERATOR,
  viewer: VIEWER,
};

export function isSuperRole(role: string) {
  return role === "super_admin" || role === "admin";
}

/** Effective permissions = role preset ∪ explicitly granted. */
export function effectivePermissions(role: string, granted: string[]): Permission[] {
  const set = new Set<string>([...(ROLE_PRESETS[role] ?? []), ...granted]);
  if (set.has("admin.full")) return [...ALL_PERMISSIONS];
  return [...set].filter((p) => ALL_PERMISSIONS.includes(p));
}

export function hasPermission(perms: string[], permission: Permission) {
  return perms.includes("admin.full") || perms.includes(permission);
}

export const STRONG_PASSWORD_HINT =
  "Password must be at least 10 characters and include an uppercase letter, a lowercase letter, a number and a symbol.";

export function isStrongPassword(pw: string) {
  return (
    pw.length >= 10 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}