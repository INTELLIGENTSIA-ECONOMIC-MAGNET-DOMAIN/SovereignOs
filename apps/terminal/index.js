
/* --- Sovereign Lifecycle Hooks --- */
export function onInit(kernel) {}
export function onSuspend() {}
export function onResume() {}
export function onDestroy() {}
/**
 * index.js - THE CONTROLLER
 */
import { TerminalModel } from './model.js';
import { TerminalView } from './view.js';
import { registry } from '../../core/registry-v2.js';

export class TerminalApp {
    constructor(container, api) {
        if (!api || api.signature !== 'SOVEREIGN_CORE_V1') {
            container.innerHTML = `<div style="color:#ff4444; padding:20px;">[FATAL]: UNAUTHORIZED_ENVIRONMENT. Access Denied.</div>`;
            throw new Error('ENCLAVE_VIOLATION');
        }

        this.container = container;
        this.api = api;
        this.view = new TerminalView(container, api.identity);
        this.model = new TerminalModel(api, registry);
        this.appRegistry = registry;

        this.isTyping = false;
        this.liveInterval = null;
    }

    init() {
        this.view.renderBase(this.api.identity, this.appRegistry.length);
        this.view.input.focus();

        this.view.input.onkeydown = (e) => this.handleInput(e);
        this.view.container.onclick = () => this.view.input.focus();

        this.view.typeWrite([
            `[SYS_LOAD]: VPU_KERNEL_V1.2.9_STABLE`,
            `[SEC_CHECK]: SIGNATURE [${this.api.signature}] VERIFIED`,
            `[VFS_MOUNT]: HOME_DIR / DECRYPTING_NODES...`,
            `[IDENTITY]: ${this.api.identity} // LEVEL: SUPERUSER`,
            `--------------------------------------------`,
            `SOVEREIGN_TERMINAL_ONLINE. READY_FOR_DIRECTIVES.`,
            `TYPE 'search' for Apps.`
        ].join('\n'));
    }

    async handleInput(e) {
        if (this.liveInterval && (e.key === 'Enter' || e.key === 'Escape')) {
            e.preventDefault();
            this.stopLiveTime();
            return;
        }

        if (this.isTyping && e.key === 'Enter') { e.preventDefault(); return; }

        if (e.key === 'Enter') {
            const val = this.view.input.value.trim();
            this.view.input.value = '';
            if (!val) return;

            this.model.history.unshift(val);
            this.model.historyIndex = -1;
            await this.handleCommand(val);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const val = this.view.input.value.toLowerCase().trim();
            const match = this.model.commands.find(c => c.startsWith(val));
            if (match) this.view.input.value = match;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.model.historyIndex < this.model.history.length - 1) {
                if (this.model.historyIndex === -1) this.model.tempInput = this.view.input.value;
                this.model.historyIndex++;
                this.view.input.value = this.model.history[this.model.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.model.historyIndex > -1) {
                this.model.historyIndex--;
                this.view.input.value = (this.model.historyIndex === -1) ? this.model.tempInput : this.model.history[this.model.historyIndex];
            }
        }
    }

