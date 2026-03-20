export type TeamMember = {
  user_id: string;
  email: string;
  role: "Admin" | "Member";
  status: "Active" | "Invitation Pending";
  is_me: boolean;
};

// Set to true to preview Admin view
export const MOCK_IS_ADMIN = true;

const BASE_MEMBERS: TeamMember[] = [
  {
    user_id: "1",
    email: "name@domain.com",
    role: MOCK_IS_ADMIN ? "Admin" : "Member",
    status: "Active",
    is_me: true,
  },
  {
    user_id: "2",
    email: "name@domain.com",
    role: "Admin",
    status: "Invitation Pending",
    is_me: false,
  },
  {
    user_id: "3",
    email: "name@domain.com",
    role: "Admin",
    status: "Active",
    is_me: false,
  },
  {
    user_id: "4",
    email: "name@domain.com",
    role: "Member",
    status: "Active",
    is_me: false,
  },
  {
    user_id: "5",
    email: "name@domain.com",
    role: "Member",
    status: "Active",
    is_me: false,
  },
  {
    user_id: "6",
    email: "name@domain.com",
    role: "Member",
    status: "Active",
    is_me: false,
  },
  {
    user_id: "7",
    email: "name@domain.com",
    role: "Member",
    status: "Active",
    is_me: false,
  },
];

const generateMembers = (): TeamMember[] => {
  const extra: TeamMember[] = Array.from({ length: 89 }, (_, i) => ({
    user_id: String(i + 8),
    email: "name@domain.com",
    role: "Member" as const,
    status: (i === 0 ? "Invitation Pending" : "Active") as TeamMember["status"],
    is_me: false,
  }));
  return [...BASE_MEMBERS, ...extra];
};

export const MOCK_TEAM_MEMBERS: TeamMember[] = generateMembers();
