import { describe, it, expect } from 'vitest';
import {
  decryptMessage,
  encryptMessageForParticipants,
  exportKeyBackup,
  getOrGenerateUserKeys,
  importKeyBackup,
} from '../src/lib/crypto';

describe('Cryptographic Engine & E2EE Key Management', () => {
  const userAId = 'test-user-a-uuid';
  const userBId = 'test-user-b-uuid';
  const userCUnauthorizedId = 'test-user-c-unauthorized-uuid';

  it('generates and retrieves valid RSA-OAEP keypairs with SHA-256 fingerprints', async () => {
    const bundleA = await getOrGenerateUserKeys(userAId);

    expect(bundleA).toBeDefined();
    expect(bundleA.publicKeyBase64).toBeTruthy();
    expect(bundleA.publicKeyJwk).toBeDefined();
    expect(bundleA.privateKeyJwk).toBeDefined();
    expect(bundleA.fingerprint).toMatch(/^([0-9A-F]{2}:){7}[0-9A-F]{2}$/);

    // Re-retrieval from IndexedDB returns the identical bundle
    const reRetrieved = await getOrGenerateUserKeys(userAId);
    expect(reRetrieved.publicKeyBase64).toBe(bundleA.publicKeyBase64);
    expect(reRetrieved.fingerprint).toBe(bundleA.fingerprint);
  });

  it('successfully encrypts a plaintext message for multiple conversation participants', async () => {
    const bundleA = await getOrGenerateUserKeys(userAId);
    const bundleB = await getOrGenerateUserKeys(userBId);

    const secretText = 'CONFIDENTIAL: SafeChat Milestone 1 Verification Message';
    const participants = [
      { userId: userAId, publicKeyBase64: bundleA.publicKeyBase64 },
      { userId: userBId, publicKeyBase64: bundleB.publicKeyBase64 },
    ];

    const encrypted = await encryptMessageForParticipants(secretText, participants);

    expect(encrypted.encryptedContent).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();
    expect(Object.keys(encrypted.keyDistribution)).toContain(userAId);
    expect(Object.keys(encrypted.keyDistribution)).toContain(userBId);

    // Ciphertext must not contain plaintext string
    expect(encrypted.encryptedContent).not.toContain(secretText);

    // Participant A can decrypt
    const decryptedByA = await decryptMessage(
      encrypted.encryptedContent,
      encrypted.iv,
      encrypted.keyDistribution,
      userAId,
      bundleA.privateKeyJwk
    );
    expect(decryptedByA).toBe(secretText);

    // Participant B can decrypt
    const decryptedByB = await decryptMessage(
      encrypted.encryptedContent,
      encrypted.iv,
      encrypted.keyDistribution,
      userBId,
      bundleB.privateKeyJwk
    );
    expect(decryptedByB).toBe(secretText);
  });

  it('rejects decryption when an unauthorized third-party attempts access', async () => {
    const bundleA = await getOrGenerateUserKeys(userAId);
    const bundleB = await getOrGenerateUserKeys(userBId);
    const bundleC = await getOrGenerateUserKeys(userCUnauthorizedId);

    const secretText = 'Top secret transaction detail';
    const participants = [
      { userId: userAId, publicKeyBase64: bundleA.publicKeyBase64 },
      { userId: userBId, publicKeyBase64: bundleB.publicKeyBase64 },
    ];

    const encrypted = await encryptMessageForParticipants(secretText, participants);

    // User C is not in key_distribution
    await expect(
      decryptMessage(
        encrypted.encryptedContent,
        encrypted.iv,
        encrypted.keyDistribution,
        userCUnauthorizedId,
        bundleC.privateKeyJwk
      )
    ).rejects.toThrow(/No encrypted symmetric key distributed/i);
  });

  it('fails decryption if ciphertext has been tampered with', async () => {
    const bundleA = await getOrGenerateUserKeys(userAId);
    const participants = [{ userId: userAId, publicKeyBase64: bundleA.publicKeyBase64 }];

    const encrypted = await encryptMessageForParticipants('Authentic message', participants);

    // Tamper with base64 ciphertext
    const tamperedContent = Buffer.from('TAMPERED_PAYLOAD_CIPHERTEXT_1234567890').toString('base64');

    await expect(
      decryptMessage(
        tamperedContent,
        encrypted.iv,
        encrypted.keyDistribution,
        userAId,
        bundleA.privateKeyJwk
      )
    ).rejects.toThrow();
  });

  it('exports and imports key backups with full cryptographic roundtrip validation', async () => {
    const originalBundle = await getOrGenerateUserKeys(userAId);

    const backupJson = exportKeyBackup(originalBundle);
    expect(backupJson).toContain('SafeChat_E2EE_Identity_Backup');
    expect(backupJson).toContain(originalBundle.fingerprint);

    // Import into a separate user ID
    const restoreUserId = 'test-restored-user-uuid';
    const restoredBundle = await importKeyBackup(restoreUserId, backupJson);

    expect(restoredBundle.publicKeyBase64).toBe(originalBundle.publicKeyBase64);
    expect(restoredBundle.fingerprint).toBe(originalBundle.fingerprint);

    // Validate that restored key can decrypt a message encrypted for original key
    const msg = 'Test message for backup verification';
    const encrypted = await encryptMessageForParticipants(msg, [
      { userId: restoreUserId, publicKeyBase64: restoredBundle.publicKeyBase64 },
    ]);

    const decrypted = await decryptMessage(
      encrypted.encryptedContent,
      encrypted.iv,
      encrypted.keyDistribution,
      restoreUserId,
      restoredBundle.privateKeyJwk
    );
    expect(decrypted).toBe(msg);
  });

  it('rejects malformed or invalid key backup data during import', async () => {
    await expect(importKeyBackup(userAId, 'not-valid-json')).rejects.toThrow(/Not valid JSON/i);
    await expect(importKeyBackup(userAId, JSON.stringify({ incomplete: true }))).rejects.toThrow(
      /Missing required cryptographic key data/i
    );
  });
});
