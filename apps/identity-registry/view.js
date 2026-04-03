/**
 * view.js - Identity Registry Visual Layer
 */
export class IdentityView {
    constructor(container) {
        this.container = container;
    }

    renderBase(title = 'Identity Registry') {
        this.container.innerHTML = `
            <section style="font-family:monospace; color:#00ff41; background:#0b0b0b; padding:20px;"> 
                <h1 style="margin:0 0 10px 0; color:#a445ff;">${title}</h1>
                <div id="identity-content">Loading...</div>
            </section>
        `;
    }

    setContent(html) {
        const container = this.container.querySelector('#identity-content');
        if (container) container.innerHTML = html;
    }
}
