// --- HARDWARE UTILITIES FOR LOADING.JS ---
function detectProvisionManagement() {
    const ua = navigator.userAgent;
    if (ua.indexOf("Win") !== -1) return "Windows";
    if (ua.indexOf("Mac") !== -1) return "macOS";
    if (ua.indexOf("Linux") !== -1) return "Linux";
    return "Unknown_Arch";
}

async function generateLocalFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        const renderer = gl.getParameter(gl.RENDERER);
        const entropy = [navigator.hardwareConcurrency, renderer, screen.colorDepth, navigator.deviceMemory].join("||");
        const msgBuffer = new TextEncoder().encode(entropy);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { return "0x_ANONYMOUS_GENESIS_CORE"; }
}
// --- 1. GLOBAL UI & POINTER ---
const pointer = document.createElement('div');
pointer.id = 'custom-pointer';
document.body.appendChild(pointer);

let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', e => {
    mouseX = e.clientX - 15;
    mouseY = e.clientY - 15;
});

function animatePointer() {
    pointer.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    requestAnimationFrame(animatePointer);
}
animatePointer();

// --- 2. ARCHITECTURE & STATE MAPS ---
const osMapping = {
    'btn-win': 'Win32', 'btn-mac': 'Darwin', 'btn-linux': 'Linux',
    'btn-android': 'Android', 'btn-ios': 'iOS'
};

const getArchitecture = () => {
    const ua = navigator.userAgent;
    const platform = navigator.platform || "";
    if (/android/i.test(ua)) return "Android";
    if (/iPad|iPhone|iPod/.test(ua)) return "iOS";
    if (/Win/i.test(platform) || /Windows/i.test(ua)) return /x64|Win64|WOW64/i.test(ua) ? "Windows x64" : "Windows x32";
    return "Sovereign Core";
};

// --- 3. SOVEREIGN NOTIFICATION SYSTEM ---
// Optimized to be persistent and high-priority
const showSovModal = (title, message, color = "#00ff88") => {
    const modal = document.getElementById('sov-notification');
    if (!modal) return console.error("SOV_FAULT: Notification container missing.");
    
    document.getElementById('sov-title').innerText = `> ${title}`;
    document.getElementById('sov-title').style.color = color;
    document.getElementById('sov-message').innerText = message;
    
    modal.style.display = 'flex';
};

const closeSovModal = () => {
    const modal = document.getElementById('sov-notification');
    if (modal) modal.style.display = 'none';
};

// --- 4. GLOBAL INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initDistributionButtons();
    initPhoneValidation();
    initInterestForm();
    initProvisionForm();   
    lockProvisioningUI();
});


// --- 5. STRICT REGEX MASKING ---
function initPhoneValidation() {
    const phoneInputs = document.querySelectorAll('input[type="tel"], #m-phone, #m-phone-interest');
    phoneInputs.forEach(input => {
        // Prevent alpha characters from ever appearing
        input.addEventListener('keypress', (e) => {
            if (!/[0-9]/.test(e.key)) e.preventDefault();
        });
        // Sanitize paste actions
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 15);
        });
    });
}

