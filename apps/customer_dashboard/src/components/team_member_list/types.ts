import type {
  CustomerDashboardUserRole,
  PendingInvitation,
  TeamMember,
} from "@oko-wallet/oko-types/ct_dashboard";

export interface TeamListItem {
  id: string;
  email: string;
  role: CustomerDashboardUserRole;
  status: "Active" | "Invitation Pending";
  is_current_user: boolean;
  invitation_id?: string;
  last_sent_at?: string | null;
}

export function capitalize(role: "admin" | "member"): "Admin" | "Member" {
  return role === "admin" ? "Admin" : "Member";
}

export function membersToListItems(members: TeamMember[]): TeamListItem[] {
  return members.map((m) => ({
    id: m.user_id,
    email: m.email,
    role: m.role,
    status: "Active",
    is_current_user: m.is_current_user,
  }));
}

export function invitationsToListItems(
  invitations: PendingInvitation[],
): TeamListItem[] {
  return invitations.map((inv) => ({
    id: inv.invitation_id,
    email: inv.email,
    role: inv.role,
    status: "Invitation Pending",
    is_current_user: false,
    invitation_id: inv.invitation_id,
    last_sent_at: inv.last_sent_at,
  }));
}
