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
