/**
 * SOVEREIGN OS - VFS BRIDGE
 * Role: Enforcement point for Tri-Key Security (Deadlock).
 */
export class SovereignVFS {
    constructor(kernel) {
        this.kernel = kernel;
        // Defined in "Basics" Doc Section 4: Restricted outside Action Centers
        this.restrictedSectors = ['Finance', 'Personnel', 'Governance', 'Vault', 'Records'];
    }

    /**
     * DEADLOCK ENFORCEMENT
     * Validates if the current Session Mode (Full/Limited) permits this path.
     */
    enforceAccessMode(path) {
        // Zero-Trust: Default to LIMITED_ACCESS if mode is undefined
        const mode = this.kernel.user?.sessionMode || "LIMITED_ACCESS";
        
        const isSensitive = this.restrictedSectors.some(sector => 
            path.includes(`/${sector}`)
        );

        if (mode === "LIMITED_ACCESS" && isSensitive) {
            // Behavioral Accountability: Log attempt to Sniffer
            this.kernel.sniffer?.logEvent("SEC_DENIAL", `UNAUTHORIZED_PATH_ACCESS: ${path}`);
            
            throw new Error("SECURITY_DENIAL: Access to sensitive modules is restricted outside Action Center geofence.");
        }
    }

    async read(path) {
        // 1. Key Verification
        const key = this.kernel.sessionKey || this.kernel.user?.sessionKey;
        if (!key) throw new Error("[VFS_BRIDGE]: READ_DENIED. No Session Key.");

        // 2. Deadlock Check
        this.enforceAccessMode(path);

        try {
            return await this.kernel.vfs.read(path); 
        } catch (e) {
            console.error("[VFS_BRIDGE]: READ_FAULT", e.message);
            return null;
        }
    }

    async write(path, data) {
        // 1. Key Verification
        const key = this.kernel.sessionKey || this.kernel.user?.sessionKey;
        if (!key) throw new Error("[VFS_BRIDGE]: WRITE_DENIED. Session context missing.");

        // 2. Deadlock Check
        this.enforceAccessMode(path);

        try {
            return await this.kernel.vfs.write(path, data);
        } catch (e) {
            console.error("[VFS_BRIDGE]: WRITE_FAULT", e.message);
        }
    }

    async list(path) {
        // 3. Security Check: Block directory listing of restricted areas
        this.enforceAccessMode(path);

        try {
            return await this.kernel.vfs.list(path);
        } catch (e) {
            console.error("[VFS_BRIDGE]: LIST_FAULT", e.message);
            return [];
        }
    }
}