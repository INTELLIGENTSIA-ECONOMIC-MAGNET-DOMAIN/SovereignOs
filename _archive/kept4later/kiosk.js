
// --- TAURI KERNEL ADAPTER ---
window.vpu = {
    bootOS: async () => {
        try {
            console.log("Kernel: Initiating Remote Handshake...");
            
            // REPLACE THIS with your actual GitHub Pages URL
            // Example: https://archanti.github.io/Thealcohesion-core/
            const remoteURL = 'https://ntilanima.github.io/Thealcohesion-core/Thealcohesion-core';
            
            window.location.href = remoteURL; 
            
            return { success: true };
        } catch (e) {
            return { success: false, error: "UPLINK_TIMEOUT" };
        }
    }
};

let osReady = false;

// Simulate kernel readiness after intro animation
setTimeout(() => {
    osReady = true;
    console.log("Kernel: Sovereign environment ready.");
}, 3500);


const h1Text = "Welcome to Thealcohesion Space Native Kiosk";
const pText = "The Secured Decoupled Enclave Architecture";

const enterBtn = document.getElementById('enter-btn');
const errorMsg = document.getElementById('error-msg');
const syncText = document.getElementById('sync-text');
const nodeStatus = document.getElementById('node-status');
const scanStatus = document.getElementById('scan-status');

// Audio Assets
const typeSound = new Audio('keypress.mp3');
typeSound.volume = 0.2;
const powerSound = new Audio('power-up.mp3');
powerSound.volume = 0.4;

// 1. Smooth Typewriter with Progress Bar Integration
function updateProgressBar(percent) {
    const bar = document.getElementById('sync-progress');
    if (bar) bar.style.width = percent + "%";
}

function typewriter(elementId, text, speed, callback) {
    let i = 0;
    const element = document.getElementById(elementId);
    element.innerHTML = ""; 

    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            
            // Play mechanical click
            typeSound.currentTime = 0;
            typeSound.play().catch(() => {});
            
            i++;
            if (elementId === "typewriter-h1") updateProgressBar((i / text.length) * 45);
            if (elementId === "typewriter-p") updateProgressBar(45 + (i / text.length) * 45);
            
            setTimeout(type, speed);
        } else if (callback) {
            setTimeout(callback, 400); 
        }
    }
    type();
}

// 2. Real Hardware Manifest Logic
async function getSystemManifest() {
    const memory = navigator.deviceMemory || "UNK";
    const cores = navigator.hardwareConcurrency || "UNK";
    const res = `${window.screen.width}x${window.screen.height}`;
    const platform = navigator.platform;
    
    let batteryLevel = "AC_POWERED";
    try {
        if (navigator.getBattery) {
            const battery = await navigator.getBattery();
            batteryLevel = `${Math.round(battery.level * 100)}%`;
        }
    } catch (e) { batteryLevel = "STABLE"; }

    return [
        `CPU_CORES: ${cores}`,
        `SYS_MEMORY: ${memory}GB`,
        `DISP_RES: ${res}`,
        `POWER_CELL: ${batteryLevel}`,
        `OS_KERNEL: ${platform}`,
        `ENCLAVE_STATE: SECURED`
    ];
}

// 3. System Status & Readiness
function checkSystemStatus() {
    if (!navigator.onLine) {
        nodeStatus.innerText = "OFFLINE";
        nodeStatus.style.color = "#ff4b4b";
        errorMsg.style.display = "block";
        errorMsg.innerHTML = `[!] CONNECTION INTERRUPTED: Please verify your uplink.`;
        enterBtn.classList.add('hidden-element');
        return;
    }

    if (!osReady) {
        nodeStatus.innerText = "SYNCING";
        nodeStatus.style.color = "#ffaa00";
        errorMsg.style.display = "block";
        errorMsg.innerHTML = `[i] Binding Sovereign Kernel…`;
        setTimeout(checkSystemStatus, 800);
        return;
    }

    nodeStatus.innerText = "ENCLAVE_ACTIVE";
    nodeStatus.style.color = "var(--primary-purple)";
    errorMsg.style.display = "none";
    syncText.innerText = "SYNCHRONIZATION COMPLETE";
    updateProgressBar(100);

    enterBtn.classList.remove('hidden-element');
    enterBtn.style.display = "inline-block";
}


