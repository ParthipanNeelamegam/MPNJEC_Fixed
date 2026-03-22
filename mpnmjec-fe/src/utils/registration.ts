// Utility to check if a role is allowed to self-register
export function canSelfRegister(role: string) {
  // Only allow non-student roles
  return role !== 'student';
}
