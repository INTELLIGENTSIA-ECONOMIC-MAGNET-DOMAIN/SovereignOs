import { RecoveryManager } from '../core/recovery.js';

export function renderRecoveryGate(kernel) {
    // FIX: Use ID selector to match index.html
    const loginBox = document.getElementById('login-box') || document.querySelector('.login-box');
    
    if (!loginBox) {
        console.error("» MATERIALIZATION_FAULT: Target #login-box not found in DOM.");
        return;
    }

    loginBox.innerHTML = `
        <div class="sovereign-recovery" style="animation: fadeIn 0.8s ease;">
            <h3 style="color: #00ff41; border-bottom: 1px solid #004411; margin-bottom: 15px;">RECOVERY_GATEWAY</h3>
            
            <div id="vpu-status" style="font-size: 10px; color: #ffbc00; margin-bottom: 10px;">AWAITING_RECOVERY_CREDENTIALS...</div>

            <div class="input-group">
                <label style="display:block; font-size: 9px; color: #888;">UPLINK_TOKEN</label>
                <input type="text" id="input-token" placeholder="000000" class="tlc-input" 
                       style="width: 100%; background: #000; border: 1px solid #004411; color: #00ff41; padding: 8px; margin-bottom: 10px;">
            </div>

            <div class="input-group">
                <label style="display:block; font-size: 9px; color: #888;">ENCLAVE_MASTER_KEY</label>
                <input type="password" id="input-enclave" placeholder="TLC-XXXX-XXXX" class="tlc-input"
                       style="width: 100%; background: #000; border: 1px solid #004411; color: #00ff41; padding: 8px; margin-bottom: 10px;">
            </div>

            <div class="input-group">
                <label style="display:block; font-size: 9px; color: #888;">NEW_SOVEREIGN_PASS</label>
                <input type="password" id="new-pass" placeholder="********" class="tlc-input"
                       style="width: 100%; background: #000; border: 1px solid #004411; color: #00ff41; padding: 8px; margin-bottom: 20px;">
            </div>

            <button id="btn-restore" class="tlc-btn-wide" 
                    style="width: 100%; padding: 12px; background: #00ff41; color: #000; border: none; cursor: pointer; font-weight: bold; margin-bottom: 10px;">
                RESTORE_SOVEREIGNTY
            </button>
            <button id="btn-cancel" class="tlc-btn-flat" 
                    style="width: 100%; background: transparent; border: none; color: #444; cursor: pointer; font-size: 10px;">
                CANCEL_PROTOCOL
            </button>
        </div>
    `;

    // 1. Trigger the actual Restore logic
    document.getElementById('btn-restore').onclick = async () => {
        const btn = document.getElementById('btn-restore');
        btn.disabled = true;
        btn.innerText = "VERIFYING_UPLINK...";
        
        // Ensure RecoveryManager handles the verification logic
        await RecoveryManager.executeRestore(kernel);
    };

    // 2. Allow user to back out
    document.getElementById('btn-cancel').onclick = () => {
        window.VPU_RECOVERY_MODE = false;
        location.reload();
    };
}