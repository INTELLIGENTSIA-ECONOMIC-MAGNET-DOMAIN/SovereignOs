/**
 * deadlock.enforcer.js - PROGRESSIVE CONTAINMENT & RECOVERY
 * Role: Manages Cooldown Loops and Escalation to Sovereign Reset
 */
import { VoidEnclave } from './void_enclave.js';

export class Deadlock {
    constructor(kernel, container) {
        this.kernel = kernel;
        this.container = container;
    }

    /**
     * EXECUTE LOCKDOWN
     * Triggered by Gatekeeper after 2 failed PIN/Password attempts.
     */
    async executeLockdown(reason = "AUTH_VIOLATION") {
        // 1. Check if we have already exhausted the 3 allowed loops
        let loops = parseInt(localStorage.getItem('vpu_loop_count') || 0);
        
        if (loops >= 3) {
            console.error("» CRITICAL_EXHAUSTION: Security loops exceeded.");
            this.renderStallState(); // Force the wipe screen immediately
            return;
        }
        console.error(`[!!!] DEADLOCK_ENGAGED: ${reason}`);

        // 1. Shred current session for safety
        sessionStorage.removeItem('vpu_session_token');

        // 2. Increment Loop Counter
        loops++;
        localStorage.setItem('vpu_loop_count', loops.toString());

        // 3. Initiate the 60s Countdown Loop
        this.initiateCooldown(60, loops, reason);
    }

    /**
     * COOLDOWN LOOP (60 Seconds)
     */
    initiateCooldown(seconds, loopCount, reason) {
        let timeLeft = seconds;
        
        // Clear UI to prevent interaction during deadlock
        this.container.innerHTML = `<div id="deadlock-gate"></div>`;
        const gate = document.getElementById('deadlock-gate');

        const timer = setInterval(() => {
            timeLeft--;

            // 1. UPDATE THE OVERLAY UI
            gate.innerHTML = `
                <div class="deadlock-overlay" style="
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    height: 100vh; background: #000; color: #ff4444; font-family: monospace;
                ">
                    <h1 style="letter-spacing: 5px; border-bottom: 2px solid #ff4444;">SECURITY_DEADLOCK</h1>
                    <div style="font-size: 3rem; margin: 20px; font-weight: bold;">${timeLeft}s</div>
                    <p>UNAUTHORIZED_ACCESS_DETECTED [LOOP ${loopCount}/3]</p>
                    <p style="color: #666; font-size: 12px;">SYSTEM_COOLDOWN_IN_PROGRESS</p>

                    ${loopCount >= 3 ? `
                        <button id="vpu-reset-trigger" style="
                            margin-top: 30px; background: none; border: 1px solid #ff4444; 
                            color: #ff4444; padding: 15px 30px; cursor: pointer; text-transform: uppercase;
                        ">System Reset Required</button>
                    ` : ''}
                </div>
            `;

            // 2. ATTACH RESET TRIGGER (If Loop 3)
            if (loopCount >= 3) {
                const btn = document.getElementById('vpu-reset-trigger');
                if (btn) {
                    btn.onclick = () => {
                        clearInterval(timer);
                        this.kernel.auth.showResetModal();
                    };
                }
            }
            if (timeLeft <= 0) {
                clearInterval(timer);
                if (loopCount < 3) {
                    localStorage.setItem('vpu_fail_count', "0");
                    location.reload(); 
                } else {
                    // Use the dedicated method to show the reboot screen
                    this.renderStallState();
                }
            }
        }, 1000);
    }

    /**
     * RENDER_STALL_STATE
     * Forces the Reboot/Wipe UI when loops are exhausted.
     */
    renderStallState() {
        this.container.innerHTML = `
            <div id="deadlock-gate" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #000; text-align:center;">
                <h2 style="color:#ff4444; font-family:monospace; letter-spacing:2px; animation: pulse 2s infinite;">
                    STALL_DETECTED: REBOOT_REQUIRED
                </h2>
                <p style="color:#666; font-size:10px; margin-bottom:20px; text-transform: uppercase;">
                    IDENTITY_INTEGRITY_COMPROMISED. SYSTEM_WIPE_STAGED.
                </p>
                <button id="vpu-hard-reboot" style="
                    background: #ff4444; color: #000; border: none; 
                    padding: 15px 30px; font-family: monospace; font-weight: bold;
                    cursor: pointer; box-shadow: 0 0 20px rgba(255,0,0,0.5); text-transform: uppercase;">
                    EXECUTE_HARD_REBOOT
                </button>
            </div>
        `;

        document.getElementById('vpu-hard-reboot').onclick = async () => {
            await this.wipeSovereignIdentity();
        };
    }

    /**
     * ALIAS: Clean reset after successful recovery
     */
    clearAllDeadlocks() {
        localStorage.setItem('vpu_fail_count', "0");
        localStorage.setItem('vpu_loop_count', "0");
        localStorage.removeItem('vpu_deadlock_flag');
    }

    async notifyBreach(reason) {
        // Telemetry to Admin/Uplink
        console.warn(`Sovereign Alert: Deadlock Loop initiated. Reason: ${reason}`);
    }

/**
 * WIPE_SOVEREIGN_IDENTITY (Scorched Earth Protocol)
 * Clears the Vault and Enclave keys to force a physical re-bind.
 * Clears IndexedDB, LocalStorage, and RAM-resident keys.
 */
async wipeSovereignIdentity() {
    console.warn("» SYSTEM_WIPE: Commencing destruction of local identity...");

    // 1. CLEAR RAM/KERNEL CACHE (Stop the VFS immediately)
    if (this.kernel) {
        this.kernel.sessionKey = null;
        this.kernel.user = null;
        
        // SAFE UNMOUNT: Just clear the internal mount points map
        if (this.kernel.vfs && this.kernel.vfs.mounts) {
            this.kernel.vfs.mounts = {}; 
        }
    }

    // 2. WIPE INDEXEDDB (The .bin Manifest Drive)
    const DB_NAME = "SOVEREIGN_CORE_DB";
    const STORE_NAME = "manifest_store";
    
    try {
        const request = indexedDB.open(DB_NAME);
        request.onsuccess = (e) => {
            const db = e.target.result;
            // Check if store exists before trying to clear it
            if (db.objectStoreNames.contains(STORE_NAME)) {
                const transaction = db.transaction(STORE_NAME, "readwrite");
                transaction.objectStore(STORE_NAME).clear();
                console.log("» VAULT: Manifest purged.");
            }
        };
    } catch (dbErr) {
        console.error("» VAULT_WIPE_ERROR:", dbErr);
    }

    // 3. WIPE ALL IDENTITY KEYS FROM STORAGE
    const identityKeys = [
        'TLC_ENCLAVE_MASTER_KEY', // The Sovereign Key
        'vpu_auth_payload',
        'vpu_username',
        'vpu_manifest_present',
        'sov_identity_confirmed',
        'hw_id',
        'vpu_fail_count',
        'vpu_loop_count',
        'vpu_deadlock_flag'
    ];

    identityKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });

    // 4. FINAL CLEANUP
    localStorage.clear();
    sessionStorage.clear(); 

    console.log("» WIPE_COMPLETE: System sanitized. Redirecting to Genesis...");
    
    // 5. FORCE REBOOT
    setTimeout(() => {
        // Use origin to ensure we land back at the clean bootstrapper
        window.location.replace(window.location.origin + window.location.pathname);
    }, 1200);
}
}