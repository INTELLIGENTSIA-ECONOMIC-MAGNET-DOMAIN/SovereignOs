export class InfoApp {
    constructor(container, bridge) {
        this.container = container;
        this.bridge = bridge;
    }

    async init() {
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="info-wrapper">
                <div class="info-sidebar">
                    <div class="info-brand">THEALCOHESION</div>
                    <nav class="info-nav">
                        <button class="i-tab active" data-target="mission">MISSION_VISION</button>
                        <button class="i-tab" data-target="constitution">CONSTITUTION</button>
                        <button class="i-tab" data-target="whitepaper">WHITEPAPER</button>
                        <button class="i-tab" data-target="formations">FORMATIONS</button>
                        <button class="i-tab" data-target="legal">TERMS_PRIVACY</button>
                        <button class="i-tab" data-target="docs">DOCUMENTS</button>
                    </nav>
                </div>
                
                <div class="info-content">
                    <section class="info-pane" id="mission">
                        <h2>SYSTEM_INTENT</h2>
                        <div class="manifesto-card">
                            <h3>MISSION</h3>
                            <p>To establish a sovereign digital layer that decouples human productivity from centralized exploitation through the Regional Resource Ledger (RRL).</p>
                        </div>
                        <div class="manifesto-card">
                            <h3>VISION</h3>
                            <p>A global network of autonomous nodes operating on proof-of-service and localized value exchange.</p>
                        </div>
                    </section>

                    <section class="info-pane hidden" id="constitution">
                        <h2>THE_SOVEREIGN_ARTICLES</h2>
                        <div class="article">
                            <span>ARTICLE 13.1 - SYNTHESIS</span>
                            <p>Every Archon has the right to local signing and manifest-first app synthesis without external oversight.</p>
                        </div>
                        <div class="article">
                            <span>ARTICLE 13.2 - DISTRIBUTION</span>
                            <p>The VPU App Center shall only distribute vetted capabilities that respect the ethics of consent and non-manipulation.</p>
                        </div>
                    </section>

                    <section class="info-pane hidden" id="whitepaper">
                        <h2>RRL_TECHNICAL_SPEC</h2>
                        <p>The Regional Resource Ledger utilizes a non-speculative tokenomics model based on units of service (Time-Weighted Utility).</p>
                        <ul>
                            <li><strong>Consensus:</strong> Proof-of-Service (PoS)</li>
                            <li><strong>Nodes:</strong> Central, Nairobi, Mombasa</li>
                            <li><strong>Encryption:</strong> AES-GCM (Session-Locked)</li>
                        </ul>
                    </section>

                    <section class="info-pane hidden" id="formations">
                        <h2>STRUCTURAL_HIERARCHY</h2>
                        <table class="info-table">
                            <tr><th>ROLE</th><th>CLEARANCE</th><th>PURPOSE</th></tr>
                            <tr><td>ARCHON</td><td>L10</td><td>System Governance</td></tr>
                            <tr><td>OFFICER</td><td>L5</td><td>Node Management</td></tr>
                            <tr><td>MEMBER</td><td>L1</td><td>Resource Exchange</td></tr>
                        </table>
                    </section>

                    <section class="info-pane hidden" id="legal">
                        <h2>LEGAL_PROTOCOLS</h2>
                        <h3>TERMS_OF_SERVICE</h3>
                        <p>By entering the Alcohesion VPU, you acknowledge that all data generated remains local to your node unless explicitly broadcasted. You own your telemetry.</p>
                        <h3>PRIVACY_POLICY</h3>
                        <p>Zero-Knowledge logging is enforced. The Kernel tracks RAM usage for stability, but never user intent or keystrokes.</p>
                    </section>

                    <section class="info-pane hidden" id="docs">
                        <h2>RESOURCE_ARCHIVE</h2>
                        <div class="doc-link">📄 RRL_Initial_Allotment_2025.pdf</div>
                        <div class="doc-link">📄 Investor_Handshake_Protocol.pdf</div>
                        <div class="doc-link">📄 Node_Deployment_Guide.pdf</div>
                    </section>
                </div>
            </div>
        `;
        this.onPostRender();
    }

    onPostRender() {
        const tabs = this.container.querySelectorAll('.i-tab');
        const panes = this.container.querySelectorAll('.info-pane');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                panes.forEach(p => p.classList.add('hidden'));

                tab.classList.add('active');
                const target = this.container.querySelector(`#${tab.dataset.target}`);
                if (target) target.classList.remove('hidden');
            });
        });
    }
}