// --- 6. FORM A: INTEREST BRIDGE (Goal 1: Identity Awareness) ---
function initInterestForm() {
    let form = document.getElementById('interest-form');
    if (!form) return;

    // Remove existing listeners
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.onsubmit = async (e) => {
        e.preventDefault();
        const btn = newForm.querySelector('button[type="submit"]');
        
        // 1. PREVENT MULTI-SUBMIT BUG
        if (btn.disabled) return; 
        btn.disabled = true;
        btn.innerText = "PREPARING_VECTORS...";

        const phoneRaw = document.getElementById('m-phone-interest');
        const selects = newForm.querySelectorAll('select');
        const textarea = newForm.querySelector('textarea');

        if (phoneRaw.value.length < 7) {
            showSovModal("INVALID_PHONE", "Identity requires at least 7 digits.", "#ff4444");
            btn.disabled = false;
            btn.innerText = "SUBMIT TO ADMIN";
            return;
        }

        try {
            const hwFingerprint = await generateLocalFingerprint(); 
            const currentPlatform = detectProvisionManagement();
            
            const payload = {
                name: newForm.querySelector('input[type="text"]').value.trim(),
                email: newForm.querySelector('input[type="email"]').value.trim(),
                phone_code: (selects[1].value && selects[1].value !== 'undefined') ? selects[1].value : "+",
                phone: phoneRaw.value.trim(),
                country: selects[0].value || "KE",
                declaration_of_intent: textarea ? textarea.value.trim() : "General Interest",
                hw_id: hwFingerprint,
                arch: currentPlatform
            };

            // 1. Fill the custom modal with data
            document.getElementById('v-name').innerText = payload.name;
            document.getElementById('v-email').innerText = payload.email;
            document.getElementById('v-phone').innerText = `${payload.phone_code}${payload.phone}`;
            document.getElementById('v-country').innerText = payload.country;

            // 2. Show the modal (Fixed ID to match HTML)
            const terminalModal = document.getElementById('interestModal');
            terminalModal.style.display = 'flex';

            // 3. Handle Buttons
            document.getElementById('abortInterestBtn').onclick = () => {
                terminalModal.style.display = 'none';
                btn.disabled = false;
                btn.innerText = "SUBMIT TO ADMIN";
            };

            document.getElementById('confirmInterestBtn').onclick = async () => {
                terminalModal.style.display = 'none';
                btn.innerText = "LOCKING_HARDWARE...";

                try {
                    const res = await fetch('http://localhost:3000/api/spacs/interest', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                        localStorage.setItem('sov_identity_confirmed', 'true');
                        localStorage.setItem('hw_id', hwFingerprint);
                        closeAllModals(); 
                        showSovModal("REGISTRY_SUCCESS", "Hardware Bound. Redirecting...", "#00ff88");
                        setTimeout(() => { window.location.href = './waiting-approval.html'; }, 2500);
                    } else {
                        showSovModal("REGISTRY_ERROR", data.error, "#ff4444");
                        btn.disabled = false;
                        btn.innerText = "SUBMIT TO ADMIN";
                    }
                } catch (err) {
                    showSovModal("BRIDGE_FAULT", "Offline.", "#ff4444");
                    btn.disabled = false;
                    btn.innerText = "SUBMIT TO ADMIN";
                }
            };
        } catch (err) {
            console.error("IDENTITY_FAULT:", err);
            btn.disabled = false;
            btn.innerText = "SUBMIT TO ADMIN";
        }
    }; // End onsubmit
} // End initInterestForm

// --- INDEXEDDB MANIFEST STORAGE ---
// --- INDEXEDDB: SOVEREIGN STORAGE ENGINE ---
const DB_NAME = "SOVEREIGN_CORE_DB";
const STORE_NAME = "manifest_store";

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveManifestToDB(manifest) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.put({
        id: "vpu_manifest",
        data: manifest
    });

    return tx.complete;
}

// --- 7. FORM B: PROVISIONING BRIDGE ---
function initProvisionForm() {
    const form = document.getElementById('provision-form');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');

        btn.disabled = true;
        btn.innerText = "AUTHENTICATING...";

        // Capturing all required vectors for identity verification and hardware binding
        const payload = {
            official_name: document.getElementById('m-name').value.trim(),
            membership_no: document.getElementById('m-member-no').value.trim(),
            license_key: document.getElementById('m-license').value.trim(),
            email: document.getElementById('m-email').value.trim(),
            phone: document.getElementById('m-phone').value.trim(),
            phone_code: document.getElementById('m-phone-code')?.value || "+254", // Match saved code
            country: document.getElementById('m-country')?.value || "KE",
            hw_id: localStorage.getItem('hw_id'), // Ensure this matches the full hash
            arch: detectProvisionManagement()
        };

        try {
            const res = await fetch('http://localhost:3000/api/spacs/verify-provision', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                closeAllModals();
                showSovModal("PROVISION_GRANTED", "Identity verified. 100MB Birthright Allotment secured Initializing download sequence.");
                // Store the allotment locally for UI consistency
                localStorage.setItem('sov_allotment', data.allotment_mb);
                if (typeof startProvisioningSequence === 'function') {
                // FIXED: Using the exact keys from your payload object above
            await handleFullProvisioning(payload.official_name, data, payload.arch);    
            }
            } else {
                showSovModal("AUTH_FAILED", data.error || "Credentials rejected.", "#ff4444");
                btn.disabled = false;
                btn.innerText = "VERIFY & PROVISION";
            }
        } catch (err) {
            showSovModal("OFFLINE", "Database connection lost.", "#ff4444");
            btn.disabled = false;
        }
    };
}

