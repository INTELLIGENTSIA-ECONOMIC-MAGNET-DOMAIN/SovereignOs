/**
 * uplink.session.js - SESSION CONTINUITY & UPLINK (Fixed)
 */
export class Uplink {
    constructor(kernel) {
        this.kernel = kernel;
        this.heartbeatInterval = null;
        
        // RECOVERY CONFIG: Enter your Bot Credentials here
        this.config = {
            botToken: '7959174332:AAH3y8iYyAyu9pz-ApuZrv9veIUrqTgzsjg', 
            chatId: '919324115' // Your Telegram Chat ID 
        };
    }

    /**
     * MULTI-CHANNEL UPLINK
     * Resolves: TypeError: this.uplink.sendTelegram is not a function
     */
    async sendTelegram(message) {
        try {
            const response = await fetch(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: this.config.chatId, 
                    text: message, 
                    parse_mode: 'HTML' 
                })
            });
            const result = await response.json();

                    if (!response.ok) {
                        // This will tell you EXACTLY why Telegram rejected it (e.g., "Bad Request: chat not found")
                        console.error("TELEGRAM_REJECTION:", result.description);
                        return false;
                    }

                    return true;
                } catch (e) {
                    console.error("UPLINK_NETWORK_FAULT:", e);
                    return false;
                }
            }

    /**
     * ESTABLISH UPLINK
     */
    async establish(sessionData) {
        console.log("UPLINK: Synchronizing Identity Context...");

        const session = {
            id: sessionData.identity,
            token: crypto.randomUUID(),
            timestamp: Date.now(),
            hwSig: sessionData.sig
        };

        // Bind session to Kernel
        this.kernel.sessionKey = sessionData.key;
        this.startHeartbeat();

        return session;
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.detectInterference()) {
                window.dispatchEvent(new CustomEvent('os:security_violation', { 
                    detail: { reason: "ENVIRONMENT_INTERFERENCE_DETECTED" } 
                }));
            }
        }, 5000);
    }

    detectInterference() {
        const threshold = 160; 
        return (window.outerWidth - window.innerWidth > threshold || 
                window.outerHeight - window.innerHeight > threshold);
    }
}