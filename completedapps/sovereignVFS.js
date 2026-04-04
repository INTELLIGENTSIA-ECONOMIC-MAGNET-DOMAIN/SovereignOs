/**
 * sovereignVFS.js - The Alcohesion Governance Engine
 * Purpose: Enforce Article 13.2 (100MB Limit) & Protocol Mapping
 */
export class SovereignGovernance {
    constructor(api, driver) {
        this.api = api; // The Kernel Bridge
        this.driver = driver; // SovereignVFS Driver
        this.PERSONAL_LIMIT = 100 * 1024 * 1024; // 100MB
    }

    async getManifest() {
        try {
            // CRITICAL: We pass 'null' as the key for the manifest 
            // OR we use a separate unencrypted store.
            // If your driver requires a key for EVERYTHING, pass the sessionKey here.
            const data = await this.api.fs.read('vfs_manifest');
            return typeof data === 'string' ? JSON.parse(data) : (data || { files: [], personalUsage: 0 });
        } catch (e) {
            console.error("Governance: Manifest retrieval failed.", e);
            return { files: [], personalUsage: 0 };
        }
    }

    async addEntry(name, content, category, sessionKey) {
        if (!sessionKey) throw new Error("AUTH_REQUIRED: No Session Key provided.");

        const manifest = await this.getManifest();
        const size = content.length;

        // 1. Quota Enforcement
        if (category === 'Personal') {
            if (manifest.personalUsage + size > this.PERSONAL_LIMIT) {
                throw new Error("QUOTA_EXCEEDED: Article 13.2 Limit Reached.");
            }
        }

        // 2. Protocol Mapping
        const protocol = this.getProtocolRef(category);
        const fullPath = `${protocol}${name}`;

        // 3. Encrypted Write (The content is encrypted using the key)
        await this.driver.write(fullPath, content, sessionKey);

        // 4. Update Manifest structure
        if (category === 'Personal') manifest.personalUsage += size;
        
        manifest.files.push({
            name,
            path: fullPath,
            category,
            size,
            timestamp: Date.now()
        });

        // 5. Save Manifest (Serialized to string so the driver handles it correctly)
        await this.api.fs.write('vfs_manifest', JSON.stringify(manifest));
        return true;
    }

    getProtocolRef(cat) {
        const map = {
            'Personal': 'USR/LOCAL/',
            'Comms': 'SEC.TAC/COM 1/2/3/VOL./',
            'Finance': 'SEC.TAC/COM 1/3/6/VOL./',
            'Records': 'SEC.TAC/COM 1/1/1/VOL./',
            'Personnel': 'SEC.TAC/COM 1/1/2/VOL./'
        };
        return map[cat] || 'GEN/VOL./';
    }
}