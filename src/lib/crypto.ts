/**
 * SafeChat Cryptographic Engine
 * Implements Client-Side End-to-End Encryption (E2EE) using Web Crypto API.
 * 
 * - Identity Keypair: RSA-OAEP 2048-bit with SHA-256
 * - Message Encryption: AES-GCM 256-bit with unique 96-bit IV per message
 * - Key Distribution: Per-participant encrypted symmetric envelopes
 * - Storage: Private keys stored in browser IndexedDB, never transmitted over network
 */

import type { KeyPairBundle } from './types';

const DB_NAME = 'SafeChat_KeyStore_v1';
const STORE_NAME = 'identity_keys';

// --- IndexedDB Helper for Private Key Persistence ---
function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveKeysToStorage(userId: string, bundle: KeyPairBundle): Promise<void> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ userId, bundle });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getKeysFromStorage(userId: string): Promise<KeyPairBundle | null> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(userId);
    req.onsuccess = () => resolve(req.result ? req.result.bundle : null);
    req.onerror = () => reject(req.error);
  });
}

// --- ArrayBuffer / Base64 Utilities ---
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Compute readable fingerprint (e.g., A8:12:F4:...)
export async function computeKeyFingerprint(keyBuffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', keyBuffer);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(':');
}

// --- Key Management ---

/**
 * Initializes or retrieves existing RSA-OAEP identity keypair for a user.
 */
export async function getOrGenerateUserKeys(userId: string): Promise<KeyPairBundle> {
  const existing = await getKeysFromStorage(userId);
  if (existing) {
    return existing;
  }

  // Generate new RSA-OAEP keypair (2048-bit, SHA-256)
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const [publicKeySpki, publicKeyJwk, privateKeyJwk] = await Promise.all([
    crypto.subtle.exportKey('spki', keyPair.publicKey),
    crypto.subtle.exportKey('jwk', keyPair.publicKey),
    crypto.subtle.exportKey('jwk', keyPair.privateKey),
  ]);

  const publicKeyBase64 = bufferToBase64(publicKeySpki);
  const fingerprint = await computeKeyFingerprint(publicKeySpki);

  const bundle: KeyPairBundle = {
    publicKeyJwk,
    privateKeyJwk,
    publicKeyBase64,
    fingerprint,
  };

  await saveKeysToStorage(userId, bundle);
  return bundle;
}

/**
 * Retrieves existing stored key bundle from IndexedDB without generating new keys.
 */
export async function getStoredUserKeys(userId: string): Promise<KeyPairBundle | null> {
  return getKeysFromStorage(userId);
}

/**
 * Exports key bundle as a formatted backup JSON string.
 */
