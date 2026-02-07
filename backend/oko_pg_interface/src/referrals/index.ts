import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool, PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";

export interface Referral {
  referral_id: string;
  user_id: string;
  public_key: Buffer;
  origin: string;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateReferralRequest {
  user_id: string;
  public_key: Buffer;
  origin: string;
  utm_source: string | null;
  utm_campaign: string | null;
}

export interface ReferralPublicInfo {
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: Date;
}

/**
 * Create referral with UPSERT behavior (ON CONFLICT DO NOTHING).
 * One referral per (public_key, origin) - only saved once at signup.
 * Returns the existing or newly created referral.
 */
export async function createReferral(
  db: Pool | PoolClient,
  data: CreateReferralRequest,
): Promise<Result<Referral, string>> {
  try {
    const query = `
INSERT INTO referrals (
  referral_id, user_id, public_key, origin, utm_source, utm_campaign
)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (public_key, origin)
DO NOTHING
RETURNING *
`;
    const values = [
      uuidv4(),
      data.user_id,
      data.public_key,
      data.origin,
      data.utm_source,
      data.utm_campaign,
    ];

    const result = await db.query<Referral>(query, values);

    // If conflict (already exists), fetch existing
    if (result.rows.length === 0) {
      const existingQuery = `
SELECT * FROM referrals
WHERE public_key = $1 AND origin = $2
LIMIT 1
`;
      const existing = await db.query<Referral>(existingQuery, [
        data.public_key,
        data.origin,
      ]);

      if (existing.rows.length === 0) {
        return { success: false, err: "Failed to create or find referral" };
      }

      return { success: true, data: existing.rows[0] };
    }

    return { success: true, data: result.rows[0] };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getReferralsByPublicKey(
  db: Pool | PoolClient,
  publicKey: Buffer,
): Promise<Result<ReferralPublicInfo[], string>> {
  try {
    const query = `
SELECT utm_source, utm_campaign, created_at
FROM referrals
WHERE public_key = $1
ORDER BY created_at DESC
`;
    const result = await db.query<ReferralPublicInfo>(query, [publicKey]);

    return {
      success: true,
      data: result.rows,
    };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getReferralsByPublicKeyAndOrigin(
  db: Pool | PoolClient,
  publicKey: Buffer,
  origin: string,
): Promise<Result<ReferralPublicInfo[], string>> {
  try {
    const query = `
SELECT utm_source, utm_campaign, created_at
FROM referrals
WHERE public_key = $1 AND origin = $2
ORDER BY created_at DESC
`;
    const result = await db.query<ReferralPublicInfo>(query, [
      publicKey,
      origin,
    ]);

    return {
      success: true,
      data: result.rows,
    };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

// export async function getReferralsByUserId(
//   db: Pool | PoolClient,
//   userId: string,
// ): Promise<Result<Referral[], string>> {
//   try {
//     const query = `
// SELECT * FROM referrals
// WHERE user_id = $1
// ORDER BY created_at DESC
// `;
//     const result = await db.query<Referral>(query, [userId]);

//     return { success: true, data: result.rows };
//   } catch (error) {
//     return { success: false, err: String(error) };
//   }
// }
