require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
// Entry point at login for VPU Access Verification
const bcrypt = require('bcryptjs');

const app = express();
app.use(helmet());
app.disable('x-powered-by');
app.use(cors()); // Allows the OS Frontend to talk to this Backend
app.use(express.json({ limit: '2mb' })); 
app.use(express.urlencoded({ limit: '2mb', extended: true }));

const rateLimit = require('express-rate-limit');

// 1. THE CITY WALL: Global limiter (Prevents server exhaustion)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { error: "VPU_TRAFFIC_OVERLOAD: Access throttled for 15 mins." },
    standardHeaders: true, 
    legacyHeaders: false,
});

// 2. THE VAULT DOOR: Strict Login Limiter (Prevents Brute-Force)
const loginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 5, // Only 5 attempts per hour
    message: { error: "SECURITY_LOCKOUT: Too many failed identity syncs. Try again in 1 hour." },
    // Only count failed attempts? You can add logic for that, 
    // but for "Sovereign" security, it's safer to limit all hits to this endpoint.
});

// Add this log to verify the bridge sees the password during startup
console.log(`[SYS] Initializing Bridge for User: ${process.env.DB_USER}`);
if (!process.env.DB_PASSWORD) {
    console.error("[CRITICAL] DB_PASSWORD is not defined in .env!");
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'thealcohesion_vpu',
  password: String(process.env.DB_PASSWORD), // Force string type
  port: process.env.DB_PORT || 5432,
});

// Diagnostic check on startup
console.log(`[UPLINK] Attempting connection to ${process.env.DB_NAME} as ${process.env.DB_USER}...`);
pool.query('SELECT NOW()', (err) => {
    if (err) {
        console.error("!!! DATABASE_CONNECTION_FAILED:", err.message);
    } else {
        console.log(">>> DATABASE_LINK_ESTABLISHED: OK");
    }
});

