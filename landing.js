import { triggerRealPanic } from './core/panic.js';
// UI REACTIVITY (Parallax)
document.addEventListener('mousemove', (e) => {
    const xPos = (e.clientX / window.innerWidth) - 0.5;
    const yPos = (e.clientY / window.innerHeight) - 0.5;
    const core = document.querySelector('.core-focus');
    const noise = document.querySelector('.noise');
    const intensity = 20;
    
    if(core) core.style.transform = `translateX(${xPos * intensity}px) translateY(${yPos * intensity}px)`;
    if(noise) noise.style.transform = `translateX(${-xPos * (intensity * 2)}px) translateY(${-yPos * (intensity * 2)}px)`;
});

function updateLiveFeed() {
    const integrity = document.querySelector('.integrity-check span:first-child');
    const blocks = ["VFS_STABLE", "GENESIS_ALIVE", "SYNC_0x1226", "CORE_LOADED"];
    if(!integrity) return;
    setInterval(() => {
        integrity.innerText = `PROTOCOL: ${blocks[Math.floor(Math.random() * blocks.length)]}`;
    }, 4000);
}

updateLiveFeed();

// SOUND UTILITIES
function playSound(frequency, type, duration, volume) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
    }, duration * 1000);
} 

// PROVISIONING DETECTION UTILITIES

// Detects if the user is on Windows, Mac, or Linux
function detectProvisionManagement() {
    const ua = navigator.userAgent;
    if (ua.indexOf("Win") !== -1) return "Windows";
    if (ua.indexOf("Mac") !== -1) return "macOS";
    if (ua.indexOf("Linux") !== -1) return "Linux";
    return "Unknown_Arch";
}

// Generates a unique SHA-256 hash based on GPU and Hardware specs
async function generateLocalFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        const renderer = gl.getParameter(gl.RENDERER);
        
        // Combining hardware specs for entropy
        const entropy = [
            navigator.hardwareConcurrency, // CPU Cores
            renderer,                      // GPU Name
            screen.colorDepth,             // Display Depth
            navigator.deviceMemory         // RAM (approx)
        ].join("||");

        const msgBuffer = new TextEncoder().encode(entropy);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    } catch (e) {
        console.warn("Fingerprint failed, using fallback hash.");
        return "0x_ANONYMOUS_GENESIS_CORE";
    }
}



/* === SOVEREIGN SNIFFER: ORCHESTRATED EXECUTION === */
/* === SOVEREIGN SNIFFER: ORCHESTRATED EXECUTION (LEAN SPACS) === */

