/**
 * Capsule - Encrypted Share Pack container
 * Immutable after creation, references Share Pack only by checksum
 */
export type Capsule = {
  capsuleId: string;
  createdAt: number;
  expiresAt?: number;
  sharePackChecksum: string;
  wrappedKey: string; // Hex-encoded wrapped content key
  recipientPublicKey: string; // Wallet address (lowercase)
  payload: string; // Encrypted Share Pack JSON (base64)
};

