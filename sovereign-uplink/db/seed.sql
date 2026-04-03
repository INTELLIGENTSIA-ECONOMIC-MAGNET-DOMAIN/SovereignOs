-- 1. Insert Membership Categories
INSERT INTO membership_type (code, name) VALUES ('NATIVE', 'Space Native');

INSERT INTO membership_category (code, name, principal_category_type, membership_type_id) VALUES 
('FOUNDING', 'Founding Member', 'RESOURCEFUL', 1),
('ORDINARY', 'Ordinary Member', 'RESOURCEFUL', 1),
('SEED_NATIVE', 'Seed Space Native', 'SEED', 1),
('YOUTH', 'Youth Member', 'RESOURCEFUL', 1),
('HONORARY', 'Honorary Member', 'RESOURCEFUL', 1);

-- 2. Insert Official Sovereign Ranks (In Order)
INSERT INTO rank (code, name, rank_order) VALUES 
('M', 'Mentee', 1),
('JM', 'Junior Mentor', 2),
('SM', 'Senior Mentor', 3),
('JAAO', 'Junior Assistant Authenticating Officer', 4),
('SAAO', 'Senior Assistant Authenticating Officer', 5),
('AO', 'Authenticating Officer', 6),
('CAO', 'Chief Authenticating Officer', 7),
('CG.SNR.', 'Chief In General Senior', 8),
('ARCHON', 'Archon (Supreme)', 9);

-- 3. Insert Specific Recognitions
INSERT INTO recognition (code, name, is_lifetime) VALUES 
('BLD', 'The Builder', true),
('TRT', 'The Trustee', true),
('PTP', 'The Philanthropist', true),
('ORIGIN', 'Origin Founder', true);

INSERT INTO membership_status (code, description) VALUES ('ACTIVE', 'Member is in good standing');

-- 4. Initial Bootstrap Admin (The Lead Engineer)
INSERT INTO person (user_name, official_name, sovereign_name) 
VALUES ('ARCHAN_SUPREME', 'Michael Audi', 'Archantilani Ntilanima Archantima');

-- Link the admin to the Rank and Category using safe subqueries
INSERT INTO person_membership (person_id, membership_category_id, membership_status_id, start_date)
VALUES (
    (SELECT id FROM person WHERE user_name = 'ARCHAN_SUPREME'), 
    (SELECT id FROM membership_category WHERE code = 'FOUNDING'), -- Safe lookup
    (SELECT id FROM membership_status WHERE code = 'ACTIVE'),      -- Safe lookup
    NOW()
);

INSERT INTO person_rank (person_id, rank_id, assigned_by_decision_id, start_date)
VALUES (
    (SELECT id FROM person WHERE user_name = 'ARCHAN_SUPREME'), 
    (SELECT id FROM rank WHERE code = 'ARCHON'), 
    uuid_generate_v4(), 
    NOW()
);

-- 5. Assign initial recognitions to the admin
INSERT INTO person_recognition (person_id, recognition_id, awarded_by, award_reason, start_date)
SELECT 
    (SELECT id FROM person WHERE user_name = 'ARCHAN_SUPREME'),
    id,
    'SYSTEM_BOOTSTRAP',
    'Founding Sovereign Identity',
    NOW()
FROM recognition 
WHERE code IN ('BLD', 'TRT', 'PTP', 'ORIGIN');

-- 6. Initialize Admin Security (Mandatory for Login)
INSERT INTO person_security (person_id, primary_ip_binding, security_clearance)
VALUES (
    (SELECT id FROM person WHERE user_name = 'ARCHAN_SUPREME'),
    '127.0.0.1', -- Or your specific IP binding
    10           -- Level 10 Clearance for Archon
);

-- -----------------------------------------------------------------------------
-- Bulk test data seed: 20 countries, 100 action centers, 300 TLCs, 3600 members
-- -----------------------------------------------------------------------------

