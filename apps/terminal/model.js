/**
 * model.js - THE ENCLAVE LOGIC
 */
export class TerminalModel {
    constructor(api, registry) {
        this.api = api;
        this.registry = registry;
        this.identity = api.identity;
        this.cwd = `/users/${this.identity}`;
        this.history = [];
        this.historyIndex = -1;
        this.tempInput = '';
        this.matrixActive = false;

        this.commands = [
            'help','status','allotment','network',
            'neofetch','matrix','time','search',
            'open','clear','ls','cd','cat','exit',
            ...registry.map(a => a.id)
        ];
    }

    fullPath(path) {
        if (!path) return this.cwd;
        if (path.startsWith('/')) return path.replace(/\/+/g, '/');
        if (path.startsWith('~')) return `/users/${this.identity}/${path.substring(1)}`.replace(/\/+/g,'/');
        return `${this.cwd}/${path}`.replace(/\/+/g, '/');
    }

    async getVfsList(path) {
        return await this.api.vfs.list(path || this.cwd);
    }

    getTemporalData() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
        const cycle = Math.floor(dayOfYear / 91) + 1;
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        const timeLeft = endOfYear - now;
        const d = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const h = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
        const m = Math.floor((timeLeft / (1000 * 60)) % 60);
        const s = Math.floor((timeLeft / 1000) % 60);

        return {
            normal: now.toLocaleTimeString(),
            date: now.toLocaleDateString(),
            alco: `TLC-${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`,
            cycle: `Phase 0${cycle}`,
            countdown: `${d}d ${h}h ${m}m ${s}s`,
            unix: Math.floor(now.getTime() / 1000)
        };
    }

    async getSystemStats() {
        const uptime = await this.api.vfs.read('/system/proc/uptime');
        const userPath = `/users/${this.identity}`;
        const { driver } = this.api.vfs.mounts.resolve(userPath);
        const usedMB = ((driver.size || 0) / 1024 / 1024).toFixed(2);
        return { uptime, usedMB, quotaMB: 100, identity: this.identity };
    }
}