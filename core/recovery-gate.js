import { RecoveryManager } from '../core/recovery.js';
export function renderRecoveryGate(kernel) {
    const loginBox = document.querySelector('.login-box');
    
    loginBox.innerHTML = `
        <div class="sovereign-recovery">
            <h3 style="color: #00ff41; border-bottom: 1px solid #004411;">RECOVERY_GATEWAY</h3>
            
            <div class="input-group">
                <label>UPLINK_TOKEN</label>
                <input type="text" id="input-token" placeholder="000000" class="tlc-input">
            </div>

            <div class="input-group">
                <label>ENCLAVE_MASTER_KEY</label>
                <input type="password" id="input-enclave" placeholder="TLC-XXXX-XXXX" class="tlc-input">
            </div>

            <div class="input-group">
                <label>NEW_SOVEREIGN_PASS</label>
                <input type="password" id="new-pass" placeholder="********" class="tlc-input">
            </div>

            <button id="btn-restore" class="tlc-btn-wide">RESTORE_SOVEREIGNTY</button>
            <button id="btn-cancel" class="tlc-btn-flat">CANCEL</button>
        </div>
    `;

    document.getElementById('btn-restore').onclick = () => {
        RecoveryManager.executeRestore(kernel);
    };
}