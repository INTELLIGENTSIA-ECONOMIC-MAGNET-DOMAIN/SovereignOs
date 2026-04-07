/**
 * vfs-manager.js
 * Central filesystem interface
 */

import { MountManager } from "./mount-manager.js";
import { resolvePath } from "./path-resolver.js";
import { PermissionLayer } from "./permission-layer.js";

export class VFSManager {

    constructor(kernel) {
        this.kernel = kernel;
        this.mounts = new MountManager();
        this.permissions = new PermissionLayer(this);
        this.activeUser = null; // Track the active user for permission checks
    }

    setActiveUser(userId) {
        console.log(`[VFS]: Security context shifted to: ${userId}`);
        this.activeUser = userId;
    }

    mount(path, driver) {
        this.mounts.mount(path, driver);
    }

    unmount(path) {
        this.permissions.checkWrite(path);
        this.mounts.unmount(path);
    }

    async read(path) {
        this.permissions.checkRead(path);
        const { driver, subpath } = resolvePath(path, this.mounts);
        return driver.read(subpath);
    }

    async write(path, data) {
        this.permissions.checkWrite(path, this.activeUser);
        const { driver, subpath } = resolvePath(path, this.mounts);
        return driver.write(subpath, data);
    }

    async delete(path) {
        this.permissions.checkWrite(path, this.activeUser);
        const { driver, subpath } = resolvePath(path, this.mounts);
        return driver.delete(subpath);
    }

    async list(path) {
        this.permissions.checkRead(path, this.activeUser);
        const { driver, subpath } = resolvePath(path, this.mounts);
        return driver.list(subpath);
    }

    async exists(path) {
        try {
            this.permissions.checkRead(path, this.activeUser);
            const { driver, subpath } = resolvePath(path, this.mounts);
            return await driver.exists(subpath);
        } catch (e) {
            return false;
        }
    }

 /**
 * vfs-manager.js - PERSISTENCE EXTENSION
 * Adds IndexedDB support to "remember" the Physical Enclave folder.
 */

// 1. Add these methods to your VFSManager class
async openRegistry() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("VPU_SYSTEM_REGISTRY", 1);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("handles")) {
                db.createObjectStore("handles");
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("REGISTRY_FAULT: Could not open IndexedDB.");
    });
}

/**
 * Saves the Physical Folder Handle (USB) so it can be re-accessed later.
 */
async saveEnclaveHandle(handle) {
    const db = await this.openRegistry();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("handles", "readwrite");
        const store = tx.objectStore("handles");
        const request = store.put(handle, "enclave_root");
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(false);
    });
}

/**
 * Retrieves the stored Folder Handle.
 */
async getEnclaveHandle() {
    const db = await this.openRegistry();
    return new Promise((resolve) => {
        const tx = db.transaction("handles", "readonly");
        const store = tx.objectStore("handles");
        const request = store.get("enclave_root");
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
    });
}   
}

