/**
 * THEALCOHESION NEURAL WALLPAPER (VPU LIFECYCLE + TEMPORAL HUD + ADVANCED PHYSICS)
 */
export class NeuralWallpaper {
    constructor(canvasId, kernel) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.kernel = kernel;
        this.temporal = kernel?.temporal || window.thealTimeApp || null;
        
        // 1. Neural Mesh State
        this.points = [];
        this.maxPoints = 80;
        this.baseConnectionDist = 150;

        // 2. VPU Lifecycle & Physics State
        this.bubbles = [];
        this.draggedBubble = null;
        this.mouse = { x: 0, y: 0, lastX: 0, lastY: 0, vx: 0, vy: 0 };
        
        // Ensure clean app layer
        this.appLayer = document.getElementById('app-layer') || this.createAppLayer();
        this.clearAppLayer(); 

        this.MAX_UPTIME = 300;
        this.MIN_SPEED = 0.8;
        this.isAnimating = false;

        this.init();
    }

    createAppLayer() {
        const layer = document.createElement('div');
        layer.id = 'app-layer';
        document.body.appendChild(layer);
        return layer;
    }

    clearAppLayer() {
        if (this.appLayer) this.appLayer.innerHTML = '';
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Mesh Points Initialization
        this.points = [];
        for (let i = 0; i < this.maxPoints; i++) {
            this.points.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5
            });
        }

        // VPU Bubbles (Integrated EPOS/Investor data placeholders)
        const apps = [
    { id:"terminal", name:"Terminal", icon:"📟", status:"KERNEL_LIVE" },
    { id:"wallet", name:"Wallet", icon:"💰", status:"14,200_EPX" },
    { id:"archives", name:"Archives", icon:"📜", status:"SECURE" },
    { id:"void", name:"Void", icon:"🌐", status:"CONNECTED" },
    { id:"security", name:"Security", icon:"🛡️", status:"LEVEL_7" },
    { id:"vfs", name:"VFS", icon:"🔒", status:"ENCRYPTED" }
    ];

        this.bubbles = apps.map(app => new Bubble(app, this));

        // Global Mouse Tracking
        window.addEventListener('mousemove', (e) => {
            this.mouse.vx = e.clientX - this.mouse.lastX;
            this.mouse.vy = e.clientY - this.mouse.lastY;
            this.mouse.x = e.clientX; 
            this.mouse.y = e.clientY;
            this.mouse.lastX = e.clientX; 
            this.mouse.lastY = e.clientY;
        });

        window.addEventListener('mouseup', () => {
            if (this.draggedBubble) {
                this.draggedBubble.isGrabbed = false;
                // Inherit mouse velocity on release
                this.draggedBubble.vx = this.mouse.vx * 0.4;
                this.draggedBubble.vy = this.mouse.vy * 0.4;
                this.draggedBubble = null;
            }
        });

        if (!this.isAnimating) {
            this.isAnimating = true;
            this.animate();
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    /**
     * Impulse-based Collision Resolution
     */
    resolveCollision(b1, b2) {
        const dx = (b2.x + b2.radius) - (b1.x + b1.radius);
        const dy = (b2.y + b2.radius) - (b1.y + b1.radius);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = b1.radius + b2.radius;

        if (dist < minDist) {
            const nx = dx / dist; 
            const ny = dy / dist;
            const overlap = minDist - dist;

            // Push apart
            if(!b1.isGrabbed) { b1.x -= nx * overlap / 2; b1.y -= ny * overlap / 2; }
            if(!b2.isGrabbed) { b2.x += nx * overlap / 2; b2.y += ny * overlap / 2; }

            // Bounce impulse
            const v1n = b1.vx * nx + b1.vy * ny;
            const v2n = b2.vx * nx + b2.vy * ny;
            const impulse = (2 * (v1n - v2n)) / (b1.mass + b2.mass);

            if(!b1.isGrabbed) { 
                b1.vx -= impulse * b2.mass * nx; 
                b1.vy -= impulse * b2.mass * ny; 
            }
            if(!b2.isGrabbed) { 
                b2.vx += impulse * b1.mass * nx; 
                b2.vy += impulse * b1.mass * ny; 
            }
        }
    }

    

    animate() {
        const now = new Date();
        const thealH = this.temporal.convertToThealHour(now.getHours()); 
        const arcProgress = (thealH - 1 + (now.getMinutes() / 60) + (now.getSeconds() / 3600)) / 11;
        const isReturning = (now.getHours() >= 19 || now.getHours() < 7);
        const peakHeight = this.canvas.height * 0.75;

        let tx = isReturning ? this.canvas.width - (arcProgress * this.canvas.width) : arcProgress * this.canvas.width;
        let ty = this.canvas.height - (Math.sin(Math.PI * arcProgress) * peakHeight + 150);
        const tSize = 100 + ((now.getMinutes() * 60 + now.getSeconds()) / 3600) * 120;

        // 1. Clear & Background
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#000'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const loadFactor = this.kernel ? (this.kernel.currentMemory / this.kernel.maxMemory) : 0.1;
        const thealDate = this.temporal.getThealDate(now);
        let cycleColor = (thealDate.type === "holiday") ? "#00d4ff" : (thealDate.type === "milestone" ? "#ffd700" : "#a445ff");

        // 2. Torch Beam
        const beamGrad = this.ctx.createRadialGradient(this.canvas.width/2, this.canvas.height, 0, tx, ty, this.canvas.height);
        beamGrad.addColorStop(0, `${cycleColor}33`);
        beamGrad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = beamGrad;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width/2, this.canvas.height);
        this.ctx.lineTo(tx - tSize, ty);
        this.ctx.lineTo(tx + tSize, ty);
        this.ctx.fill();

        // 3. Neural Mesh
        this.points.forEach((p, i) => {
            p.x += p.vx * (1 + loadFactor * 5);
            p.y += p.vy * (1 + loadFactor * 5);
            if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
            this.ctx.fillStyle = loadFactor > 0.7 ? '#ff4444' : cycleColor; 
            this.ctx.fill();

            for (let j = i + 1; j < this.points.length; j++) {
                const dist = Math.hypot(p.x - this.points[j].x, p.y - this.points[j].y);
                if (dist < this.baseConnectionDist) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.x, p.y);
                    this.ctx.lineTo(this.points[j].x, this.points[j].y);
                    this.ctx.strokeStyle = `rgba(164, 69, 255, ${(1 - dist/this.baseConnectionDist) * 0.2})`;
                    this.ctx.stroke();
                }
            }
        });

        // 4. Update Bubbles & Collisions
        for (let i = 0; i < this.bubbles.length; i++) {
            this.bubbles[i].update();
            for (let j = i + 1; j < this.bubbles.length; j++) {
                this.resolveCollision(this.bubbles[i], this.bubbles[j]);
            }
        }

        // 5. HUD elements
        this.drawTemporalBubble(tx, ty, tSize, thealDate, this.temporal.getTemporalMetrics(now), now);
        this.drawObserver();

        requestAnimationFrame(() => this.animate());
    }

    drawTemporalBubble(x, y, size, theal, metrics, now) {
    const ctx = this.ctx;
    const isHoliday = theal.type === "holiday";
    const isMilestone = theal.type === "milestone";
    const loadFactor = this.kernel ? (this.kernel.currentMemory / this.kernel.maxMemory) : 0.1;
    
    // 1. Dynamic Sovereign Palette
    let color = isHoliday ? "#00d4ff" : (isMilestone ? "#ffd700" : "#a445ff");
    if (loadFactor > 0.8) color = "#ff4444"; // Stress overrides everything

    const rotation = (now.getSeconds() + now.getMilliseconds() / 1000) * (Math.PI / 30);
    const pulse = isHoliday ? 1 + Math.sin(Date.now() / 400) * 0.15 : 1 + Math.sin(Date.now() / 1000) * 0.05;

    ctx.save();
    ctx.translate(x, y);

    // 2. THE OUTER HULL (Restored Static Border)
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.15, 0, Math.PI * 2);
    ctx.strokeStyle = `${color}33`; // Faint constant border
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3. THE PROGRESS ARC (Minute Tracking)
    const progress = (now.getMinutes() * 60 + now.getSeconds()) / 3600;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.15, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * progress));
    ctx.strokeStyle = color; // Solid active border
    ctx.lineWidth = 3;
    ctx.stroke();

    // 4. THE MECHANICAL CORE (Spinning Data Ticks)
    ctx.save();
    ctx.rotate(rotation);
    for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(size * 0.85, 0);
        ctx.lineTo(size * 1.0, 0);
        ctx.strokeStyle = `${color}aa`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    ctx.restore();

    // 5. CORE GLOW & GEOMETRY (Diamond vs Circle)
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * pulse);
    grad.addColorStop(0, `${color}55`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    
    ctx.beginPath();
    if (isHoliday) {
        ctx.rotate(rotation * 0.5);
        ctx.rect(-size/1.5, -size/1.5, size*1.3, size*1.3);
        ctx.rotate(-rotation * 0.5);
    } else {
        ctx.arc(0, 0, size, 0, Math.PI * 2);
    }
    ctx.fill();

    // 6. SOVEREIGN DATA STACK (Text)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const h = this.temporal.convertToThealHour(now.getHours()).toString().padStart(2,"0");
    const m = now.getMinutes().toString().padStart(2,"0");
    const s = now.getSeconds().toString().padStart(2,"0");
    
    ctx.font = `900 ${size * 0.28}px 'Ubuntu', monospace`;
    ctx.fillStyle = '#fff';
    ctx.fillText(`${h}:${m}:${s}`, 0, -10);

    ctx.font = `bold ${size * 0.09}px 'Ubuntu'`;
    ctx.fillStyle = color;
    ctx.letterSpacing = "2px";
    const label = isHoliday ? `CELEBRATION: ${theal.label.toUpperCase()}` : (loadFactor > 0.8 ? "SYSTEM_STRESS" : theal.label.toUpperCase());
    ctx.fillText(label, 0, 25);

    // VPU Load Metrics
    ctx.font = "700 7px monospace";
    ctx.fillStyle = `${color}aa`;
    ctx.fillText(`VPU_LOAD: ${(loadFactor * 100).toFixed(1)}%`, 0, 42);

    ctx.restore();
}

    drawObserver() {
        if (!this.kernel || !this.kernel.iconCoordinateMap) return;
        this.kernel.iconCoordinateMap.forEach((pos) => {
            const dist = Math.hypot(this.mouse.x - pos.x, this.mouse.y - pos.y);
            if (dist < 250) {
                this.ctx.beginPath();
                this.ctx.moveTo(this.mouse.x, this.mouse.y);
                this.ctx.lineTo(pos.x, pos.y);
                this.ctx.strokeStyle = pos.color === 'gold' ? 'rgba(255,215,0,0.3)' : 'rgba(0,255,65,0.15)';
                this.ctx.lineWidth = pos.color === 'gold' ? 1.5 : 0.5;
                this.ctx.stroke();
            }
        });
    }
}

