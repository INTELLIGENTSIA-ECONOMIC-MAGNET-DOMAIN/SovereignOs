/**
 * void_enclave.js - SOVEREIGN ISOLATION STATE (v1.0)
 * Role: Non-progressive neutral containment.
 * Characteristics: No escalation, continuous observation, zero trust.
 */

export class VoidEnclave {
    constructor(container) {
        this.container = container;
        this.integrityStatus = "NEUTRALIZED";
    }

    /**
     * MATERIALIZE VOID
     * Wipes the existing UI and renders the isolation environment.
     * @param {string} reason - The specific violation or state that triggered isolation.
     */
    materialize(reason = "UNBOUND_MACHINE_OBSERVATION") {
        console.warn("SYSTEM: Transitioning to VOID_ENCLAVE. Identity escalation paused.");

        // Clear all previous UI/logic bindings
        this.container.innerHTML = "";
        
        // Render the Neutral Isolation UI
        const voidHTML = `
            <div class="void-surface" style="
                position: fixed; inset: 0; 
                background: #000; color: #333; 
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                font-family: 'Courier New', monospace; z-index: 99999;
                overflow: hidden;">
                
                <div style="position: absolute; inset: 0; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.02), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.02)); background-size: 100% 2px, 3px 100%; pointer-events: none;"></div>

                <div class="void-core" style="border: 1px solid #111; padding: 60px; text-align: center; position: relative;">
                    <h1 style="letter-spacing: 15px; margin: 0; font-size: 24px; color: #222;">VOID_ENCLAVE</h1>
                    
                    <div style="margin: 30px 0; height: 1px; width: 100%; background: #111;"></div>
                    
                    <p style="font-size: 12px; color: #444; max-width: 400px; line-height: 1.6;">
                        [STATE]: ${reason}<br>
                        [MODE]: CONTINUOUS_OBSERVATION<br>
                        [TRUST]: ZERO_THRESHOLD
                    </p>

                    <div id="void-telemetry" style="margin-top: 40px; font-size: 9px; color: #1a1a1a;">
                        Awaiting sovereign re-binding...
                    </div>
                </div>

                <div style="position: absolute; bottom: 20px; font-size: 10px; opacity: 0.3;">
                    SOVEREIGN_VPU_ISOLATION_PROTOCOL_v.2025.12.26
                </div>
            </div>
        `;

        this.container.innerHTML = voidHTML;
        this.startBackgroundObservation();
    }

    /**
     * CONTINUOUS OBSERVATION
     * Simulates the 'Sniffer' role even while in Void state.
     */
    startBackgroundObservation() {
        const telemetry = document.getElementById('void-telemetry');
        const pulses = [
            "SCANNING_ENVIRONMENT...",
            "HEARTBEAT_STABLE...",
            "NO_ESCALATION_DETECTED...",
            "OBSERVING_INGRESS_PATTERNS..."
        ];
        
        let i = 0;
        setInterval(() => {
            if (telemetry) {
                telemetry.innerText = pulses[i % pulses.length];
                i++;
            }
        }, 4000);
    }
}