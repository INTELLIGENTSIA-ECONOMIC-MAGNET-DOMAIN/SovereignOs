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
        console.error(`[!!!] DEADLOCK_ENGAGED: ${reason}`);

        // 1. Shred current session for safety
        sessionStorage.removeItem('vpu_session_token');

        // 2. Increment Loop Counter
        let loops = parseInt(localStorage.getItem('vpu_loop_count') || 0);
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

            // If 3 loops are completed, allow access to the Reset Modal
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
                    // Reset failure count but keep loop count, then reload for another try
                    localStorage.setItem('vpu_fail_count', "0");
                    location.reload(); 
                } else {
                    // If they ignored the reset button and time ran out after loop 3
                    gate.innerHTML = `<h2 style="color:#ff4444">STALL_DETECTED: REBOOT_REQUIRED</h2>`;
                }
            }
        }, 1000);
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
}