/**
 * Bubble Class: Combined UI and Physics Lifecycle
 */
class Bubble {
    constructor(app, parent) {
        this.parent = parent; // Set parent FIRST
        this.app = app;
        this.type = this.determineType(); 
        
        this.baseRadius = 75;
        this.radius = this.baseRadius;
        this.size = this.radius * 2;
        this.x = Math.random() * (window.innerWidth - (this.baseRadius * 2));
        this.y = Math.random() * (window.innerHeight - (this.baseRadius * 2));
        this.vx = (Math.random() - 0.5) * 1.6;
        this.vy = (Math.random() - 0.5) * 1.6;
        this.mass = this.radius;
        
        this.isGrabbed = false;
        this.isHovered = false;
        this.isDead = false;
        this.spawnTime = Date.now();
        this.pauseOffset = 0;
        this.currentColor = '#a855f7';

        this.el = document.createElement('div');
        this.el.className = 'app-bubble';
        this.el.innerHTML = `
            <div class="shine"></div>
            <div class="scan-bar"></div>
            <div class="app-icon">${app.icon}</div>
            <div class="app-name">${app.name}</div>
            <div class="app-status">${app.status}</div>
            <div class="uptime-display">UP: 0s</div>
        `;
        this.parent.appLayer.appendChild(this.el);

        this.el.addEventListener('mousedown', () => {
            this.isGrabbed = true;
            this.parent.draggedBubble = this;
            this.vx = 0; this.vy = 0;
        });
        
        this.el.addEventListener('mouseenter', () => this.isHovered = true);
        this.el.addEventListener('mouseleave', () => this.isHovered = false);

        this.statusEl = this.el.querySelector('.app-status');
        this.uptimeEl = this.el.querySelector('.uptime-display');
        this.scannerEl = this.el.querySelector('.scan-bar');
    }

