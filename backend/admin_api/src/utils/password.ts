import { randomBytes } from "crypto";

function getRandomChar(charset: string): string {
  const maxValidByte = Math.floor(256 / charset.length) * charset.length;
  while (true) {
    const byte = randomBytes(1)[0];
    if (byte >= maxValidByte) {
      continue;
    }
    return charset[byte % charset.length];
  }
}

export function generatePassword(length: number = 20): string {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";

  const charset = lower + upper + numbers;

  const requiredChars = [
    getRandomChar(lower),
    getRandomChar(upper),
    getRandomChar(numbers),
  ];

  const remainingLength = length - requiredChars.length;
  const resultChars = [];
  const maxValidByte = Math.floor(256 / charset.length) * charset.length;

  while (resultChars.length < remainingLength) {
    const byte = randomBytes(1)[0];
    if (byte >= maxValidByte) {
      continue;
    }
    resultChars.push(charset[byte % charset.length]);
  }

  const merged = [...requiredChars, ...resultChars];

  for (let i = merged.length - 1; i > 0; i--) {
    let j: number;
    while (true) {
      const rand = randomBytes(1)[0];
      const maxValidForRange = Math.floor(256 / (i + 1)) * (i + 1);
      if (rand >= maxValidForRange) {
        continue;
      }
      j = rand % (i + 1);
      break;
    }
    [merged[i], merged[j]] = [merged[j], merged[i]];
  }

  return merged.join("");
}
