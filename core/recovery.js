/**
 * THEALCOHESION SOVEREIGN RECOVERY
 * Requirements: Uplink Token + Enclave Master Key + Manifest
 */
import { SovereignValidator } from './validator.js';

export const RecoveryManager = {
    // This would be stored encrypted in your VFS or LocalStorage during setup
    getStoredEnclaveKey() {
        return localStorage.getItem('TLC_ENCLAVE_MASTER_KEY'); 
    },

    /**
     * Initial Session Generation
     */
    async initiate(kernel) {
        const tempToken = Math.floor(100000 + Math.random() * 900000);
        kernel.recoverySession = {
            token: tempToken,
            expires: Date.now() + (5 * 60 * 1000) // 5 minute expiry
        };

        const message = `
⚠️ <b>RECOVERY_SESSION_STARTED</b>
A password reset has been requested.
Your Temporary Token: <code>${tempToken}</code>
<i>This token expires in 5 minutes.</i>
        `;

        return await this.sendToUplink(message);
    },

    async sendToUplink(msg) {
        const token = "YOUR_BOT_TOKEN";
        const chatId = "YOUR_CHAT_ID";
        try {
            const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' })
            });
            return response.ok;
        } catch (e) { return false; }
    },

    /**
     * Unified Sovereign Reset Logic
     * Handles User/Password rewriting after multi-factor validation
     */
    async executeSovereignReset(type) {
        const status = document.getElementById('vpu-status');
        const resetCodeInput = document.getElementById('reset-code').value;
        const manifestFile = document.getElementById('manifest-upload').files[0];
        const enclaveFile = document.getElementById('enclave-upload').files[0];

        // 1. Check the Uplink Code (from SessionStorage)
        const activeCode = sessionStorage.getItem('vpu_recovery_code');
        if (resetCodeInput !== activeCode) {
            this.handleRecoveryError("ERROR: INVALID_UPLINK_CODE");
            return;
        }

        // 2. Validate Files presence
        if (!manifestFile || !enclaveFile) {
            this.handleRecoveryError("ERROR: MISSING_SOVEREIGN_DOCUMENTS");
            return;
        }

        // 3. Deep Validation (Hardware & Enclave)
        const manifestResult = await SovereignValidator.validateManifest(manifestFile);
        const enclaveResult = await SovereignValidator.validateEnclaveKey(enclaveFile);

        if (!manifestResult.valid || !enclaveResult.valid) {
            this.handleRecoveryError(`ERROR: ${manifestResult.error || enclaveResult.error}`);
            return;
        }

        // 4. Perform the Write based on selected type
        try {
            if (type === 'USERNAME') {
                const newUser = document.getElementById('new-user').value;
                const repeatUser = document.getElementById('rep-user').value;
                if (newUser !== repeatUser) { this.handleRecoveryError("USER_MISMATCH"); return; }
                localStorage.setItem('vpu_username', newUser);
            } else {
                const newPass = document.getElementById('new-pass').value;
                const repeatPass = document.getElementById('rep-pass').value;
                if (newPass !== repeatPass) { this.handleRecoveryError("PASS_MISMATCH"); return; }
                localStorage.setItem('vpu_auth_payload', btoa(newPass));
            }

            // 5. Reset Deadlock State & Reboot
            localStorage.setItem('vpu_fail_count', 0);
            localStorage.setItem('vpu_loop_count', 0);
            
            if (status) {
                status.innerHTML = "<span style='color:#00ff41'>AUTHORIZATION_GRANTED: REBOOTING...</span>";
            }
            setTimeout(() => location.reload(), 3000);

        } catch (err) {
            this.handleRecoveryError("REWRITE_FAILED: KERNEL_LOCK_PROTECTION");
        }
    },

    handleRecoveryError(msg) {
        const status = document.getElementById('vpu-status');
        if (status) {
            status.innerText = msg;
            status.style.color = "#ff4444";
        } else {
            console.error(msg);
            alert(msg);
        }
    }
};