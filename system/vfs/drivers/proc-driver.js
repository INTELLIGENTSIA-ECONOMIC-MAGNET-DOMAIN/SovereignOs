/**
 * proc-driver.js - VIRTUAL PROCESS FILESYSTEM
 * Generates system state data dynamically.
 */
export class ProcDriver {
    constructor(kernel) {
        this.kernel = kernel;
        this.readOnly = true; // Processes cannot be "written" to via text
    }

    // This driver intercepts "read" commands
    async read(path) {
        const segments = path.split('/').filter(Boolean);

        // Path: /system/proc/tasks
        if (segments[0] === 'tasks') {
            const tasks = this.kernel.processManager.getTasks();
            return JSON.stringify(tasks, null, 2);
        }

        // Path: /system/proc/mem
        if (segments[0] === 'mem') {
            return JSON.stringify({
                total: "100MB",
                used: `${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)}MB`,
                status: "STABLE"
            });
        }

        // Path: /system/proc/uptime
        if (segments[0] === 'uptime') {
            return `${Math.floor(performance.now() / 1000)}s`;
        }

        throw new Error("VFS_READ_ERROR: Virtual file not found");
    }

    async list() {
        return ['tasks', 'mem', 'uptime', 'version'];
    }
}