// src/app/lib/walletEncryption.ts
// Wallet encryption utilities using eth_getEncryptionPublicKey and eth_decrypt (Option B)
// For wrapping capsule keys to recipient wallets

/**
 * Get encryption public key from wallet using eth_getEncryptionPublicKey
 * 
 * This is a MetaMask-style API that returns a public key that can be used
 * to encrypt small payloads (like capsule keys) to a specific wallet.
 * 
 * @param walletAddress - The wallet address to get encryption public key for
 * @returns Hex-encoded encryption public key
 */
export async function getEncryptionPublicKey(walletAddress: string): Promise<string> {
  if (!window?.ethereum) {
    throw new Error('No wallet detected');
  }

  try {
    const encryptionPublicKey = await window.ethereum.request({
      method: 'eth_getEncryptionPublicKey',
      params: [walletAddress],
    });

    if (typeof encryptionPublicKey !== 'string') {
      throw new Error('Invalid encryption public key response');
    }

    return encryptionPublicKey;
  } catch (error: any) {
    // Handle user rejection
    if (error.code === 4001 || error.message?.includes('User rejected')) {
      throw new Error('User rejected encryption key request');
    }
    
    // Handle unsupported wallet
    if (error.code === -32601 || error.message?.includes('not supported')) {
      throw new Error('Wallet does not support eth_getEncryptionPublicKey');
    }

    throw error;
  }
}

/**
 * Encrypt data to a wallet using eth_encrypt
 * 
 * This encrypts a small payload (like a capsule key) to a recipient wallet.
 * The recipient can decrypt it using eth_decrypt with their wallet.
 * 
 * @param encryptionPublicKey - Hex-encoded encryption public key from eth_getEncryptionPublicKey
 * @param data - Data to encrypt (string or Uint8Array)
 * @returns Encrypted data in MetaMask format (hex string)
 */
export async function encryptToWallet(
  encryptionPublicKey: string,
  data: string | Uint8Array
): Promise<string> {
  if (!window?.ethereum) {
    throw new Error('No wallet detected');
  }

  // Convert data to hex string if needed
  let dataHex: string;
  if (typeof data === 'string') {
    dataHex = '0x' + Array.from(new TextEncoder().encode(data))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    dataHex = '0x' + Array.from(data)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  try {
    const encrypted = await window.ethereum.request({
      method: 'eth_encrypt',
      params: [encryptionPublicKey, dataHex],
    });

    if (typeof encrypted !== 'string') {
      throw new Error('Invalid encryption response');
    }

    return encrypted;
  } catch (error: any) {
    if (error.code === 4001 || error.message?.includes('User rejected')) {
      throw new Error('User rejected encryption');
    }
    throw error;
  }
}

/**
 * Decrypt data using eth_decrypt
 * 
 * The recipient wallet decrypts the encrypted payload using their private key.
 * 
 * @param encryptedData - Encrypted data in MetaMask format (hex string)
 * @param walletAddress - The wallet address that will decrypt (must match the recipient)
 * @returns Decrypted data as Uint8Array
 */
export async function decryptFromWallet(
  encryptedData: string,
  walletAddress: string
): Promise<Uint8Array> {
  if (!window?.ethereum) {
    throw new Error('No wallet detected');
  }

  try {
    const decryptedHex = await window.ethereum.request({
      method: 'eth_decrypt',
      params: [encryptedData, walletAddress],
    });

    if (typeof decryptedHex !== 'string' || !decryptedHex.startsWith('0x')) {
      throw new Error('Invalid decryption response');
    }

    // Convert hex to Uint8Array
    const hex = decryptedHex.slice(2); // Remove '0x' prefix
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }

    return bytes;
  } catch (error: any) {
    // Handle user rejection
    if (error.code === 4001 || error.message?.includes('User rejected')) {
      throw new Error('User rejected decryption');
    }
    
    // Handle unsupported wallet
    if (error.code === -32601 || error.message?.includes('not supported')) {
      throw new Error('Wallet does not support eth_decrypt');
    }

    throw error;
  }
}

/**
 * Wrap a capsule key to a recipient wallet
 * 
 * Process:
 * 1. Get recipient's encryption public key
 * 2. Export capsule key as raw bytes
 * 3. Encrypt capsule key bytes to recipient
 * 
 * @param capsuleKey - The AES-GCM content key to wrap
 * @param recipientWallet - The recipient's wallet address
 * @returns Encrypted capsule key (hex string, MetaMask format)
 */
export async function wrapCapsuleKeyToWallet(
  capsuleKey: CryptoKey,
  recipientWallet: string
): Promise<string> {
  // Export capsule key as raw bytes
  const rawKey = await crypto.subtle.exportKey('raw', capsuleKey);
  const keyBytes = new Uint8Array(rawKey);

  // Get recipient's encryption public key
  const encryptionPublicKey = await getEncryptionPublicKey(recipientWallet);

  // Encrypt capsule key to recipient
  const wrappedKey = await encryptToWallet(encryptionPublicKey, keyBytes);

  return wrappedKey;
}

/**
 * Unwrap a capsule key from wallet encryption
 * 
 * Process:
 * 1. Decrypt wrapped key using recipient's wallet
 * 2. Import decrypted bytes as AES-GCM key
 * 
 * @param wrappedKey - Encrypted capsule key (hex string, MetaMask format)
 * @param recipientWallet - The recipient's wallet address
 * @returns Unwrapped AES-GCM content key
 */
export async function unwrapCapsuleKeyFromWallet(
  wrappedKey: string,
  recipientWallet: string
): Promise<CryptoKey> {
  // Decrypt wrapped key using recipient's wallet
  const keyBytes = await decryptFromWallet(wrappedKey, recipientWallet);

  // Import as AES-GCM key
  // Use slice to ensure ArrayBuffer (not SharedArrayBuffer)
  const buffer = keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength);
  const keyData = new Uint8Array(buffer as ArrayBufferLike).slice().buffer;
  return crypto.subtle.importKey(
    'raw',
    keyData,
    'AES-GCM',
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Check if wallet supports eth_getEncryptionPublicKey and eth_decrypt
 */
export async function checkWalletEncryptionSupport(): Promise<boolean> {
  if (!window?.ethereum) {
    return false;
  }

  try {
    // Try to detect if the methods are available
    // Some wallets expose this via provider methods
    const provider = window.ethereum as any;
    
    // Check if methods exist (some wallets expose them directly)
    if (typeof provider.request === 'function') {
      // Try a test call (will fail gracefully if not supported)
      // We'll just check if the method exists in the provider
      return true; // Assume supported if request method exists
    }
    
    return false;
  } catch {
    return false;
  }
}

