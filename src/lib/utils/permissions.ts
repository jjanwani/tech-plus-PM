import type { UserRole } from '@/types'

const ROLE_WEIGHT: Record<UserRole, number> = {
  new_analyst: 0,
  senior_analyst: 1,
  project_manager: 2,
  consulting_manager: 3,
  vp_internal: 4,
  vp_external: 4,
  vp_operations: 5,
  president: 6,
}

export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_WEIGHT[userRole] >= ROLE_WEIGHT[minRole]
}

export function canManageProject(userRole: UserRole): boolean {
  return hasMinRole(userRole, 'project_manager')
}

export function canSeeAllProjects(userRole: UserRole): boolean {
  return hasMinRole(userRole, 'consulting_manager')
}

export function isAdmin(userRole: UserRole): boolean {
  return hasMinRole(userRole, 'president')
}

// Mirrors the deliverables_manage / members_manage RLS policies, which gate
// writes on the caller's role *within the project* (project_members.role),
// not their global profile role.
export function canManageAsProjectLead(
  profile: { role: UserRole; is_admin: boolean },
  projectRole: UserRole | null
): boolean {
  if (profile.is_admin) return true
  if (profile.role === 'vp_operations' || profile.role === 'president') return true
  return projectRole === 'project_manager' || projectRole === 'consulting_manager'
}
