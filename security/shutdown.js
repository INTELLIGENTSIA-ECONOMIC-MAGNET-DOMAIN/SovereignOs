/**
 * SHUTDOWN_SEQUENCE (2025-12-26 Compliant)
 * Hard wipe of all volatile memory and return to cold boot state.
 */
export async function shutdown() {
    this.logEvent('SYS', 'SHUTDOWN: Purging volatile memory...');

    // 1. Wipe the keys and session
    this.sessionKey = null;
    this.isLoggedIn = false;
    
    // 2. Clear sensitive UI elements immediately
    document.getElementById('os-root').innerHTML = '';
    
    // 3. The "Halt" UI
    document.body.innerHTML = `
        <div style="background:#000; color:#00ff41; height:100vh; width:100vw; 
                    display:flex; flex-direction:column; align-items:center; 
                    justify-content:center; font-family:monospace; text-align:center;">
            <h2 style="border:1px solid #00ff41; padding:20px;">SYSTEM_HALTED</h2>
            <p style="margin-top:20px; color:#444;">Genesis Block [SIG_2025_12_26] Locked.</p>
            <p style="font-size:12px; color:#222;">It is now safe to close your browser window.</p>
            <button onclick="window.location.reload()" 
                    style="margin-top:30px; background:transparent; border:1px solid #222; color:#222; cursor:pointer;">
                REBOOT_KERNEL
            </button>
        </div>
    `;

    // 4. Try to close (will only work if the OS was opened via a launcher)
    let id = window.setInterval(null, 0);
    while (id--) window.clearInterval(id);
    window.close(); 
}
