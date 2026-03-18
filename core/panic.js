/**
 * Sovereign OS - Level 0 Panic Handler
 * EXECUTION: IMMEDIATE
 * Handles both technical failures and Sovereign revocations.
 */
export function triggerRealPanic(errorCode, details) {
    // 1. PHYSICAL LOCKDOWN
    document.body.style.cursor = 'none';
    document.body.style.overflow = 'hidden';
    
    // Disable all keyboard interactions except 'R' for Reboot
    window.addEventListener('keydown', (e) => {
        e.preventDefault();
        if (e.key.toLowerCase() === 'r') window.location.reload();
    }, { capture: true });

    // 2. MEMORY PURGE
    if (window.kernel) {
        window.kernel.sessionKey = null;
        window.kernel.runningApps = new Set();
    }

    // 3. UI INJECTION (Differentiate between Panic and Revocation)
    if (errorCode === "0xSOV_REVOKED_ACCESS") {
        // --- SOVEREIGN HALT UI (For Blacklisted Users) ---
        document.body.innerHTML = `
            <div id="kernel-panic-overlay" style="background: #1a0000; color: #ff4444; position: fixed; inset: 0; z-index: 99999; padding: 50px; font-family: 'Courier New', monospace;">
                <h1 style="border-bottom: 2px solid #ff4444; text-shadow: 0 0 15px #ff0000;">!!! SOVEREIGN_HALT_IN_EFFECT !!!</h1>
                <p style="font-size: 20px;">STOP_CODE: ${errorCode}</p>
                <div class="trace" style="background: #000; padding: 20px; border: 1px dashed #ff4444; margin-top: 20px;">
                    [SYSTEM_REPORT]<br>
                    STATUS: PERMANENT_REVOCATION<br>
                    DETAIL: ${details}<br><br>
                    --------------------------------------------------<br>
                    Your hardware signature has been blacklisted by the Sovereign Authority.<br>
                    All local encrypted shards are being purged from cache.<br>
                    Access to the Enclave from this machine is strictly prohibited.
                </div>
                <p style="margin-top: 50px; animation: blink 1s infinite;">CONNECTION_TERMINATED_BY_BRIDGE</p>
                <style> @keyframes blink { 50% { opacity: 0; } } </style>
            </div>
        `;
    } else {
        // --- STANDARD KERNEL PANIC UI (For Technical Errors) ---
        document.body.innerHTML = `
            <div id="kernel-panic-overlay" style="background: #000033; color: #fff; position: fixed; inset: 0; z-index: 99999; padding: 50px; font-family: monospace;">
                <div class="panic-content">
                    <h1 style="background: #fff; color: #000033; display: inline-block; padding: 0 10px;">!!! FATAL KERNEL PANIC !!!</h1>
                    <div class="panic-code" style="margin: 20px 0; font-size: 20px;">STOP_CODE: ${errorCode}</div>
                    <div class="panic-trace" style="background: rgba(255,255,255,0.1); padding: 20px; border-left: 5px solid #fff;">
                        [REGISTER_DUMP]<br>
                        EAX: 0x0020251226 | EBX: 0xFFFFFFFF | CRITICAL_FAILURE<br>
                        STACK_TRACE: ${details}<br>
                        --------------------------------------------------<br>
                        A critical security breach or hardware mismatch has been detected.<br>
                        Sovereign OS has been halted to protect member data assets.
                    </div>
                    <div class="memory-dump" style="margin-top: 20px; color: #00ff41;">
                        Dumping physical RAM to disk... <span id="dump-percent">0</span>%
                    </div>
                    <div class="reboot-msg" style="margin-top: 30px; opacity: 0.6;">PRESS [R] TO REBOOT ENCLAVE</div>
                </div>
            </div>
        `;

        // Start Visual Progress for standard panics
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.floor(Math.random() * 7);
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            const el = document.getElementById('dump-percent');
            if (el) el.innerText = progress;
        }, 150);
    }
}