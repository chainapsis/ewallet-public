import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import {
  type EmailVerification,
  type CreateEmailVerificationRequest,
  type VerifyEmailRequest,
  EmailVerificationStatus,
  type VerifyEmailResponse,
} from "@oko-wallet/oko-types/ct_dashboard";
import type { Result } from "@oko-wallet/stdlib-js";

export async function createEmailVerification(
  db: Pool,
  request: CreateEmailVerificationRequest,
): Promise<Result<EmailVerification, string>> {
  const query = `
INSERT INTO email_verifications (
  email_verification_id, email, verification_code,
  status, expires_at
)
VALUES (
  $1, $2, $3,
  $4, $5
)
RETURNING *
`;

  const values = [
    uuidv4(),
    request.email,
    request.verification_code,
    EmailVerificationStatus.PENDING,
    request.expires_at,
  ];

  try {
    const result = await db.query<EmailVerification>(query, values);
    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: "Failed to create email verification",
      };
    }

    return {
      success: true,
      data: row,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error) as string,
    };
  }
}

export async function verifyEmailCode(
  db: Pool,
  request: VerifyEmailRequest,
): Promise<Result<VerifyEmailResponse, string>> {
  try {
    const updateQuery = `
UPDATE email_verifications
SET status = '${EmailVerificationStatus.VERIFIED}', updated_at = NOW()
WHERE email_verification_id = (
  SELECT email_verification_id
  FROM email_verifications
  WHERE email = $1
    AND verification_code = $2
    AND status = '${EmailVerificationStatus.CODE_VERIFIED}'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1
)
RETURNING status
`;

    const result = await db.query<EmailVerification>(updateQuery, [
      request.email,
      request.verification_code,
    ]);

    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: "Invalid or expired verification code",
      };
    }

    if (row.status !== EmailVerificationStatus.VERIFIED) {
      return {
        success: false,
        err: "Invalid or expired verification code",
      };
    }

    return {
      success: true,
      data: {
        is_verified: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function markCodeVerified(
  db: Pool,
  email: string,
  code: string,
  extendMinutes: number = 5,
): Promise<Result<EmailVerification, string>> {
  const query = `
UPDATE email_verifications
SET status = '${EmailVerificationStatus.CODE_VERIFIED}',
    expires_at = NOW() + INTERVAL '1 minute' * $3,
    updated_at = NOW()
WHERE email_verification_id = (
  SELECT email_verification_id
  FROM email_verifications
  WHERE email = $1
    AND verification_code = $2
    AND status = '${EmailVerificationStatus.PENDING}'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1
)
RETURNING *
`;

  try {
    const result = await db.query<EmailVerification>(query, [
      email,
      code,
      extendMinutes,
    ]);

    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: "Invalid or expired verification code",
      };
    }

    return {
      success: true,
      data: row,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getLatestPendingVerification(
  db: Pool,
  email: string,
): Promise<Result<EmailVerification | null, string>> {
  const query = `
SELECT *
FROM email_verifications
WHERE email = $1
  AND status = '${EmailVerificationStatus.PENDING}'
  AND expires_at > NOW()
ORDER BY created_at DESC
LIMIT 1
`;

  try {
    const result = await db.query<EmailVerification>(query, [email]);

    let emailVerification: EmailVerification | null = null;
    if (result.rows.length > 0) {
      emailVerification = result.rows[0];
    }

    return {
      success: true,
      data: emailVerification,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function verifyEmailCodeFromPending(
  db: Pool,
  request: VerifyEmailRequest,
): Promise<Result<VerifyEmailResponse, string>> {
  try {
    const updateQuery = `
UPDATE email_verifications
SET status = '${EmailVerificationStatus.VERIFIED}', updated_at = NOW()
WHERE email_verification_id = (
  SELECT email_verification_id
  FROM email_verifications
  WHERE email = $1
    AND verification_code = $2
    AND status = '${EmailVerificationStatus.PENDING}'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1
)
RETURNING status
`;

    const result = await db.query<EmailVerification>(updateQuery, [
      request.email,
      request.verification_code,
    ]);

    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: "Invalid or expired verification code",
      };
    }

    if (row.status !== EmailVerificationStatus.VERIFIED) {
      return {
        success: false,
        err: "Invalid or expired verification code",
      };
    }

    return {
      success: true,
      data: {
        is_verified: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}
