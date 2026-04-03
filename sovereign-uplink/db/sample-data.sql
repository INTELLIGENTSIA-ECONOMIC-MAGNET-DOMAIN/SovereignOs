-- Sample data to populate the identity registry with realistic values
-- Run this after schema.sql to resolve "Unknown" values

-- Insert sample ranks
INSERT INTO rank (code, name, description, rank_order) VALUES
('ARCHON', 'Archon (Supreme)', 'Supreme Sovereign Authority', 10),
('SOV', 'Sovereign', 'Full Sovereign Member', 9),
('CIT', 'Citizen', 'Verified Citizen', 5),
('PROS', 'Prospect', 'Identity Prospect', 1)
ON CONFLICT (code) DO NOTHING;

-- Insert membership categories
INSERT INTO membership_category (code, name, description, principal_category_type) VALUES
('FOUNDING', 'Founding Member', 'Original founding member', 'RESOURCEFUL'),
('RESOURCEFUL', 'Resourceful Member', 'Active contributing member', 'RESOURCEFUL'),
('SEED', 'Seed Member', 'Initial seed participant', 'SEED')
ON CONFLICT (code) DO NOTHING;

-- Insert membership status
INSERT INTO membership_status (code, description) VALUES
('ACTIVE', 'Active membership'),
('PENDING', 'Pending approval'),
('SUSPENDED', 'Temporarily suspended')
ON CONFLICT (code) DO NOTHING;

-- Update existing person records with sample data
UPDATE person SET
    gender = CASE
        WHEN id = '7e2efc91-bf5d-4f35-969d-ca52abd08e2f' THEN 'MALE'
        WHEN id = '9eea3a7d-1e21-4ffd-9c63-2f25f4ca0725' THEN 'MALE'
        ELSE 'FEMALE'
    END,
    country = CASE
        WHEN id = '7e2efc91-bf5d-4f35-969d-ca52abd08e2f' THEN 'US'
        WHEN id = '9eea3a7d-1e21-4ffd-9c63-2f25f4ca0725' THEN 'KE'
        ELSE 'CA'
    END,
    bound_machine_id = CASE
        WHEN id = '7e2efc91-bf5d-4f35-969d-ca52abd08e2f' THEN 'WORKSTATION-001'
        WHEN id = '9eea3a7d-1e21-4ffd-9c63-2f25f4ca0725' THEN 'LAPTOP-KE-001'
        ELSE 'SERVER-001'
    END,
    membership_no = CASE
        WHEN id = '7e2efc91-bf5d-4f35-969d-ca52abd08e2f' THEN 'ARCHON-001'
        WHEN id = '9eea3a7d-1e21-4ffd-9c63-2f25f4ca0725' THEN 'EPOS-2025-01226'
        ELSE 'MEMBER-001'
    END
WHERE id IN ('7e2efc91-bf5d-4f35-969d-ca52abd08e2f', '9eea3a7d-1e21-4ffd-9c63-2f25f4ca0725');

-- Insert person rank for the first user
INSERT INTO person_rank (person_id, rank_id, assigned_by_decision_id, start_date)
SELECT '7e2efc91-bf5d-4f35-969d-ca52abd08e2f', r.id, gen_random_uuid(), '2026-04-01'
FROM rank r WHERE r.code = 'ARCHON'
ON CONFLICT DO NOTHING;

-- Insert person membership
INSERT INTO person_membership (person_id, membership_category_id, membership_status_id, start_date)
SELECT
    p.id,
    mc.id,
    ms.id,
    '2026-04-01'
FROM person p
CROSS JOIN membership_category mc
CROSS JOIN membership_status ms
WHERE mc.code = 'FOUNDING' AND ms.code = 'ACTIVE'
AND p.id IN ('7e2efc91-bf5d-4f35-969d-ca52abd08e2f', '9eea3a7d-1e21-4ffd-9c63-2f25f4ca0725')
ON CONFLICT DO NOTHING;

-- Insert sample avatars
INSERT INTO person_media (person_id, media_type, url) VALUES
('7e2efc91-bf5d-4f35-969d-ca52abd08e2f', 'profile', '/images/avatars/archon-avatar.png'),
('9eea3a7d-1e21-4ffd-9c63-2f25f4ca0725', 'profile', '/images/avatars/citizen-avatar.png')
ON CONFLICT DO NOTHING;

-- Insert recognition data
INSERT INTO recognition (code, name, description) VALUES
('BLD', 'Builder', 'System builder and architect'),
('TRT', 'Truth Seeker', 'Committed to truth and transparency'),
('PTP', 'Pathfinder', 'Trailblazer and innovator'),
('ORIGIN', 'Origin Member', 'Original founding participant')
ON CONFLICT (code) DO NOTHING;

-- Link recognitions to people
INSERT INTO person_recognition (person_id, recognition_id, awarded_by, award_reason)
SELECT
    p.id,
    r.id,
    'SYSTEM',
    'Automatic award for founding member'
FROM person p
CROSS JOIN recognition r
WHERE r.code IN ('BLD', 'TRT', 'PTP', 'ORIGIN')
AND p.id = '7e2efc91-bf5d-4f35-969d-ca52abd08e2f'
ON CONFLICT DO NOTHING;