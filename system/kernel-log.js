/**
 * SOVEREIGN OS - KERNEL LOGGER
 * Visual real-time logging for the workspace.
 */
export const KernelLog = {
    log(message, type = 'info') {
        let container = document.getElementById('kernel-log-container');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'kernel-log-container';
            document.body.appendChild(container);
        }

        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        
        // Inline styles as fallback, but classes should handle the 2025-12-26 aesthetic
        const timestamp = new Date().toLocaleTimeString([], { 
            hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });
        
        entry.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-msg">${message}</span>`;
        container.appendChild(entry);

        // Auto-remove logic
        setTimeout(() => {
            entry.style.opacity = '0';
            setTimeout(() => entry.remove(), 300);
        }, 4000);
    }
};

/**Will consider this if above does not display logs correct using kernel-logs.css
 * //LOGS AT THE BOTTOM OF THE WORKSPACE
          logSystemEvent(message, type = 'info') {
    let container = document.getElementById('kernel-log-container');
    
    // Create container if it doesn't exist
    if (!container) {
        container = document.createElement('div');
        container.id = 'kernel-log-container';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            max-height: 200px;
            max-width: 350px;
            overflow-y: auto;
            z-index: 50;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            gap: 5px;
        `;
        document.body.appendChild(container);
    }

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.style.cssText = `
        background: rgba(0, 0, 0, 0.8);
        color: ${type === 'critical' ? '#ff4444' : type === 'warn' ? '#ffaa00' : '#00ff41'};
        padding: 8px 12px;
        font-family: monospace;
        font-size: 11px;
        border-left: 3px solid ${type === 'critical' ? '#ff4444' : type === 'warn' ? '#ffaa00' : '#00ff41'};
        border-radius: 4px;
        max-width: 330px;
        word-wrap: break-word;
        opacity: 1;
        transition: opacity 0.3s ease;
    `;
    
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    entry.innerHTML = `[${timestamp}] ${message}`;

    container.appendChild(entry);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        entry.style.opacity = '0';
        setTimeout(() => entry.remove(), 300);
    }, 4000);
}  
 */