-- =========================================
-- Thealcohesion-core: Full Production-ready schema
-- Includes all triggers, audit logs, business logic
-- =========================================

-- Recommended extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- hashing/encryption
CREATE EXTENSION IF NOT EXISTS "plpgsql";    -- procedural language

-- ===========================
-- DROP TABLES IF EXISTS
-- =========================== 
DROP TABLE IF EXISTS house_assembly_member CASCADE;
DROP TABLE IF EXISTS person_security CASCADE;
DROP TABLE IF EXISTS member_birthright CASCADE;
DROP TABLE IF EXISTS judicial_panel_member CASCADE;
DROP TABLE IF EXISTS judicial_session CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS platform CASCADE;
DROP TABLE IF EXISTS tenure CASCADE;
DROP TABLE IF EXISTS person_certification CASCADE;
DROP TABLE IF EXISTS certification CASCADE;
DROP TABLE IF EXISTS readiness_pool_assignment CASCADE;
DROP TABLE IF EXISTS readiness_pool CASCADE;
DROP TABLE IF EXISTS operational_assignment CASCADE;
DROP TABLE IF EXISTS operational_role CASCADE;
DROP TABLE IF EXISTS operational_unit_service CASCADE;
DROP TABLE IF EXISTS operational_unit CASCADE;
DROP TABLE IF EXISTS operational_unit_type CASCADE;
DROP TABLE IF EXISTS ranking_decision CASCADE;
DROP TABLE IF EXISTS ranking_board_subject CASCADE;
DROP TABLE IF EXISTS ranking_board_member CASCADE;
DROP TABLE IF EXISTS ranking_board_session CASCADE;
DROP TABLE IF EXISTS ranking_board_type CASCADE;
DROP TABLE IF EXISTS office_assignment CASCADE;
DROP TABLE IF EXISTS office CASCADE;
DROP TABLE IF EXISTS tlc_officials CASCADE;
DROP TABLE IF EXISTS tlc CASCADE;
DROP TABLE IF EXISTS action_center_officials CASCADE;
DROP TABLE IF EXISTS action_center CASCADE;
DROP TABLE IF EXISTS person_mentorship CASCADE;
DROP TABLE IF EXISTS mentorship_structure CASCADE;
DROP TABLE IF EXISTS mentorship_structure_type CASCADE;
DROP TABLE IF EXISTS formation_relationship CASCADE;
DROP TABLE IF EXISTS formation_officials CASCADE;
DROP TABLE IF EXISTS subformation CASCADE;
DROP TABLE IF EXISTS formation CASCADE;
DROP TABLE IF EXISTS formation_type CASCADE;
DROP TABLE IF EXISTS person_training CASCADE;
DROP TABLE IF EXISTS training_program CASCADE;
DROP TABLE IF EXISTS training_level CASCADE;
DROP TABLE IF EXISTS person_recognition CASCADE;
DROP TABLE IF EXISTS recognition CASCADE;
DROP TABLE IF EXISTS person_rank CASCADE;
DROP TABLE IF EXISTS rank_hierarchy CASCADE;
DROP TABLE IF EXISTS rank CASCADE;
DROP TABLE IF EXISTS person_membership CASCADE;
DROP TABLE IF EXISTS membership_status CASCADE;
DROP TABLE IF EXISTS membership_category CASCADE;
DROP TABLE IF EXISTS membership_type CASCADE;
DROP TABLE IF EXISTS person_media CASCADE;
DROP TABLE IF EXISTS person_titles CASCADE;
DROP TABLE IF EXISTS verification_log CASCADE;
DROP TABLE IF EXISTS contact_information CASCADE;
DROP TABLE IF EXISTS address CASCADE;
DROP TABLE IF EXISTS biometric_data CASCADE;
DROP TABLE IF EXISTS identity_document CASCADE;
DROP TABLE IF EXISTS person CASCADE;
DROP TABLE IF EXISTS admin_provision_action CASCADE;
DROP TABLE IF EXISTS security_device CASCADE;
DROP TABLE IF EXISTS identity_trust_chain CASCADE;
DROP TABLE IF EXISTS security_session CASCADE;
DROP TABLE IF EXISTS birthright_claim CASCADE;
DROP TABLE IF EXISTS offline_provision_packet CASCADE;
DROP TABLE IF EXISTS operating_system CASCADE;
DROP TABLE IF EXISTS allotment_codes CASCADE;

