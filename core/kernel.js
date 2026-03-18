/**
 * Thealcohesion Sovereign Kernel
 * Phase 3.5: Multi-Window Shell Integration
 */
const kernel = {
    member: null,
    systemState: "ACTIVE", // States: ACTIVE, LOCKED
    sessionKey: null, 
    logs: [],

    // 1. Emergency Lockdown: Only for Guardians/Stewards
    triggerEmergencyLockdown() {
        if (this.member && (this.member.role === "GUARDIAN" || this.member.role === "STEWARD")) {
            this.systemState = "LOCKED";
            this.logAction("EMERGENCY LOCKDOWN ACTIVATED");
            if (typeof ui !== 'undefined') ui.renderLockdownScreen();
            console.error("CRITICAL: Sovereign Environment is now LOCKED.");
        } else {
            this.logAction("UNAUTHORIZED LOCKDOWN ATTEMPT");
            throw new Error("Unauthorized: Guardian clearance required.");
        }
    },

    // 2. Security Middleware
    isSystemReady() {
        if (this.systemState === "LOCKED") {
            alert("System is LOCKED. Operations suspended.");
            return false;
        }
        return true;
    },

    // 3. Unified Audit Logging
    logAction(action) {
        const entry = {
            timestamp: new Date().toISOString(),
            member: this.member ? this.member.username : "System",
            action: action,
            state: this.systemState
        };
        this.logs.push(entry);
        console.log("Audit Record:", entry);
    },

    // 4. Identity Verification Flow
    async login() {
        const userField = document.getElementById('username').value;
        const passField = document.getElementById('password').value;

        if (!userField || !passField) {
            alert("Credentials required.");
            return;
        }

        try {
            // Logic for Identity-Gated Access
            const verifiedMember = await identityGate.verify(userField, passField);
            
            // Deriving session-specific encryption key
            this.sessionKey = await identityGate.deriveKey(passField, userField);

            this.member = {
                username: userField,
                role: verifiedMember.role,
                tier: verifiedMember.tier,
                allotment: 5 * 1024 * 1024 * 1024 // 5GB Baseline
            };

            this.logAction("IDENTITY VERIFIED & KEY DERIVED");
            this.bootShell();

        } catch (error) {
            this.logAction(`FAILED ACCESS ATTEMPT: ${userField}`);
            alert("Access Denied: " + error.message);
        }
    },

    // 5. Shell Initialization (The OS Trigger)
    bootShell() {
        console.log("Entering Private Operational Environment...");

        // Hide Login Interface
        const loginGate = document.getElementById('login-gate');
        if (loginGate) loginGate.classList.add('hidden');

        // Reveal the Sovereign Desktop/Shell
        const sovereignShell = document.getElementById('sovereign-shell');
        if (sovereignShell) sovereignShell.classList.remove('hidden');

        // Update Global UI Status
        const sessionStatus = document.getElementById('session-status');
        if (sessionStatus) {
            sessionStatus.innerText = `Member: ${this.member.username} (${this.member.role})`;
        }

        // --- START OS COMPONENTS ---
        
        // Inject Taskbar and Start Menu
        if (typeof initVPOS === "function") {
            initVPOS();
        }

        // Start Temporal Engine Clock (Syncs Taskbar Clock)
        if (typeof thealTimeApp !== "undefined" && thealTimeApp.startClock) {
            thealTimeApp.startClock();
        }

        // Initialize Role-based UI permissions
        if (typeof vpuUI !== "undefined") {
            vpuUI.init();
        }

        console.log(`VPU Session Active for ${this.member.username}`);
    },

    async saveFile(name, content) {
        if (!this.isSystemReady()) return;
        await vfs.secureWrite(this.member.username, name, content, this.sessionKey);
    }
    
};