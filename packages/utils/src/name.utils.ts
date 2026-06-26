export function getFullName(member: { firstName: string; fatherName: string; grandfatherName?: string | null }) {
  return [member.firstName, member.fatherName, member.grandfatherName].filter(Boolean).join(' ').trim();
}
