/**
 * SOVEREIGN OS - IPC (INTERNAL BUS)
 * Handles event distribution across the kernel and active apps.
 */
export const IPC = {
    init(kernel) {
        kernel.events = new EventTarget();

        kernel.on = (event, callback) => {
            kernel.events.addEventListener(event, (e) => callback(e.detail));
        };

        kernel.emit = (event, data) => {
            console.log(`[KERNEL_SIGNAL]: ${event}`, data);
            kernel.events.dispatchEvent(new CustomEvent(event, { detail: data }));
        };
        
        // Example: Listen for new file creation to update UI apps
        kernel.on('FILE_CREATED', (fileData) => {
            if (kernel.runningApps.has('files')) {
                kernel.activeProcesses['files']?.updateUI?.();
            }
        });
    }
};