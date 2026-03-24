import type { CustomerDashboardUserRole } from "./customer_dashboard_user";

export interface TeamMember {
  user_id: string;
  email: string;
  role: CustomerDashboardUserRole;
  is_current_user: boolean;
}

export type TeamInvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "CANCELLED"
  | "EXPIRED";

export interface PendingInvitation {
  invitation_id: string;
  email: string;
  role: CustomerDashboardUserRole;
  status: TeamInvitationStatus;
  last_sent_at: string | null;
}

// ─── Request types ────────────────────────────────────────────────

export interface GetTeamMembersRequest {
  limit?: number;
  offset?: number;
  search?: string;
  sort_by?: "role" | "email" | "created_at";
  sort_order?: "asc" | "desc";
}

export interface InviteTeamMemberRequest {
  email: string;
  role: CustomerDashboardUserRole;
}

export interface ResendInvitationRequest {
  invitation_id: string;
}

export interface CancelInvitationRequest {
  invitation_id: string;
}

export interface UpdateMemberRoleRequest {
  user_id: string;
  role: CustomerDashboardUserRole;
}

export interface RemoveMemberRequest {
  user_id: string;
}

export interface LeaveTeamRequest {
  target_user_id?: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
}

export interface ValidateInvitationRequest {
  token: string;
}

// ─── Response types ───────────────────────────────────────────────

export interface GetTeamMembersResponse {
  members: TeamMember[];
  pending_invitations: PendingInvitation[];
  total: number;
  team_name: string;
}

export interface InviteTeamMemberResponse {
  invitation_id: string;
  email: string;
  role: CustomerDashboardUserRole;
}

export interface AcceptInvitationResponse {
  email: string;
  customer_id: string;
}

export interface LeaveTeamResponse {
  action: "left";
}
