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
