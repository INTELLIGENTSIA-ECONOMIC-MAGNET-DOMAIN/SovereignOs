/**
 * sniffer.ingress.js - SOVEREIGN OBSERVATION LAYER (V2.0)
 * Role: Environment Analysis & Machine Fingerprinting
 * Principle: Unknown entities are observed, not trusted.
 */

export class Sniffer {
    constructor() {
        this.trustScore = 1.0;
        this.ingressHistory = [];
    }

    /**
     * OBSERVE
     * Analyzes the execution environment before identity escalation.
     */
    async observe(creds) {
        console.log("SNIFFER: Evaluating execution environment integrity...");

        const entropy = await this.collectHardwareEntropy();
        const anomalies = this.detectAnomalies();

        const report = {
            id: creds.id,
            pass: creds.pass,
            hwSig: entropy,
            isAutomation: anomalies.webdriver || anomalies.headless,
            isReplay: this.checkReplay(creds.timestamp),
            environment: anomalies,
            timestamp: Date.now()
        };

        // If automation is detected, we don't block yet—we let GateKeeper decide the "Trap"
        if (report.isAutomation) this.trustScore -= 0.8;
        
        return report;
    }

    /**
     * COLLECT HARDWARE ENTROPY
     * Generates a unique binding for the Enclave-Key Generator.
     */
    async collectHardwareEntropy() {
        const components = [
            navigator.userAgent,
            navigator.language,
            screen.colorDepth,
            screen.width + "x" + screen.height,
            new Date().getTimezoneOffset(),
            !!window.indexedDB,
            !!window.sessionStorage
        ];
        
        const string = components.join('|');
        const encoder = new TextEncoder();
        const data = encoder.encode(string);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * DETECT ANOMALIES
     * Identifies headless browsers and bot frameworks.
     */
    detectAnomalies() {
        return {
            webdriver: navigator.webdriver, // Native bot check
            headless: /HeadlessChrome/.test(navigator.userAgent),
            resolution: window.outerWidth === 0 && window.outerHeight === 0,
            touch: navigator.maxTouchPoints > 0,
            platform: navigator.platform
        };
    }

    /**
     * CHECK REPLAY
     * Ensures the login attempt hasn't been intercepted and re-sent.
     */
    checkReplay(ingressTime) {
        const drift = Math.abs(Date.now() - ingressTime);
        return drift > 10000; // Flag if attempt is older than 10 seconds
    }
}