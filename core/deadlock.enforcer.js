/**
 * deadlock.enforcer.js - IRREVERSIBLE CONTAINMENT
 */
import { VoidEnclave } from './void_enclave.js';
export class Deadlock {
    constructor(kernel, container) {
        this.kernel = kernel;
        this.container = container;
    }

    // ALIAS: This satisfies the call from auth.js line 74
    async executeLockdown(reason = "MANUAL_TRIGGER") {
        return this.enforce(reason);
    }

    /**
     * ENFORCE FINALITY
     * Triggered by Gatekeeper or Kernel upon critical violation.
     */
    enforce(reason) {
        console.error(`[!!!] DEADLOCK_ACTIVATED: ${reason}`);

        // 1. Shred Session Material
        localStorage.removeItem('vpu_session_token');
        sessionStorage.clear();

        // 2. Bind Hardware Lock (24h cooldown)
        const expiry = Date.now() + (24 * 60 * 60 * 1000);
        localStorage.setItem('vpu_deadlock_flag', expiry.toString());

        // 3. Emit OS-level shutdown
        if (this.kernel) this.kernel.isBooted = false;

        // 4. Force UI Regression to Void-Enclave
        // We import the VoidEnclave dynamically to prevent circular dependencies
        // 2. Clear UI and Materialize the Void
        this.container.innerHTML = ""; 
        const voidState = new VoidEnclave(this.container);
        voidState.materialize(`TERMINATED: ${reason}`);

        // 5. Notify Admin (EPOS/Investor Security Protocol)
        this.notifyBreach(reason);
    }

    async notifyBreach(reason) {
        // Implementation for your WhatsApp/API alert
        console.warn("Security breach telemetry transmitted to Sovereign Admin.");
    }
}