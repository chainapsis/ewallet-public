import {
  Participant,
  participantToIdentifier,
} from "@oko-wallet/teddsa-interface";

export { Participant, participantToIdentifier };

/**
 * Convert Participant enum to 32-byte FROST identifier as Uint8Array.
 */
export function participantToIdentifierBytes(
  participant: Participant,
): Uint8Array {
  return new Uint8Array(participantToIdentifier(participant));
}

/**
 * Check if an identifier matches a participant.
 */
export function identifierMatchesParticipant(
  identifier: number[] | Uint8Array,
  participant: Participant,
): boolean {
  const expectedFirstByte = participant === Participant.P0 ? 1 : 2;
  return identifier[0] === expectedFirstByte;
}

/**
 * Get Participant from identifier bytes.
 * Returns null if identifier doesn't match expected pattern.
 */
export function participantFromIdentifier(
  identifier: number[] | Uint8Array,
): Participant | null {
  if (identifier[0] === 1) {
    return Participant.P0;
  }
  if (identifier[0] === 2) {
    return Participant.P1;
  }
  return null;
}
