/**
 * SOVEREIGN OS - RESOURCE LEDGER
 * Handles the minting and tracking of VPU allotments for the EPOS 2025-12-26 event.
 * * Handles Proof-of-Service minting and regional node exchange logic.
 */
export const ResourceLedger = {

/**
 * Request coins based on Good Service.
 * @param {string} region - e.g., 'NAIROBI'
 * @param {number} units - The amount of service units provided
 */

initializeLedger() {
    // 1. Load or Initialize the Ledger
    this.ledger = JSON.parse(localStorage.getItem('vpu_rrl_ledger')) || {
        balances: {
            "CENTRAL_NODE": 0.00,
            "NAIROBI_BRANCH": 0.00,
            "MOMBASA_BRANCH": 0.00
        },
        metadata: {
            "CENTRAL_NODE": { symbol: "CC", color: "#a855f7" },
            "NAIROBI_BRANCH": { symbol: "NBC", color: "#00ff41" },
            "MOMBASA_BRANCH": { symbol: "MBC", color: "#00d4ff" }
        },
        history: []
    };
    
    // 2. Load the Mint Queue (Pending Requests)
    this.mintQueue = JSON.parse(localStorage.getItem('vpu_mint_queue')) || [];
},

/**
 * LOGIC: Request coins for Proof-of-Service
 */
requestServiceMint(branchId, units, description) {
    const request = {
        id: `REQ-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        requester: this.user?.name || "Member_Node",
        branch: branchId,
        amount: units,
        desc: description,
        timestamp: new Date().toISOString(),
        status: 'PENDING'
    };
    
    this.mintQueue.push(request);
    this.saveLedgerState()
    this.notify("LEDGER_UPLINK", `Service Log ${request.id} broadcasted for approval.`);
},

/**
 * ADMIN LOGIC: Approve Minting
 */
approveMint(requestId) {
    const index = this.mintQueue.findIndex(r => r.id === requestId);
    if (index === -1) return;

    const req = this.mintQueue[index];
    
    // Update Balance
    if (!this.ledger.balances[req.branch]) this.ledger.balances[req.branch] = 0;
    this.ledger.balances[req.branch] += req.amount;
    
    // Archive to History
    req.status = 'APPROVED';
    req.approvedAt = new Date().toISOString();
    this.ledger.history.unshift(req); // Most recent first
    
    // Remove from Queue
    this.mintQueue.splice(index, 1);
    
    this.saveLedgerState();
    this.notify("MINT_SUCCESS", `${req.amount} ${this.ledger.metadata[req.branch]?.symbol || 'COINS'} released to vault.`);
    if (this.activeProcesses['rrl-wallet']) {
    this.activeProcesses['rrl-wallet'].update();
}
},

saveLedgerState() {
    localStorage.setItem('vpu_rrl_ledger', JSON.stringify(this.ledger));
    localStorage.setItem('vpu_mint_queue', JSON.stringify(this.mintQueue));
},

executeExchange(fromBranch, toBranch, amount) {
    const rate = this.getExchangeRate(fromBranch, toBranch);
    const cost = amount;
    const receive = amount * rate;

    if (this.ledger.balances[fromBranch] >= cost) {
        this.ledger.balances[fromBranch] -= cost;
        this.ledger.balances[toBranch] += receive;

        this.ledger.history.unshift({
            id: `SWAP-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            branch: toBranch,
            amount: receive,
            desc: `Exchange from ${this.ledger.metadata[fromBranch].symbol} (Rate: ${rate})`,
            timestamp: new Date().toISOString(),
            status: 'EXCHANGED'
        });

        this.saveLedgerState();
        if (this.activeProcesses['rrl-wallet']) {
            this.activeProcesses['rrl-wallet'].update();
        }
        this.notify("EXCHANGE_COMPLETE", `Converted to ${receive.toFixed(2)} ${this.ledger.metadata[toBranch].symbol}`);
        return true;
    }
    this.notify("INSUFFICIENT_FUNDS", "Not enough regional credit for this swap.");
    return false;
},

getExchangeRate(from, to) {
    // Logic: Central Node is the 'Gold Standard' (1.0). 
    // Branches might have 0.8 or 1.2 depending on your current economic policy.
    const rates = { "CENTRAL_NODE": 1.0, "NAIROBI_BRANCH": 0.9, "MOMBASA_BRANCH": 0.85 };
    return rates[to] / rates[from];
},


    
        async provisionInitialFiles() {
        try {
            // 1. Check the correct folder
            const check = await SovereignVFS.read("vaultfiles/investors.txt", this.sessionKey);
            
            if (!check) {
                console.log("Kernel: Genesis Boot. Provisioning encrypted volumes...");
                
                // 2. FIXED: Write to vaultfiles, not home/documents
                await SovereignVFS.write(
                    "vaultfiles/investors.txt", 
                    "OFFICIAL RECORD: EPOS 2025-12-26\n--------------------------------\nAllotment: 15,000,000 VPU\nStatus: Verified & Locked\nTrust Tier: Root", 
                    this.sessionKey
                );
    
                // 3. Keep standard files in the home directory
                await SovereignVFS.write(
                    "home/readme.txt", 
                    "Welcome to Sovereign OS. Your data is encrypted locally using AES-GCM.", 
                    this.sessionKey
                );
                
                this.logEvent('SUCCESS', 'Genesis Allotment (2025-12-26) written to Enclave.');
            } else {
                this.logEvent('INFO', 'Genesis Allotment verified in vaultfiles.');
            }
        } catch (err) {
            console.warn("Provisioning skipped or drive already exists.", err);
        }
    },
    
    
        /**
         * MEMBER ID GENERATOR
         * This generates unique member id used in vault.js access log
         */
        generateMemberId(username) {
            // A simple deterministic hash to create a unique ID like "INV-8A2F"
            let hash = 0;
            for (let i = 0; i < username.length; i++) {
                hash = ((hash << 5) - hash) + username.charCodeAt(i);
                hash |= 0; 
            }
            const id = Math.abs(hash).toString(16).toUpperCase().substring(0, 4);
            this.memberId = `INV-${id}`;
            this.logEvent('INFO', `Identity Derived: ${this.memberId}`);
            return this.memberId;
        }
};