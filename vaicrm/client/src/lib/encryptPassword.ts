import CryptoJS from "crypto-js";

// These must match your backend config
const SECRET = "A*z^@&mT^v2025!#*=";
const SALT = "passwordAz123@";

// PBKDF2: 65536 iterations, 128 bits key
const ITERATIONS = 65536;
const KEY_SIZE = 128 / 32; // 128 bits / 32 = 4

export function encryptPassword(plainPassword: string): string {
  // Key derivation
  const key = CryptoJS.PBKDF2(SECRET, CryptoJS.enc.Utf8.parse(SALT), {
    keySize: KEY_SIZE,
    iterations: ITERATIONS,
    hasher: CryptoJS.algo.SHA1,
  });

  // IV: 16 bytes of zeros
  const iv = CryptoJS.enc.Hex.parse("00000000000000000000000000000000");

  // Encrypt
  const encrypted = CryptoJS.AES.encrypt(plainPassword, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // Return Base64 string (matches Java's Base64.getEncoder().encodeToString)
  return encrypted.toString();
}