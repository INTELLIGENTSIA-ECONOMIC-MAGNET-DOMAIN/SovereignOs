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
                startProvisioningSequence(
                    payload.official_name,
                    payload.license_key,
                    payload.arch, 
                    data.shell_url
                );}
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
    
    if (interestBtn && window.location.hash === '#provision') {
        // 1. Change Text to show Authorization
        interestBtn.innerText = "✓ IDENTITY_VERIFIED_BY_ADMIN";
        
        // 2. Change Styling to look like a Badge rather than a Button
        interestBtn.style.background = "rgba(0, 255, 128, 0.1)"; // Faint green glow
        interestBtn.style.color = "#00ff80";
        interestBtn.style.border = "1px solid #00ff80";
        interestBtn.style.boxShadow = "0 0 10px rgba(0, 255, 128, 0.2)";
        
        // 3. Disable Interactivity
        interestBtn.style.cursor = "default";
        interestBtn.style.pointerEvents = "none"; 
        
        // 4. Remove the original hover class
        interestBtn.classList.remove('interest');
        
        console.log("SPACS: Member UI locked to 'Approved' state.");
    }

    if (mismatchDetected) {
    const switchBtn = document.getElementById('interested-btn');
    switchBtn.innerText = "REQUEST_ARCH_RESET";
    switchBtn.style.color = "#ffbc00";
    switchBtn.style.pointerEvents = "auto";
    switchBtn.onclick = () => {
        showSovModal("RESET_REQUESTED", "Admin notified. Hardware signature reset pending.");
        // Call an endpoint to notify Admin
    };
}
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
