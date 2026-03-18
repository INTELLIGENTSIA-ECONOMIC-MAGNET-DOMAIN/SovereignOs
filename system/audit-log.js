/**
 * SOVEREIGN OS - AUDIT LOG SERVICE
 * Manages persistent system logs and hardware ticker updates.
 */
export const AuditLog = {
    log(kernel, type, message) {
        // 1. PERSISTENCE: Save to LocalStorage
        const logs = JSON.parse(localStorage.getItem('SOVEREIGN_LOGS') || '[]');
        const newEntry = {
            timestamp: new Date().toISOString(),
            type: type, // 'INFO', 'WARN', 'CRITICAL'
            message: message
        };
        
        logs.unshift(newEntry);
        localStorage.setItem('SOVEREIGN_LOGS', JSON.stringify(logs.slice(0, 50)));
        
        console.log(`[${type}]: ${message}`);

        // 2. UI: Update the Top Bar Ticker
        const ticker = document.getElementById('top-bar-ticker');
        if (ticker) {
            ticker.innerText = `[${type}] ${message}`;
            ticker.style.color = type === 'CRITICAL' ? '#ff4444' : '#00ff41';
            ticker.classList.add('flash');
            setTimeout(() => ticker.classList.remove('flash'), 3000);
        }

        // 3. REACTIVITY: Refresh Security Dashboards if open
        const dashboard = document.querySelector('[id^="win-security"]');
        if (dashboard) {
            // Trigger the internal app refresh if the instance is registered
            const appId = dashboard.id.replace('win-', '');
            if (kernel.activeProcesses[appId]?.updateUI) {
                kernel.activeProcesses[appId].updateUI();
            }
        }
    }
};