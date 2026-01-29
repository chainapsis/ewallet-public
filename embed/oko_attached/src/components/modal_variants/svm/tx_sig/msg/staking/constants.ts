// Solana Staking Program IDs

// Native Staking
export const STAKE_PROGRAM_ID = "Stake11111111111111111111111111111111111111";

// SPL Stake Pool (used by bSOL, JitoSOL, and most LSTs)
export const SPL_STAKE_POOL_PROGRAM_ID =
  "SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy";

// Marinade Finance
export const MARINADE_LIQUID_STAKING_PROGRAM_ID =
  "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD";
export const MARINADE_NATIVE_STAKING_PROGRAM_ID =
  "mnspJQyF1KdDEs5c6YJPocYdY1esBgVQFufM2dY9oDk";

// Jito
export const JITO_STAKE_DEPOSIT_INTERCEPTOR_PROGRAM_ID =
  "5TAiuAh3YGDbwjEruC1ZpXTJWdNDS7Ur7VeqNNiHMmGV";

export const STAKING_PROGRAM_IDS = new Set([
  STAKE_PROGRAM_ID,
  SPL_STAKE_POOL_PROGRAM_ID,
  MARINADE_LIQUID_STAKING_PROGRAM_ID,
  MARINADE_NATIVE_STAKING_PROGRAM_ID,
  JITO_STAKE_DEPOSIT_INTERCEPTOR_PROGRAM_ID,
]);

export function isStakingProgram(programId: string): boolean {
  return STAKING_PROGRAM_IDS.has(programId);
}