// API Endpoint for the OS Kernel to fetch global status
app.get('/api/vpu/status', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM person');
        res.json({ total_members: result.rows[0].count, status: 'ONLINE' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API endpoint for registry members
app.get('/api/vpu/registry/members', async (req, res) => {
  try {
    const query = req.query.q;
    let sql;
    let params = [];

    if (query) {
      sql = `
        SELECT
          p.id,
          p.user_name,
          p.official_name,
          p.sovereign_name,
          p.gender,
          p.country,
          p.membership_no,
          p.bound_machine_id,
          p.identity_state,
          p.registration_state,
          p.is_frozen,
          r.name as rank_name,
          r.code as rank_code,
          ms.code as membership_status,
          mc.name as membership_category,
          pm.start_date,
          pm.end_date,
          array_agg(rec.code) as special_recognitions,
          pm_profile.url as profile_avatar
        FROM person p
        LEFT JOIN person_rank pr ON p.id = pr.person_id
        LEFT JOIN rank r ON pr.rank_id = r.id
        LEFT JOIN person_membership pm ON p.id = pm.person_id
        LEFT JOIN membership_status ms ON pm.membership_status_id = ms.id
        LEFT JOIN membership_category mc ON pm.membership_category_id = mc.id
        LEFT JOIN person_recognition prec ON p.id = prec.person_id
        LEFT JOIN recognition rec ON prec.recognition_id = rec.id
        LEFT JOIN person_media pm_profile ON p.id = pm_profile.person_id AND pm_profile.media_type = 'profile'
        WHERE p.sovereign_name ILIKE $1 OR p.user_name ILIKE $1 OR p.country ILIKE $1 OR p.official_name ILIKE $1
        GROUP BY p.id, p.user_name, p.official_name, p.sovereign_name, p.gender, p.country, p.membership_no, p.bound_machine_id, p.identity_state, p.registration_state, p.is_frozen, r.name, r.code, ms.code, mc.name, pm.start_date, pm.end_date, pm_profile.url
        ORDER BY p.created_at DESC
      `;
      params = [`%${query}%`];
    } else {
      sql = `
        SELECT
          p.id,
          p.user_name,
          p.official_name,
          p.sovereign_name,
          p.gender,
          p.country,
          p.membership_no,
          p.bound_machine_id,
          p.identity_state,
          p.registration_state,
          p.is_frozen,
          r.name as rank_name,
          r.code as rank_code,
          ms.code as membership_status,
          mc.name as membership_category,
          pm.start_date,
          pm.end_date,
          array_agg(rec.code) as special_recognitions,
          pm_profile.url as profile_avatar
        FROM person p
        LEFT JOIN person_rank pr ON p.id = pr.person_id
        LEFT JOIN rank r ON pr.rank_id = r.id
        LEFT JOIN person_membership pm ON p.id = pm.person_id
        LEFT JOIN membership_status ms ON pm.membership_status_id = ms.id
        LEFT JOIN membership_category mc ON pm.membership_category_id = mc.id
        LEFT JOIN person_recognition prec ON p.id = prec.person_id
        LEFT JOIN recognition rec ON prec.recognition_id = rec.id
        LEFT JOIN person_media pm_profile ON p.id = pm_profile.person_id AND pm_profile.media_type = 'profile'
        GROUP BY p.id, p.user_name, p.official_name, p.sovereign_name, p.gender, p.country, p.membership_no, p.bound_machine_id, p.identity_state, p.registration_state, p.is_frozen, r.name, r.code, ms.code, mc.name, pm.start_date, pm.end_date, pm_profile.url
        ORDER BY p.created_at DESC
      `;
    }

    const result = await pool.query(sql, params);

    // Transform to match the expected format
    const members = result.rows.map(row => ({
      officialName: row.official_name,
      sovereignName: row.sovereign_name || row.user_name,
      userName: row.user_name,
      gender: row.gender,
      country: row.country,
      membershipNo: row.membership_no,
      boundMachineId: row.bound_machine_id,
      profileAvatar: row.profile_avatar,
      identityState: row.identity_state,
      registrationState: row.registration_state,
      isFrozen: row.is_frozen,
      rank: {
        name: row.rank_name,
        code: row.rank_code
      },
      membership: {
        status: row.membership_status,
        category: row.membership_category,
        startDate: row.start_date,
        endDate: row.end_date
      },
      security: {
        uid: row.id
      },
      specialRecognition: row.special_recognitions ? row.special_recognitions.filter(r => r !== null) : []
    }));

    res.json(members);
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).json({ error: err.message });
  }
});



// ---VPU LOGIN (Identity Binding) ---
app.post('/api/vpu/login', loginLimiter, async (req, res) => {
    const username = (req.body.username || req.body.id || "").trim(); 
    const owner_number = (req.body.owner_number || "").trim();
    const password = req.body.password || req.body.pass;
    const machineFingerprint = req.body.machineFingerprint || req.body.hwSig;
    const enclave_sig = req.body.enclave_sig; // <--- THE NEW VECTOR
    const ipAddress = req.body.ipAddress || req.ip || "127.0.0.1";
    // VALIDATION: Ensure required fields are present
    if (!username || !owner_number) {
        return res.status(400).json({ success: false, message: "EMPTY_IDENTITY_VECTOR" });
    }

    try {
        // THE TRIPLE LOCK QUERY
        // Checks: 1. Username/Membership | 2. Linked Owner Number | 3. Existing Enclave Signature
        const result = await pool.query(`
            SELECT 
                p.id, p.user_name, p.password_hash, p.is_frozen,
                p.bound_machine_id, p.membership_no,
                ps.enclave_public_key 
            FROM person p 
            LEFT JOIN person_security ps ON p.id = ps.person_id 
            WHERE p.user_name ILIKE $1  -- $1 is the Username from the input
            AND p.membership_no ILIKE $2 -- $2 is the Owner Number from the .bin manifest
        `, [username, owner_number]);

        if (result.rows.length === 0) {
            // Log exactly what failed for your debugging
            console.error(`[AUTH_BLOCK] No DB match for User:${username} | Owner:${owner_number} | Sig:${enclave_sig?.substring(0,10)}...`);
            
            return res.status(401).json({ 
                success: false, 
                message: "IDENTITY_MISMATCH: Credential/Media/Signature alignment failed." 
            });
        }

        const person = result.rows[0];

        // 1. CHECK IF FROZEN
        if (person.is_frozen) {
            return res.json({ success: false, message: "ACCOUNT_FROZEN" });
        }

        // 2. PASSWORD CHECK
        const validPassword = await bcrypt.compare(password, person.password_hash);
        if (!validPassword) {
            console.error(`[AUTH_FAIL] Password mismatch for ${username}`);
            return res.json({ success: false, message: "INVALID_CREDENTIALS" });
        }
        // 3. SOVEREIGN ENCLAVE BINDING (If the signature doesn't match, we update it. This allows users to switch devices but still have the enclave bound to their identity.)
        // If password is correct, we "Trust and Seal" the signature provided.
        if (!person.enclave_public_key && enclave_sig) {
            await pool.query(`
                INSERT INTO person_security (person_id, enclave_public_key, root_identity_hash)
                VALUES ($1, $2, $3)
                ON CONFLICT (person_id) DO UPDATE SET enclave_public_key = $2
            `, [person.id, enclave_sig, '0x_GENESIS_ROOT']);
            console.log(`>>> SOVEREIGN_ENCLAVE_BOUND for ${username}`);
        }

        // 3a. VALIDATE KEY: If DB ALREADY has a key, it MUST match the .crt file
        if (person.enclave_public_key && person.enclave_public_key !== enclave_sig) {
        return res.status(403).json({ error: "ENCLAVE_MISMATCH" });
        }

        // 3. GENESIS BINDING
        if (!person.bound_machine_id || !person.root_identity_hash) {
            await pool.query('BEGIN');
            
            // Update Machine Binding
            await pool.query(
                'UPDATE person SET bound_machine_id = $1, bound_ip_address = $2, binding_date = NOW() WHERE id = $3',
                [machineFingerprint, ipAddress, person.id]
            );

            // Update Sovereign Enclave Binding
            if (enclave_sig) {
                await pool.query(
                    'UPDATE person_security SET enclave_public_key = $1, failed_login_attempts = 0 WHERE person_id = $2',
                    [enclave_sig, person.id]
                );
                console.log(`>>> SOVEREIGN_ENCLAVE_BOUND for ${username}`);
            }

            await pool.query('COMMIT');
        }
        // 4. HARDWARE ENFORCEMENT
        else if (person.bound_machine_id !== machineFingerprint) {
            const newAttempts = (person.failed_attempts || 0) + 1;
            if (newAttempts >= 3) {
                await pool.query('UPDATE person SET is_frozen = TRUE, failed_attempts = $1 WHERE user_name ILIKE $2', [newAttempts, username]);
                return res.json({ success: false, message: "ACCOUNT_FROZEN" });
            } else {
                await pool.query('UPDATE person SET failed_attempts = $1 WHERE user_name ILIKE $2', [newAttempts, username]);
                return res.json({ success: false, message: "HARDWARE_ID_REJECTED" });
            }
        }

        // 5. PREPARE PASSPORT (JWT)
        // We only get here if password and hardware match
        await pool.query('UPDATE person SET failed_attempts = 0 WHERE user_name ILIKE $1', [username]);

        const token = jwt.sign(
            { id: person.id, username: person.user_name, state: person.identity_state },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        console.log(`>>> ACCESS GRANTED: ${username} [Passport Issued]`);

        return res.json({ 
            success: true, 
            token: token, 
            user: {
                username: person.user_name,
                state: person.identity_state,
                bound_machine_id: person.bound_machine_id
            }
        });

    } catch (err) {
        console.error("VPU_CORE_CRITICAL_ERROR:", err);
        return res.status(500).json({ success: false, message: "INTERNAL_ERROR" });
    }
});

// SOVEREIGN SNIFFER (Ingress Verification) ---
// SOVEREIGN SNIFFER (Ingress Verification) ---
app.post('/api/spacs/sniffer', loginLimiter, async (req, res) => {
    const { hw_id, arch } = req.body;
    console.log(`>>> SNIFFER_PROBE: HW_ID [${hw_id?.substring(0,16)}]`);
    
    try {
        // 1. PRIMARY CHECK: Is this device already in our Registry?
        const checkQuery = `
            SELECT 
                p.id as person_id, 
                p.official_name, 
                p.identity_state,      
                p.registration_state, 
                p.membership_no, 
                p.license_key,
                p.password_hash,
                p.user_name,
                sd.revoked, 
                mb.provisioning_status 
            FROM security_device sd
            LEFT JOIN person p ON sd.person_id = p.id
            LEFT JOIN member_birthright mb ON p.id = mb.person_id
            WHERE sd.device_fingerprint_hash = $1
        `;
        
        const result = await pool.query(checkQuery, [hw_id]);

        // --- BLOCK A: HARDWARE RECOGNIZED (NO GHOST ALLOWED) ---
        if (result.rows.length > 0) {
            const u = result.rows[0];

            //If device exists but person is missing, 
            // stop here so Case B is never reached.
            if (!u.person_id) return res.json({ status: 'INITIAL' });

            // 6) GO OS-CORE: Registration=COMPLETE, Identity=VERIFIED, Provisioning=PROVISIONED, Password & Username NOT EMPTY
            if (u.registration_state === 'COMPLETE' && 
                u.identity_state === 'VERIFIED' && 
                u.provisioning_status === 'PROVISIONED' &&
                u.password_hash && u.user_name) {
                return res.json({ status: 'PROVISIONED', user: u.official_name });
            }

            // 5) GO TO COMPLETE-PROFILE: Registration=PRECOMPLETE, Provisioning=PROVISIONED, Identity=PREVERIFIED
            if (u.registration_state === 'PRECOMPLETE' && 
                u.provisioning_status === 'PROVISIONED' && 
                u.identity_state === 'PREVERIFIED') {
                return res.json({ status: 'REQUIRE_PROFILE' });
            }

            // 3) GO TO FORM B: Registration=PENDING, Identity=UNVERIFIED, Provisioning=UNPROVISIONED, Keys NOT EMPTY
            if (u.registration_state === 'PENDING' && 
                u.identity_state === 'UNVERIFIED' && 
                u.provisioning_status === 'UNPROVISIONED' && 
                u.membership_no && u.license_key) {
                return res.json({ status: 'REQUIRE_FORM_B' });
            }

            // 4) GO TO WAITING: Registration=PENDING, Identity=UNVERIFIED, Provisioning=UNPROVISIONED, Keys EMPTY
            if (u.registration_state === 'PENDING' && 
                u.identity_state === 'UNVERIFIED' && 
                u.provisioning_status === 'UNPROVISIONED' && 
                !u.membership_no) {
                return res.json({ status: 'WAITING' });
            }

            // 2) TO FORM A: Official_name=PROSPECT_RESERVED, Registration=INITIAL, Identity=PROSPECT, Provisioning=PENDING
            if (u.official_name === 'PROSPECT_RESERVED' && 
                u.registration_state === 'INITIAL' && 
                u.identity_state === 'PROSPECT') {
                return res.json({ status: 'INITIAL' });
            }

            /** * CRITICAL FALLBACK: 
             * If the hw_id exists but matched none of the specific logic above, 
             * we return 'INITIAL' to prevent the code from continuing to Case B.
             */
            return res.json({ status: 'INITIAL' });
            
        } else {
        // --- CASE B: GHOST HANDSHAKE (First time seeing this hardware) ---
        // We use a transactional client to prevent "No Parameter $1" errors
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Create Identity
            const personRes = await client.query(
                `INSERT INTO person (official_name, identity_state, registration_state) 
                 VALUES ('PROSPECT_RESERVED', 'PROSPECT', 'INITIAL') RETURNING id`
            );
            const personId = personRes.rows[0].id;

            // 2. Bind Hardware (Ensure all columns match your schema)
            await client.query(
                `INSERT INTO security_device (person_id, device_fingerprint_hash, device_type, os_signature)
                 VALUES ($1, $2, $3, $4) 
                 ON CONFLICT (device_fingerprint_hash) DO UPDATE SET person_id = EXCLUDED.person_id`,
                [personId, hw_id, 'VPU_STATION', arch || 'Unknown']
            );

            // 3. Initialize Birthright Slot
            await client.query(
                `INSERT INTO member_birthright (person_id, provisioning_status) 
                 VALUES ($1, 'PENDING')`, 
                [personId]
            );

            await client.query('COMMIT');
            console.log(`>>> GENESIS SUCCESS: HW_ID [${hw_id.substring(0,8)}] Registered to Person [${personId}]`);
            return res.json({ status: 'INITIAL' });

        } catch (handshakeErr) {
            await client.query('ROLLBACK');
            // Handle race condition if two requests hit at the exact same millisecond
            if (handshakeErr.code === '23505') {
                return res.json({ status: 'INITIAL' });
            }
            throw handshakeErr; 
        } finally {
            client.release();
        }
    }
    } catch (err) {
        console.error("SNIFFER_FAULT:", err.message);
        res.status(500).json({ error: "BRIDGE_FAULT" });
    }
});

// ---SPACS PROVISIONING WORKFLOW---
// --- FORM A: EXPRESSION OF INTEREST (Identity Lockdown) ---
// --- FORM A: EXPRESSION OF INTEREST (Update Existing Prospect) ---
app.post('/api/spacs/interest', async (req, res) => {
    const { 
        name, email, phone, country, declaration_of_intent, phone_code, 
        hw_id, arch 
    } = req.body;

    if (!hw_id || !email || !name || !phone || !country || !declaration_of_intent || !phone_code || !arch) {
        return res.status(400).json({ error: "REQUIRED_VECTORS_MISSING" });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Resolve Person ID (Link Ghost record to real identity)
        const checkResult = await client.query(
            `SELECT p.id FROM person p 
             JOIN security_device sd ON sd.person_id = p.id 
             WHERE sd.device_fingerprint_hash = $1`, 
            [hw_id]
        );

        let personId;

        if (checkResult.rows.length > 0) {
            personId = checkResult.rows[0].id;
            // UPDATE: Move from INITIAL to PENDING/UNVERIFIED logic
            await client.query(
                `UPDATE person 
                 SET official_name = $1, 
                     country = $2, 
                     registration_state = 'PENDING', 
                     identity_state = 'UNVERIFIED', 
                     declaration_of_intent = $3
                 WHERE id = $4`,
                [name.trim(), country || 'Unknown', declaration_of_intent, personId]
            );
        } else {
            // FALLBACK: Create fresh with correct Stage 2/4 states
            const personRes = await client.query(
                `INSERT INTO person (official_name, country, registration_state, identity_state, declaration_of_intent) 
                 VALUES ($1, $2, 'PENDING', 'UNVERIFIED', $3) RETURNING id`,
                [name.trim(), country || 'Unknown', declaration_of_intent]
            );
            personId = personRes.rows[0].id;

            await client.query(
                `INSERT INTO security_device (person_id, device_fingerprint_hash, os_signature)
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (device_fingerprint_hash) DO UPDATE SET person_id = EXCLUDED.person_id`,
                [personId, hw_id, arch || 'Unknown']
            );
        }

        // 2. CONTACT VECTORS: Insert Phone, Phone Code, and Email
        // We wipe old ghost contacts to ensure clean data
        await client.query(`DELETE FROM contact_information WHERE person_id = $1`, [personId]);
        
        const cleanEmail = email.toLowerCase().trim();
        const fullPhone = `${phone_code}${phone}`.replace(/\s+/g, ''); // Removes spaces to ensure uniqueness

        // Insert Email
        await client.query(
                `INSERT INTO contact_information (person_id, contact_type, contact_value, is_primary) 
                VALUES ($1, 'email', $2, TRUE)`,
                [personId, cleanEmail]
            );

        // Insert Combined Phone
        await client.query(
                `INSERT INTO contact_information (person_id, contact_type, contact_value, is_primary) 
                VALUES ($1, 'phone', $2, FALSE)`,
                [personId, fullPhone]
            );
        // 3. INITIALIZE BIRTHRIGHT (Ensures Form B target exists)
        await client.query(
            `INSERT INTO member_birthright (person_id, provisioning_status) 
             VALUES ($1, 'UNPROVISIONED') 
             ON CONFLICT (person_id) DO UPDATE SET provisioning_status = 'UNPROVISIONED'`,
            [personId]
        );

        await client.query('COMMIT');
        return res.status(201).json({ success: true, message: "IDENTITY_LOCKED_PENDING_APPROVAL" });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("REGISTRY_LOCKDOWN_FAULT:", err.message);
        
        // Custom error for the user if they use an email already in the system
        if (err.message.includes('unique_contact_value')) {
            return res.status(409).json({ error: "CONTACT_VECTOR_ALREADY_REGISTERED" });
        }
        
        return res.status(500).json({ error: "REGISTRY_FAILURE" });
    } finally {
        client.release();
    }
});

// Verify Membership and Finalize Provisioning
app.post('/api/spacs/verify-provision', async (req, res) => {
    console.log("Provision Request Body:", req.body);
    const { 
        hw_id, official_name, membership_no, license_key, 
        email, phone, phone_code, country 
    } = req.body;

    // 1. STAGE 1: FULL VECTOR GATE
    if (!hw_id || !membership_no || !license_key || !email || !phone || !official_name) {
        return res.status(400).json({ error: "REQUIRED_VECTORS_MISSING" });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 2. STAGE 2: IDENTITY & HARDWARE LOCK-IN
        const result = await client.query(
            `SELECT p.id FROM person p
             JOIN security_device sd ON sd.person_id = p.id
             WHERE sd.device_fingerprint_hash LIKE $1
             AND p.membership_no = $2 
             AND p.license_key = $3
             AND p.official_name = $4
             AND p.country = $5`,
            [`%${hw_id}%`, membership_no, license_key, official_name.trim(), country]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(401).json({ error: "REGISTRY_MISMATCH" });
        }

        const personId = result.rows[0].id;

        // 3. STAGE 3: CONTACT VECTOR VALIDATION (Implicitly checks Phone Code)
        const cleanEmail = email.toLowerCase().trim();
        const fullPhoneCheck = `${phone_code}${phone}`.replace(/\s+/g, '');

        const contactMatch = await client.query(
            `SELECT id FROM contact_information 
             WHERE person_id = $1 AND contact_value IN ($2, $3)`,
            [personId, cleanEmail, fullPhoneCheck]
        );

        // Fail if we can't find both the email and the phone assigned to this person
        if (contactMatch.rows.length < 2) {
            await client.query('ROLLBACK');
            return res.status(401).json({ error: "CONTACT_VERIFICATION_FAILED" });
        }

        // 4. STAGE 4: PROVISIONING FINALIZATION
        // Update identity states
        await client.query(
            `UPDATE person SET identity_state = 'PREVERIFIED', registration_state = 'PRECOMPLETE' WHERE id = $1`,
            [personId]
        );

        // Officially link this specific hardware to this person
        const bindResult = await client.query(
            `UPDATE security_device SET person_id = $1 WHERE device_fingerprint_hash LIKE $2`,
            [personId, `%${hw_id}%`]
        );

        if (bindResult.rowCount === 0) {
            console.error(`!!! BINDING_FAILURE: No device found matching ${hw_id}`);
            // If this fails, Step 3 will always fail.
        }

        // THE BIRTHRIGHT ALLOTMENT: Explicitly setting the 100MB quota
        await client.query(
            `UPDATE member_birthright 
            SET provisioning_status = 'PROVISIONED', 
                storage_quota_mb = 100, 
                updated_at = NOW() 
            WHERE person_id = $1`,
            [personId]
        );

        await client.query('COMMIT');
        console.log(`>>> PROVISIONING_COMPLETE: ${official_name} [${membership_no}] bound to HW [${hw_id.substring(0,8)}]`);
        res.json({ 
            success: true, 
            shell_url: "/builds/core-os-v1.iso",
            allotment_mb: 100 // Feedback for the UI
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("VERIFY_PROVISION_FAULT:", err.message);
        res.status(500).json({ error: "INTERNAL_BRIDGE_FAULT" });
    } finally {
        client.release();
    }
});

// --- COMPLETE PROFILE (Final Identity Handshake) ---
app.post('/api/spacs/complete-profile', async (req, res) => {
    const { 
        hw_id, password, user_name, date_of_birth, 
        gender, bio, titles, avatar 
    } = req.body;

    // GUARD: Ensure we aren't processing a null hardware ID
    if (!hw_id || hw_id === "null") {
        return res.status(400).json({ error: "DEVICE_VECTOR_MISSING" });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. LOCATE VIA HARDWARE (Using LIKE for resilience)
        const bindingResult = await client.query(
            `SELECT p.id, mb.storage_quota_mb 
             FROM person p
             JOIN security_device sd ON sd.person_id = p.id
             LEFT JOIN member_birthright mb ON p.id = mb.person_id
             WHERE sd.device_fingerprint_hash LIKE $1 LIMIT 1`,
            [`%${hw_id}%`]
        );

        if (bindingResult.rows.length === 0) {
            throw new Error("DEVICE_NOT_RECOGNIZED: Complete Provisioning Step 2 first.");
        }

        const personId = bindingResult.rows[0].id;

        // 2. UPDATE IDENTITY 
        // We use jsonb_build_object to safely merge the bio into contact_meta
        const updatePersonQuery = `
            UPDATE person SET 
                user_name = $1, 
                date_of_birth = $2, 
                gender = $3, 
                contact_meta = COALESCE(contact_meta, '{}'::jsonb) || jsonb_build_object('bio', $4::text),
                identity_state = 'VERIFIED',
                registration_state = 'COMPLETE',
                updated_at = NOW()
            WHERE id = $5
        `;
        await client.query(updatePersonQuery, [
            user_name, date_of_birth, gender, bio || "", personId
        ]);

        // 3. SECURE PASSWORD
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        await client.query(
            `UPDATE person SET password_hash = $1 WHERE id = $2`,
            [passwordHash, personId]
        );

        // 4. HANDLE AVATAR (TEXT column ensures 18KB+ is safe)
        if (avatar) {
            await client.query(
                `DELETE FROM person_media WHERE person_id = $1 AND media_type = 'profile'`, 
                [personId]
            );
            await client.query(
                `INSERT INTO person_media (person_id, url, media_type) VALUES ($1, $2, 'profile')`,
                [personId, avatar]
            );
        }

        // 5. ATTEST DEVICE
        await client.query(
            `UPDATE security_device SET enclave_attested = TRUE WHERE person_id = $1`,
            [personId]
        );

        await client.query('COMMIT');
        console.log(`>>> INGRESS_COMPLETE: ${user_name} is fully synchronized.`);

        res.status(200).json({ 
            success: true, 
            redirect: "./Thealcohesion-core/index.html" 
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("INGRESS_FAULT:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});
// API: Check Citizenship Approval Status
// API: Check Citizenship Approval Status (Strict Allotment Enforcement)
app.get('/api/spacs/check-status', async (req, res) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    
    const { hw_id } = req.query;

    try {
        const result = await pool.query(
            `SELECT 
                p.identity_state, 
                p.registration_state,
                p.membership_no, 
                p.license_key,
                mb.provisioning_status,
                mb.storage_quota_mb
             FROM security_device sd
             JOIN person p ON sd.person_id = p.id
             LEFT JOIN member_birthright mb ON p.id = mb.person_id
             WHERE sd.device_fingerprint_hash = $1`, 
            [hw_id]
        );

        const user = result.rows[0];

        if (!user) return res.json({ status: 'NOT_FOUND' });

        // --- THE 100MB GATE ---
        // We only consider the machine "Provisioned" if storage_quota_mb is exactly 100 (or more)
        const hasAllotment = user.storage_quota_mb && parseInt(user.storage_quota_mb) >= 100;
        const isProvisioned = user.provisioning_status === 'PROVISIONED';

        // 1. REDIRECT TO FORM B: Only if keys are present but hardware isn't provisioned yet
        if (user.membership_no && user.license_key && !isProvisioned) {
            return res.json({ 
                status: 'APPROVED', 
                membership_no: user.membership_no, 
                license_key: user.license_key 
            });
        }

        // 2. PROCEED TO COMPLETE PROFILE: Only if state is PREVERIFIED AND 100MB is confirmed
        if (isProvisioned && hasAllotment && user.identity_state === 'PREVERIFIED') {
            return res.json({ 
                status: 'REQUIRE_PROFILE', // This signal tells loading.js to move to the final step
                provision_status: 'PROVISIONED',
                allotment: user.storage_quota_mb
            });
        }

        // 3. FULLY ACTIVE: If already completed
        if (user.registration_state === 'COMPLETE') {
            return res.json({ status: 'PROVISIONED' });
        }

        // 4. WAITING ROOM: If still in draft or pending admin keys
        res.json({ 
            status: 'UNVERIFIED', 
            provision_status: user.provisioning_status || 'PENDING',
            allotment_status: hasAllotment ? 'AWARDED' : 'WAITING'
        });

    } catch (err) {
        console.error("CHECK_STATUS_FAULT:", err.message);
        res.status(500).json({ error: "CORE_UPLINK_OFFLINE" });
    }
});


// --- VFS HARDWARE BINDING & BIRTHRIGHT CHECK ---
app.post('/api/spacs/vfs-sync', async (req, res) => {
    const { hw_id } = req.body;

    if (!hw_id) return res.status(400).json({ error: "HARDWARE_ID_MISSING" });

    try {
        // Query to verify the hardware belongs to a provisioned person
        const result = await pool.query(
            `SELECT p.user_name, mb.storage_quota_mb, mb.provisioning_status
             FROM security_device sd
             JOIN person p ON sd.person_id = p.id
             JOIN member_birthright mb ON p.id = mb.person_id
             WHERE sd.device_fingerprint_hash = $1 LIMIT 1`,
            [hw_id]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ error: "UNAUTHORIZED_HARDWARE" });
        }

        const data = result.rows[0];

        // Check if the 100MB has actually been activated (Provisioned)
        if (data.provisioning_status !== 'PROVISIONED') {
            return res.status(403).json({ error: "BIRTHRIGHT_NOT_PROVISIONED" });
        }

        res.json({
            success: true,
            status: "SYNCHRONIZED",
            allotment: data.storage_quota_mb, // Returns 100
            vault_id: `VAULT_${data.user_name.toUpperCase()}`
        });

    } catch (err) {
        console.error("VFS_SYNC_CRITICAL_FAILURE:", err.message);
        res.status(500).json({ error: "CORE_OFFLINE" });
    }
});

/**
 * SOVEREIGN AUTH MIDDLEWARE
 * Ensures the request is coming from a validated Enclave session.
 */
const verifySovereignKey = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const machineSig = req.headers['x-machine-id'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer <token>"

    // For the 2025-12-26 Allotment Protocol, we require both a Bearer token and a HW Signature
    if (!authHeader || !machineSig) {
        console.error(`[SEC_ALERT] Unauthorized access attempt from ${req.ip}`);
        return res.status(403).json({ 
            success: false, 
            message: "SOVEREIGN_ERR: ENCLAVE_UPLINK_REQUIRED" 
        });
    }

    if (!token) return res.status(401).json({ error: "PASSPORT_REQUIRED" });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "INVALID_PASSPORT" });
        req.user = user; // This allows req.user.id to be used in /allotment/claim
        next();
    });

    // Optional: Add logic here to verify the token against your session store
    // For now, we will allow the "Bearer temp_key" or your specific sessionKey
    next();
};

//Identity registry connection
// vpu-bridge.js
app.get('/api/vpu/registry', verifySovereignKey, async (req, res) => {
    try {
        console.log("[UPLINK] Generating Sovereign Registry from Relational Schema...");

        // This query joins your tables to build the "Member" object the frontend needs
        const query = `
            SELECT 
                p.id, p.official_name, p.sovereign_name, p.membership_no,
                r.name as rank_name, r.code as rank_code,
                ac.name as action_center_name, ac.area_code as ac_id,
                t.name as tlc_name, t.area_code as tlc_id,
                ps.security_clearance,
                p.identity_state
            FROM person p
            LEFT JOIN person_rank pr ON p.id = pr.person_id AND pr.end_date IS NULL
            LEFT JOIN rank r ON pr.rank_id = r.id
            LEFT JOIN person_security ps ON p.id = ps.person_id
            LEFT JOIN action_center_officials aco ON p.id = aco.person_id
            LEFT JOIN action_center ac ON aco.action_center_id = ac.id
            LEFT JOIN tlc_officials tlco ON p.id = tlco.person_id
            LEFT JOIN tlc t ON tlco.tlc_id = t.id
            WHERE p.is_frozen = FALSE
            ORDER BY r.rank_order DESC, p.official_name ASC;
        `;

        const result = await pool.query(query);

        // Map the flat SQL rows into the nested JSON objects the frontend expects
        const members = result.rows.map(row => ({
            security: { 
                uid: row.id, 
                rank: row.rank_name || 'PROSPECT', 
                abbr: row.rank_code || 'PRSP', 
                clearance: row.security_clearance || 0 
            },
            personal: { 
                official_name: row.official_name, 
                sovereign_name: row.sovereign_name || row.official_name 
            },
            tactical: { 
                ac_id: row.ac_id || 'UNASSIGNED', 
                tlc_id: row.tlc_id || 'UNASSIGNED' 
            },
            status: { 
                remarks: row.identity_state || 'ACTIVE' 
            }
        }));

        // Fallback for Dec 26th Allotment if DB is currently empty
        if (members.length === 0) {
            return res.json([{
                security: { uid: "0000", rank: "ARCHON", abbr: "ARCH", clearance: 10 },
                personal: { officialName: "Michael Audi", sovereignName: "ARCHANTI" },
                tactical: { ac_id: "AC_NAIROBI", tlc_id: "TLC_01" },
                status: { remarks: "SEED_DATA_REQUIRED" }
            }]);
        }

        res.json(members);
    } catch (err) {
        console.error("!!! PG_UPLINK_CRASH:", err);
        res.status(500).json({ error: "DATABASE_QUERY_ERROR", details: err.message });
    }
});


app.post('/api/vpu/allotment/claim', verifySovereignKey, async (req, res) => {
    const { allotmentCode } = req.body;
    
    // Safety: Ensure ID comes from the JWT payload set by verifySovereignKey
    const userId = req.user?.id; 

    if (!allotmentCode) {
        return res.status(400).json({ error: "CLAIM_CODE_REQUIRED" });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Check if code exists and is still valid
        const codeCheck = await client.query(
            `SELECT id, value_mb FROM allotment_codes 
             WHERE code = $1 AND is_redeemed = FALSE`, 
            [allotmentCode.trim()]
        );

        if (codeCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: "INVALID_OR_EXPIRED_CODE" });
        }

        const grantAmount = codeCheck.rows[0].value_mb;

        // 2. Update member_birthright (Standardizing table names)
        const updateRes = await client.query(
            `UPDATE member_birthright 
             SET storage_quota_mb = storage_quota_mb + $1, 
                 updated_at = NOW() 
             WHERE person_id = $2`, 
            [grantAmount, userId]
        );

        if (updateRes.rowCount === 0) {
            // Fallback: If the user doesn't have a birthright row yet, create it
            await client.query(
                `INSERT INTO member_birthright (person_id, storage_quota_mb, provisioning_status) 
                 VALUES ($1, $2, 'PROVISIONED')`,
                [userId, grantAmount]
            );
        }

        // 3. Burn the code so it cannot be used again
        await client.query(
            `UPDATE allotment_codes 
             SET is_redeemed = TRUE, redeemed_by = $1, redeemed_at = NOW() 
             WHERE code = $2`,
            [userId, allotmentCode]
        );

        await client.query('COMMIT');

        console.log(`[BIRTHRIGHT] Success: User ${userId} claimed ${grantAmount}MB via ${allotmentCode}`);
        
        res.json({ 
            success: true, 
            message: `BIRTHRIGHT_EXPANDED: ${grantAmount}MB_ADDED`,
            code: allotmentCode 
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("CLAIM_FAULT:", err.message);
        res.status(500).json({ error: "DATABASE_SYNC_FAILED" });
    } finally {
        client.release();
    }
});

// Dual-mode: Registry Index + Global Search
app.get('/api/vpu/registry/members', async (req, res) => {
    try {
        const q = req.query.q?.trim();

        const query = `
            SELECT 
                p.id, 
                p.official_name, 
                p.sovereign_name, 
                p.identity_state,
                r.name as rank_name, 
                r.code as rank_abbr, 
                r.rank_order as clearance,
                mb.storage_quota_mb
            FROM person p
            LEFT JOIN person_rank pr ON p.id = pr.person_id
            LEFT JOIN rank r ON pr.rank_id = r.id
            LEFT JOIN member_birthright mb ON p.id = mb.person_id
            ORDER BY r.rank_order DESC NULLS LAST;
        `;

        const searchClause = q
            ? `
                WHERE 
                    p.official_name ILIKE $1 OR
                    p.sovereign_name ILIKE $1 OR
                    p.identity_state ILIKE $1 OR
                    r.name ILIKE $1 OR
                    r.abbr ILIKE $1
              `
            : '';

        const orderClause = `
            ORDER BY r.clearance DESC NULLS LAST, p.id ASC
        `;

        const baseSelect = `
            SELECT p.id, p.official_name, p.sovereign_name, p.identity_state,
                   r.name as rank_name, r.code as rank_abbr, r.rank_order as clearance
            FROM person p
            LEFT JOIN person_rank pr ON p.id = pr.person_id
            LEFT JOIN rank r ON pr.rank_id = r.id `;

        const sql = baseSelect + searchClause + orderClause;

        const params = q ? [`%${q}%`] : [];

        const result = await pool.query(sql, params);

        // Normalize → IdentityManager schema
        const members = result.rows.map(row => ({
            security: { 
                uid: row.id.toString().padStart(4, '0'),
                rank: row.rank_name || 'SEED',
                abbr: row.rank_abbr || 'S',
                clearance: row.clearance || 1
            },
            personal: { 
                officialName: row.official_name || "UNREGISTERED",
                sovereignName: row.sovereign_name || "PENDING_BIND"
            },
            status: { 
                remarks: row.identity_state || 'ACTIVE'
            }
        }));

        // Genesis fallback
        if (members.length === 0 && !q) {
            return res.json([{
                security: { uid: "0000", rank: "ARCHON", abbr: "ARCH", clearance: 10 },
                personal: { officialName: "Michael Audi", sovereignName: "ARCHANTILANI" },
                status: { remarks: "GENESIS_CORE" }
            }]);
        }

        res.json(members);

    } catch (err) {
        console.error("!!! PG_UPLINK_CRASH:", err);
        res.status(500).json({ error: "GENESIS_SYNC_FAILED" });
    }
});

/**
 * GENESIS PROVISIONING ENDPOINT
 * This generates the "Physical" assets for the Universal Handshake.
 */
/**
 * PRODUCTION GENESIS PROVISIONING
 * Strictly linked to the PostgreSQL 'person' table.
 */
app.get('/api/vpu/provision-bundle', async (req, res) => {
    try {
        // FIX: Cast UUID to TEXT to allow comparison with '1'
        const result = await pool.query(
            "SELECT official_name, sovereign_name, id FROM person WHERE id::text = '1' OR official_name = 'Michael Audi' LIMIT 1"
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ error: "IDENTITY_NOT_FOUND" });
        }

        const identity = result.rows[0];
        const enclaveSeed = require('crypto').randomBytes(16).toString('hex').toUpperCase();

        const payload = {
            uid: identity.id,
            founder: identity.official_name,
            build: "1.2.8_GENESIS",
            iat: Math.floor(Date.now() / 1000)
        };

        const signedCert = jwt.sign(payload, process.env.JWT_SECRET || 'GENESIS_SECRET');

        // --- Save the signature to the Security Table ---
        await pool.query(`
            UPDATE person_security 
            SET enclave_public_key = $1, 
                last_key_rotation = NOW() 
            WHERE person_id = $2`, 
        [signedCert, identity.id]);

        console.log(`>>> GENESIS_ASSETS_PROVISIONED for ${identity.official_name}`);

        res.json({
            success: true,
            certificate: signedCert,
            enclave_key_id: enclaveSeed,
            founder: identity.official_name,
            issued_at: new Date().toISOString()
            
        });

    } catch (err) {
        console.error("!!! GENESIS_PROVISION_CRASH:", err);
        res.status(500).json({ error: "DATABASE_UPLINK_CRASH" });
    }
});

// ===== BIOME API ENDPOINTS =====

// Get all action centers
app.get('/api/vpu/action-centers', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                ac.id,
                ac.name,
                ac.area_code,
                ac.latitude,
                ac.longitude,
                ac.country,
                COUNT(DISTINCT t.id) as tlc_count,
                COUNT(DISTINCT pm.person_id) as member_count
            FROM action_center ac
            LEFT JOIN tlc t ON t.action_center_id = ac.id
            LEFT JOIN person_membership pm ON pm.action_center_id = ac.id
            GROUP BY ac.id, ac.name, ac.area_code, ac.latitude, ac.longitude, ac.country
            ORDER BY ac.name ASC
        `);
        
        res.json(result.rows.map(row => ({
            id: row.id,
            name: row.name,
            action_center_id: row.id,
            action_center_name: row.name,
            area_code: row.area_code,
            latitude: row.latitude || -1.286389,
            longitude: row.longitude || 36.817223,
            lat: row.latitude || -1.286389,
            lng: row.longitude || 36.817223,
            country: row.country,
            tlc_capacity: row.tlc_count || 100,
            member_count: parseInt(row.member_count || 0)
        })));
    } catch (err) {
        console.error("ACTION_CENTERS_FETCH_ERROR:", err.message);
        res.status(500).json({ error: "Failed to fetch action centers" });
    }
});

// Get TLC nodes for a specific action center
app.get('/api/vpu/action-centers/:acId/tlc', async (req, res) => {
    try {
        const { acId } = req.params;
        const result = await pool.query(`
            SELECT 
                t.id,
                t.name,
                t.area_code,
                t.latitude,
                t.longitude,
                COUNT(DISTINCT pm.person_id) as member_count
            FROM tlc t
            LEFT JOIN person_membership pm ON pm.tlc_id = t.id
            WHERE t.action_center_id = $1 OR t.id = $1
            GROUP BY t.id, t.name, t.area_code, t.latitude, t.longitude
            ORDER BY t.name ASC
        `, [acId]);
        
        res.json(result.rows.map(row => ({
            id: row.id,
            tlc_id: row.id,
            name: row.name,
            tlc_name: row.name,
            area_code: row.area_code,
            latitude: row.latitude || -1.286389,
            longitude: row.longitude || 36.817223,
            lat: row.latitude || -1.286389,
            lng: row.longitude || 36.817223,
            member_count: parseInt(row.member_count || 0)
        })));
    } catch (err) {
        console.error("TLC_FETCH_ERROR:", err.message);
        res.status(500).json({ error: "Failed to fetch TLC nodes" });
    }
});

// Get members for a specific action center
app.get('/api/vpu/action-centers/:acId/members', async (req, res) => {
    try {
        const { acId } = req.params;
        const result = await pool.query(`
            SELECT 
                p.id,
                p.user_name,
                p.official_name,
                p.sovereign_name,
                p.membership_no,
                p.country,
                ac.id as action_center_id,
                ac.name as action_center_name,
                r.name as rank_name,
                r.code as rank_code
            FROM person p
            JOIN person_membership pm ON p.id = pm.person_id
            LEFT JOIN action_center ac ON pm.action_center_id = ac.id
            LEFT JOIN person_rank pr ON p.id = pr.person_id
            LEFT JOIN rank r ON pr.rank_id = r.id
            WHERE ac.id = $1 OR ac.area_code = $1
            ORDER BY p.official_name ASC
        `, [acId]);
        
        res.json(result.rows.map(row => ({
            id: row.id,
            user_name: row.user_name,
            official_name: row.official_name,
            sovereign_name: row.sovereign_name,
            membership_no: row.membership_no,
            country: row.country,
            action_center: row.action_center_name,
            action_center_id: row.action_center_id,
            rank: row.rank_name,
            security: { uid: row.id }
        })));
    } catch (err) {
        console.error("ACTION_CENTER_MEMBERS_FETCH_ERROR:", err.message);
        res.status(500).json({ error: "Failed to fetch action center members" });
    }
});

// Get members for a specific TLC
app.get('/api/vpu/tlc/:tlcId/members', async (req, res) => {
    try {
        const { tlcId } = req.params;
        const result = await pool.query(`
            SELECT 
                p.id,
                p.user_name,
                p.official_name,
                p.sovereign_name,
                p.membership_no,
                p.country,
                t.id as tlc_id,
                t.name as tlc_name,
                r.name as rank_name,
                r.code as rank_code
            FROM person p
            JOIN person_membership pm ON p.id = pm.person_id
            LEFT JOIN tlc t ON pm.tlc_id = t.id
            LEFT JOIN person_rank pr ON p.id = pr.person_id
            LEFT JOIN rank r ON pr.rank_id = r.id
            WHERE t.id = $1 OR t.area_code = $1
            ORDER BY p.official_name ASC
        `, [tlcId]);
        
        res.json(result.rows.map(row => ({
            id: row.id,
            user_name: row.user_name,
            official_name: row.official_name,
            sovereign_name: row.sovereign_name,
            membership_no: row.membership_no,
            country: row.country,
            tlc: row.tlc_name,
            tlc_id: row.tlc_id,
            rank: row.rank_name,
            security: { uid: row.id }
        })));
    } catch (err) {
        console.error("TLC_MEMBERS_FETCH_ERROR:", err.message);
        res.status(500).json({ error: "Failed to fetch TLC members" });
    }
});

// --- SOVEREIGN IDENTITY SYNC ENDPOINT ---
app.post('/api/v1/system/sync-sovereign-identity', async (req, res) => {
    // DATA DERIVED STRICTLY FROM ENCLAVE & MANIFEST
    const { type, payload, enclave_sig } = req.body;

    if (!enclave_sig || enclave_sig.length < 64) {
        return res.status(400).json({ error: "INVALID_SOVEREIGN_ENCLAVE" });
    }

    try {
        // --- PASSWORD: BCrypt Hashing ---
        let finalValue = payload;
        if (type === 'PASSWORD') {
            // 1. Decode the Base64 from the frontend to get the raw password
            const rawPassword = Buffer.from(payload, 'base64').toString('utf-8');
            // 2. Hash it using Bcrypt so it matches your DB security standard
            const bcrypt = require('bcrypt'); // Ensure this is at the top of your file
            finalValue = await bcrypt.hash(rawPassword, 12);
        }
        // Map 'type' to the exact column (USERNAME -> user_name, PASSWORD -> password_hash)
        const targetColumn = type === 'USERNAME' ? 'user_name' : 'password_hash';

        // THE PURE ATOMIC SYNC
        // This query finds the person linked to the Enclave Signature and updates them.
        const syncResult = await pool.query(`
            UPDATE person 
            SET ${targetColumn} = $1 
            WHERE id = (
                SELECT person_id 
                FROM person_security 
                WHERE enclave_public_key = $2
            )
            RETURNING id
        `, [finalValue, enclave_sig.trim()]); // Added .trim() to prevent whitespace errors

        // If no rows were updated, the Enclave Signature wasn't found in the DB.
        if (syncResult.rows.length === 0) {
            console.error(`[AUTH_FAIL] No record matched signature: ${enclave_sig.substring(0, 10)}...`);
            return res.status(401).json({ error: "UNAUTHORIZED_ENCLAVE_SIGNATURE" });
        }

        const personId = syncResult.rows[0].id;

        // 2. NEUTRALIZE DEADLOCK
        // Reset security counters for the identified person.
        await pool.query(`
            UPDATE person_security 
            SET failed_login_attempts = 0, 
                locked_until = NULL 
            WHERE person_id = $1
        `, [personId]);

        res.json({ 
            success: true, 
            message: "IDENTITY_CONSUMED_AND_SYNCED",
            id_vector: enclave_sig.substring(0, 8) 
        });

    } catch (err) {
        console.error(`[SYS_ERR] ${err.message}`);
        res.status(500).json({ error: "SOVEREIGN_SYNC_FAULT" });
    }
});

// --- RECOVERY CREDENTIAL VERIFICATION---
// Ensure you have: const bcrypt = require('bcrypt'); at the top of your file
app.post('/api/v1/system/verify-recovery-credentials', async (req, res) => {
    const { membership_no, verify_value, verify_type, enclave_sig, current_username} = req.body;
    const incomingSig = (enclave_sig || "").trim();
    try {
        const query = `
            SELECT p.user_name, p.password_hash, ps.enclave_public_key 
            FROM person p
            JOIN person_security ps ON p.id = ps.person_id
            WHERE p.membership_no = $1
        `;
        
        const result = await pool.query(query, [membership_no]);
        if (result.rows.length === 0) return res.status(404).json({ error: "MEMBERSHIP_NOT_FOUND" });

        const userData = result.rows[0];

        // --- IDENTITY BINDING CHECK ---
        // Verify that the username or password provided matches the one linked to the membership_no
        // Only perform the 'toUpperCase' check if current_username actually exists
        if (current_username) {
            const isCorrectAccount = current_username.toUpperCase() === (userData.user_name || "").toUpperCase();
            if (!isCorrectAccount) {
            console.warn(`[SECURITY_ALERT] Membership ${membership_no} does not belong to user ${current_username}`);
            return res.status(403).json({ error: "IDENTITY_MISMATCH: Provided username does not match membership record." });
            }
        }
        
        // VECTOR A: Credential Match
        let credentialValid = false;
        if (verify_type === 'PASSWORD') {
            credentialValid = await bcrypt.compare(verify_value, userData.password_hash);
        } else {
        // Check if input verify_value matches the DB username
            credentialValid = (verify_value || "").toUpperCase() === (userData.user_name || "").toUpperCase();
        }

        // VECTOR B: Physical Enclave Match (Corrected Column)
        const dbSig = (userData.enclave_public_key || "").trim();
        const enclaveValid = (incomingSig !== "" && incomingSig === dbSig);

        // --- AUTHORIZATION ---
        if (credentialValid || enclaveValid) {
            console.log(`[AUTH] Handshake Success for ${userData.user_name} and Vector_B_Match: ${enclaveValid}`);
            return res.json({ status: "VERIFIED" });
        }

        return res.status(401).json({ error: "IDENTITY_VERIFICATION_FAILED" });

    } catch (err) {
        console.error(`[CRITICAL_RECOVERY_FAULT]: ${err.message}`);
        res.status(500).json({ error: "DATABASE_CONNECTION_ERROR" });
    }
});

app.listen(3000, () => console.log('Sovereign Link: Port 3000'));