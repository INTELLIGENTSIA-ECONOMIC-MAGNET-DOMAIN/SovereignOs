/**
 * SOVEREIGN OS - ENCLAVE BRIDGE
 * Gatekeeper for all encrypted VFS communication.
 */
export const Enclave = {
    async bridge(kernel, appId, request) {
        // Guard 01: Identity Verification
        if (!kernel.runningApps.has(appId)) {
            console.error(`Security Violation: Unregistered App [${appId}] attempted VFS access.`);
            return null;
        }

        // Guard 02: Session Check
        if (!kernel.sessionKey) {
            console.warn("Bridge Refused: No active encryption session.");
            return null;
        }

        try {
            switch (request.operation) {
                case 'READ_SECURE':
                    // Guard 03: Rank/Role Check
                    const isRestricted = request.path.includes('SEC.TAC') || request.path.includes('vaultfiles');
                    if (isRestricted && kernel.userRole !== 'OFFICER') {
                        throw new Error("PRIVILEGE_ESCALATION_PREVENTED: Insufficient Rank.");
                    }
                    return await window.SovereignVFS.read(request.path, kernel.sessionKey);
                            
                case 'WRITE_SECURE':
                    return await window.SovereignVFS.write(request.path, request.data, kernel.sessionKey);

                default:
                    return null;
            }
        } catch (err) {
            console.error(`Bridge Handshake Failed: ${err.message}`);
            return null;
        }
    },

//The Unified Binding Function
async getSecurityBinding() {
    // 1. Hardware Fingerprint Logic
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    const debugInfo = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
    const hardwareEntropy = [
        navigator.hardwareConcurrency,
        screen.width + 'x' + screen.height,
        debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'no-gpu',
        Intl.DateTimeFormat().resolvedOptions().timeZone
    ].join('|');

    // 2. IP Binding Logic (Using a public API)
    let ip = null;
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ip = data.ip;
    } catch (e) {
        console.error("VPU_NETWORK_ERROR: Could not resolve Public IP.");
        // THROW ERROR INSTEAD OF FALLBACK
        throw new Error("NETWORK_UPLINK_OFFLINE");
    }

    // Combine hardware entropy with the STRICT IP
    const hardware = [
        navigator.hardwareConcurrency,
        screen.width + "x" + screen.height,
        new Date().getTimezoneOffset(),
        ip // Using the real IP here
    ].join('|');

    const msgBuffer = new TextEncoder().encode(hardware);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const fingerprint = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    return { fingerprint, ip };
}

}