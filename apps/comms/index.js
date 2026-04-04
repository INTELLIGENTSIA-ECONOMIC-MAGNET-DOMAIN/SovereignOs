
import { CommsModel } from './model.js';
import { CommsView } from './view.js';

/* --- Sovereign Lifecycle Hooks --- */
let commsApp = null;

export function onInit(kernel) {
    commsApp = new CommsApp(kernel);
    commsApp.init();
}

export function onSuspend() {
    if (commsApp) {
        commsApp.suspend();
    }
}

export function onResume() {
    if (commsApp) {
        commsApp.resume();
    }
}

export function onDestroy() {
    if (commsApp) {
        commsApp.destroy();
    }
}

class CommsApp {
    constructor(kernel) {
        this.kernel = kernel;
        this.id = 'comms';
        this.model = new CommsModel(kernel);
        this.view = new CommsView(kernel.container, kernel);
        // Make globally accessible for event handlers
        window.commsApp = this;
    }

    async init() {
        this.view.render(this.model.getTransmissions());
        if (this.kernel.notify) this.kernel.notify("COMMS_HUB: UPLINK_STABLE");
    }

    suspend() {
        // Cleanup if needed
    }

    resume() {
        this.view.render(this.model.getTransmissions());
    }

    destroy() {
        // Cleanup
        window.commsApp = null;
    }

    switchTab(tab) {
        this.view.setActiveTab(tab);
        this.view.render(this.model.getTransmissions());
    }

    clearSentHistory() {
        const sentCount = this.model.getSentCount();

        if (sentCount === 0) {
            this.kernel.notify("CLEANUP_ABORTED: NO_SENT_RECORDS_FOUND", "normal");
            return;
        }

        if (confirm(`PERMANENTLY PURGE ${sentCount} SENT RECORDS FROM VPU?`)) {
            this.model.clearSentTransmissions();
            this.kernel.notify(`SYSTEM_PURGE: ${sentCount} RECORDS ARCHIVED TO PERMANENT STORAGE`);
            this.view.render(this.model.getTransmissions());
        }
    }

    downloadAudit() {
        // Placeholder for audit download functionality
        this.kernel.notify("AUDIT_DOWNLOAD: FEATURE_NOT_IMPLEMENTED");
    }

    openRoutingConsole(fileId) {
        const file = this.model.getTransmissionById(fileId);
        const formationGroups = this.model.getFormationGroups();
        this.view.renderRoutingModal(file, formationGroups);
    }

    async processRouting(fileId) {
        const selected = Array.from(document.querySelectorAll('.formation-chip.selected')).map(c => c.dataset.id);
        const officer = this.kernel.getSignature ? this.kernel.getSignature() : "CHIEF_OFFICER_01";
        const selectedPriority = document.getElementById('route-priority').value;

        if (selected.length === 0) return;

        this.view.updateRelayVisualizer();

        // Initialize Event Log if it doesn't exist
        this.model.addLogEntry(fileId, {
            action: "ROUTING_INITIATED",
            officer: officer,
            timestamp: new Date().toISOString().split('T')[1].slice(0, 8),
            details: `Targets: ${selected.join(', ')}`
        });

        this.model.updateTransmissionStatus(fileId, 'RELAYING');
        this.view.render(this.model.getTransmissions());

        await new Promise(r => setTimeout(r, 2000));

        // Finalize
        this.model.updateTransmissionRecipients(fileId, selected, selectedPriority);

        this.model.addLogEntry(fileId, {
            action: "BEAM_STABILIZED",
            officer: "SYSTEM_VPU",
            timestamp: new Date().toISOString().split('T')[1].slice(0, 8),
            details: "Handshake confirmed by all target nodes."
        });

        this.model.updateTransmissionStatus(fileId, 'SENT');

        document.querySelector('.sov-modal-overlay').remove();
        this.view.render(this.model.getTransmissions());
    }
}
