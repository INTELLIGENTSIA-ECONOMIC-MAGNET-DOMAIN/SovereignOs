/**
 * THEALCOHESION VALIDATION ENGINE
 * Checks Manifest Signature vs Local Hardware ID
 */
export const SovereignValidator = {
    
    async validateManifest(file) {
        try {
            const content = await file.text();
            const manifest = JSON.parse(content);
            
            // Compare Manifest Hardware ID with the actual Machine ID
            const localHW = localStorage.getItem('VPU_HW_ID');
            
            if (manifest.HW_ID !== localHW) {
                console.error("VALIDATION_FAILURE: MANIFEST_HARDWARE_MISMATCH");
                return { valid: false, error: "DEVICE_UNAUTHORIZED" };
            }
            
            return { valid: true, data: manifest };
        } catch (e) {
            return { valid: false, error: "CORRUPT_MANIFEST" };
        }
    },

    async validateEnclaveKey(file) {
        try {
            const uploadedKey = (await file.text()).trim();
            const storedKey = localStorage.getItem('TLC_ENCLAVE_MASTER_KEY');
            
            if (uploadedKey !== storedKey) {
                console.error("VALIDATION_FAILURE: ENCLAVE_KEY_MISMATCH");
                return { valid: false, error: "ENCLAVE_DENIED" };
            }
            
            return { valid: true };
        } catch (e) {
            return { valid: false, error: "FILE_READ_ERROR" };
        }
    }
};