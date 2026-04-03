/**
 * view.js - THE VISUAL LAYER
 */
export class TerminalView {
    constructor(container, identity) {
        this.container = container;
        this.identity = identity;

                this.logo = `
                _   _  ____  _   _ 
        | | | ||  _ \\| | | |
        | | | || |_) | | | |
        | |/ / |  __/| |_| |
        |___/  |_|    \\.../ 

   ███████╗ ██████╗ ██╗   ██╗███████╗██████╗ ███████╗██╗ ██████╗ ███╗   ██╗
   ██╔════╝██╔═══██╗██║   ██║██╔════╝██╔══██╗██╔════╝██║██╔════╝ ████╗  ██║
   ███████╗██║   ██║██║   ██║█████╗  ██████╔╝█████╗  ██║██║  ███╗██╔██╗ ██║
   ╚════██║██║   ██║╚██╗ ██╔╝██╔══╝  ██╔══██╗██╔══╝  ██║██║   ██║██║╚██╗██║
   ███████║╚██████╔╝ ╚████╔╝ ███████╗██║  ██║███████╗██║╚██████╔╝██║ ╚████║
   ╚══════╝ ╚═════╝   ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝
   [ SOVEREIGN_VIRTUAL_PRAGMATIC_UNIVERSE // ADMINISTRATIVE_TERMINAL ]`;
    }

    renderBase(identity, appCount) {
        this.container.innerHTML = `
            <div id="vpu-terminal" style="background:#050505; color:#00ff41; font-family: 'Courier New', monospace; height:100%; display:flex; flex-direction:column; padding:15px; box-sizing:border-box; position: relative; overflow: hidden; text-shadow: 0 0 5px rgba(0, 255, 65, 0.4);">
                <canvas id="matrix-canvas" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:1; opacity:0; transition: opacity 2s ease; pointer-events:none;"></canvas>
                <div id="term-header" style="z-index: 5; margin-bottom: 20px; border-bottom: 1px solid rgba(0, 255, 65, 0.2); padding-bottom: 10px;">
                    <pre style="color:#a445ff; margin:0; font-size: 10px; line-height: 1.2;">${this.logo}</pre>
                    <div style="font-size: 12px; margin-top: 5px; opacity: 0.8;">
                        ENCLAVE: ${identity} | KEY: VERIFIED\nCORE: Sovereign v1.2.9 | APPS: ${appCount} | KERNEL: 1.0.2-theal
                    </div>
                </div>
                <div id="term-output" style="flex:1; overflow-y:auto; margin-bottom:10px; font-size:13px; line-height:1.5; white-space: pre-wrap; z-index: 5; position:relative;"></div>
                <div class="input-line" style="display:flex; align-items:center; gap:10px; z-index: 5; position:relative;">
                    <span style="color:#a445ff; font-weight:bold; white-space: nowrap;">admin@vpu:~$</span>
                    <input type="text" id="term-input" autocomplete="off" spellcheck="false" style="background:transparent; border:none; color:#fff; outline:none; flex:1; font-family: inherit; font-size: 13px;">
                </div>
                <div class="terminal-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.15) 50%); background-size: 100% 4px; pointer-events: none; z-index: 10; opacity: 0.3;"></div>
            </div>`;

        this.output = this.container.querySelector('#term-output');
        this.input = this.container.querySelector('#term-input');
        this.canvas = this.container.querySelector('#matrix-canvas');
    }

    print(text, color = '#00ff41') {
        const line = document.createElement('div');
        line.style.color = color;
        line.style.whiteSpace = 'pre-wrap';
        line.textContent = text;
        this.output.appendChild(line);
        this.output.scrollTop = this.output.scrollHeight;
    }

    async typeWrite(text, outputEl) {
        const line = document.createElement('div');
        (outputEl || this.output).appendChild(line);
        for (const char of text.split('')) {
            line.textContent += char;
            this.output.scrollTop = this.output.scrollHeight;
            await new Promise(r => setTimeout(r, 5));
        }
    }

    toggleMatrix(active) {
        this.canvas.style.opacity = active ? '0.25' : '0';
        if (active) this.runMatrix();
    }

    runMatrix() {
        const ctx = this.canvas.getContext('2d');
        const w = this.canvas.width = this.container.offsetWidth;
        const h = this.canvas.height = this.container.offsetHeight;
        const columns = Math.floor(w / 20) + 1;
        const ypos = Array(columns).fill(0);

        const matrix = () => {
            if (this.canvas.style.opacity === '0') return;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#0f0';
            ctx.font = '15pt monospace';
            ypos.forEach((y, i) => {
                ctx.fillText(String.fromCharCode(Math.random() * 128), i * 20, y);
                ypos[i] = y > 100 + Math.random() * 10000 ? 0 : y + 20;
            });
        };

        const interval = setInterval(() => {
            if (this.canvas.style.opacity === '0') return clearInterval(interval);
            matrix();
        }, 50);
    }
}