// 4. Main Access Navigation
enterBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    // 1. Data Prep
    const specs = await getSystemManifest();
    const nativeID = localStorage.getItem('spaceNativeID') || "NATIVE-GENESIS";
    const lastLogin = localStorage.getItem('lastEnclaveLogin') || "INITIAL_INITIALIZATION";
    const now = new Date();
    const currentTimeStr = `${now.toLocaleDateString()} // ${now.toLocaleTimeString()}`;

    const orbs = document.querySelectorAll('.ambient-orb');
    const container = document.querySelector('.kiosk-container');
    const welcome = document.getElementById('welcome-overlay');
    const manifest = document.getElementById('system-manifest');
    

    // 2. Initial Setup
    document.getElementById('native-display-id').innerText = nativeID;
    document.getElementById('last-login-display').innerText = `LAST_ACCESS: ${lastLogin}`;
    manifest.innerHTML = ""; 

    // 3. Trigger Visual Surge
    orbs.forEach(orb => orb.classList.add('orb-active'));
    container.classList.add('kiosk-fade-out');
    if (powerSound) powerSound.play().catch(() => {});

    // 4. The Two-Step Overlay Reveal
    welcome.style.display = 'flex'; // Step 1: Put it in the DOM
    
    setTimeout(() => {
        welcome.classList.add('welcome-active'); // Step 2: Fade it in
        localStorage.setItem('lastEnclaveLogin', currentTimeStr);
        
    // 5. Percentage Counter Animation (0 to 100 over 3 seconds)
    const percentEl = document.getElementById('scan-percentage');
    const statusEl = document.getElementById('scan-status');
    let count = 0;
    const counterInterval = setInterval(() => {
        count += Math.floor(Math.random() * 3) + 1; // Random increments for "Realism"
        if (count >= 100) {
            count = 100;
            clearInterval(counterInterval);
            // Finalize Status
            statusEl.innerText = "IDENTITY RECOGNIZED";
            statusEl.style.color = "#00ff41";
        }
        percentEl.innerText = count.toString().padStart(2, '0');
    }, 30);
        // Print real-time system manifest
        specs.forEach((spec, index) => {
            setTimeout(() => {
                const line = document.createElement('div');
                line.className = 'manifest-line';
                line.innerText = `> ${spec}`;
                manifest.appendChild(line);
                typeSound.currentTime = 0;
                typeSound.play().catch(() => {});
            }, index * 250); 
        });
    }, 50); // Smallest delay to ensure display:flex is registered

    // 6. Update Status mid-scan
    setTimeout(() => {
        const statusEl = document.getElementById('scan-status');
        if(statusEl) {
            statusEl.innerText = "IDENTITY RECOGNIZED";
            statusEl.style.color = "#00ff41";
        }
    }, 2500);

// 7. Secure Navigation via VPU Bridge
    setTimeout(async () => {
        // Fade out the overlay for a smooth transition
        const welcome = document.getElementById('welcome-overlay');
        if (welcome) welcome.style.opacity = '0';

        console.log("Initiating Kernel Handshake...");

        try {
            // Tell the Tauris Main Process to load the OS folder
            const response = await window.vpu.bootOS();

            if (!response.success) {
                console.error("OS Launch Failed:", response.error);
                // Display error if the OS folder is missing
                const statusEl = document.getElementById('scan-status');
                if (statusEl) {
                    statusEl.innerText = "ERROR: CORE NOT FOUND";
                    statusEl.style.color = "#ff4b4b";
                }
            }
        } catch (err) {
            console.error("Bridge Communication Error:", err);
        }
    }, 6500); // 6.5s buffer to allow the manifest typing to finish
});

// 8. Ambient Mouse Tracking
    document.addEventListener('mousemove', (e) => {
        const orb1 = document.querySelector('.orb-1');
        const orb2 = document.querySelector('.orb-2');
        const moveX = (e.clientX - window.innerWidth / 2) / 25;
        const moveY = (e.clientY - window.innerHeight / 2) / 25;

        if(orb1) orb1.style.transform = `translate(${moveX}px, ${moveY}px)`;
        if(orb2) orb2.style.transform = `translate(${-moveX * 1.5}px, ${-moveY * 1.5}px)`;
    });

    // 9. Initialization
    window.onload = () => {
        typewriter("typewriter-h1", h1Text, 40, () => {
            typewriter("typewriter-p", pText, 25, () => {
                checkSystemStatus();
            });
        });
    };
    

window.addEventListener('offline', checkSystemStatus);
window.addEventListener('online', checkSystemStatus);