-- ===========================
-- Core tables
-- ===========================

CREATE TABLE person (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_name TEXT, 
    official_name TEXT NOT NULL,
    sovereign_name TEXT,
    gender VARCHAR(10), 
    date_of_birth DATE,
    country VARCHAR(100),
    password_hash TEXT,
    membership_no VARCHAR(64) UNIQUE,
    license_key VARCHAR(64) UNIQUE,
    contact_meta JSONB,
    identity_state VARCHAR(50) DEFAULT 'PROSPECT' CHECK (identity_state IN ('PROSPECT', 'UNVERIFIED', 'PREVERIFIED', 'VERIFIED', 'LOCKED', 'BLACKLISTED')),
    registration_state VARCHAR(50) DEFAULT 'INITIAL', CHECK (registration_state IN ('INITIAL', 'PENDING', 'PRECOMPLETE','COMPLETE')), 
    declaration_of_intent TEXT,
    is_frozen BOOLEAN DEFAULT FALSE, 
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    bound_machine_id TEXT,
    bound_ip_address INET,
    binding_date TIMESTAMP,
    failed_attempts INT DEFAULT 0
);

CREATE TABLE contact_information (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    contact_type VARCHAR(50), 
    contact_value VARCHAR(255) UNIQUE NOT NULL, -- Crucial for preventing double registration
    is_primary BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE contact_information ADD CONSTRAINT unique_contact_value UNIQUE (contact_value);
ALTER TABLE contact_information ADD CONSTRAINT unique_person_contact_type UNIQUE (person_id, contact_type);


CREATE TABLE person_security (
    person_id UUID PRIMARY KEY REFERENCES person(id) ON DELETE CASCADE,
    primary_ip_binding INET,
    last_login_ip INET,
    device_fingerprint TEXT,
    security_clearance INT DEFAULT 0,
    is_mfa_enabled BOOLEAN DEFAULT FALSE,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    client_version TEXT,
    root_identity_hash TEXT UNIQUE,             -- Hash of sovereign identity
    enclave_public_key TEXT,                    -- Device enclave key
    enclave_attested BOOLEAN DEFAULT FALSE,     -- Hardware attestation status
    trust_level INT DEFAULT 0 CHECK (trust_level BETWEEN 0 AND 5),
    risk_score INT DEFAULT 0,
    last_key_rotation TIMESTAMP,
    compromised BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_person_security_person_id ON person_security(person_id);


-- Platform (Shell & Binary Delivery)
CREATE TABLE operating_system (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(64) UNIQUE NOT NULL,           -- e.g., 'VPU_WIN_X64'
    name TEXT NOT NULL,                         -- e.g., 'Sovereign Shell Windows'
    os_name TEXT NOT NULL,                      -- e.g., 'Win32', 'Linux' (Matches navigator.platform)
    download_url TEXT,                          -- e.g., '/builds/vpu_shell_win.msi'
    version_tag VARCHAR(32),                    -- e.g., 'v1.0.1'
    is_active BOOLEAN DEFAULT TRUE,             -- Used to toggle availability
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for the Bridge to find downloads instantly
CREATE INDEX idx_operating_system_lookup ON operating_system(os_name, is_active);



CREATE TABLE identity_document (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    issuing_country VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (document_type, document_number)
);

CREATE TABLE biometric_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    data_type VARCHAR(50) NOT NULL,
    data BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE address (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    street_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE verification_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    verification_type VARCHAR(50) NOT NULL,
    verification_status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    details TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_identity_document_person_id ON identity_document(person_id);
CREATE INDEX idx_biometric_data_person_id ON biometric_data(person_id);
CREATE INDEX idx_address_person_id ON address(person_id);
CREATE INDEX idx_contact_information_person_id ON contact_information(person_id);
CREATE INDEX idx_verification_log_person_id ON verification_log(person_id);


-- ======================
-- PERSON MEDIA / TITLES
-- ======================
CREATE TABLE person_titles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE person_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    media_type VARCHAR(20), -- 'profile','cover','idFront','idBack'
    url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================
-- Updated_at trigger function
-- ===========================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all core tables
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname='public' AND tablename IN (
            'person', 'identity_document', 'biometric_data', 'address',
            'contact_information', 'verification_log'
        )
    LOOP
        EXECUTE format('
            CREATE TRIGGER trg_update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE PROCEDURE update_updated_at_column();',
            tbl, tbl
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ===========================
-- Membership tables
-- ===========================

CREATE TABLE membership_type (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    immutable BOOLEAN DEFAULT TRUE
);

CREATE TABLE membership_category (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    immutable BOOLEAN DEFAULT TRUE,
    membership_type_id INT REFERENCES membership_type(id)
);

-- Add Principal Category Flag (RESOURCEFUL / SEED)
ALTER TABLE membership_category 
ADD COLUMN principal_category_type VARCHAR(20) 
CHECK (principal_category_type IN ('RESOURCEFUL', 'SEED'));


CREATE TABLE membership_status (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE person_membership (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    membership_category_id INT REFERENCES membership_category(id),
    membership_status_id INT REFERENCES membership_status(id),
    start_date DATE NOT NULL,
    end_date DATE,
    policy_version TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_person_membership_person_id ON person_membership(person_id);
CREATE INDEX idx_person_membership_category_id ON person_membership(membership_category_id);
CREATE INDEX idx_person_membership_status_id ON person_membership(membership_status_id);


-- ===========================
-- Rank tables
-- ===========================

CREATE TABLE rank (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    rank_order INT NOT NULL,
    immutable BOOLEAN DEFAULT TRUE
);

CREATE TABLE rank_hierarchy (
    parent_rank_id INT REFERENCES rank(id) ON DELETE CASCADE,
    child_rank_id INT REFERENCES rank(id) ON DELETE CASCADE,
    PRIMARY KEY (parent_rank_id, child_rank_id)
);

CREATE TABLE person_rank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    rank_id INT REFERENCES rank(id),
    assigned_by_board_session_id UUID,
    assigned_by_decision_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    policy_version TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_single_active_rank
ON person_rank (person_id)
WHERE end_date IS NULL;

-- Trigger: enforce active membership + resourceful category
CREATE OR REPLACE FUNCTION enforce_rank_rules()
RETURNS TRIGGER AS $$
BEGIN
    -- Active membership check
    IF NOT EXISTS (
        SELECT 1 FROM person_membership
        WHERE person_id = NEW.person_id
        AND end_date IS NULL
    ) THEN
        RAISE EXCEPTION 'Person % does not have an active membership', NEW.person_id;
    END IF;

    -- Block SEED members
    IF EXISTS (
        SELECT 1 FROM person_membership pm
        JOIN membership_category mc ON pm.membership_category_id = mc.id
        WHERE pm.person_id = NEW.person_id
        AND mc.principal_category_type = 'SEED'
    ) THEN
        RAISE EXCEPTION 'Seed members cannot hold rank. Transition to Resourceful first.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_rank_rules
BEFORE INSERT ON person_rank
FOR EACH ROW EXECUTE FUNCTION enforce_rank_rules();

-- ===========================
-- Recognition tables
-- ===========================

CREATE TABLE recognition (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    name TEXT,
    description TEXT,
    is_lifetime BOOLEAN,
    immutable BOOLEAN DEFAULT TRUE
);

CREATE TABLE person_recognition (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    recognition_id INT REFERENCES recognition(id),
    awarded_by TEXT,
    award_reason TEXT,
    award_reference TEXT,
    start_date DATE,
    end_date DATE,
    policy_version TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_person_recognition_person_id ON person_recognition(person_id);
CREATE INDEX idx_person_recognition_recognition_id ON person_recognition(recognition_id);


-- ===========================
-- Training tables
-- ===========================

CREATE TABLE training_level (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE,
    name TEXT,
    description TEXT,
    level_order INT,
    immutable BOOLEAN DEFAULT TRUE
);

CREATE TABLE training_program (
    id SERIAL PRIMARY KEY,
    training_level_id INT REFERENCES training_level(id),
    name TEXT,
    description TEXT,
    delivery_mode TEXT,
    provider TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE person_training (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    training_program_id INT REFERENCES training_program(id),
    training_level_id INT REFERENCES training_level(id),
    enrollment_date DATE,
    completion_date DATE,
    verified_by TEXT,
    certificate_reference TEXT,
    policy_version TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE (person_id, training_program_id)
);


CREATE INDEX idx_person_training_person_id ON person_training(person_id);
CREATE INDEX idx_person_training_program_id ON person_training(training_program_id);
CREATE INDEX idx_person_training_level_id ON person_training(training_level_id);


-- ===========================
-- Formation / Mentorship
-- ===========================

CREATE TABLE formation_type (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE,
    name TEXT,
    description TEXT,
    immutable BOOLEAN DEFAULT TRUE
);

CREATE TABLE formation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formation_type_id INT REFERENCES formation_type(id),
    code VARCHAR(64),
    name TEXT,
    mandate TEXT,
    scope TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subformation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_formation_id UUID REFERENCES formation(id) ON DELETE CASCADE,
    code VARCHAR(64),
    name TEXT,
    mandate TEXT,
    scope TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE formation_officials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formation_id UUID REFERENCES formation(id) ON DELETE CASCADE,
    person_id UUID REFERENCES person(id),
    role TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE formation_relationship (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_formation_id UUID REFERENCES formation(id),
    child_formation_id UUID REFERENCES formation(id),
    relationship_type TEXT,
    policy_version TEXT
);

CREATE TABLE mentorship_structure_type (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE,
    name TEXT,
    description TEXT,
    immutable BOOLEAN DEFAULT TRUE
);

CREATE TABLE mentorship_structure (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    structure_type_id INT REFERENCES mentorship_structure_type(id),
    name TEXT,
    purpose TEXT,
    formation_scope TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE person_mentorship (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    mentorship_structure_id UUID REFERENCES mentorship_structure(id),
    role TEXT,
    start_date DATE,
    end_date DATE,
    policy_version TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_person_mentorship_person_id ON person_mentorship(person_id);
CREATE INDEX idx_person_mentorship_structure_id ON person_mentorship(mentorship_structure_id);


-- ======================
-- ACTION CENTERS
-- ======================
CREATE TABLE action_center (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    area_coordinates POINT,
    area_code VARCHAR(32),
    physical_area_name TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE action_center_officials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_center_id UUID REFERENCES action_center(id) ON DELETE CASCADE,
    person_id UUID REFERENCES person(id),
    role TEXT,
    start_date DATE,
    end_date DATE, 
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_action_center_officials_person_id ON action_center_officials(person_id);
CREATE INDEX idx_action_center_officials_action_center_id ON action_center_officials(action_center_id);

-- ======================
-- TLCS
-- ======================
CREATE TABLE tlc (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    action_center_id UUID REFERENCES action_center(id) ON DELETE CASCADE,
    mandate TEXT,
    scope TEXT,
    start_date DATE,
    end_date DATE,
    area_coordinates POINT,
    area_code VARCHAR(32),
    physical_area_name TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tlc_officials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tlc_id UUID REFERENCES tlc(id) ON DELETE CASCADE,
    person_id UUID REFERENCES person(id),
    role TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_tlc_officials_person_id ON tlc_officials(person_id);
CREATE INDEX idx_tlc_officials_tlc_id ON tlc_officials(tlc_id);

-- ===========================
-- Office tables
-- ===========================

CREATE TABLE office (
    id SERIAL PRIMARY KEY,
    formation_id UUID REFERENCES formation(id),
    code VARCHAR(64),
    title TEXT,
    description TEXT,
    is_executive BOOLEAN,
    immutable BOOLEAN DEFAULT TRUE
);

CREATE TABLE office_assignment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id INT REFERENCES office(id),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    assignment_type TEXT,
    start_date DATE,
    end_date DATE,
    policy_version TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_single_active_office_holder
ON office_assignment (office_id)
WHERE end_date IS NULL;

-- Trigger: enforce active membership for office
CREATE OR REPLACE FUNCTION enforce_active_membership()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM person_membership
        WHERE person_id = NEW.person_id
        AND end_date IS NULL
    ) THEN
        RAISE EXCEPTION 'Person % does not have an active membership', NEW.person_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_membership_required_for_office
BEFORE INSERT ON office_assignment
FOR EACH ROW EXECUTE FUNCTION enforce_active_membership();

-- ===========================
-- Ranking boards
-- ===========================

CREATE TABLE ranking_board_type (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE,
    name TEXT,
    description TEXT,
    immutable BOOLEAN DEFAULT TRUE
);

CREATE TABLE ranking_board_session (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_type_id INT REFERENCES ranking_board_type(id),
    purpose TEXT,
    initiated_by TEXT,
    policy_version TEXT,
    session_date DATE,
    status TEXT,
    required_quorum INT DEFAULT 7,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ranking_board_member (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_session_id UUID REFERENCES ranking_board_session(id) ON DELETE CASCADE,
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    role TEXT,
    rank_at_time_id INT REFERENCES rank(id),
    conflict_declared BOOLEAN NOT NULL DEFAULT FALSE,
    conflict_notes TEXT,
    joined_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TRIGGER trg_membership_required_for_board
BEFORE INSERT ON ranking_board_member
FOR EACH ROW EXECUTE FUNCTION enforce_rank_rules();

CREATE TABLE ranking_board_subject (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_session_id UUID REFERENCES ranking_board_session(id) ON DELETE CASCADE,
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    current_rank_id INT REFERENCES rank(id),
    target_rank_id INT REFERENCES rank(id),
    reason TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Prevent self-judgement
CREATE OR REPLACE FUNCTION prevent_self_judgement()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM ranking_board_member
        WHERE board_session_id = NEW.board_session_id
        AND person_id = NEW.person_id
    ) THEN
        RAISE EXCEPTION 'Board member % cannot be subject of the same board', NEW.person_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_self_judgement
BEFORE INSERT ON ranking_board_subject
FOR EACH ROW EXECUTE FUNCTION prevent_self_judgement();

CREATE TABLE ranking_decision (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_session_id UUID REFERENCES ranking_board_session(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES ranking_board_subject(id),
    decision TEXT,
    decision_notes TEXT,
    effective_date DATE,
    recorded_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Trigger: enforce quorum
CREATE OR REPLACE FUNCTION enforce_board_quorum()
RETURNS TRIGGER AS $$
DECLARE
    member_count INT;
BEGIN
    SELECT COUNT(*) INTO member_count
    FROM ranking_board_member
    WHERE board_session_id = NEW.board_session_id;
    IF member_count < (SELECT required_quorum FROM ranking_board_session WHERE id = NEW.board_session_id) THEN
        RAISE EXCEPTION 'Insufficient quorum for board session %', NEW.board_session_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_enforce_board_quorum
BEFORE INSERT ON ranking_decision
FOR EACH ROW EXECUTE FUNCTION enforce_board_quorum();

-- ===========================
-- Operational units
-- ===========================

CREATE TABLE operational_unit_type (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE,
    name TEXT,
    description TEXT,
    immutable BOOLEAN DEFAULT TRUE
);

CREATE TABLE operational_unit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operational_unit_type_id INT REFERENCES operational_unit_type(id),
    code VARCHAR(64),
    name TEXT,
    mandate TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE operational_unit_service (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operational_unit_id UUID REFERENCES operational_unit(id) ON DELETE CASCADE,
    formation_id UUID REFERENCES formation(id),
    service_type TEXT,
    policy_version TEXT
);

CREATE TABLE operational_role (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32),
    name TEXT,
    description TEXT
);

CREATE TABLE operational_assignment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operational_unit_id UUID REFERENCES operational_unit(id) ON DELETE CASCADE,
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    operational_role_id INT REFERENCES operational_role(id),
    start_date DATE,
    end_date DATE,
    policy_version TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_operational_assignment_person_id ON operational_assignment(person_id);
CREATE INDEX idx_operational_assignment_unit_id ON operational_assignment(operational_unit_id);


-- ===========================
-- Readiness pool
-- ===========================

CREATE TABLE readiness_pool (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    target_rank_id INT REFERENCES rank(id),
    criteria_summary TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE readiness_pool_assignment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    readiness_pool_id UUID REFERENCES readiness_pool(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('PENDING','READY','PROMOTED','WITHDRAWN')),
    start_date DATE,
    end_date DATE,
    policy_version TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger: readiness promotion enforcement
CREATE OR REPLACE FUNCTION enforce_readiness_promotion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'PROMOTED' THEN
        RAISE NOTICE 'Promotion recorded for %; ensure rank assignment follows', NEW.person_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_readiness_promotion_notice
AFTER UPDATE ON readiness_pool_assignment
FOR EACH ROW EXECUTE FUNCTION enforce_readiness_promotion();

CREATE INDEX idx_readiness_pool_assignment_person_id ON readiness_pool_assignment(person_id);
CREATE INDEX idx_readiness_pool_assignment_pool_id ON readiness_pool_assignment(readiness_pool_id);


-- ===========================
-- Certifications
-- ===========================

CREATE TABLE certification (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    immutable BOOLEAN DEFAULT TRUE
);

CREATE TABLE person_certification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    certification_id INT REFERENCES certification(id),
    awarded_date DATE,
    issuer TEXT,
    reference TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_person_certification_person_id ON person_certification(person_id);
CREATE INDEX idx_person_certification_certification_id ON person_certification(certification_id);

-- ===========================
-- Tenure
-- ===========================

CREATE TABLE tenure (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    entity_type TEXT CHECK (entity_type IN ('OFFICE','RANK','BOARD','OPERATIONAL')),
    entity_id UUID,
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger: auto-close tenure for office & rank
CREATE OR REPLACE FUNCTION auto_close_tenure()
RETURNS TRIGGER AS $$
DECLARE
    entity_type TEXT;
BEGIN
    IF TG_TABLE_NAME = 'office_assignment' THEN
        entity_type := 'OFFICE';
    ELSIF TG_TABLE_NAME = 'person_rank' THEN
        entity_type := 'RANK';
    ELSE
        RAISE EXCEPTION 'Trigger not applicable for table %', TG_TABLE_NAME;
    END IF;

    INSERT INTO tenure (
        person_id,
        entity_type,
        entity_id,
        start_date,
        end_date,
        created_at,
        updated_at
    )
    VALUES (
        NEW.person_id,
        entity_type,
        NEW.id,
        NEW.start_date,
        NEW.end_date,
        NOW(),
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenure_office
AFTER INSERT OR UPDATE ON office_assignment
FOR EACH ROW EXECUTE FUNCTION auto_close_tenure();

CREATE TRIGGER trg_tenure_rank
AFTER INSERT OR UPDATE ON person_rank
FOR EACH ROW EXECUTE FUNCTION auto_close_tenure();

CREATE INDEX idx_tenure_person_id ON tenure(person_id);


-- ===========================
-- Platform
-- ===========================

CREATE TABLE platform (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(64) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    purpose TEXT,
    owner_formation_id UUID REFERENCES formation(id),
    operational_unit_id UUID REFERENCES operational_unit(id),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================
-- Audit log
-- ===========================

CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    entity_type TEXT,
    entity_id UUID,
    action TEXT,
    performed_by TEXT,
    performed_at TIMESTAMP DEFAULT NOW(),
    details TEXT,
    previous_log_hash TEXT,
    log_hash TEXT NOT NULL,
    signature TEXT
);

CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (entity_type, entity_id, action, performed_by, details)
    VALUES (
        TG_TABLE_NAME,
        NEW.id,
        TG_OP,
        current_user,
        row_to_json(NEW)::TEXT
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Audit triggers for key tables
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname='public' AND tablename IN (
            'person','person_membership','person_rank','office_assignment',
            'ranking_board_session','ranking_board_member','ranking_board_subject','ranking_decision'
        )
    LOOP
        EXECUTE format('
            CREATE TRIGGER trg_audit_%I
            AFTER INSERT OR UPDATE OR DELETE ON %I
            FOR EACH ROW EXECUTE PROCEDURE log_audit();',
            tbl, tbl
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Hash chaining for audit log integrity
CREATE OR REPLACE FUNCTION hash_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    prev_hash TEXT;
BEGIN
    SELECT log_hash INTO prev_hash
    FROM audit_log
    ORDER BY id DESC
    LIMIT 1;

    NEW.previous_log_hash := prev_hash;
    NEW.log_hash := encode(
        digest(
            coalesce(prev_hash,'') || row_to_json(NEW)::TEXT,
            'sha256'
        ),
        'hex'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hash_audit_log
BEFORE INSERT ON audit_log
FOR EACH ROW EXECUTE FUNCTION hash_audit_log();

-- ===========================
-- Person Security Triggers
-- ===========================
CREATE OR REPLACE FUNCTION enforce_security_lock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.failed_login_attempts >= 5 OR NEW.risk_score > 80 THEN
        NEW.locked_until := NOW() + INTERVAL '24 hours';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_security_lock
BEFORE UPDATE ON person_security
FOR EACH ROW EXECUTE FUNCTION enforce_security_lock();

-- ===========================
-- Admin Provision Actions
-- ===========================
CREATE TABLE admin_provision_action (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_identity TEXT,
    action_type TEXT,
    target_person_id UUID,
    justification TEXT,
    air_gapped BOOLEAN DEFAULT FALSE,
    performed_at TIMESTAMP DEFAULT NOW()
);


-- ===========================
-- JUDICIAL SESSIONS
-- ===========================
CREATE TABLE judicial_session (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_ref TEXT,
    session_type VARCHAR(20) CHECK (session_type IN ('ORDERLY_ROOM', 'IMPEACHMENT')),
    defendant_id UUID REFERENCES person(id),
    presiding_officer_id UUID REFERENCES person(id),
    status VARCHAR(20) DEFAULT 'OPEN',
    verdict TEXT,
    required_quorum INT DEFAULT 9,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE judicial_panel_member (
    session_id UUID REFERENCES judicial_session(id),
    person_id UUID REFERENCES person(id),
    judicial_role VARCHAR(50),
    PRIMARY KEY (session_id, person_id)
);

CREATE OR REPLACE FUNCTION enforce_judicial_quorum()
RETURNS TRIGGER AS $$
DECLARE
    member_count INT;
BEGIN
    SELECT COUNT(*) INTO member_count
    FROM judicial_panel_member
    WHERE session_id = NEW.session_id;
    IF member_count < (SELECT required_quorum FROM judicial_session WHERE id = NEW.session_id) THEN
        RAISE EXCEPTION 'Insufficient quorum for judicial session %', NEW.session_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;    

CREATE TRIGGER trg_enforce_judicial_quorum
BEFORE UPDATE OF verdict ON judicial_session
FOR EACH ROW 
WHEN (NEW.verdict IS NOT NULL)
EXECUTE FUNCTION enforce_judicial_quorum();

-- ===========================
-- MEMBER BIRTHRIGHT
-- ===========================
CREATE TABLE member_birthright (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    storage_quota_mb INT DEFAULT 100,
    provisioning_status TEXT DEFAULT 'PENDING', CHECK (provisioning_status IN ('PENDING', 'UNPROVISIONED','PROVISIONED')), 
    activated_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_member_birthright_person_id ON member_birthright(person_id);
ALTER TABLE member_birthright ADD CONSTRAINT unique_person_birthright UNIQUE (person_id);


CREATE TABLE allotment_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    value_mb INTEGER DEFAULT 100,
    is_redeemed BOOLEAN DEFAULT FALSE,
    redeemed_by UUID REFERENCES person(id),
    redeemed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);


-- 1. Create the Function that performs the insertion
CREATE OR REPLACE FUNCTION initialize_member_birthright()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO member_birthright (person_id, storage_quota_mb, provisioning_status)
    VALUES (NEW.id, 100, 'PENDING');
    
    RAISE NOTICE 'GENESIS_BIRTHRIGHT_PROVISIONED: ID % initialized with 100MB.', NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Bind the Function to the 'person' table
DROP TRIGGER IF EXISTS trg_genesis_birthright ON person;
CREATE TRIGGER trg_genesis_birthright
AFTER INSERT ON person
FOR EACH ROW
EXECUTE FUNCTION initialize_member_birthright();


-- ===========================
-- SECURITY DEVICES
-- ===========================

CREATE TABLE security_device (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    device_fingerprint_hash TEXT UNIQUE NOT NULL,
    device_type TEXT,
    os_signature TEXT,
    enclave_attested BOOLEAN DEFAULT FALSE,
    provision_management VARCHAR(64),
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    UNIQUE (person_id, device_fingerprint_hash),
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_hardware_identity UNIQUE (device_fingerprint_hash),
    CONSTRAINT unique_person_device_pair UNIQUE (person_id, device_fingerprint_hash)
);
CREATE INDEX idx_security_device_fingerprint ON security_device(device_fingerprint_hash);  
CREATE INDEX idx_security_device_lookup ON security_device(device_fingerprint_hash, revoked);
CREATE INDEX idx_security_device_owner ON security_device(person_id);


-- ===========================
-- IDENTITY TRUST CHAIN
-- ===========================
CREATE TABLE identity_trust_chain (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    parent_chain_id UUID REFERENCES identity_trust_chain(id),
    public_key TEXT NOT NULL,
    key_purpose TEXT CHECK (key_purpose IN ('ROOT','DEVICE','SESSION','RECOVERY')),
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_security_device_person_id ON security_device(person_id);
CREATE INDEX idx_identity_trust_chain_person_id ON identity_trust_chain(person_id);

-- ===========================
-- SECURITY SESSIONS
-- ===========================
CREATE TABLE security_session (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    device_id UUID REFERENCES security_device(id),
    session_key_hash TEXT NOT NULL,
    ip_address INET,
    geo_hint TEXT,
    trust_snapshot INT,
    started_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    terminated_at TIMESTAMP,
    termination_reason TEXT
);
CREATE INDEX idx_security_session_person_id ON security_session(person_id);
CREATE INDEX idx_security_session_device_id ON security_session(device_id);

-- ===========================
-- BIRTHRIGHT CLAIMS
-- ===========================
CREATE TABLE birthright_claim (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    qr_payload_hash TEXT UNIQUE NOT NULL,
    issued_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    claimed_at TIMESTAMP,
    claim_device_id UUID REFERENCES security_device(id),
    revoked BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_birthright_claim_person_id ON birthright_claim(person_id);

-- ===========================
-- OFFLINE PROVISION PACKETS
-- ===========================
CREATE TABLE offline_provision_packet (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    packet_hash TEXT UNIQUE NOT NULL,
    issued_for_person_id UUID REFERENCES person(id),
    issued_by TEXT,
    issued_at TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP,
    consumed_at TIMESTAMP,
    integrity_verified BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_offline_provision_packet_person_id ON offline_provision_packet(issued_for_person_id);
CREATE INDEX idx_offline_provision_packet_hash ON offline_provision_packet(packet_hash);
CREATE INDEX idx_birthright_claim_device_id ON birthright_claim(claim_device_id);

-- ===========================
-- HOUSE ASSEMBLY MEMBERS
-- ===========================
CREATE TABLE house_assembly_member (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES person(id) ON DELETE CASCADE,
    session_term VARCHAR(64),
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_house_assembly_member_person_id ON house_assembly_member(person_id);  


-- ===========================
-- DEFAULT MENTORSHIP STRUCTURES
-- ===========================
INSERT INTO mentorship_structure_type (code, name, description) VALUES
('CIRCLE', 'Mentee Circle', 'Basic grouping for new members'),
('FOLD', 'Mentee Fold', 'Intermediate functional group'),
('CLUSTER', 'Mentee Cluster', 'Advanced collaborative unit'),
('CONCLAVE', 'Mentee Conclave', 'Highest mentee functional assembly');

-- =========================================
-- END OF FULL THEALCOHESION SCHEMA
-- =========================================

-- --- GOVERNANCE & AUTHORITY BINDING ---
-- Granting the Bridge User access to the Public Schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO archanti;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO archanti;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO archanti;

-- Ensure future tables created in this schema also inherit these permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO archanti;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO archanti;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO archanti;

-- Confirming Authority
DO $$ 
BEGIN 
    RAISE NOTICE 'SOVEREIGN_AUTHORITY: Privileges successfully bound to archanti.';
END $$;