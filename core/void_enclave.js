/**
 * void_enclave.js - SOVEREIGN ISOLATION STATE (v2.2)
 * Feature: Identity Purge Countdown & Continuous Observation
 * Logic: Hardwipe Enclave Keys on session dissolution.
 */

export class VoidEnclave {
    constructor(container) {
        this.container = container;
        this.purgeTimer = null;
        this.obsTimer = null;
        this.secondsRemaining = 60; 
    }

    materialize(reason = "IDENTITY_MISMATCH") {
        console.error("» VOID_ENCLAVE: Continuous observation initialized.");

        const voidHTML = `
            <div id="void-surface" style="
                position: fixed; inset: 0; background: #000; color: #333; 
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                font-family: 'Courier New', monospace; z-index: 999999; overflow: hidden;">
                
                <div style="position: absolute; inset: 0; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.2) 50%); background-size: 100% 4px; pointer-events: none;"></div>

                <div class="void-core" style="border: 1px solid #1a0000; padding: 60px; text-align: center; background: rgba(5,0,0,0.95); position: relative; box-shadow: 0 0 50px rgba(255,0,0,0.05);">
                    
                    <div id="void-glitch-title" style="letter-spacing: 12px; font-size: 24px; color: #500; text-shadow: 0 0 10px #300;">VOID_ENCLAVE</div>
                    
                    <div id="purge-clock" style="margin: 20px 0; font-size: 48px; color: #200; font-weight: bold; letter-spacing: 5px; transition: color 0.5s;">
                        00:60
                    </div>

                    <div style="font-size: 9px; color: #444; margin-bottom: 30px; letter-spacing: 2px;">
                        [STATE]: CONTINUOUS_OBSERVATION_ACTIVE
                    </div>

                    <div style="text-align: left; display: inline-block; font-size: 11px; line-height: 2; border-left: 1px solid #200; padding-left: 20px;">
                        <span style="color: #600;">[STATUS]:</span> ISOLATED<br>
                        <span style="color: #600;">[VIOLATION]:</span> ${reason.toUpperCase()}<br>
                        <span style="color: #600;">[ENFORCEMENT]:</span> ZERO_TRUST_THRESHOLD
                    </div>

                    <div id="void-telemetry" style="margin-top: 30px; font-size: 10px; color: #1a1a1a; min-height: 15px;">
                        SCANNING_INGRESS_ANOMALY...
                    </div>

                    <div style="margin-top: 40px;">
                        <button id="rebind-btn" style="
                            background: transparent; border: 1px solid #200; 
                            color: #200; padding: 12px 24px; cursor: pointer;
                            font-family: inherit; font-size: 10px; transition: 0.3s; text-transform: uppercase;">
                            Interrupt Purge & Rebind
                        </button>
                    </div>
                </div>

                <div style="position: absolute; bottom: 20px; font-size: 10px; opacity: 0.2; letter-spacing: 5px;">
                    SOVEREIGN_VPU_ENCLAVE_SYSTEM_2025_12_26
                </div>
            </div>
        `;

        this.container.innerHTML = voidHTML;
        this.startPurgeCountdown();
        this.startObservationTelemetry();
        this.attachRecoveryLogic();
    }

    startObservationTelemetry() {
        const telemetry = document.getElementById('void-telemetry');
        const logs = [
            "SCANNING_HARDWARE_INTEGRITY...",
            "OBSERVING_INGRESS_PATTERNS...",
            "HEARTBEAT_STABLE...",
            "MAPPING_VIOLATION_VECTORS...",
            "IDENTITY_ESCALATION_PAUSED...",
            "REPLICATING_VOLATILE_STATE..."
        ];
        
        let i = 0;
        this.obsTimer = setInterval(() => {
            if (telemetry) {
                telemetry.innerText = logs[i % logs.length];
                i++;
            }
        }, 3500);
    }

    startPurgeCountdown() {
        const clock = document.getElementById('purge-clock');
        
        this.purgeTimer = setInterval(() => {
            this.secondsRemaining--;
            
            if (clock) {
                const secs = this.secondsRemaining.toString().padStart(2, '0');
                clock.innerText = `00:${secs}`;
                
                if (this.secondsRemaining <= 10) {
                    clock.style.color = "#f00";
                    clock.style.textShadow = "0 0 15px rgba(255,0,0,0.5)";
                    clock.style.transform = `translateX(${Math.random() * 4 - 2}px)`;
                }
            }

            if (this.secondsRemaining <= 0) this.executePurge();
        }, 1000);
    }

    executePurge() {
        clearInterval(this.purgeTimer);
        clearInterval(this.obsTimer);
        
        console.warn("» VOID_CRITICAL: PURGE_SEQUENCE_COMPLETE. WIPING_ENCLAVE_KEY.");

        const core = document.querySelector('.void-core');
        if (core) {
            core.style.borderColor = "#f00";
            core.innerHTML = `
                <div style="color:#f00; font-size: 14px; letter-spacing: 2px; padding: 20px;">
                    SESSION_PURGED<br>
                    <span style="font-size: 9px; color: #400; display: block; margin-top: 10px;">
                        ENCLAVE_KEY_DELETED // MEMORY_WIPED // REBOOTING
                    </span>
                </div>
            `;
        }

        // --- CRYPTOGRAPHIC WIPE ---
        if (window.kernel) {
            window.kernel.sessionKey = null;
            window.kernel.user = null;
        }

        // --- PERSISTENCE WIPE ---
        localStorage.removeItem('vpu_session_token');
        localStorage.removeItem('vpu_deadlock_flag');
        sessionStorage.clear(); 

        setTimeout(() => location.reload(), 2500);
    }

    attachRecoveryLogic() {
        const btn = document.getElementById('rebind-btn');
        if (!btn) return;

        btn.onmouseover = () => {
            btn.style.borderColor = "#500";
            btn.style.color = "#500";
        };
        btn.onmouseout = () => {
            btn.style.borderColor = "#200";
            btn.style.color = "#200";
        };

        btn.onclick = () => {
            clearInterval(this.purgeTimer);
            clearInterval(this.obsTimer);
            if (window.kernel && window.kernel.auth) {
                document.getElementById('void-surface').remove();
                window.kernel.auth.renderMountButton();
            } else {
                location.reload();
            }
        };
    }
}