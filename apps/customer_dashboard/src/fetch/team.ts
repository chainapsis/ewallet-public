import type {
  AcceptInvitationResponse,
  CustomerDashboardUserRole,
  GetTeamMembersResponse,
  InviteTeamMemberResponse,
  LeaveTeamResponse,
} from "@oko-wallet/oko-types/ct_dashboard";

import { OKO_API_ENDPOINT } from ".";
import { errorHandle } from "./utils";

const CUSTOMER_V1_ENDPOINT = `${OKO_API_ENDPOINT}/customer_dashboard/v1`;

export async function requestGetTeamMembers({
  token,
  limit,
  offset,
  search,
  sort_by,
  sort_order,
}: {
  token: string;
  limit?: number;
  offset?: number;
  search?: string;
  sort_by?: "role" | "email" | "created_at";
  sort_order?: "asc" | "desc";
}) {
  return errorHandle<GetTeamMembersResponse>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/team/get_members`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        limit,
        offset,
        search,
        sort_by,
        sort_order,
      }),
    }),
  );
}

export async function requestInviteTeamMember({
  token,
  email,
  role,
}: {
  token: string;
  email: string;
  role: CustomerDashboardUserRole;
}) {
  return errorHandle<InviteTeamMemberResponse>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/team/invite_member`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, role }),
    }),
  );
}

export async function requestResendInvitation({
  token,
  invitation_id,
}: {
  token: string;
  invitation_id: string;
}) {
  return errorHandle<{ invitation_id: string }>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/team/resend_invitation`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ invitation_id }),
    }),
  );
}

export async function requestCancelInvitation({
  token,
  invitation_id,
}: {
  token: string;
  invitation_id: string;
}) {
  return errorHandle<{ invitation_id: string }>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/team/cancel_invitation`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ invitation_id }),
    }),
  );
}

export async function requestValidateInvitation({ token }: { token: string }) {
  return errorHandle<{
    email: string;
    role: string;
    team_name: string;
  }>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/team/validate_invitation`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ token }),
    }),
  );
}

export async function requestAcceptInvitation({
  token,
  password,
}: {
  token: string;
  password: string;
}) {
  return errorHandle<AcceptInvitationResponse>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/team/accept_invitation`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ token, password }),
    }),
  );
}

export async function requestUpdateMemberRole({
  token,
  user_id,
  role,
}: {
  token: string;
  user_id: string;
  role: CustomerDashboardUserRole;
}) {
  return errorHandle<{ user_id: string; role: CustomerDashboardUserRole }>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/team/update_member_role`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ user_id, role }),
    }),
  );
}

export async function requestRemoveTeamMember({
  token,
  user_id,
}: {
  token: string;
  user_id: string;
}) {
  return errorHandle<{ user_id: string }>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/team/remove_member`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ user_id }),
    }),
  );
}

export async function requestLeaveTeam({
  token,
  target_user_id,
}: {
  token: string;
  target_user_id?: string;
}) {
  return errorHandle<LeaveTeamResponse>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/team/leave`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ target_user_id }),
    }),
  );
}
