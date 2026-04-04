/**
 * mfs.js - Sovereign Mock File System
 * Comprehensive Protocol Mapping per Communication Manual
 */
export const MFS = {
    
    manifest: {
        personalQuota: 100 * 1024 * 1024, // 100 MB
        personalUsage: 0,                 // recalculated on boot
        recycleBin: [],          // 🗑️ deleted files live here
        deleteLedger: [],        // 🧾 audit trail
        recyclePolicy: {
        autoPurgeDays: 30    // ♻️ auto purge window
        },
        
        files: [
            // --- PERSONAL Category ---
            { 
                name: "private_notes.txt", 
                path: "USR/LOCAL/VOL./notes.txt", 
                category: "Personal", 
                type: "txt", 
                sizeBytes: 1024,
                size: "1.00 KB",
                author: "USR_ROOT",
                urgency: "normal",
                created: "2025-12-26",
                modified: "2026-01-24",
                views: 14
            },
            
            // --- FINANCE Category (Protocol 1/3/6) ---
            { 
                name: "allotment_registry.json", 
                path: "SEC.TAC/COM 1/3/6/VOL./allotment.json", 
                category: "Finance", 
                type: "json", 
                sizeBytes: 4520,
                size:"1.00KB",
                author: "FIN_OFFICER",
                urgency: "high", // High priority for investor tracking
                created: "2025-12-26",
                modified: "2026-01-20",
                views: 12
            },
            { 
                name: "epos_structure.pdf", 
                path: "SEC.TAC/COM 1/3/6/VOL./epos_v1.pdf", 
                category: "Finance", 
                type: "pdf", 
                sizeBytes: 85200,
                size:"85.20KB",
                author: "SYSTEM_ARCHITECT",
                urgency: "normal",
                created: "2025-12-30",
                modified: "2026-01-15",
                views: 1142
            }
        ]
    },

    // Protocol Directory Mapping
   protocols: {
    'Personal': {
        'Local Storage': { path: 'USR/LOCAL/VOL./', remark: 'USER SPECIFIC LOCAL DATA STORAGE' },
        'Private Vault': { path: 'USR/LOCAL/VAULT/', remark: 'ENCRYPTED PRIVATE USER VAULT' }
    },
    'Comms': {
        'Official Letters': { path: 'SEC.TAC/COM 1/2/3/VOL./', remark: 'OFFICIAL LETTER IN AND OUT OF THEALCOHESION' },
        'Other Letters': { path: 'SEC.TAC/COM 1/2/4/VOL./', remark: 'OTHER LETTERS THAT ARE NOT OFFICIAL WITHIN THEALCOHESION' },
        'Communication Logs': { path: 'SEC.TAC/COM 1/1/7/VOL./', remark: 'DETAILS, INFORMATION AND LOGS FOR COMMUNICATION MADE BY THEALCOHESION' }
    },
    'Records': {
        'Minutes of Meetings': { path: 'SEC.TAC/COM 1/1/1/VOL./', remark: 'MINUTES OF MEETINGS HELD BY THEALCOHESION' },
        'Constitution': { path: 'SEC.TAC/COM 1/1/3/VOL./', remark: 'ALL PERTAINING THE THEALCOHESION CONSTITUTION' },
        'Legal Information': { path: 'SEC.TAC/COM 1/1/4/VOL./', remark: 'ANY LEGAL INFORMATION CONCERNING THE THEALCOHESION E.G REGISTRATION' },
        'General Information': { path: 'GEN/VOL./', remark: 'INCLUDE ANY OTHER INFORMATION NOT EXPRESSED IN OTHER FILES' }
    },
    'Finance': {
        'Tax Records': { path: 'SEC.TAC/COM 1/1/5/VOL./', remark: 'TAX INFORMATION OF THEALCOHESION' },
        'Contracts': { path: 'SEC.TAC/COM 1/2/2/VOL./', remark: 'DETAILS OF CONTRACTS DEALS FOR THEALCOHESION' },
        'Receipts & Tickets': { path: 'SEC.TAC/COM 1/3/3/VOL./', remark: 'INCLUDES RECEIPTS AND TICKET BOOK FILING' },
        'Investments & Shares': { path: 'SEC.TAC/COM 1/3/6/VOL./', remark: 'INCLUDES INFORMATION ON SHARES' },
        'Capital Returns': { path: 'SEC.TAC/COM 1/4/2/VOL./', remark: 'RETURNS ON CAPITAL REQUIRED IN INITIAL ESTABLISHMENT' },
        'Profit Reports': { path: 'SEC.TAC/COM 1/4/3/VOL./', remark: 'RETURNS ON PROFIT MADE BY THEALCOHESION BUSINESSES' },
        'Loss Reports': { path: 'SEC.TAC/COM 1/4/4/VOL./', remark: 'RETURNS ON LOSS MADE BY THEALCOHESION BUSINESSES' },
        'Accounts Data': { path: 'ACC/VOL./', remark: 'DAILY ACCOUNTING RETURNS AND ACCOUNTS INFORMATION' },
        'Budgets': { path: 'BUD/VOL./', remark: 'INCLUDE BUDGET NARRATIONS' },
        'Assets Information': { path: 'SEC.TAC/COM 1/2/8/VOL./', remark: 'INFORMATION ON ASSETS' },
        'Export & Import Records': { path: 'SEC.TAC/COM 1/2/1/VOL./', remark: 'DETAILS OF EXPORTS AND IMPORTS BY THEALCOHESION' },
        'Partnership & Membership': { path: 'SEC.TAC/COM 1/3/2/VOL./', remark: 'INFORMATION ON PARTNERSHIP AND MEMBERSHIP' },
        'General Summary': { path: 'SEC.TAC/COM 1/3/8/VOL./', remark: 'EVERY YEAR NOVEMBER GENERAL SUMMARY' }
    },
    'Personnel': {
        'Employment & Staff Records': { path: 'SEC.TAC/COM 1/1/2/VOL./', remark: 'DETAILS OF EMPLOYMENT AND STAFF OF THEALCOHESION' },
        'Discipline Records': { path: 'SEC.TAC/COM 1/1/6/VOL./', remark: 'DISCIPLINE DETAILS OF MEMBERS, STAFF AND EMPLOYEES' },
        'HR Details': { path: 'SEC.TAC/COM 1/1/9/VOL./', remark: 'HUMAN RESOURCE DETAILS' },
        'Nominal Roll': { path: 'SEC.TAC/COM 1/2/6/VOL./', remark: 'DATA ON ALL PERSONNEL, OFFICIALS AND EMPLOYEES' },
        'Employee Returns': { path: 'SEC.TAC/COM 1/3/1/VOL./', remark: 'RETURNS ON EMPLOYEES, VACANCIES AND RECRUITMENT' },
        'Welfare Information': { path: 'SEC.TAC/COM 1/2/7/VOL./', remark: 'INFORMATION ON WELFARE' }
    },
    'Projects': {
        'Market Evaluations': { path: 'SEC.TAC/COM 1/2/5/VOL./', remark: 'REPORTS ON MARKET EVALUATION' },
        'Creative & Innovative Ideas': { path: 'SEC.TAC/COM 1/3/1/VOL./', remark: 'CREATIVE AND INNOVATIVE IDEAS PUT IN PLACE' },
        'Future Plans': { path: 'SEC.TAC/COM 1/3/7/VOL./', remark: 'FUTURE PLANS FOR BUSINESSES AND COMPANIES' },
        'Programs & Projects': { path: 'POJ/VOL./', remark: 'INFORMATION ON PROGRAMS AND PROJECTS' },
        'Research Documents': { path: 'RES/VOL./', remark: 'DETAILED RESEARCHES CONDUCTED BY THEALCOHESION' },
        'Business & Company Establishment': { path: 'EST/VOL./', remark: 'INFORMATION ON BUSINESSES AND COMPANIES ESTABLISHED' }
    },
    'Logistics': {
        'Website & Applications Details': { path: 'SEC.TAC/COM 1/1/8/VOL./', remark: 'DETAILS OF THEALCOHESION WEBSITE AND APPLICATIONS' },
        'Meetings Information': { path: 'SEC.TAC/COM 1/2/9/VOL./', remark: 'INFORMATION ON MEETINGS' },
        'Situation Analysis Reports': { path: 'SEC.TAC/COM 1/4/1/VOL./', remark: 'SITUATION ANALYSIS: INPUT, OUTPUT, CUSTOMERS, RELATIONS' },
        'Tours & Visits Records': { path: 'SEC.TAC/COM 1/3/4/VOL./', remark: 'INFORMATION ON TOURS, VISITS IN AND OUT' },
        'Motor Vehicle Tickets': { path: 'SEC.TAC/COM 1/3/5/VOL./', remark: 'TIME OUT/IN, FUEL AND MILEAGE RECORDS' },
        'Locomotion Returns': { path: 'SEC.TAC/COM 1/3/9/VOL./', remark: 'BUS/CYCLE FARE AND AIR TICKET RETURNS' },
        'Horse Power': { path: 'SEC.TAC/COM 1/4/5/VOL./', remark: 'MACHINES, TOOLS, ELECTRICITY, FUEL, OIL' },
        'Transport Facilities': { path: 'TRN/VOL./', remark: 'INFORMATION ON TRANSPORT FACILITIES AVAILABLE' }
    }
},

    async getFiles(category) {
        return this.manifest.files.filter(f => f.category === category);
    },

    getSubFolders(category) {
        return Object.keys(this.protocols[category] || {});
    },

    getProtocolPath(cat, sub) {
        const entry = this.protocols[cat]?.[sub];
        // Safely extract the string path from the object
        return entry?.path || 'GEN/VOL./';
    },

    getProtocolRemark(cat, sub) {
        return this.protocols[cat]?.[sub]?.remark || 'NO_REMARKS_FOUND';
    },

    recalculatePersonalUsage() {
        // This ensures the 100MB Bar (100 - X) is accurate
        this.manifest.personalUsage = this.manifest.files
            .filter(f => f.category === 'Personal')
            .reduce((sum, f) => sum + (f.sizeBytes || 0), 0);
        return this.manifest.personalUsage;
    }
};