import { z } from "zod";

import { registry } from "../registry";

// ─── Common ───────────────────────────────────────────────────────

const RoleSchema = z.enum(["admin", "member"]).openapi({
  description: "Team member role",
});

const TeamMemberSchema = registry.register(
  "TeamMember",
  z.object({
    user_id: z.string().uuid(),
    email: z.string(),
    role: RoleSchema,
    is_current_user: z.boolean(),
  }),
);

const PendingInvitationSchema = registry.register(
  "PendingInvitation",
  z.object({
    invitation_id: z.string().uuid(),
    email: z.string(),
    role: RoleSchema,
    status: z.literal("PENDING"),
    last_sent_at: z.string().nullable(),
  }),
);

// ─── Get Members ──────────────────────────────────────────────────

export const GetTeamMembersRequestSchema = registry.register(
  "GetTeamMembersRequest",
  z.object({
    limit: z.number().int().min(1).max(100).optional().openapi({
      description: "Number of members per page",
    }),
    offset: z.number().int().min(0).optional().openapi({
      description: "Offset for pagination",
    }),
    search: z.string().optional().openapi({
      description: "Search by email",
    }),
    sort_by: z
      .enum(["role", "email", "created_at"])
      .optional()
      .openapi({ description: "Sort field" }),
    sort_order: z
      .enum(["asc", "desc"])
      .optional()
      .openapi({ description: "Sort direction" }),
  }),
);

export const GetTeamMembersSuccessResponseSchema = registry.register(
  "GetTeamMembersSuccessResponse",
  z.object({
    success: z.literal(true),
    data: z.object({
      members: z.array(TeamMemberSchema),
      pending_invitations: z.array(PendingInvitationSchema),
      total: z.number(),
      team_name: z.string(),
    }),
  }),
);

// ─── Invite Member ────────────────────────────────────────────────

export const InviteTeamMemberRequestSchema = registry.register(
  "InviteTeamMemberRequest",
  z.object({
    email: z.string().email().openapi({
      description: "Email address to invite",
    }),
    role: RoleSchema,
  }),
);

export const InviteTeamMemberSuccessResponseSchema = registry.register(
  "InviteTeamMemberSuccessResponse",
  z.object({
    success: z.literal(true),
    data: z.object({
      invitation_id: z.string().uuid(),
      email: z.string(),
      role: RoleSchema,
    }),
  }),
);

// ─── Resend Invitation ────────────────────────────────────────────

export const ResendInvitationRequestSchema = registry.register(
  "ResendInvitationRequest",
  z.object({
    invitation_id: z.string().uuid(),
  }),
);

export const ResendInvitationSuccessResponseSchema = registry.register(
  "ResendInvitationSuccessResponse",
  z.object({
    success: z.literal(true),
  }),
);

// ─── Cancel Invitation ────────────────────────────────────────────

export const CancelInvitationRequestSchema = registry.register(
  "CancelInvitationRequest",
  z.object({
    invitation_id: z.string().uuid(),
  }),
);

export const CancelInvitationSuccessResponseSchema = registry.register(
  "CancelInvitationSuccessResponse",
  z.object({
    success: z.literal(true),
  }),
);

// ─── Accept Invitation ────────────────────────────────────────────

export const AcceptInvitationRequestSchema = registry.register(
  "AcceptInvitationRequest",
  z.object({
    token: z.string().openapi({
      description: "Invitation token from email link",
    }),
    password: z.string().min(8).max(20).openapi({
      description: "Password for the new account",
    }),
  }),
);

export const AcceptInvitationSuccessResponseSchema = registry.register(
  "AcceptInvitationSuccessResponse",
  z.object({
    success: z.literal(true),
    data: z.object({
      email: z.string(),
      customer_id: z.string().uuid(),
    }),
  }),
);

// ─── Update Member Role ───────────────────────────────────────────

export const UpdateMemberRoleRequestSchema = registry.register(
  "UpdateMemberRoleRequest",
  z.object({
    user_id: z.string().uuid(),
    role: RoleSchema,
  }),
);

export const UpdateMemberRoleSuccessResponseSchema = registry.register(
  "UpdateMemberRoleSuccessResponse",
  z.object({
    success: z.literal(true),
  }),
);

// ─── Remove Member ────────────────────────────────────────────────

export const RemoveMemberRequestSchema = registry.register(
  "RemoveMemberRequest",
  z.object({
    user_id: z.string().uuid(),
  }),
);

export const RemoveMemberSuccessResponseSchema = registry.register(
  "RemoveMemberSuccessResponse",
  z.object({
    success: z.literal(true),
  }),
);

// ─── Leave Team ───────────────────────────────────────────────────

export const LeaveTeamRequestSchema = registry.register(
  "LeaveTeamRequest",
  z.object({
    target_user_id: z.string().uuid().optional().openapi({
      description:
        "User ID to transfer admin role to (required when sole admin with members)",
    }),
  }),
);

export const LeaveTeamSuccessResponseSchema = registry.register(
  "LeaveTeamSuccessResponse",
  z.object({
    success: z.literal(true),
    data: z.object({
      action: z.literal("left"),
    }),
  }),
);
