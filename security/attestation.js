/**
 * SOVEREIGN OS - ATTESTATION SERVICE
 * Handles Hardware Entropy and Perimeter Verification.
 */
export const SecurityMonitor = {
    // Generates a unique signature based on browser/hardware fingerprints
    // generates a unique fingerprint based on how your hardware draws pixels
async getHardwareEntropy() {
    // 1. Create a dedicated canvas for GPU info
    const canvasGL = document.createElement('canvas');
    const gl = canvasGL.getContext('webgl') || canvasGL.getContext('experimental-webgl');
    
    // Multi-layer Renderer Detection (Firefox-safe)
    let renderer = "UNKNOWN_GPU";
    if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        } else {
            renderer = gl.getParameter(gl.RENDERER) + gl.getParameter(gl.VENDOR);
        }
    }

    // 2. Create a SECOND dedicated canvas for 2D pixel drawing
    const canvas2D = document.createElement('canvas');
    const ctx = canvas2D.getContext('2d');
    
    // Safety check for privacy-hardened browsers
    if (!ctx) return `HARDWARE_FALLBACK_${renderer.replace(/\s/g, '_')}_2025_12_26`;

    // Draw complex geometry to capture sub-pixel rendering differences
    ctx.textBaseline = "alphabetic"; // Case-sensitive correction
    ctx.font = "16px 'Courier'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("Sovereign_VPU_Auth", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("Sovereign_VPU_Auth", 4, 17);
    
    const rawData = canvas2D.toDataURL();

    // 3. Generate the SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawData + renderer));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
},

    // The Sentry Logic
    async verifyPerimeter(kernel) {
        if (!kernel.isBooted || !kernel.isLoggedIn) return;

        const currentHW = await this.getHardwareEntropy();
        
        // Compare against the signature captured during the Login Handshake
        if (currentHW !== kernel.sessionHardwareSignature) {
            console.error("SECURITY_BREACH: Hardware Entropy Mismatch.");
            
            // This protects the 2025-12-26 Allotment by shredding the key
            kernel.shredAndLock("HARDWARE_TAMPER_DETECTED");
        }
    },

// --- SECURITY MONITORING: PHASES 3, 4, & 5 ---

startSecurityPulse(expectedSignature) {
    this.currentUserSignature = expectedSignature;
    this.sessionStart = Date.now();

    setInterval(async () => {
        if (!this.isBooted) return;

        // 30s Perimeter Pulse: Detect if the machine/hardware changed mid-session
        const currentHW = await this.getHardwareEntropy();
        
        // Use a simple string comparison for the signatures
        if (currentHW !== this.currentUserSignature) {
            console.warn("VPU_SECURITY: Signature mismatch. Shredding session...");
            this.shredAndLock("HARDWARE_TAMPER_DETECTED");
        }

        // 24h Dead-Drop: Automatic Memory Purge
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (Date.now() - this.sessionStart > twentyFourHours) {
            this.shredAndLock("TEMPORAL_DEAD_DROP_TRIGGERED");
        }
    }, 30000); 
},

shredAndLock(reason) {
    this.sessionKey = null; // The "Wipe": Clears the Enclave Key from RAM
    this.isBooted = false;
    
    console.error(`[SECURITY_CRITICAL] ${reason}`);
    
    // Notify the UI to show the Reset/Contact form
    window.dispatchEvent(new CustomEvent('os:security_violation', { detail: { reason } }));
    
    // Hide the desktop and force return to login gate
    document.getElementById('os-root').style.display = 'none';
    const gate = document.getElementById('login-gate');
    if (gate) gate.style.display = 'flex';
}
};