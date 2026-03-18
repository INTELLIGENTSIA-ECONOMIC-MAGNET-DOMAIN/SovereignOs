/**
 * boot.js - Unified Thealcohesion VPU Boot Sequence
 * Slowed to 10-second duration with organic stutters.
 */
export class BootSequence {
    constructor() {
        this.splash = document.getElementById('os-splash');
        this.fill = document.getElementById('progressFill');
        this.text = document.getElementById('progressText');
        this.status = document.getElementById('statusText');
        this.loginGate = document.getElementById('login-gate');

        this.progress = 0;
        this.duration = 10000; // Total time: 10 Seconds
        this.messageIndex = 0;
        this.bootMessages = [
    ">> Virtualizing Thealcohesion Sovereign Core via VPU framework...",
    ">> Synchronizing mesh formations and decentralized nodes...",
    ">> Establishing cryptographic handshakes:\n   - Protocol Formations: SECURE",
    ">> Establishing cryptographic handshakes:\n   - Platform Infrastructure: VERIFIED",
    ">> Establishing cryptographic handshakes:\n   - Service Layer Abstraction: ACTIVE",
    ">> VPU environment stabilized. Integrity check 100%.\n>> Welcome to Thealcohesion Sovereign Core"
];
    }

    init() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(() => {});
        }

        const title = this.splash?.querySelector('h1');
        if (title) {
            title.style.letterSpacing = "10px";
            setTimeout(() => {
                title.style.transition = "letter-spacing 4s ease-out";
                title.style.letterSpacing = "2px";
            }, 50);
        }

        this.startTime = performance.now(); // Record the start time
        this.animate();
    }

    animate() {
        const now = performance.now();
        const elapsed = now - this.startTime;
        
        // 1. Calculate the "Ideal" progress based on 10 seconds
        const linearProgress = (elapsed / this.duration) * 100;

        // 2. Add organic variation
        // If we are behind the clock, jump forward. 
        // If we are ahead, wait (slow down).
        if (this.progress < linearProgress) {
            const jump = Math.random() > 0.9 ? 2.0 : 0.4;
            this.progress += jump;
        }

        // 3. Keep logs updated based on current progress
        this.updateUI();

        if (this.progress < 100 && elapsed < this.duration + 500) {
            requestAnimationFrame(() => this.animate());
        } else {
            this.progress = 100;
            this.updateUI();
            this.terminate();
        }
    }

    updateUI() {
        if (!this.fill || !this.text) return;

        this.fill.style.width = `${this.progress}%`;
        this.text.innerText = `${Math.floor(this.progress)}%`;

        // Check if it's time for a new message AND we aren't currently typing
        const triggerPoint = (this.messageIndex + 1) * (100 / (this.bootMessages.length + 1));
        
        if (this.progress > triggerPoint && this.messageIndex < this.bootMessages.length && !this.isTyping) {
            this.typewriter(this.bootMessages[this.messageIndex]);
            this.messageIndex++;
        }
    }

    typewriter(fullText) {
        this.isTyping = true;
        let charIndex = 0;
        
        // Create a new container for this specific line
        const line = document.createElement('div');
        line.style.color = "#00ff41";
        line.style.textShadow = "0 0 5px rgba(0, 255, 65, 0.5)";
        line.style.marginBottom = "8px";
        this.status.appendChild(line);

        const type = () => {
            if (charIndex < fullText.length) {
                const char = fullText.charAt(charIndex);
                line.innerHTML += char === "\n" ? "<br>" : char;
                charIndex++;
                
                // Scroll to bottom as we type
                this.status.scrollTop = this.status.scrollHeight;
                
                setTimeout(type, 15); // Fast typing speed
            } else {
                this.isTyping = false; // Allow the next message to start
            }
        };
        type();
    }

    terminate() {
    setTimeout(() => {
        if (this.splash) {
            // 1. Smoothly fade and blur
            this.splash.style.transition = "opacity 0.8s ease, filter 0.8s ease";
            this.splash.style.opacity = "0";
            this.splash.style.filter = "blur(10px)";
            
            // 2. IMPORTANT: Disable interaction so you can click the login gate through it
            this.splash.style.pointerEvents = "none";
        }

        if (this.loginGate) {
            this.loginGate.style.display = 'flex';
            this.loginGate.style.opacity = '0';
            // Ensure login gate is ready for clicks
            this.loginGate.style.pointerEvents = "auto";
            this.loginGate.style.zIndex = "30001"; // Put it above everything
        }

        setTimeout(() => {
            if (this.splash) {
                this.splash.style.display = 'none'; // Completely remove from layout
            }
            if (this.loginGate) {
                this.loginGate.style.transition = "opacity 0.5s ease";
                this.loginGate.style.opacity = '1';
            }
            // Execute the bridge callback for index.html if it exists
            if (typeof this.onCompleteCallback === 'function') {
                this.onCompleteCallback();
            }
        }, 800);
    }, 1500); // Short delay to let the user read the last log
    }
}
// BRIDGE
export function startBootSequence(onComplete) {
    const boot = new BootSequence();
    // Pass the onComplete callback to our terminate sequence
    boot.onCompleteCallback = onComplete; 
    boot.init();
}