    async handleCommand(cmd) {
        const parts = cmd.toLowerCase().trim().split(' ');
        const cleanCmd = parts[0];
        const arg = parts[1];

        if (cleanCmd !== 'clear') await new Promise(res => setTimeout(res, 100));

        try {
            switch (cleanCmd) {
                case 'ls': {
                    const files = await this.model.getVfsList();
                    if (files.length === 0) {
                        await this.view.typeWrite('Directory empty.');
                    } else {
                        files.forEach(f => this.view.print(`  ${f}`, f.includes('.') ? '#00ff41' : '#3498db'));
                    }
                    break;
                }
                case 'cd': {
                    const targetPath = this.model.fullPath(arg || this.model.cwd);
                    if (await this.api.vfs.exists(targetPath)) {
                        this.model.cwd = targetPath;
                        this.view.print(`MOVED_TO: ${this.model.cwd}`, '#a445ff');
                    } else {
                        throw new Error('PATH_NOT_FOUND');
                    }
                    break;
                }
                case 'cat': {
                    if (!arg) throw new Error('USAGE: cat [filename]');
                    const content = await this.api.vfs.read(this.model.fullPath(arg));
                    this.view.print('--- ENCLAVE_BUFFER_START ---', '#a445ff');
                    this.view.print(typeof content === 'object' ? JSON.stringify(content, null, 2) : content);
                    this.view.print('--- ENCLAVE_BUFFER_END ---', '#a445ff');
                    break;
                }
                case 'mkdir':
                case 'touch': {
                    if (!arg) throw new Error(`USAGE: ${cleanCmd} [name]`);
                    await this.api.vfs.write(this.model.fullPath(arg), cleanCmd === 'mkdir' ? {} : '');
                    await this.view.typeWrite(`[VFS]: Object ${arg} materialized in enclave.`);
                    break;
                }
                case 'rm': {
                    if (!arg) throw new Error('USAGE: rm [target]');
                    await this.api.vfs.delete(this.model.fullPath(arg));
                    await this.view.typeWrite(`[VFS]: Object ${arg} purged from sector.`);
                    break;
                }
                case 'clear':
                    this.view.output.innerHTML = '';
                    break;
                case 'exit':
                    this.destruct();
                    this.api.close();
                    break;
                case 'search': {
                    let searchOutput = 'ALCOHESION APP REGISTRY:\n';
                    this.appRegistry.forEach(app => {
                        const description = app.desc || 'Sovereign Module';
                        searchOutput += `  ${app.icon} [${app.id.padEnd(12)}] : ${app.name}\n    - ${description}\n`;
                    });
                    await this.view.typeWrite(searchOutput);
                    break;
                }
                case 'open': {
                    if (!arg) {
                        await this.view.typeWrite('ERR: Specify Application ID. Usage: open [id]');
                    } else {
                        const target = this.appRegistry.find(a => a.id === arg);
                        if (target) {
                            await this.view.typeWrite(`Executing ${target.name} sequence...`);
                            window.dispatchEvent(new CustomEvent('launchApp', { detail: { appId: arg } }));
                        } else {
                            await this.view.typeWrite(`ERR: App ID '${arg}' not found.`);
                        }
                    }
                    break;
                }
                case 'neofetch': {
                    const stats = await this.model.getSystemStats();
                    const percent = Math.min(Math.round((stats.usedMB / stats.quotaMB) * 100), 100);
                    const barLength = 10;
                    const filled = Math.round(percent / 10);
                    const progressBar = `[${'█'.repeat(filled)}${'-'.repeat(barLength - filled)}]`;

                    await this.view.typeWrite([
                        ' ',
                        `USER:     ${this.api.identity}`,
                        'KERNEL:   VPU-OS_v1.2.9_STABLE',
                        `UPTIME:   ${stats.uptime}`,
                        'SHELL:    SovereignShell v1.0',
                        ' ',
                        '[ENCLAVE TELEMETRY]',
                        `MOUNT:    ${this.model.cwd}`,
                        `STORAGE:  ${stats.usedMB}MB / ${stats.quotaMB}MB ${progressBar}`,
                        `STATUS:   ${percent > 90 ? 'CRITICAL_QUOTA' : 'OPTIMAL'}`,
                        `IDENTITY: ${this.api.sessionKey ? 'ENCRYPTED_AND_BOUND' : 'UNSECURED'}`,
                        ' '
                    ].join('\n'));
                    break;
                }
                case 'vfs-tree':
                    this.view.print('VPU_SOVEREIGN_VFS_MAP:', '#a445ff');
                    this.view.print('root/');
                    this.view.print(' ├── etc/');
                    this.view.print(' │   └── config.vpu');
                    this.view.print(' ├── home/');
                    this.view.print(' │   ├── readme.txt');
                    this.view.print(' │   └── documents/');
                    this.view.print(' │       ├── investors.txt [ENCRYPTED]');
                    this.view.print(' │       └── allotment_memo.pdf');
                    this.view.print(' └── bin/');
                    this.view.print('     └── auth_sequencer.sh');
                    break;
                case 'help':
                    await this.view.typeWrite('DIRECTIVES:\n  > search     (App Registry)\n  > open [id]  (Launch App)\n  > time       (Temporal Pulse)\n  > status     (System Integrity)\n  > network    (Node Scan)\n  > allotment  (Genesis Data)\n  > neofetch   (Hardware Info)\n  > matrix     (Toggle Reality)\n  > clear      (Flush Buffer) > VFS_DIRECTIVES:\n  ls, cd, cat, touch, mkdir, rm, clear\n\nSYSTEM_DIRECTIVES:\n  search, open, status, neofetch, matrix, exit');
                    break;
                case 'status': {
                    const checkFile = await this.api.vfs.read('home/readme.txt', this.api.sessionKey);
                    if (checkFile) {
                        await this.view.typeWrite('VFS STATUS: VERIFIED (Integrity 100%)\nENCLAVE: SECURE');
                    } else {
                        await this.view.typeWrite('VFS STATUS: CORRUPTED\nWARNING: ENCLAVE KEY MISMATCH', '#ff4444');
                    }
                    break;
                }
                case 'network':
                    await this.view.typeWrite('SCANNING VPU NODES...\n[NODE_01]: ONLINE\n[EPOS_RELAY]: SECURE');
                    break;
                case 'allotment':
                    await this.view.typeWrite('EPOS & Investors Allotment Confirmed.\nTarget Date: 2025-12-26\nStatus: LOCKED');
                    break;
                case 'time':
                    this.startLiveTime();
                    break;
                case 'matrix':
                    this.toggleMatrix();
                    await this.view.typeWrite('Visual override toggled.');
                    break;
                case 'sudo':
                    if (!arg) return this.view.print('USAGE: sudo [ACTION] [TARGET]', '#ffaa00');
                    if (arg === 'beam' && parts[2]) {
                        const fileId = parts[2].toUpperCase();
                        this.view.print(`EXECUTING_REMOTE_BEAM: ${fileId}...`, '#a445ff');
                        window.dispatchEvent(new CustomEvent('vpu:remote_beam', { detail: { id: fileId, officer: this.api.identity } }));
                        await new Promise(r => setTimeout(r,1000));
                        this.view.print('BEAM_SIGNAL_SENT: Handshake pending in COMMS_HUB.');
                    } else {
                        this.view.print(`ERR: Action '${arg}' requires higher clearance.`, '#ff4444');
                    }
                    break;
                default: {
                    const target = this.appRegistry.find(a => a.id === cleanCmd);
                    if (target) {
                        window.dispatchEvent(new CustomEvent('launchApp', { detail: { appId: cleanCmd } }));
                    } else {
                        await this.view.typeWrite(`ERR: Command '${cleanCmd}' not found.`);
                    }
                }
            }
        } catch (error) {
            this.view.print(`ERR: ${error.message || error}`, '#ff4444');
        }
    }