    determineType() {
        if (!this.parent.kernel) return 'STATIC';
        if (this.parent.kernel.favorites?.has(this.app.id)) return 'FAVORITE';
        if (this.parent.kernel.runningApps?.has(this.app.id)) return 'ACTIVE';
        return 'STATIC';
    }


    update() {
        if (this.isDead) return;
        // NEW LOGIC: Only 'ACTIVE' apps age. 
        // Favorites and Most Used apps are temporally locked.
        if (this.type === 'ACTIVE' && !this.isHovered) {
            const uptime = Math.floor((Date.now() - this.spawnTime - this.pauseOffset) / 1000);
            
            // Aging effect: physical growth and color evolution
            this.radius = this.baseRadius + (uptime * 0.12);
            
            if (uptime <= 100) this.currentColor = '#a855f7'; // New
            else if (uptime <= 200) this.currentColor = '#00ff41'; // Mature
            else this.currentColor = '#ff4444'; // Critical

            if (uptime >= this.parent.MAX_UPTIME) { this.terminate(); return; }
        } else {
            // FAVORITES / MOST USED: Remain Purple or Gold, do not grow.
            this.radius = this.baseRadius;
            this.currentColor = (this.type === 'FAVORITE') ? '#ffcc33' : '#a855f7';
            this.uptimeEl.textContent = `${this.type}`;
        }

        //physics and visual updates
        if (!this.isHovered) {
            // NORMAL STATE: Lifecycle grows the bubble
            const uptime = Math.floor((Date.now() - this.spawnTime - this.pauseOffset) / 1000);
            
            this.radius = this.baseRadius + (uptime * 0.12);
            this.size = this.radius * 2;
            this.mass = this.radius;
            
            this.uptimeEl.textContent = `UP: ${uptime}s`;
            this.statusEl.textContent = this.app.status;
            this.statusEl.style.color = 'var(--mtaa-green)';

            // Lifecycle Color Stages
            if (uptime <= 100) this.currentColor = '#a855f7';
            else if (uptime <= 200) this.currentColor = '#00ff41';
            else this.currentColor = '#ff4444';

            this.el.style.boxShadow = `0 0 15px ${this.currentColor}33, inset 0 0 15px rgba(255,255,255,0.05)`;
            this.scannerEl.style.background = `linear-gradient(90deg, transparent, ${this.currentColor}, transparent)`;

            if (uptime >= this.parent.MAX_UPTIME) { this.terminate(); return; }
        } else {
            // HOVER STATE: Scanning behavior
            this.vx *= 0.7; 
            this.vy *= 0.7;
            this.pauseOffset += 16.6; // Freeze lifecycle clock (approx 60fps)
            
            this.statusEl.textContent = `HLTH: ${Math.floor(95+Math.random()*5)}% // SCAN_ACTIVE`;
            this.statusEl.style.color = 'white';
            
            const uptime = Math.floor((Date.now() - this.spawnTime - this.pauseOffset) / 1000);
            this.uptimeEl.textContent = `TTL: ${this.parent.MAX_UPTIME - uptime}s`;
            
            this.el.style.boxShadow = `0 0 25px ${this.currentColor}66, inset 0 0 15px rgba(255,255,255,0.1)`;
        }

        if (this.isGrabbed) {
            this.x = this.parent.mouse.x - this.radius;
            this.y = this.parent.mouse.y - this.radius;
        } else {
            // "Flee from Mouse" Logic (only when not hovered/grabbed)
            if (!this.isHovered) {
                const dx = (this.x + this.radius) - this.parent.mouse.x;
                const dy = (this.y + this.radius) - this.parent.mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.radius + 80) {
                    this.vx += dx * 0.002;
                    this.vy += dy * 0.002;
                }
            }

            // Wall Collisions
            if (this.x <= 0) { this.x = 0; this.vx *= -0.8; }
            if (this.x + this.size >= window.innerWidth) { this.x = window.innerWidth - this.size; this.vx *= -0.8; }
            if (this.y <= 0) { this.y = 0; this.vy *= -0.8; }
            if (this.y + this.size >= window.innerHeight) { this.y = window.innerHeight - this.size; this.vy *= -0.8; }

            // Speed Normalization
            let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed < this.parent.MIN_SPEED && !this.isHovered) { this.vx *= 1.05; this.vy *= 1.05; }
            if (speed > 3.5) { this.vx *= 0.95; this.vy *= 0.95; }

            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.998;
            this.vy *= 0.998;
        }

        // Apply visual updates
        this.el.style.width = this.size + 'px';
        this.el.style.height = this.size + 'px';
        this.el.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;

        if (this.isHovered || this.isGrabbed) this.drawTether();
    }

    drawTether() {
        const ctx = this.parent.ctx;
        ctx.beginPath();
        ctx.moveTo(this.parent.mouse.x, this.parent.mouse.y);
        ctx.lineTo(this.x + this.radius, this.y + this.radius);
        ctx.strokeStyle = this.currentColor;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1.0;
    }

    terminate() {
        this.isDead = true;
        this.el.style.transition = "opacity 0.6s, transform 0.6s, filter 0.6s";
        this.el.style.opacity = "0";
        this.el.style.filter = "blur(10px)";
        this.el.style.transform += " scale(0.1)";
        setTimeout(() => {
            this.el.remove();
            this.parent.bubbles = this.parent.bubbles.filter(b => b !== this);
        }, 600);
    }
}