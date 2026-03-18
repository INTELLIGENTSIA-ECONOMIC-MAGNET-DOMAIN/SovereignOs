
// SECURITY PROTOCOL: LOCK SYSTEM
export async function lockSystem(kernel) {
    console.warn("Kernel: SECURITY PROTOCOL ACTIVE. Purging Session Key...");

    // 1. SHRED DATA
    kernel.sessionKey = null;

    // 2. WIPE DOM (Kill all apps)
    Object.keys(kernel.runningApps).forEach(appId => {
        kernel.killProcess(appId);
    });

    // 3. UI RESET
    const gate = document.getElementById('login-gate');
    const root = document.getElementById('os-root');
    const top = document.getElementById('top-bar');
    const passInput = document.getElementById('pass-input');
    const status = document.getElementById('auth-status');

    if (gate) {
        gate.style.display = 'flex';
        gate.style.opacity = '1';
        // Notify the user that the purge was successful
        if (status) {
            status.innerText = "SESSION_PURGED: MEMORY_CLEAN";
            status.style.color = "#ff4444"; // Red alert color
        }
    }
    
    if (root) root.style.display = 'none';
    if (top) top.classList.add('hidden');
    
    // 4. SECURITY HYGIENE
    if (passInput) passInput.value = ''; 
    kernel.isLoggedIn = false;

    // Optional: Re-trigger the Pulse FX to show Sentry is still watching
    const pulse = document.querySelector('.pulse-container');
    if (pulse) pulse.style.display = 'block';

    console.log("Kernel: System Enclave Locked and Purged.");
}

export async function suspendSession(kernel) {
    console.log("Kernel: Entering Standby Mode...");
    
    const lockScreen = document.getElementById('lock-screen');
    const loginGate = document.getElementById('login-gate');
    const root = document.getElementById('os-root');

    // 1. Ensure the Login Gate is HIDDEN
    if (loginGate) loginGate.style.display = 'none';

    // 2. Show the Lock Screen
    if (lockScreen) {
        lockScreen.classList.remove('hidden');
        lockScreen.style.display = 'flex';
        lockScreen.style.opacity = '1';
        kernel.isLocked = true;
    }

    // 3. Blur the background workspace
    if (root) {
        root.style.filter = "blur(20px)";
        // Optional: reduce opacity of workspace for better contrast
        root.style.opacity = "0.5";
    }
}

export async function unlockSystem(kernel) {
    const lockPass = document.getElementById('lock-pass-input');
    const status = document.getElementById('lock-status');
    const lockScreen = document.getElementById('lock-screen');
    const lockBox = lockScreen?.querySelector('.lock-box');
    const root = document.getElementById('os-root');

    // 1. Safety Check
    if (!lockPass || lockPass.value === "") {
        kernel.triggerLockShake();
        return;
    }

    // 2. UI Feedback
    status.innerText = ">> INITIATING_DECRYPTION_HANDSHAKE...";
    status.style.color = "#a445ff";
    lockPass.disabled = true;

    // 3. Simulated Kernel Processing
    await new Promise(r => setTimeout(r, 1000));

    // 4. AUTHENTICATION LOGIC
    // Determine your correct key (Checking against 'admin' OR a stored system pass)
    const correctKey = kernel.systemPassword || "admin"; 
    
    if (lockPass.value === correctKey) {
        // --- SUCCESS SEQUENCE ---
        status.innerText = ">> SIGNATURE_VALID // ENCLAVE_RESUMING";
        status.style.color = "#a445ff";
        
        // Update Internal State Immediately
        kernel.isLocked = false; 

        if (lockBox) lockBox.style.boxShadow = "0 0 100px rgba(164, 69, 255, 0.4)";

        // 5. Force UI Reveal
        if (lockScreen) {
            lockScreen.style.transition = "opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), backdrop-filter 0.8s";
            lockScreen.style.opacity = '0';
            lockScreen.style.pointerEvents = 'none'; // Stop intercepting clicks
        }

        if (root) {
            root.style.display = "block"; // Ensure it exists in DOM
            root.style.filter = "none"; 
            root.style.opacity = "1";
        }

        // Final Cleanup
        setTimeout(() => {
            if (lockScreen) {
                lockScreen.classList.add('hidden');
                lockScreen.style.display = 'none';
            }
            lockPass.value = ""; 
            lockPass.disabled = false;
            
            // Restore EPOS/Investor Session Brightness
            if (typeof kernel.setBrightness === 'function' && kernel.currentBrightness) {
                kernel.setBrightness(kernel.currentBrightness);
            }
            
            console.log("Kernel: Sovereign Enclave Resumed.");
        }, 800);

    } else {
        // --- FAILURE SEQUENCE ---
        status.innerText = ">> CRITICAL: KEY_SIGNATURE_REJECTED";
        status.style.color = "#ff003c";
        
        kernel.triggerLockShake();

        lockPass.value = "";
        lockPass.disabled = false;
        lockPass.focus();
    }
}

// Helper for the Shake Effect
export async function triggerLockShake() {
    const lockBox = document.querySelector('.lock-box');
    if (lockBox) {
        lockBox.classList.add('impact-shake');
        setTimeout(() => lockBox.classList.remove('impact-shake'), 400);
    }
}


    // IDLE LOCK SYSTEM
   export async function setupIdleLock(timeout) {
        const resetTimer = () => {
            clearTimeout(this.idleTimer);
            this.idleTimer = setTimeout(() => {
                // Ensure lockSystem exists before calling
                if (this.lockSystem) this.lockSystem();
            }, timeout);
        };

        // Listen for activity to reset the 5-minute clock
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('mousedown', resetTimer);
        window.addEventListener('keydown', resetTimer);
        window.addEventListener('touchstart', resetTimer);
        
        resetTimer(); // Start the first countdown
    }