async function runSovereignSniffer(btn) {
    // 1. Initial UI Transition
    //btn.innerHTML = `<span class="text">ACCESSING_VPU_KERNEL...</span>`;
    await new Promise(r => setTimeout(r, 6000));
    
    // 2. Inject High-End HUD Overlay
    const overlay = document.createElement('div');
    overlay.id = 'sniffer-overlay';
    overlay.innerHTML = `
        <div class="hud-noise"></div>
        <div class="scanner-bar"></div>
        <div class="sniffer-hud">
            <div class="status-title">SOVEREIGN_SNIFFER_v2.6</div>
            <div class="sniffer-log" id="sniffer-log"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    const log = document.getElementById('sniffer-log');
    const addLog = async (msg, type = '', delay = 500) => {
        const div = document.createElement('div');
        div.className = type;
        div.innerText = `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
        await new Promise(r => setTimeout(r, delay)); 
    };

    try {
        // --- STAGE 1: HARDWARE PROBE ---
        await addLog("INITIALIZING_FORENSIC_BUFFER...", "", 800);
        const hwFingerprint = await generateLocalFingerprint(); 
        const currentPlatform = detectProvisionManagement().toLowerCase(); 

        await addLog(`MACHINE_ID: ${hwFingerprint.substring(0, 24)}...`, "success", 600);
        await addLog(`LOCAL_ARCH: ${currentPlatform.toUpperCase()}`, "success", 600);

        // --- STAGE 2: UPLINK ---
        await addLog("UPLINKING_TO_VPU_BRIDGE...", "", 1000);
        const response = await fetch('http://localhost:3000/api/spacs/sniffer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hw_id: hwFingerprint, arch: currentPlatform })
        });

        if (response.status === 429) {
            alert("SYSTEM_THROTTLED: Too many handshake attempts. Please wait.");
            return;
        }
        
        const data = await response.json();
        // We now look for 'status' per our agreement
        const result = data.status; 

        await addLog("HANDSHAKE_ESTABLISHED. ANALYZING_HIERARCHY...", "success", 800);

        // --- STAGE 3: THE 5-STAGE REDIRECT ENGINE ---

        // 1. SECURITY KILL-SWITCH (REVOKED / LOCKED)
        if (result === 'REVOKED') {
            await addLog("!! SECURITY_ALERT: IDENTITY_TERMINATED !!", "critical", 1500);
            playSound(60, 'sawtooth', 2.0, 0.4); 
            setTimeout(() => {
                triggerRealPanic("0x_SOV_REVOKED", `HW_ID: ${hwFingerprint.substring(0, 8)}`);
            }, 1000);
            return;
        }

        // 2. IDENTITY GATE (WAITING ROOM)
        if (result === 'WAITING') {
            await addLog("IDENTITY_LOCKED: AWAITING_ADMIN_KEY.", "warning", 1200);
            await addLog("REDIRECTING TO APPROVAL_QUEUE...", "warning", 800);
            setTimeout(() => window.location.href = './waiting-approval.html', 1500);
            return;
        }

        // 3. BIRTHRIGHT CLAIM (SYSTEM PROVISIONING - FORM B)
        if (result === 'REQUIRE_FORM_B') {
            await addLog("BIRTHRIGHT_OFFLINE: PROVISIONING_REQUIRED.", "info", 1200);
            await addLog("ALLOCATING_SYSTEM_RESOURCES...", "info", 800);
            
            // Add the #provision hash to the URL
            setTimeout(() => window.location.href = './download.html#provision', 1500);
            return;
        }

        // 4. PROFILE SYNC (HUMAN IDENTITY - COMPLETE PROFILE)
        if (result === 'REQUIRE_PROFILE') {
            await addLog("IDENTITY_INCOMPLETE: SYNCING_PROFILE.", "info", 1200);
            await addLog("REDIRECTING TO BIO-SYNC TERMINAL...", "info", 800);
            setTimeout(() => window.location.href = './complete-profile.html', 1500);
            return;
        }

        // 5. ACCESS GRANTED (PROVISIONED)
        if (result === 'PROVISIONED') {
            await addLog("HARDWARE_MATCH: IDENTITY_VERIFIED.", "success", 1200);
            await addLog("BYPASSING INGRESS...", "success", 800);
            setTimeout(() => window.location.href = './Thealcohesion-core/index.html', 1000);
            return;
        }

        // 6. FALLBACK: NEW USER (UNPROVISIONED)
        if (result === 'INITIAL') {
            await addLog("STATE: INITIAL_REGISTRATION_REQUIRED.", "success", 1200);
            await addLog("ADMITTING_TO_TERMINAL...", "success", 800);
            setTimeout(() => window.location.href = './download.html', 1000);
        }

    } catch (err) {
        console.error("SNIFFER_CRITICAL_ERROR:", err);
        await addLog("UPLINK_FAILURE: BRIDGE_OFFLINE", "critical", 2000);
        setTimeout(() => {
            overlay.remove();
            btn.innerHTML = `<span class="text">BRIDGE_OFFLINE</span>`;
            btn.style.pointerEvents = "auto";
        }, 2000);
    }
}
// 5. BINDING (SINGLE HANDLER)
document.querySelector('.download-btn').onclick = async function(e) {
    e.preventDefault();
    const btn = this;
    
    // 1. Enter Verification State & Lock UI
    btn.style.pointerEvents = "none"; 
    // Ensure the structure is correct for the loop to find '.text'
    btn.innerHTML = `<span class="text">VERIFYING_HASH...</span>`;
    btn.style.borderColor = "#fff";
    document.body.style.animation = "flash 0.4s ease-out";

    // 2. Start the REAL backend sniffer
    // We start it, but we don't 'await' it yet so the cinematic runs
    const snifferTask = runSovereignSniffer(btn);

    // 3. Cinematic Security Sequence
    const sequence = [
        { text: "CHECKING_MD5", delay: 800 },
        { text: "SIG_GENESIS_2025_MATCH", delay: 1500 },
        { text: "DECRYPTING_BINARY", delay: 2200 },
        { text: "HANDSHAKE_COMPLETE", delay: 2500 },
        { text: "SECURITY_CHECKS_PASSED", delay: 3000 },
        { text: "STARTING SNIFFER...", delay: 3500 }
    ];

    for (const [index, step] of sequence.entries()) {
        const timeToWait = index === 0 ? step.delay : step.delay - sequence[index-1].delay;
        await new Promise(res => setTimeout(res, timeToWait));
        
        // Re-selecting to ensure we have the current DOM element
        const textSpan = btn.querySelector('.text');
        if(textSpan) {
            textSpan.innerText = step.text;
        }
    }

    // 4. Final Handover
    document.body.style.background = "#fff";
    
    // Brief flash effect
    await new Promise(res => setTimeout(res, 100));
    document.body.style.background = "#050505";
    
    // 5. Sync with Backend Result
    // Now we wait for the sniffer to finish its network/logic
    await snifferTask; 
    
    // If the sniffer didn't redirect (e.g., error), show final state
    if (btn.querySelector('.text')) {
        btn.querySelector('.text').innerText = "ACCESS_GRANTED";
    }
};

// SOVEREIGN NOTIFICATION MODAL
function closeSovModal() {
    const modal = document.getElementById('sov-notification');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
}

// Alias to prevent "never read" or case-sensitivity errors
window.closesovmodal = closeSovModal;