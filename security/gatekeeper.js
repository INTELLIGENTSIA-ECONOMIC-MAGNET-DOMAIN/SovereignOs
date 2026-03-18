/**
 * VPU CORE MODULE - GATEKEEPER
 * Logic: Security Intercepts, Fullscreen Management, and Breach Detection
 */

export class Gatekeeper {
    /**
     * Prevents unauthorized exits and manages contextual escapes.
     * Intercepts the 'Escape' key to protect the 2025-12-26 Allotment session.
     */
    setupGuards(kernel) {
        // Prevent Page Unload if Session is Active
        window.onbeforeunload = (e) => {
            if (kernel.isLoggedIn && kernel.sessionKey) {
                e.preventDefault();
                e.returnValue = 'Sovereign Session Active: Unsaved Enclave data will be shredded.';
                return e.returnValue;
            }
        };

        // Monitor Fullscreen State (Article 15 Breach Protection)
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && kernel.isLoggedIn) {
                kernel.logEvent('SEC', 'SOVEREIGN_STATE_BREACH: Fullscreen exited.');
                this.triggerEscapeWarning(kernel);
            }
        });
    }
    
    initEscapeSentinel(kernel) {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // 1. PREVENT DEFAULT SYSTEM ESCAPE BEHAVIOR
                e.preventDefault();
                e.stopImmediatePropagation();

                // 2. CONTEXTUAL ESCAPE ONLY
                // Allow ESC only for specific UI toggles (e.g., Task Overview)
                if (document.body.classList.contains('task-overview-active')) {
                    kernel.toggleTaskOverview();
                    return;
                }

                // 3. SECURE MODAL PURGE
                const activeVaultViewer = document.getElementById('vault-viewer');
                if (activeVaultViewer && activeVaultViewer.style.display !== 'none') {
                    if (kernel.activeProcesses['vault']) {
                        kernel.activeProcesses['vault'].purgeMemory();
                        return;
                    }
                }

                // 4. BREACH LOGGING
                console.warn("Gatekeeper: Escape intercepted. OS shutdown must be manual via System Menu.");
                kernel.logEvent('WARN', 'ESC_BLOCKED: Use the System Menu for manual shutdown.');
                
                // Visual feedback for blocked exit
                const shutdownBtn = document.querySelector('.menu-item-shutdown'); 
                if (shutdownBtn) shutdownBtn.style.background = "rgba(255,0,0,0.5)";
            }
        }, true); // Captured in the 'true' phase to ensure priority
    }

    /**
     * Monitor Fullscreen State for "Sovereign State Breaches".
     * If the user exits fullscreen while logged in, the session is shredded.
     */
    initDisplaySentry(kernel) {
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && kernel.isLoggedIn) {
                kernel.logEvent('SEC', 'SOVEREIGN_STATE_BREACH: Fullscreen exited.');
                
                // Trigger immediate lockdown or countdown
                if (kernel.triggerEscapeWarning) {
                    kernel.triggerEscapeWarning();
                } else {
                    kernel.lockSystem(); 
                    alert("SECURITY ALERT: Enclave locked due to Display Mode breach.");
                }
            }
        });
    }

    /**
     * Intercepts browser tab closing/reloading.
     */
    initUnloadGuard(kernel) {
        window.onbeforeunload = (e) => {
            if (kernel.isLoggedIn && kernel.sessionKey) {
                e.preventDefault();
                e.returnValue = 'Sovereign Session Active: Unsaved Enclave data will be shredded.';
                return e.returnValue;
            }
        };
    }

/**
     * ROLE: Decision Authority [cite: 61, 304]
     * Evaluates ingress data to determine Access Mode [cite: 96, 362]
     */
    async evaluate(ingressData, authorizedFingerprint, actionCenterGeofence) {
        const results = {
            authorized: false,
            mode: "NONE",
            reason: ""
        };

        // 1. IDENTITY KEY VALIDATION [cite: 81, 346]
        // Checked via Enclave Crypto during handshake [cite: 199, 208, 321]
        if (!ingressData.identityVerified) {
            results.reason = "IDENTITY_SIGNATURE_INVALID";
            return results;
        }

        // 2. MACHINE KEY VALIDATION [cite: 87, 352]
        // Ensures account is bound to authorized machine fingerprint [cite: 88, 353]
        const isRecognizedMachine = ingressData.hwSig === authorizedFingerprint;
        if (!isRecognizedMachine) {
            results.reason = "UNAUTHORIZED_HARDWARE_FINGERPRINT";
            return results; // Fail-fast: Unauthorized machine = Deny Access [cite: 89, 355]
        }

        // 3. LOCATION KEY VALIDATION (GEOFENCING) [cite: 93, 358]
        // Checks if member is within their assigned Action Center [cite: 94, 359]
        const isWithinActionCenter = this.validateGeofence(
            ingressData.location, 
            actionCenterGeofence
        );

        // 4. SESSION MODE ASSIGNMENT [cite: 96, 361]
        if (isWithinActionCenter) {
            // Full Access: Identity + Machine + Location [cite: 98, 363]
            results.authorized = true;
            results.mode = "FULL_ACCESS"; 
        } else {
            // Limited Access: Outside Action Center environment [cite: 104, 370]
            results.authorized = true;
            results.mode = "LIMITED_ACCESS";
            console.warn("[GATEKEEPER]: Limited Access Mode engaged - Outside Geofence.");
        }

        return results;
    }

    /**
     * Spatial Verification: Checks if member is within hub radius.
     * Threshold: 0.5km (Standard Branch/Action Center drift)
     */
    validateGeofence(userLoc, centerLoc) {
        if (!userLoc || !centerLoc) return false;

        const R = 6371; // Earth's radius in km
        const dLat = (centerLoc.lat - userLoc.lat) * Math.PI / 180;
        const dLon = (centerLoc.lon - userLoc.lon) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(userLoc.lat * Math.PI / 180) * Math.cos(centerLoc.lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        // Returns true if within 500 meters of the Hub
        return distance <= 0.5; 
    }
//Escape key warning
triggerEscapeWarning() {
    const overlay = document.createElement('div');
    overlay.id = 'sec-breach-overlay';
    overlay.style = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(139, 0, 0, 0.9); backdrop-filter: blur(20px);
        z-index: 1000000; display: flex; flex-direction: column;
        justify-content: center; align-items: center; color: white;
        font-family: monospace; transition: opacity 0.5s ease;
    `;

    overlay.innerHTML = `
        <h1 style="font-size: 3rem; margin-bottom: 10px; text-shadow: 0 0 20px #f00;">DISPLAY_BREACH</h1>
        <p style="letter-spacing: 2px;">SECURE_STATE LOST: PURGING VOLATILE RAM IN <span id="shred-timer">3</span>s</p>
        <div style="width: 200px; height: 2px; background: #fff; margin-top: 20px;">
            <div id="shred-bar" style="width: 100%; height: 100%; background: #ff0000; transition: width 1s linear;"></div>
        </div>
    `;

    document.body.appendChild(overlay);

    let count = 3;
    const shredTimer = setInterval(() => {
        count--;
        document.getElementById('shred-timer').innerText = count;
        document.getElementById('shred-bar').style.width = `${(count / 3) * 100}%`;

        if (count <= 0) {
            clearInterval(shredTimer);
            this.lockSystem(); // The final shred
            overlay.remove();
        }
    }, 1000);
}

    /**
     * High-level security check for session integrity.
     */
    invokeSecurityIntercept(kernel, reason) {
        console.error(`[GATEKEEPER]: Security Intercept triggered - ${reason}`);
        kernel.forceLockdown(reason);
    }
};