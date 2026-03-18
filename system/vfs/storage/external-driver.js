export class PhysicalDiskDriver {
    constructor() {
        this.directoryHandle = null;
    }

    async mount(folderName = "VPU_ENCLAVE") {
        try {
            // This triggers the real Windows/Mac/Linux folder picker
            this.directoryHandle = await window.showDirectoryPicker({
                mode: 'readwrite'
            });
            console.log("HARDWARE: Physical Enclave Mounted.");
            return true;
        } catch (e) {
            console.error("HARDWARE_ERROR: User denied disk access.");
            return false;
        }
    }

    async write(fileName, blob) {
        const fileHandle = await this.directoryHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
    }
}