/**
 * FORM B: PHYSICAL PROVISIONING (100MB FOLDER & MANIFEST CREATION)
 */
/**
 * UNIFIED PROVISIONING ENGINE
 * Saves manifest to IndexedDB AND generates physical downloads (.bin & .vpu)
 */
async function handleFullProvisioning(ownerName, bundle, arch) {
    const overlay = document.getElementById('provisioning-overlay');
    const logBox = document.getElementById('log-box');
    if (overlay) overlay.style.display = 'flex';

    const addLog = (text) => {
        const line = document.createElement('div');
        line.className = 'log-line';
        line.innerHTML = `> ${text}`;
        if (logBox) {
            logBox.appendChild(line);
            logBox.scrollTop = logBox.scrollHeight;
        }
    };

    addLog(`<span style="color:#a855f7;">INITIALIZING SOVEREIGN PROVISIONING...</span>`);

    // 1. DATA ASSEMBLY
    const systemIdentity = document.getElementById('m-member-no').value.trim().toUpperCase();
    const vpuManifest = {
        vfs_version: "1.2.8",
        owner: systemIdentity,
        real_name: ownerName,
        hardware_binding: localStorage.getItem('hw_id'),
        allotment_mb: bundle.allotment_mb || 100,
        created_at: new Date().toISOString(),
        sector_id: `SEC-${Math.random().toString(36).toUpperCase().substring(2, 10)}`,
        integrity_hash: bundle.build_hash || "GENESIS_HASH_001"
    };

    // 2. PERSISTENCE (IndexedDB)
    try {
        addLog(`Securing Vault Manifest in local enclave...`);
        await saveManifestToDB(vpuManifest);
        localStorage.setItem('vpu_manifest_present', 'true');
        localStorage.setItem('vpu_sector_id', vpuManifest.sector_id);
        addLog(`<span style="color:#00ff88;">[SUCCESS]: Manifest persisted to IndexedDB.</span>`);
    } catch (err) {
        addLog(`<span style="color:#ff4444;">[ERROR]: Database persistence failed.</span>`);
    }

    // 3. GENERATE SOVEREIGN DRIVE (.BIN)
    addLog(`Generating 100MB Sovereign Drive (Physical Media)...`);
    const ALLOTMENT_SIZE = 100 * 1024 * 1024; 
    const driveBuffer = new Uint8Array(ALLOTMENT_SIZE);
    const encoder = new TextEncoder();
    
    // Tagging manifest for auth.js scanning
    const taggedManifest = `---VPU_MANIFEST_START---\n${JSON.stringify(vpuManifest)}\n---VPU_MANIFEST_END---`;
    const manifestBytes = encoder.encode(taggedManifest);
    driveBuffer.set(manifestBytes);

    const driveBlob = new Blob([driveBuffer], { type: 'application/octet-stream' });
    const driveLink = document.createElement('a');
    driveLink.href = URL.createObjectURL(driveBlob);
    driveLink.download = `SOVEREIGN_DRIVE_${ownerName.replace(/\s+/g, '_')}.bin`;
    document.body.appendChild(driveLink);
    driveLink.click();
    document.body.removeChild(driveLink);
    addLog(`Sovereign Drive download initiated.`);

    // 4. GENERATE IDENTITY ANCHOR (.VPU)
    addLog(`Issuing Identity Certificate...`);
    const certContent = `--- VPU SOVEREIGN CERTIFICATE ---\n${bundle.certificate || "VALID_IDENTITY"}\n\n--- MANIFEST_REF ---\n${vpuManifest.sector_id}`;
    const certBlob = new Blob([certContent], { type: 'text/plain' });
    const certLink = document.createElement('a');
    certLink.href = URL.createObjectURL(certBlob);
    certLink.download = `VPU_ANCHOR_${ownerName.replace(/\s+/g, '_')}.vpu`;
    document.body.appendChild(certLink);
    certLink.click();
    document.body.removeChild(certLink);
    addLog(`Certificate download initiated.`);

    // 5. EXTERNAL SEQUENCE TRIGGER (UI Sync)
    addLog(`<span style="color:#00ff88;">PROVISIONING COMPLETE.</span>`);
    localStorage.setItem('vpu_provisioned', 'true');
    localStorage.setItem('sov_provision_complete', 'true');

    // Optional: Call the original download sequence if you still need the build download
    if (typeof startProvisioningSequence === 'function') {
        await startProvisioningSequence(ownerName, bundle, arch);
    } else {
        setTimeout(() => {
            window.location.href = "./complete-profile.html";
        }, 3000);
    }
}
// --- 8. UI HELPERS ---
function initDistributionButtons() {
    // 1. Correctly parse the Hash and Parameters
    const currentHash = window.location.hash;
    const params = new URLSearchParams(currentHash.replace('#', '').replace('&', '?')); // Format for URLSearchParams
    const lockedArch = params.get('arch');
    
    // Check if the hash starts with 'provision' rather than an exact match
    const isProvisionMode = currentHash.includes('provision');

    // 2. Visual Lockdown (Grey out other kernels immediately)
    if (lockedArch) applyKernelEnforcement(lockedArch);

    document.querySelectorAll('.btn-dist').forEach(button => {
        button.onclick = async (e) => {
            e.preventDefault();

            // 1. Capture Hardware & Architecture
            const hwFingerprint = await generateLocalFingerprint(); 
            localStorage.setItem('hw_id', hwFingerprint);
            
            const selectedClass = [...button.classList].find(cls => osMapping[cls]);
            const architecture = osMapping[selectedClass] || getArchitecture();

            // 2. ENFORCEMENT: Block click if it doesn't match the lock
            if (lockedArch && architecture !== lockedArch) {
                showSovModal("SECURITY_VIOLATION", `Identity locked to ${lockedArch}.`, "#ff4444");
                return;
            }
            
            // 3. Update state
            localStorage.setItem('pending_arch', architecture);

            // 4. THE SPACS ROUTER (Priority Logic)
            const isRegistered = localStorage.getItem('sov_identity_confirmed');

            if (isProvisionMode) {
                // FORCE FORM B: Arrived via Sniffer Redirect (Approved User)
                closeAllModals();
                const memberModal = document.getElementById('member-modal');
                if (memberModal) {
                    memberModal.style.display = 'flex';
                    
                    // Transform the "Become a Native" button into an "Approved" Badge
                    const interestBtn = document.getElementById('interested-btn');
                    if (interestBtn) {
                        interestBtn.innerText = "✓ IDENTITY_VERIFIED_BY_ADMIN";
                        interestBtn.style.background = "rgba(0, 255, 128, 0.1)";
                        interestBtn.style.color = "#00ff80";
                        interestBtn.style.border = "1px solid #00ff80";
                        interestBtn.style.cursor = "default";
                        interestBtn.style.pointerEvents = "none";
                        interestBtn.classList.remove('interest');
                    }
                }
            } 
            else if (isRegistered === 'true') {
                const provModal = document.getElementById('member-modal');
                if (provModal) provModal.style.display = 'flex';
            } 
            else {
                const interestModal = document.getElementById('interest-modal');
                if (interestModal) interestModal.style.display = 'flex';
            }

            // Start the global timer (Ensure this is in the global scope)
            if (typeof startTimeoutTimer === 'function') startTimeoutTimer();
        };
    });
}

