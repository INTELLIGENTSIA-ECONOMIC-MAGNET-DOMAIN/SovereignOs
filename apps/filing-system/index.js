import { FilingSystemModel } from './model.js';
import { FilingSystemView } from './view.js';
import { MFS } from '../../core/mfs.js';

export class FilesApp {
    constructor(container, governance, sessionKey, role) {
        this.container = container;
        this.governance = governance;
        this.sessionKey = sessionKey;
        this.role = role;
        this.kernel = governance.api; // the kernel
        this.model = new FilingSystemModel(this.kernel, this.governance);
        this.view = new FilingSystemView(container, this.model);
        window.app = this;

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                this.undoDelete();
            }
        });
    }

    async init() {
        this.view.renderBase();
        this.view.navigateTo('Personal');
        this.view.updateTelemetry();
        MFS.recalculatePersonalUsage();
        this.model.runRecycleMaintenance();
    }

    async navigateTo(cat, sub = null) {
        await this.view.navigateTo(cat, sub);
    }

    async saveNewFile(name, content, category) {
        await this.model.saveNewFile(name, content, category);
    }

    async tacticalRoute(fileName, size, index) {
        const routeBox = this.container.querySelector(`#route-box-${index}`);
        const fill = this.container.querySelector(`#fill-${index}`);
        const icon = routeBox.querySelector('.route-icon');

        if (routeBox.classList.contains('transmitting')) return;
        
        routeBox.classList.add('transmitting');
        this.model.notify(`ESTABLISHING_UPLINK: ${fileName.toUpperCase()}`, "normal");

        const sizeVal = parseFloat(size);
        const weight = size.includes('MB') ? 1000 : 10;
        const duration = Math.min(Math.max(sizeVal * weight, 800), 3000);

        fill.style.transition = `width ${duration}ms linear`;
        setTimeout(() => { fill.style.width = '100%'; }, 50);

        await new Promise(res => setTimeout(res, duration));

        this.model.tacticalRoute(fileName, size, index);

        icon.innerHTML = '✔️';
        this.model.notify(`UPLINK_SUCCESS: ${fileName.toUpperCase()}`);
        
        setTimeout(() => {
            routeBox.classList.remove('transmitting');
            fill.style.width = '0%';
            icon.innerHTML = '📡';
        }, 2000);
    }

    routeToComms(fileName, size = '0.00 KB') {
        this.model.notify(`PREPARING_DISPATCH: ${fileName.toUpperCase()}`, "normal");
        
        this.kernel.emit('FILE_CREATED', { 
            name: fileName,
            category: this.view.activeCategory,
            size: size,
            timestamp: new Date().toISOString(),
            isManualRoute: true
        });
    }

    openFolioDirector() {
        const modal = document.createElement('div');
        modal.className = 'sov-modal-overlay';
        modal.innerHTML = `
            <div class="sov-modal folio-director">
                <div class="modal-header">INITIALIZE_FOLIO_SYSTEM</div>
                <div class="modal-body">
                    <div class="folio-choice-grid">
                        <div class="choice-card" onclick="app.generateNativeTemplate('OFFICIAL_LETTER')">
                            <div class="choice-icon">⚖️</div>
                            <div class="choice-label">OFFICIAL_LETTER</div>
                        </div>
                        <div class="choice-card" onclick="app.generateNativeTemplate('OTHER_LETTER')">
                            <div class="choice-icon">✉️</div>
                            <div class="choice-label">OTHER_LETTER</div>
                        </div>
                        <div class="choice-card" onclick="app.generateNativeTemplate('SIGNAL')">
                            <div class="choice-icon">📡</div>
                            <div class="choice-label">SIGNAL_BURST</div>
                        </div>
                        <div class="choice-card upload-path" onclick="app.bridgeToUpload()">
                            <div class="choice-icon">📤</div>
                            <div class="choice-label">UPLOAD_FILE</div>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="wipe-btn" onclick="this.closest('.sov-modal-overlay').remove()">ABORT</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    generateNativeTemplate(type) {
        const template = FilingSystemModel.COMM_TEMPLATES[type];
        const identity = this.kernel.user?.identity || "NATIVE_ADMIN";
        const content = template.content(identity);
        
        const category = (type === 'OTHER_LETTER') ? 'Personal' : 'Comms';
        const sub = (type === 'SIGNAL') ? 'Signals' : 'Inbound';
        
        document.querySelector('.sov-modal-overlay').remove();

        this.triggerSuccessAnimation(
            { name: template.name, content: content, isTemplate: true }, 
            category, sub, 'RESTRICTED'
        );
    }

    bridgeToUpload() {
        document.querySelector('.sov-modal-overlay').remove();
        this.openUniversalCreator();
    }

    async openUniversalCreator() {
        const categories = Object.keys(MFS.protocols);
        
        const modal = document.createElement('div');
        modal.className = 'sov-modal-overlay';
        modal.innerHTML = `
            <div class="sov-modal">
                <div class="modal-header">SECURE_PROTOCOL_UPLOAD</div>
                <div class="modal-body">
                    <label>SELECT_OBJECT</label>
                    <input type="file" id="new-file-upload" class="file-input-tactical" />
                    
                    <div id="upload-progress-container" style="display: none; margin-top: 20px;">
                    <div class="stat-row"><span id="upload-status-text">INITIALIZING_ENCRYPTION...</span> <span id="upload-pct">0%</span></div>
                    <div class="silo-bar" style="width: 100%; height: 10px; margin-top: 5px;">
                        <div id="upload-progress-fill" class="silo-fill" style="width: 0%; background: var(--sov-purple);"></div>
                    </div>
                    </div>

                    <label>TARGET_SECTOR</label>
                    <select id="new-file-cat">
                        <option value="">-- SELECT SECTOR --</option>
                        ${categories.map(c => `<option value="${c}">${c.toUpperCase()}</option>`).join('')}
                    </select>

                    <label>TARGET_VOLUME</label>
                    <select id="new-file-sub">
                        <option value="">-- SELECT SECTOR FIRST --</option>
                    </select>

                    <label>SECURITY_CLEARANCE</label>
                    <select id="new-file-clearance">
                        <option value="UNRESTRICTED">UNRESTRICTED</option>
                        <option value="RESTRICTED">RESTRICTED</option>
                        <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                        <option value="TOP_SECRET">TOP_SECRET</option>
                    </select>

                    <label>AUTHOR_SIGNATURE</label>
                    <input type="text" id="new-file-auth" value="USER_ADMIN" />
                </div>
                <div class="modal-actions">
                    <button class="create-btn" id="confirm-upload">UPLOAD_TO_MESH</button>
                    <button class="wipe-btn" id="abort-upload">ABORT</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const catSelect = modal.querySelector('#new-file-cat');
        const subSelect = modal.querySelector('#new-file-sub');
        
        catSelect.addEventListener('change', (e) => {
            const selectedCat = e.target.value;
            if (!selectedCat) {
                subSelect.innerHTML = '<option value="">-- SELECT SECTOR FIRST --</option>';
                return;
            }
            
            const subs = Object.keys(MFS.protocols[selectedCat]);
            subSelect.innerHTML = subs.map(s => `<option value="${s}">${s}</option>`).join('');
        });

        modal.querySelector('#confirm-upload').onclick = () => this.executeUpload();
        modal.querySelector('#abort-upload').onclick = () => modal.remove();
    }

    async executeUpload() {
        const fileInput = document.getElementById('new-file-upload');
        const cat = document.getElementById('new-file-cat').value;
        const sub = document.getElementById('new-file-sub').value;
        const clearance = document.getElementById('new-file-clearance').value;

        if (!fileInput.files[0] || !cat || !sub) {
            alert("CRITICAL_ERR: MISSING_UPLOAD_DATA");
            return;
        }

        const progressContainer = document.getElementById('upload-progress-container');
        const progressFill = document.getElementById('upload-progress-fill');
        const statusText = document.getElementById('upload-status-text');
        const pctText = document.getElementById('upload-pct');
        const uploadBtn = document.getElementById('confirm-upload');

        uploadBtn.disabled = true;
        progressContainer.style.display = 'block';
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 100) progress = 100;
            
            progressFill.style.width = `${progress}%`;
            pctText.innerText = `${Math.floor(progress)}%`;

            if (progress < 40) statusText.innerText = "FRAGMENTING_OBJECT...";
            else if (progress < 80) {
                statusText.innerText = "ENCRYPTING_BITSTREAM...";
                progressFill.style.background = "var(--sov-purple)";
            } 
            else statusText.innerText = "FINALIZING_PROTOCOL...";

            if (progress === 100) {
                clearInterval(interval);
                this.triggerSuccessAnimation(fileInput.files[0], cat, sub, clearance);
            }
        }, 150);
    }

    triggerSuccessAnimation(fileOrData, cat, sub, clearance) {
        const modal = document.querySelector('.sov-modal');
        modal.innerHTML = `
            <div class="success-anim-wrapper">
                <div class="success-hex">⬢</div>
                <div class="success-msg">OBJECT_SECURED</div>
                <div class="success-details">${fileOrData.name.toUpperCase()}</div>
            </div>
        `;

        this.model.triggerSuccessAnimation(fileOrData, cat, sub, clearance);

        setTimeout(() => {
            const overlay = document.querySelector('.sov-modal-overlay');
            if (overlay) overlay.remove();
            this.navigateTo(cat, sub);
        }, 2000);
    }

    viewVersions(fileName) {
        this.model.viewVersions(fileName);
    }

    async download(fileName) {
        const fullPath = `${this.model.cwd}/${this.view.activeCategory}/${fileName}`.replace(/\/+/g, '/');
        
        console.log(`PULLING_LIVE_DATA: ${fullPath}...`);

        try {
            const content = await this.model.vfs.read(fullPath);
            
            const blob = new Blob(
                [typeof content === 'string' ? content : JSON.stringify(content, null, 2)], 
                { type: 'text/plain' }
            );
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            window.URL.revokeObjectURL(url);
            
            this.model.notify(`DATA_PULL_COMPLETE: ${fileName}`);
        } catch (e) {
            this.model.notify(`READ_FAULT: ${e.message || "DATA_UNREACHABLE"}`, "high");
        }
    }

    copyPath(path) {
        navigator.clipboard.writeText(path).then(() => {
            this.model.notify(`PATH_REPLICATED: ${path}`);
        });
    }

    async wipe(fileName) {
        await this.model.wipe(fileName);
        await this.navigateTo(this.view.activeCategory, this.view.activeSub);
    }

    undoDelete() {
        this.model.undoDelete();
    }

    async restoreFromRecycle(index) {
        const targetCategory = prompt("RESTORE_TO_SECTOR:", "Personal");
        if (!targetCategory) return;
        await this.model.restoreFromRecycle(this.model.undoStack[index].name, targetCategory);
    }

    permanentDelete(index) {
        const card = document.querySelectorAll('.file-card.recycle-status')[index];
        card.style.transition = 'all 0.4s';
        card.style.filter = 'contrast(2) brightness(2) hue-rotate(90deg)';
        card.style.transform = 'scale(0.8)';
        card.style.opacity = '0';

        this.model.permanentDelete(index);
    }

    notify(msg, priority = "normal") {
        this.model.notify(msg, priority);
    }
}

// --- Sovereign Lifecycle Hooks ---
export function onInit(kernel) {}
export function onSuspend() {}
export function onResume() {}
export function onDestroy() {}

