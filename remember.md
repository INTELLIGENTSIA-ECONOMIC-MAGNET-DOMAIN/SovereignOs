//add this guard clause: to prevent locked member from loging in
login(uid) {
    const user = MEMBER_LIST.find(m => m.security.uid === uid);
    if (user && user.isFrozen) {
        throw new Error("IDENTITY_LOCKED: Your account has been frozen.");
    }
    // Proceed with login...
}

--------------------------------------------------------------


Decision Tree & Outcomes on landing.html

Following the "handshake" with the vpu-bridge.js, the system makes one of four critical decisions:
Outcome	Trigger Condition	System Action
IDENTITY_REVOKED	revoked flag is TRUE in the database.	Panic Triggered: Red HUD overlay appears, an audible alarm plays, and triggerRealPanic is executed to lock the VPU.
PROVISIONED	enclave_attested is TRUE and a user_name is linked.	Bypass Ingress: The sniffer recognizes the machine as a trusted device and automatically redirects to the main OS kernel (index.html).
ARCH_LOCKED	The machine's OS matches an existing bound architecture for that identity.	Access Denied: Prevents "Architecture Duplication" where one identity tries to claim multiple machines of the same OS type.
INITIAL_PROVISION	No record found in the database.	Auto-Registration: The bridge logs the hardware hash as a "CANDIDATE" and admits the user to the provisioning terminal (download.html).
Security Observations

    Forensic Buffer: The sniffer uses artificial delays (e.g., 800ms for "ISOLATING_HARDWARE_SIG") to ensure the user perceives the depth of the security check.

    Bridge Resiliency: If the bridge is offline, the sniffer catches the fetch error and displays "BRIDGE_OFFLINE" rather than crashing the frontend.

    Silent Enrollment: If a machine is unknown, it is silently inserted into the security_device table with enclave_attested = FALSE, allowing administrators to review new candidates.





Technical Breakdown of the Gates
1. The Sniffer Decision (landing.js & vpu-bridge.js)

    The sniffer captures a hardware fingerprint using generateLocalFingerprint() and sends it to the bridge.

    The bridge queries the security_device table (linked to the person table via person_id).

    If the user is found but marked as is_frozen in the person table, the sniffer rejects the probe entirely.

2. The Approval Loop (waiting-approval.html)

    While on this page, the frontend polls the /api/spacs/check-status endpoint.

    The bridge checks the identity_state for the person bound to that hardware.

    If the state is 'ACTIVE' or 'verified', the bridge returns status: 'APPROVED', triggering the jump to /complete-profile.html.

3. The Provisioning Handshake (complete-profile.html)

    This is the "Final Sync" gate.

    Once bio-data and a password hash are saved to the person and person_security tables, the provision_stage is updated to 'COMPLETE'.

    This transition allows the Sniffer to finally authorize entry to /Thealcohesion-core/index.html.

4. Security Enforcement (vpu-bridge.js)

    If the bound_machine_id in the person table does not match the machineFingerprint sent during login, the system increments failed_attempts.

    After 3 failed hardware matches, the is_frozen flag is set to TRUE, locking the identity out of all target URLs.


UPDATE person 
SET 
    membership_no = 'EPOS-2025-01226', 
    license_key = 'SOV-AUDI-GENESIS-2025-1226-XX'
WHERE official_name = 'Michael Audi';


NEW SNIFER LOGIC

1 CREATE GHOST: Whenever 
fingerprint_hash not binded to any user, create ghost and bind it to Ghost 
insert into person: Official_name = PROSPECT_RESERVED
change;
registration_state= INITIAL
identity-state = PROSPECT
Provisioning-status = PENDING


2 TO FORM A: Whenever 
official mame = PROSPECT_RESERVED
fingerprint-Current fingerprint 
registration = INITIAL
identity-state = PROSPECT
Provisioning-status = PENDING
on submiting interests;
Change/insert official_name, email, Rountry, phone + phone code,declaration_of_intent,
Change: 
registration = PENDING
identity-state = UNVERIFIED
Provisioning_Status= UNPROVISIONED

3)GO To FORM B; whenever
Membership_NO and License-Key is not empty
registration = PENDING 
Identity-state = UNVERIFIED 
Provisioning-status = UNPROVISIONED

on submiting Provision button! 
Change ;
registration=PRECOMPLETE
Provisioning status = PROVISIONED
identity-state = PREVERIFIED

4) GO TO WAITING! Whenever
registadion=PENDING 
identity-state = UNVERIFIED
Provisioning status = UNPROVISIONED 
membership-no and lisence-Key is empty

5) Go to Complete-profile whenever
registration = PRECOMPLETE 
Provisioning=PROVISIONED
identity state = PREVERIFIED
on submeting;
insert: Password harsh, Avatar, D.D.B, Gender, user name,Bio
Change
registration = COMPLETE 
identity-state = VERIFIED 
Provisioning = PROVISIONED

6) GO OS-CORE : Whenever: 
Registration = COMPLETE
identity-state= VERIFIED 
Provisioning = PROVISIONED
Pasword_harsh and user_name is not empty
Go to OS CORE

CLAIM BIRTHDAY FRONT END REMEBEDR TO IMPLEMENT IT
// Example Frontend Call
const claimBirthright = async (code) => {
    const response = await fetch('/api/vpu/allotment/claim', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${kernel.sessionKey}`,
            'X-Machine-ID': kernel.hwSig
        },
        body: JSON.stringify({ allotmentCode: code })
    });
    
    const result = await response.json();
    if (result.success) {
        alert("Storage Quota Updated: +100MB");
    }
};