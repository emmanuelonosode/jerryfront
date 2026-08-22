/**
 * Roles and permissions.
 *
 * PERMISSIONS ARE ENUMERATED, ROLES ARE NOT HIERARCHICAL.
 *
 * The tempting model is a rank - ADMIN > MANAGER > AGENT > ACCOUNTANT > CLIENT
 * - with a `role >= required` check. It reads well and it is wrong here,
 * because ACCOUNTANT and AGENT are not more or less privileged than each other,
 * they are privileged over different things. An accountant should verify a
 * payment and never see an applicant's date of birth; an agent should read the
 * applicant and never mark money received. A rank forces one of those to be
 * wrong.
 *
 * So: an explicit grant table. Adding a permission to a role is a visible edit
 * to this file, which is the property that matters for something auditable.
 */

export const ROLES = ['ADMIN', 'MANAGER', 'AGENT', 'ACCOUNTANT', 'CLIENT'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  // Inventory
  'property:read', 'property:write', 'property:publish',
  // CRM
  'lead:read', 'lead:write', 'lead:assign',
  // Applications
  'application:read', 'application:decide',
  // The PII on an application, separated from reading the application itself.
  // Deciding needs income and rental history; it does not need a date of birth
  // or a licence number, and most staff who can decide should not see those.
  'application:read-pii',
  // Money
  'invoice:read', 'invoice:write', 'payment:read', 'payment:verify',
  // Scheduling
  'viewing:read', 'viewing:write', 'tour:review',
  // Tenant-facing
  'maintenance:read', 'maintenance:manage', 'document:read', 'document:write',
  // Content
  'content:write',
  // Administration
  'user:read', 'user:write', 'config:write', 'analytics:read',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const MANAGER: Permission[] = [
  'property:read', 'property:write', 'property:publish',
  'lead:read', 'lead:write', 'lead:assign',
  'application:read', 'application:decide',
  'invoice:read', 'invoice:write', 'payment:read',
  'viewing:read', 'viewing:write', 'tour:review',
  'maintenance:read', 'maintenance:manage',
  'document:read', 'document:write',
  'content:write', 'user:read', 'analytics:read',
];

const AGENT: Permission[] = [
  'property:read',
  'lead:read', 'lead:write',
  'application:read',
  'viewing:read', 'viewing:write', 'tour:review',
  'maintenance:read',
  'document:read',
];

const ACCOUNTANT: Permission[] = [
  'property:read',
  'application:read',
  'invoice:read', 'invoice:write',
  'payment:read', 'payment:verify',
  'analytics:read',
];

/** A client has no staff permissions at all; their access is ownership-scoped. */
const CLIENT: Permission[] = [];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: PERMISSIONS,
  MANAGER,
  AGENT,
  ACCOUNTANT,
  CLIENT,
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Whether a role belongs to staff.
 *
 * Derived from having any permission rather than from a list of role names, so
 * a new role cannot be added and accidentally treated as public.
 */
export function isStaff(role: Role): boolean {
  return (ROLE_PERMISSIONS[role]?.length ?? 0) > 0;
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/**
 * Ownership check for client-scoped resources.
 *
 * Staff permission and ownership are different questions and conflating them is
 * how one user reads another's application: a `CLIENT` may read *their own*
 * application without holding `application:read`, and holding
 * `application:read` should not require owning anything.
 */
export function canAccessOwn(actorUserId: string, resourceUserId: string | null): boolean {
  return resourceUserId !== null && actorUserId === resourceUserId;
}
