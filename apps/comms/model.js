export class CommsModel {
    constructor(api) {
        this.api = api;
        this.transmissions = [
            { id: 'TX-101', subject: 'INITIAL_ALLOTMENT_MEMO', sender: 'SYSTEM', status: 'RECEIVED', priority: 'NORMAL', time: '09:00', size: '12.4 KB' },
            { id: 'TX-772', subject: 'INVESTOR_SHARE_DISTRIBUTION', sender: 'FINANCE_DIV', status: 'RECEIVED', priority: 'HIGH', time: '11:45', size: '45.0 KB' }
        ];
    }

    getTransmissions() {
        return this.transmissions;
    }

    getFilteredTransmissions(activeTab) {
        return this.transmissions.filter(tx => {
            if (activeTab === 'inbound') return tx.status === 'RECEIVED' || tx.status === 'PENDING_DISPATCH';
            if (activeTab === 'outbound') return tx.status === 'SENT';
            if (activeTab === 'relays') return tx.status === 'RELAYING';
            return true;
        });
    }

    getTransmissionById(id) {
        return this.transmissions.find(t => t.id === id);
    }

    updateTransmissionStatus(id, status) {
        const index = this.transmissions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.transmissions[index].status = status;
        }
    }

    updateTransmissionRecipients(id, recipients, priority) {
        const index = this.transmissions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.transmissions[index].recipients = recipients;
            this.transmissions[index].priority = priority;
        }
    }

    addLogEntry(id, logEntry) {
        const index = this.transmissions.findIndex(t => t.id === id);
        if (index !== -1) {
            if (!this.transmissions[index].logs) {
                this.transmissions[index].logs = [];
            }
            this.transmissions[index].logs.push(logEntry);
        }
    }

    clearSentTransmissions() {
        this.transmissions = this.transmissions.filter(t => t.status !== 'SENT');
    }

    getSentCount() {
        return this.transmissions.filter(t => t.status === 'SENT').length;
    }

    getFormationGroups() {
        return {
            "EXECUTIVE (COMCENT)": [
                "ULTIMATE_DEVOPS", "OFFICE_DEVOPS", "MEMBERSHIP_DEVOPS",
                "TRANSPORT_DEVOPS", "SWIFT_RESPONSE_DEVOPS"
            ],
            "LEGISLATIVE (THA)": [
                "THA_DEVOPS", "THA_RESOLUTION_HOUSE", "THA_MEDIATION_HOUSE",
                "THA_FINANCE", "THA_RESEARCH", "THA_ETHICS", "THA_HEALTH", "THA_EDUCATION"
            ],
            "AUTHORITY (TAO)": [
                "SDA_IEMD", "SDA_PHILOMSCI", "SDA_ATINFINITY", "SDA_NITMOI",
                "ESVA_MEGA", "ESVA_SHRA", "ESVA_EIHA"
            ],
            "BUREAU (TBO)": [
                "LCB_LEGAL", "ACB_ACCOUNTS", "WCB_WELFARE",
                "ICB_INFO", "CCB_CONTROL", "TTB_THINKTANK", "OCB_OPERATIONS"
            ],
            "FINANCE (TNFI)": [
                "ANTI_FRAUD_DEVOPS", "LOAN_DEVOPS", "INVESTMENT_DEVOPS",
                "MARKET_DEVOPS", "FUNDING_DEVOPS"
            ],
            "COMMUNITY & BRANCHES": [
                "TB_BRANCHES", "COV_DEVOPS", "CABOS_DEVOPS", "NGLS_DEVOPS", "STUDIO_DEVOPS"
            ]
        };
    }
}