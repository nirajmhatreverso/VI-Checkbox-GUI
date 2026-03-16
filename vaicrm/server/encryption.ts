import CryptoJS from "crypto-js";
import * as crypto from 'crypto';

// These must match your backend config
const SECRET = "A*z^@&mT^v2025!#*=";
const SALT = "passwordAz123@";

// PBKDF2: 65536 iterations, 128 bits key
const ITERATIONS = 65536;
const KEY_SIZE = 128 / 32; // 128 bits / 32 = 4
const KEY_SIZE_BYTES = 16;
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

export function decryptPassword(encryptedPassword: string): string {
  try {
    // Derive key using PBKDF2 (same as Java)
    const key = crypto.pbkdf2Sync(
      SECRET,
      Buffer.from(SALT, 'utf8'),
      ITERATIONS,
      KEY_SIZE_BYTES,
      'sha1'
    );

    // IV: 16 bytes of zeros (matches Java implementation)
    const iv = Buffer.alloc(16, 0);

    // Decode the Base64 encrypted string
    const encryptedBuffer = Buffer.from(encryptedPassword, 'base64');

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);

    // Decrypt
    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {

    throw new Error('Something Went Wrong!');
  }
}