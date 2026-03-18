/**
 * enclave.crypto.js - CRYPTOGRAPHIC SOVEREIGNTY
 */
export class EnclaveCrypto {
    /**
     * DERIVE ENCLAVE KEY
     * Uses PBKDF2 to turn a password + hardware signature into a 256-bit AES key.
     */
    async deriveKey(password, hwSig) {
        const encoder = new TextEncoder();
        const pwKey = await crypto.subtle.importKey(
            "raw", 
            encoder.encode(password), 
            "PBKDF2", 
            false, 
            ["deriveKey"]
        );

        return await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: encoder.encode(hwSig), // Hardware-bound salt
                iterations: 100000,
                hash: "SHA-256"
            },
            pwKey,
            { name: "AES-GCM", length: 256 },
            false, // Key is NOT extractable from RAM
            ["encrypt", "decrypt"]
        );
    }

    async encrypt(data, key) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(data);
        const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
        return { iv, ciphertext };
    }
}