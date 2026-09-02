import { randomBytes } from "node:crypto";

const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const randomCharacterCount = 16;
const unbiasedByteLimit = Math.floor(256 / alphabet.length) * alphabet.length;

export const generateTemporaryPassword = () => {
  let value = "";

  while (value.length < randomCharacterCount) {
    for (const byte of randomBytes(randomCharacterCount)) {
      // 余りによる文字ごとの出現確率の偏りを避ける。
      if (byte >= unbiasedByteLimit) {
        continue;
      }
      value += alphabet[byte % alphabet.length];
      if (value.length === randomCharacterCount) {
        break;
      }
    }
  }

  return value.match(/.{4}/g)?.join("-") ?? value;
};