function normalizeArch(val) {
    if (!val) return "";
    val = val.toLowerCase();

    if (val.includes("win")) return "windows";
    if (val.includes("mac")) return "macos";
    if (val.includes("linux")) return "linux";
    if (val.includes("android")) return "android";
    if (val.includes("ios")) return "ios";

    return val;
}
   
//UI should automatically disable the kernels that don't match their locked_arch returned from the sniffer API, and only allow clicking the compatible one. 
// This ensures users can't bypass the hardware lock by selecting a different OS option.
function enforceKernelLock(lockedArch) {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
        const btn = card.querySelector('.btn-dist');
        const selectedClass = [...btn.classList].find(cls => osMapping[cls]);
        const cardArch = osMapping[selectedClass];

        if (cardArch !== lockedArch) {
            // Disable wrong kernels
            card.style.opacity = "0.3";
            card.style.filter = "grayscale(1)";
            btn.style.pointerEvents = "none";
            btn.innerHTML = "INCOMPATIBLE_ARCH";
            
            // Add a small warning label
            const warning = document.createElement('small');
            warning.innerText = `IDENTITY_LOCKED_TO: ${lockedArch}`;
            warning.style.color = "#ff4444";
            card.appendChild(warning);
        } else {
            // Highlight the correct one
            card.style.border = "1px solid #00ff88";
            card.style.boxShadow = "0 0 20px rgba(0, 255, 136, 0.3)";
            btn.innerHTML = "VERIFIED_ARCH: PROCEED";
        }
    });
}

