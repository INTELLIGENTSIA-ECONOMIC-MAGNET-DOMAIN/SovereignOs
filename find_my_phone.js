const noble = require('@abandonware/noble');

console.log("» SCANNING: Please unlock your phone and stay close...");

noble.on('stateChange', (state) => {
    if (state === 'poweredOn') noble.startScanning([], true);
});

noble.on('discover', (peripheral) => {
    // Look for the strongest signal (closest device)
    if (peripheral.rssi > -60) {
        console.log(`[FOUND] ID: ${peripheral.address} | RSSI: ${peripheral.rssi} | Name: ${peripheral.advertisement.localName || 'Unknown'}`);
    }
});