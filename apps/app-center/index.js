import { AppCenterModel } from './model.js';
import { AppCenterView } from './view.js';

/* --- Sovereign Lifecycle Hooks --- */
let hiveInstance = null;

export function onInit(kernel) {
    // Initialize the app center
    const container = document.createElement('div');
    container.id = 'app-center-container';
    document.body.appendChild(container);

    hiveInstance = new HiveCenter(container, kernel.api);
    hiveInstance.init();
}

export function onSuspend() {
    if (hiveInstance) {
        // Suspend logic if needed
    }
}

export function onResume() {
    if (hiveInstance) {
        // Resume logic if needed
    }
}

export function onDestroy() {
    if (hiveInstance) {
        // Cleanup
        if (hiveInstance.view.tickerInterval) clearInterval(hiveInstance.view.tickerInterval);
        if (hiveInstance.view.telemetryInterval) clearInterval(hiveInstance.view.telemetryInterval);
        hiveInstance = null;
    }
}

export class HiveCenter {
    constructor(container, api) {
        if (!api || api.signature !== 'SOVEREIGN_CORE_V1') {
            container.innerHTML = `<div class="fatal-error">[FATAL]: UNAUTHORIZED_HIVE_ACCESS.</div>`;
            throw new Error("ENCLAVE_VIOLATION");
        }
        this.container = container;
        this.api = api;
        this.model = new AppCenterModel();
        this.view = new AppCenterView(container, api, this.model);
    }

    init() {
        // KILL GHOST TICKERS BEFORE RE-STARTING
        if (this.view.tickerInterval) clearInterval(this.view.tickerInterval);
        this.view.renderShell();
        this.view.renderMesh();
        this.view.updateSidebarTelemetry(); // INITIAL SYNC
        window.hive = this;
    }

    provisionNode(appId) {
        const app = this.model.registry.find(a => a.id === appId);
        const node = this.container.querySelector(`#node-${appId}`);
        const bubble = this.container.querySelector(`#bubble-${appId}`); 

        // 1. UI RESET
        this.view.closeInspector();

        // 2. SCENARIO A: THE APP IS NOT IN THE CURRENT FILTER (e.g., Dev Center)
        if (!node && app) {
            console.log(`[VPU_OS]: DIRECT_LAUNCH -> ${appId}`);
            // Visual feedback even for silent launch
            this.container.style.opacity = '0';
            setTimeout(() => {
                if (window.kernel) window.kernel.launchApp(appId);
                this.container.style.opacity = '1';
            }, 500);
            return; // Stop here
        }

        // 3. SCENARIO B: THE NODE IS VISIBLE (Standard Animation)
        if (node) {
            // Resource Allotment Calculation
            const currentWidth = parseInt(getComputedStyle(node).getPropertyValue('--hex-width')) || 150;
            const newSize = currentWidth + 40;
            
            node.style.setProperty('--hex-width', `${newSize}px`);
            if (bubble) {
                bubble.style.setProperty('--size', `${newSize}px`);
                bubble.classList.add('expanding');
            }

            this.model.saveSystemState(appId, newSize);
            this.view.updateSidebarTelemetry();
            this.view.createParticleStream(node, bubble);

            // THE CLASSIC "FRONT-AND-CENTER" SEQUENCE
            node.classList.add('launching');
            
            setTimeout(() => {
                if (window.kernel && typeof window.kernel.launchApp === 'function') {
                    window.kernel.launchApp(appId);
                }
                node.classList.remove('launching');
            }, 900); 
        }
    }

    inspectNode(appId) {
        this.view.inspectNode(appId);
    }

    closeInspector() {
        this.view.closeInspector();
    }

    launchDevCenter() {
        console.log("[VPU_OS]: SYSTEM_GATEWAY_INIT -> DEV_CENTER");
        // We point the Hive's internal provision logic to the 'dev-center' ID
        // This triggers the Masonry expansion, the Flash, and the Kernel launch
        this.provisionNode('vscode');
    }
}

// --- Sovereign Lifecycle Hooks ---
export function onInit(kernel) {}
export function onSuspend() {}
export function onResume() {}
export function onDestroy() {}
