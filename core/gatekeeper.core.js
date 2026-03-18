/**
 * gatekeeper.core.js - BEHAVIORAL JUDGEMENT ENGINE (V2.0)
 * Role: Internal Sentry & Authority Judge
 * Responsibility: Continuous evaluation and consequence enforcement.
 */

export class GateKeeper {
    constructor(kernel, deadlock) {
        this.kernel = kernel;
        this.deadlock = deadlock;
        this.violationCount = 0;
        this.maxViolations = 3;
    }

    /**
     * EVALUATE
     * The primary decision node for ingress and active sessions.
     */
    async evaluate(observation) {
        console.log("GATEKEEPER: Evaluating observation report...");

        // 1. CRITICAL: Automation/Bot Detection
        if (observation.isAutomation) {
            return this.issueConsequence("AUTOMATION_SIGNATURE_DETECTED", true);
        }

        // 2. CRITICAL: Replay Attack Detection
        if (observation.isReplay) {
            return this.issueConsequence("REPLAY_ATTACK_PREVENTED", true);
        }

        // 3. INTEGRITY: Hardware Signature Verification
        // Comparing current entropy against the "Law" stored in OS-Core
        const isHardwareValid = await this.kernel.verifyHardwareSignature(observation.hwSig);
        
        if (!isHardwareValid) {
            return this.issueConsequence("UNAUTHORIZED_HARDWARE_BINDING", false);
        }

        // 4. IDENTITY: Credential Handshake
        const authResult = await this.kernel.attemptLogin(observation.id, observation.pass);

        if (!authResult.success) {
            this.violationCount++;
            if (this.violationCount >= this.maxViolations) {
                return this.issueConsequence("BRUTE_FORCE_THRESHOLD_EXCEEDED", true);
            }
            return { authorized: false, reason: "INVALID_CREDENTIALS" };
        }

        // Everything passed: Reset violations and authorize
        this.violationCount = 0;
        return { authorized: true, context: authResult.context };
    }

    /**
     * ISSUE CONSEQUENCE
     * Decides if the user gets a "Red Box" warning or a "Deadlock" termination.
     */
    issueConsequence(reason, isFatal) {
        console.warn(`GATEKEEPER_JUDGEMENT: ${reason} (Fatal: ${isFatal})`);

        if (isFatal) {
            // Irreversible termination
            this.deadlock.enforce(reason);
            return { authorized: false, state: "VOID" };
        } else {
            // Temporary block / Security Intercept (Red Box UI)
            this.kernel.auth.renderGatekeeperUI(reason);
            return { authorized: false, reason: reason };
        }
    }

    /**
     * MONITOR ACTIVE SESSION
     * Can be called by the Uplink heartbeat to detect mid-session tampering.
     */
    pulseCheck(metrics) {
        if (metrics.integrityDegraded) {
            this.deadlock.enforce("SESSION_INTEGRITY_COMPROMISED");
        }
    }
}