/**
 * REFINES THE MEMBER MODAL FOR APPROVED USERS
 * Transforms the 'Become a Space Native' button into a Status Badge
 */
function lockProvisioningUI() {
    const interestBtn = document.getElementById('interested-btn');

    const params = new URLSearchParams(
        window.location.hash.replace('#', '').replace('&', '?')
    );
    const lockedArch = params.get('arch');

    const mismatchDetected = detectMismatch(lockedArch);

    if (!interestBtn) return;

    // ✅ APPROVED STATE
    if (window.location.hash.includes('provision') && !mismatchDetected) {
        interestBtn.innerText = "✓ IDENTITY_VERIFIED_BY_ADMIN";
        interestBtn.style.background = "rgba(0, 255, 128, 0.1)";
        interestBtn.style.color = "#00ff80";
        interestBtn.style.border = "1px solid #00ff80";
        interestBtn.style.pointerEvents = "none";
        interestBtn.classList.remove('interest');
    }

    // ⚠️ MISMATCH STATE (THIS IS WHAT YOU WANTED)
    if (mismatchDetected) {
        interestBtn.innerText = "REQUEST_ARCH_RESET";
        interestBtn.style.color = "#ffbc00";
        interestBtn.style.pointerEvents = "auto";

        interestBtn.onclick = async () => {
            showSovModal("RESET_REQUESTED", "Admin notified. Hardware signature reset pending.");

            await fetch('http://localhost:3000/api/spacs/request-reset', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    hw_id: localStorage.getItem('hw_id'),
                    current_arch: detectProvisionManagement(),
                    expected_arch: lockedArch
                })
            });
        };
    }
}

function detectMismatch(lockedArch) {
    if (!lockedArch) return false;

    const current = detectProvisionManagement().toLowerCase();
    const expected = lockedArch.toLowerCase();

    return current !== expected;
}

// This function is called by the sniffer sequence if the user's hardware is locked to a specific architecture. 
// It disables all incompatible options and only allows the user to select the correct one, ensuring they can't bypass the hardware lock.
function applyKernelEnforcement(allowedArch) {
    const allButtons = document.querySelectorAll('.btn-dist');
    
    allButtons.forEach(btn => {
        const selectedClass = [...btn.classList].find(cls => osMapping[cls]);
        const btnArch = osMapping[selectedClass];

        if (btnArch !== allowedArch) {
            // Disable the card
            const card = btn.closest('.card');
            card.style.opacity = "0.4";
            card.style.filter = "grayscale(1) contrast(0.8)";
            btn.style.pointerEvents = "none";
            btn.innerHTML = `<span class="icon">🔒</span> LOCKED_ARCH`;
        } else {
            // Highlight the correct one
            const card = btn.closest('.card');
            card.style.border = "1px solid #00ff88";
            card.style.boxShadow = "0 0 15px rgba(0, 255, 136, 0.2)";
            btn.innerHTML = `<span class="icon">✓</span> VERIFIED_ARCH`;
        }
    });
}

function closeAllModals() {
    // Hide all modals EXCEPT the sovereign notification
    document.querySelectorAll('.modal-overlay, .modal').forEach(m => {
        if (m.id !== 'sov-notification') {
            m.style.display = 'none';
        }
    });
}
