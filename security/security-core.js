 
    /**
     * TRIGGER_REAL_PANIC
     * Immediate Level 0 Halt. Wipes session and displays Red Screen.
     */
    export function triggerRealPanic(errorCode, details) {
        console.error(`!!! KERNEL PANIC: ${errorCode} !!!`);
        
        // 1. Log for Recovery
        localStorage.setItem('LAST_PANIC_CODE', errorCode);
        localStorage.setItem('LAST_PANIC_TIME', Date.now());

        // 2. Security Wipe
        this.sessionKey = null;
        this.isLoggedIn = false;
        
        // 3. Halt all background loops
        for (let i = 1; i < 9999; i++) window.clearInterval(i);

        // 4. UI Takeover (The Red Screen)
        document.body.innerHTML = `
            <div style="background:#800000; color:#fff; height:100vh; width:100vw; padding:50px; font-family:monospace; position:fixed; z-index:999999;">
                <h1 style="background:#fff; color:#800000; padding:0 10px; display:inline-block;">FATAL_ERROR: ${errorCode}</h1>
                <p style="margin-top:20px;">The Sovereign Kernel has halted to protect Member Allotments (2025-12-26).</p>
                <p style="color:#ffcc00;">TRACE: ${details}</p>
                <p style="margin-top:50px;">PRESS [R] TO ATTEMPT ENCLAVE RECOVERY</p>
            </div>
        `;
        
        window.onkeydown = (e) => { if(e.key.toLowerCase() === 'r') window.location.reload(); };
    }

      export function shredAndLock(reason) {
    this.sessionKey = null; // Wipe the Enclave Key from RAM
    this.isBooted = false;
    
    // Switch UI to the Reset/Contact Form
    const gate = document.getElementById('login-gate');
    gate.style.display = 'flex';
    document.getElementById('os-root').style.display = 'none';
    
    window.dispatchEvent(new CustomEvent('vpu:security_breach', { detail: { reason } }));
    alert(`SECURITY_CRITICAL: ${reason}. Enclave Shredded.`);
} 
    /**
     * TRIGGER_REAL_PANIC
     * Handled at Level 0. Immediate system halt.
     */
    export function triggerRealPanic(errorCode, details) {
        console.error(`KERNEL_PANIC [${errorCode}]: ${details}`);

        // 1. Persistence: Log the crash for the next boot cycle
        localStorage.setItem('LAST_PANIC_CODE', errorCode);
        localStorage.setItem('LAST_PANIC_TIME', Date.now());

        // 2. Security: Wipe the volatile session key immediately
        this.sessionKey = null;
        this.isLoggedIn = false;
        
        // 3. Halt: Clear all running process intervals
        for (let i = 1; i < 9999; i++) window.clearInterval(i);

        // 4. UI Takeover: Call your visual renderer (ensure this is imported or global)
        if (typeof renderPanicUI === 'function') {
            renderPanicUI(errorCode, details); 
        } else {
            // Fallback if the UI module is also corrupted
            document.body.innerHTML = `<div style="background:red;color:white;padding:50px;">FATAL_ERROR: ${errorCode}</div>`;
        }
        this.logEvent("'CRITICAL', Kernel Panic: ${errorCode}");
    }


    //OS's ultimate self-defense mechanism
    export function triggerKernelPanic(errorCode) {
    console.error(`!!! KERNEL PANIC: ${errorCode} !!!`);
    
    // 1. Immediate Silence
    this.sessionKey = null; // Purge keys for security
    
    // 2. The Dreaded Screen
    document.body.innerHTML = `
        <div id="panic-screen" style="background:#800000; color:#fff; height:100vh; width:100vw; padding:50px; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.6; overflow:hidden;">
            <h1 style="background:#fff; color:#800000; display:inline-block; padding:0 10px;"> FATAL_ERROR: ENCLAVE_CORRUPTION </h1>
            <p style="margin-top:20px;">A critical exception has occurred at 0x0020251226. The Sovereign Kernel has been halted to prevent data leakage.</p>
            <p>REASON: ${errorCode}</p>
            <p>*** STOP: 0x0000007B (0xF78D2524, 0xC0000034, 0x00000000, 0x00000000)</p>
            
            <div style="margin-top:40px; border:1px solid #fff; padding:20px; background: rgba(0,0,0,0.2);">
                <p>MEMORY_DUMPING...</p>
                <div id="dump-progress"> [||||||||||||||||| ] 82% </div>
                <p>DO NOT POWER OFF THE DEVICE. ENCRYPTING REMAINING SECTORS...</p>
            </div>

            <p style="margin-top:50px; opacity:0.7;">Contact your Alcohesion System Administrator.<br>Sovereign OS v1.2.9 - Build (2026.01.05)</p>
        </div>
    `;

    // Disable all interaction
    document.body.style.cursor = 'none';
    window.onkeydown = (e) => {
        if(e.key === 'r') window.location.reload(); // Hidden "Reboot" key
    };
}

export async function  verifySecurityPerimeter() {
    if (!this.isLoggedIn) return; // Only watch if a session is active

    const binding = await this.getSecurityBinding(); // Fetches HW + IP
    
    // If current hardware/network doesn't match the session's bound identity
    if (binding.fingerprint !== this.currentUser.bound_machine_id) {
        this.triggerRealPanic("HW_MISMATCH", "Machine binding integrity lost.");
        this.invokeGatekeeper("SECURITY_MISMATCH");
    }
}