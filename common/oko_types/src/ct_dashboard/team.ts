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

export type AdminTransferStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

export interface AdminTransferRequest {
  transfer_id: string;
  customer_id: string;
  from_user_id: string;
  to_user_id: string;
  status: AdminTransferStatus;
  expires_at: string;
  created_at: string;
}