    startLiveTime() {
        if (this.liveInterval) return;
        const liveEl = document.createElement('div');
        liveEl.style.padding = '10px';
        liveEl.style.border = '1px solid #00ff41';
        liveEl.style.margin = '10px 0';
        liveEl.style.background = 'rgba(0, 255, 65, 0.05)';
        this.view.output.appendChild(liveEl);

        this.isTyping = true;
        this.view.input.placeholder = 'Press ENTER to stop pulse...';

        this.liveInterval = setInterval(() => {
            const t = this.model.getTemporalData();
            liveEl.innerHTML = `[LIVE TEMPORAL PULSE]<br>Standard:    ${t.normal} | ${t.date}<br>Alcohesion:  ${t.alco}<br>Year Cycle:  ${t.cycle}<br>Remaining:   ${t.countdown}<br>Unix Epoch:  ${t.unix}<br>------------------------------------<br>STATUS: SYNCHRONIZED`;
            this.view.output.scrollTop = this.view.output.scrollHeight;
        }, 1000);
    }

    stopLiveTime() {
        if (!this.liveInterval) return;
        clearInterval(this.liveInterval);
        this.liveInterval = null;
        this.isTyping = false;
        this.view.input.placeholder = '';
        this.view.output.innerHTML += '\nPulse severed.\n';
    }

    toggleMatrix() {
        this.model.matrixActive = !this.model.matrixActive;
        this.view.toggleMatrix(this.model.matrixActive);
    }

    destruct() {
        if (this.liveInterval) {
            clearInterval(this.liveInterval);
            this.liveInterval = null;
        }
        this.model.matrixActive = false;
        this.view.toggleMatrix(false);
        this.model.history = [];
        this.view.output.innerHTML = '';
        console.log('Terminal: Memory purged. Destruct sequence complete.');
    }
}