WITH country_list AS (
    SELECT * FROM (VALUES
        ('Kenya','Africa',-1.286389,36.817223),
        ('Brazil','Americas',-15.7801,-47.9292),
        ('Finland','Europe',60.1699,24.9384),
        ('Japan','Asia',35.6895,139.6917),
        ('Australia','Oceania',-35.2809,149.13),
        ('India','Asia',28.6139,77.2090),
        ('Canada','Americas',45.4215,-75.6972),
        ('Spain','Europe',40.4168,-3.7038),
        ('South Africa','Africa',-25.7479,28.2293),
        ('Argentina','Americas',-34.6037,-58.3816),
        ('Germany','Europe',52.52,13.4050),
        ('Mexico','Americas',19.4326,-99.1332),
        ('Singapore','Asia',1.3521,103.8198),
        ('New Zealand','Oceania',-41.2865,174.7762),
        ('Nigeria','Africa',9.0765,7.3986),
        ('Italy','Europe',41.9028,12.4964),
        ('Chile','Americas',-33.4489,-70.6693),
        ('Vietnam','Asia',21.0278,105.8342),
        ('Egypt','Africa',30.0444,31.2357),
        ('Netherlands','Europe',52.3676,4.9041)
    ) AS t(name, continent, lat, lng)
), new_centers AS (
    INSERT INTO action_center (name, area_code, physical_area_name, area_coordinates)
    SELECT
        'AC_' || LPAD(i::text, 3, '0') || '_' || UPPER(REPLACE(c.name, ' ', '_')),
        'AC' || LPAD(i::text, 3, '0'),
        c.name || ' Regional Hub',
        POINT(c.lng + mod(i, 5) * 0.25, c.lat + mod(i, 3) * 0.2)
    FROM generate_series(1,100) AS gs(i)
    JOIN country_list c ON c.name = (
         SELECT name FROM country_list ORDER BY name LIMIT 1 OFFSET ((i - 1) % 20)
    )
    RETURNING id, area_code, physical_area_name, area_coordinates
), new_tlcs AS (
    INSERT INTO tlc (name, action_center_id, mandate, scope, area_code, physical_area_name, area_coordinates)
    SELECT
        'TLC_' || ac.area_code || '_' || LPAD(j::text, 3, '0'),
        ac.id,
        'Monitoring and local engagement',
        'Community coordination',
        'TLC' || ac.area_code || LPAD(j::text, 3, '0'),
        ac.physical_area_name || ' - TLC ' || LPAD(j::text, 3, '0'),
        POINT(ac.area_coordinates[0] + (j - 2) * 0.05, ac.area_coordinates[1] + (j - 2) * 0.04)
    FROM new_centers ac,
         generate_series(1,3) AS t(j)
    RETURNING id, action_center_id, name
), member_base AS (
    SELECT
        'user_' || LPAD(g::text, 4, '0') AS user_name,
        'Member ' || g AS official_name,
        'SOV_' || LPAD(g::text, 4, '0') AS sovereign_name,
        (ARRAY['M','F'])[1 + ((g % 2)::int)] AS gender,
        (SELECT name FROM country_list ORDER BY name LIMIT 1 OFFSET ((g - 1) % 20)) AS country,
        'MEM' || LPAD(g::text, 4, '0') AS membership_no,
        'AC' || LPAD(((g - 1) % 100 + 1)::text, 3, '0') AS action_center_code,
        'TLC' || LPAD(((g - 1) % 300 + 1)::text, 3, '0') AS tlc_code,
        g
    FROM generate_series(1,3600) AS g
)
INSERT INTO person (user_name, official_name, sovereign_name, gender, country, membership_no, date_of_birth, identity_state, registration_state)
SELECT
    mb.user_name,
    mb.official_name,
    mb.sovereign_name,
    mb.gender,
    mb.country,
    mb.membership_no,
    NOW()::date - ((18 + (mb.g % 30)) * INTERVAL '1 year'),
    'VERIFIED',
    'COMPLETE'
FROM member_base mb;

INSERT INTO person_membership (person_id, membership_category_id, membership_status_id, action_center_id, tlc_id, start_date)
SELECT p.id,
       (SELECT id FROM membership_category WHERE code = CASE
            WHEN rn <= 900 THEN 'FOUNDING'
            WHEN rn <= 2700 THEN 'ORDINARY'
            WHEN rn <= 3300 THEN 'YOUTH'
            ELSE 'HONORARY'
       END),
       (SELECT id FROM membership_status WHERE code = 'ACTIVE'),
       ac.id,
       tlc.id,
       NOW()::date
FROM (
    SELECT p.id, ROW_NUMBER() OVER (ORDER BY p.user_name) AS rn,
           'AC' || LPAD(((ROW_NUMBER() OVER (ORDER BY p.user_name) - 1) % 100 + 1)::text, 3, '0') AS ac_code,
           'TLC' || LPAD(((ROW_NUMBER() OVER (ORDER BY p.user_name) - 1) % 300 + 1)::text, 3, '0') AS tlc_code
    FROM person p
    WHERE p.user_name LIKE 'user_%'
) p
JOIN action_center ac ON ac.area_code = p.ac_code
JOIN tlc tlc ON tlc.area_code = p.tlc_code;

INSERT INTO person_rank (person_id, rank_id, assigned_by_decision_id, start_date)
SELECT p.id,
       r.id,
       uuid_generate_v4(),
       NOW()::date
FROM (
    SELECT p.id, ROW_NUMBER() OVER (ORDER BY p.user_name) AS rn
    FROM person p
    WHERE p.user_name LIKE 'user_%'
) p
CROSS JOIN (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rank_num
    FROM rank
) r
WHERE (p.rn - 1) % (SELECT COUNT(*) FROM rank) + 1 = r.rank_num;

INSERT INTO person_security (person_id, primary_ip_binding, security_clearance)
SELECT p.id,
       '127.0.0.1',
       CASE
           WHEN rn <= 50 THEN 10
           WHEN rn <= 360 THEN 8
           WHEN rn <= 720 THEN 6
           ELSE 2
       END
FROM (
    SELECT p.id, ROW_NUMBER() OVER (ORDER BY p.user_name) AS rn
    FROM person p
    WHERE p.user_name LIKE 'user_%'
) p;

-- Link one official per AC and TLC (optional)
WITH ac_ordered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY area_code) AS rn
    FROM action_center
),
person_ordered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY user_name) AS rn
    FROM person
    WHERE user_name LIKE 'user_%'
)
INSERT INTO action_center_officials (action_center_id, person_id, role, start_date)
SELECT ac.id,
       p.id,
       'CENTRAL_OFFICER',
       NOW()::date
FROM ac_ordered ac
JOIN person_ordered p ON ac.rn = p.rn;

WITH tlc_ordered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS rn
    FROM tlc
),
person_ordered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY user_name) AS rn
    FROM person
    WHERE user_name LIKE 'user_%'
)
INSERT INTO tlc_officials (tlc_id, person_id, role, start_date)
SELECT t.id,
       p.id,
       'TLC_COORDINATOR',
       NOW()::date
FROM tlc_ordered t
JOIN person_ordered p ON t.rn = p.rn;