export function exportKeyBackup(bundle: KeyPairBundle): string {
  const payload = {
    version: '1.0',
    type: 'SafeChat_E2EE_Identity_Backup',
    exportedAt: new Date().toISOString(),
    fingerprint: bundle.fingerprint,
    publicKeyBase64: bundle.publicKeyBase64,
    publicKeyJwk: bundle.publicKeyJwk,
    privateKeyJwk: bundle.privateKeyJwk,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Validates and restores a key bundle from backup into IndexedDB.
 */
export async function importKeyBackup(userId: string, backupJson: string): Promise<KeyPairBundle> {
  let parsed: {
    publicKeyBase64?: string;
    publicKeyJwk?: JsonWebKey;
    privateKeyJwk?: JsonWebKey;
  };
  try {
    parsed = JSON.parse(backupJson);
  } catch {
    throw new Error('Invalid backup file: Not valid JSON format.');
  }

  if (!parsed || !parsed.publicKeyBase64 || !parsed.privateKeyJwk || !parsed.publicKeyJwk) {
    throw new Error('Invalid backup format: Missing required cryptographic key data.');
  }

  // Validate that the keypair functions correctly by running an encrypt/decrypt test cycle
  try {
    const testPub = await importPublicKey(parsed.publicKeyBase64);
    const testPriv = await importPrivateKey(parsed.privateKeyJwk);
    const testData = new Uint8Array([83, 97, 102, 101, 67, 104, 97, 116]);
    const enc = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, testPub, testData);
    const dec = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, testPriv, enc);
    const decBytes = new Uint8Array(dec);
    if (decBytes.length !== testData.length || decBytes[0] !== testData[0]) {
      throw new Error('Decrypted test block mismatch.');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Keypair cryptographic validation failed: ${msg}`);
  }

  const spkiBuffer = base64ToBuffer(parsed.publicKeyBase64);
  const fingerprint = await computeKeyFingerprint(spkiBuffer);

  const bundle: KeyPairBundle = {
    publicKeyJwk: parsed.publicKeyJwk,
    privateKeyJwk: parsed.privateKeyJwk,
    publicKeyBase64: parsed.publicKeyBase64,
    fingerprint,
  };

  await saveKeysToStorage(userId, bundle);
  return bundle;
}

/**
 * Imports an SPKI Base64 public key for encryption.
 */
export async function importPublicKey(base64Spki: string): Promise<CryptoKey> {
  const buffer = base64ToBuffer(base64Spki);
  return crypto.subtle.importKey(
    'spki',
    buffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['encrypt']
  );
}

/**
 * Imports a private JWK key for decryption.
 */
export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['decrypt']
  );
}

// --- Message Encryption & Decryption ---

export interface EncryptedMessagePayload {
  encryptedContent: string; // Base64
  iv: string;               // Base64
  keyDistribution: Record<string, string>; // userId -> Base64 encrypted AES key
}

/**
 * Encrypts a plaintext message for multiple conversation participants using hybrid encryption:
 * 1. Generates an ephemeral AES-GCM 256-bit symmetric session key.
 * 2. Encrypts plaintext with AES-GCM and fresh 12-byte IV.
 * 3. Encrypts the AES key with each participant's RSA public key.
 */
export async function encryptMessageForParticipants(
  plaintext: string,
  participants: { userId: string; publicKeyBase64: string }[]
): Promise<EncryptedMessagePayload> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // 1. Generate ephemeral 256-bit AES-GCM key
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // 2. Generate random 12-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 3. Encrypt plaintext
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    data
  );

  // 4. Export raw AES key
  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);

  // 5. Encrypt AES key for each participant's public key
  const keyDistribution: Record<string, string> = {};

  for (const p of participants) {
    if (!p.publicKeyBase64) continue;
    try {
      const pubKey = await importPublicKey(p.publicKeyBase64);
      const encryptedKeyBuf = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        pubKey,
        rawAesKey
      );
      keyDistribution[p.userId] = bufferToBase64(encryptedKeyBuf);
    } catch (err) {
      console.error(`Failed to encrypt session key for participant ${p.userId}:`, err);
    }
  }

  return {
    encryptedContent: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
    keyDistribution,
  };
}

/**
 * Decrypts an encrypted message using the user's private key.
 */
export async function decryptMessage(
  encryptedContentBase64: string,
  ivBase64: string,
  keyDistribution: Record<string, string>,
  currentUserId: string,
  privateKeyJwk: JsonWebKey
): Promise<string> {
  const encryptedAesKeyBase64 = keyDistribution[currentUserId];
  if (!encryptedAesKeyBase64) {
    throw new Error('No encrypted symmetric key distributed for your account.');
  }

  // 1. Decrypt AES session key with private RSA key
  const privateKey = await importPrivateKey(privateKeyJwk);
  const encryptedKeyBuf = base64ToBuffer(encryptedAesKeyBase64);
  const rawAesKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedKeyBuf
  );

  // 2. Import raw AES key
  const aesKey = await crypto.subtle.importKey(
    'raw',
    rawAesKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  // 3. Decrypt ciphertext
  const iv = new Uint8Array(base64ToBuffer(ivBase64));
  const ciphertext = base64ToBuffer(encryptedContentBase64);
  const decryptedBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuf);
}
