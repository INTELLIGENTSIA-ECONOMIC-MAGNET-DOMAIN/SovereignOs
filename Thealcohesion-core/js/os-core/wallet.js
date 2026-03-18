export const WalletApp = {
    id: "wallet",
    name: "SOVEREIGN_VAULT",
    icon: "🏦",
    render(kernel) {
        const ledger = kernel.ledger;
        const isAdmin = ['ADMIN', 'ARCHON', 'MEGA'].includes(kernel.user?.role);
        
        return `
            <div class="vault-wrapper">
                <div class="vault-header">
                    <div class="glitch-text" data-text="REGIONAL_LEDGER">REGIONAL_LEDGER</div>
                    <div class="node-info">
                        <span>NODE: ${kernel.user?.location || 'LOCAL'}</span>
                        <span class="pulse-dot"></span>
                    </div>
                </div>
no
                <div class="asset-grid">
                    ${Object.keys(ledger.balances).map(id => {
                        const meta = ledger.metadata[id];
                        const bal = ledger.balances[id];
                        return `
                            <div class="asset-card" style="--accent: ${meta.color}">
                                <div class="card-inner">
                                    <div class="asset-label">${meta.symbol} <small>${meta.label}</small></div>
                                    <div class="asset-value">${bal.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                    <div class="card-glow"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="vault-tabs">
                    <button class="v-tab active" data-target="mint-form">SERVICE_LOG</button>
                    <button class="v-tab" data-target="exchange-form">CROSS_NODE_SWAP</button>
                    <button class="v-tab" data-target="history-log">HISTORY</button>
                    ${isAdmin ? `<button class="v-tab admin-alert" data-target="admin-panel">ADMIN_CORE (${kernel.mintQueue.length})</button>` : ''}
                </div>

                <div class="tab-content" id="mint-form">
                    <div class="pane-ui">
                        <label>TARGET_BRANCH</label>
                        <select id="branch-select">
                            ${Object.keys(ledger.balances).map(id => `<option value="${id}">${ledger.metadata[id].label}</option>`).join('')}
                        </select>
                        <label>SERVICE_UNITS (HOURS)</label>
                        <input type="number" id="service-units" placeholder="0.00">
                        <label>REASON_FOR_MINT</label>
                        <input type="text" id="service-desc" placeholder="Describe your service...">
                        <button class="action-btn" id="submit-service">BROADCAST_REQUEST</button>
                    </div>
                </div>

                <div class="tab-content hidden" id="exchange-form">
                    <div class="pane-ui exchange-box">
                        <div class="swap-row">
                            <select id="swap-from">
                                ${Object.keys(ledger.balances).map(id => `<option value="${id}">${ledger.metadata[id].symbol}</option>`).join('')}
                            </select>
                            <span>➔</span>
                            <select id="swap-to">
                                ${Object.keys(ledger.balances).reverse().map(id => `<option value="${id}">${ledger.metadata[id].symbol}</option>`).join('')}
                            </select>
                        </div>
                        <label>AMOUNT_TO_CONVERT</label>
                        <input type="number" id="swap-amount" placeholder="0.00">
                        <div id="exchange-preview" class="preview-text">Rate: 1.0000</div>
                        <button class="action-btn swap-theme" id="execute-swap">EXECUTE_CONVERSION</button>
                    </div>
                </div>

                <div class="tab-content hidden" id="history-log">
                    <div class="ledger-history">
                        ${ledger.history.length === 0 ? '<div class="empty">NO_DATA_FOUND</div>' : 
                            ledger.history.map(entry => `
                                <div class="history-item">
                                    <div class="h-main">
                                        <span class="h-branch" style="color:${ledger.metadata[entry.branch]?.color}">${ledger.metadata[entry.branch]?.symbol}</span>
                                        <span class="h-desc">${entry.desc}</span>
                                    </div>
                                    <div class="h-side">
                                        <span class="h-amount">${entry.amount > 0 ? '+' : ''}${entry.amount.toFixed(2)}</span>
                                        <span class="h-date">${new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>

                ${isAdmin ? `
                <div class="tab-content hidden" id="admin-panel">
                    <div class="admin-queue">
                        ${kernel.mintQueue.length === 0 ? '<div class="empty">QUEUE_CLEAR</div>' : 
                            kernel.mintQueue.map(req => `
                                <div class="queue-card">
                                    <div class="q-header">
                                        <span>${req.requester}</span>
                                        <span class="q-amt">${req.amount} ${ledger.metadata[req.branch].symbol}</span>
                                    </div>
                                    <p>${req.desc}</p>
                                    <button class="approve-btn" data-id="${req.id}">AUTHORIZE_MINT</button>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    },

    onPostRender(kernel, win) {
        // --- TAB SWITCHING ---
        const tabs = win.querySelectorAll('.v-tab');
        tabs.forEach(t => t.addEventListener('click', () => {
            tabs.forEach(b => b.classList.remove('active'));
            t.classList.add('active');
            win.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            win.querySelector(`#${t.dataset.target}`).classList.remove('hidden');
        }));

        // --- EXCHANGE PREVIEW LOGIC ---
        const updateRate = () => {
            const from = win.querySelector('#swap-from').value;
            const to = win.querySelector('#swap-to').value;
            const rate = kernel.getExchangeRate(from, to);
            win.querySelector('#exchange-preview').textContent = `System Rate: 1 ${kernel.ledger.metadata[from].symbol} = ${rate.toFixed(4)} ${kernel.ledger.metadata[to].symbol}`;
        };
        win.querySelector('#swap-from').addEventListener('change', updateRate);
        win.querySelector('#swap-to').addEventListener('change', updateRate);

        // --- SUBMIT SERVICE ---
        win.querySelector('#submit-service').addEventListener('click', () => {
            const b = win.querySelector('#branch-select').value;
            const u = parseFloat(win.querySelector('#service-units').value);
            const d = win.querySelector('#service-desc').value;
            if (u > 0) {
                kernel.requestServiceMint(b, u, d);
                kernel.openApp('wallet');
            }
        });

        // --- EXECUTE SWAP ---
        win.querySelector('#execute-swap')?.addEventListener('click', () => {
            const from = win.querySelector('#swap-from').value;
            const to = win.querySelector('#swap-to').value;
            const amt = parseFloat(win.querySelector('#swap-amount').value);
            if (amt > 0 && kernel.executeExchange(from, to, amt)) {
                kernel.openApp('wallet');
            }
        });

        // --- ADMIN APPROVAL ---
        win.querySelectorAll('.approve-btn').forEach(btn => btn.addEventListener('click', () => {
            kernel.approveMint(btn.dataset.id);
            kernel.openApp('wallet');
        }));
    }
};