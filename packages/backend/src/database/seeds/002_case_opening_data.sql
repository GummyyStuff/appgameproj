-- Case Opening System Seed Data
-- This file contains all Tarkov-themed items and case configurations

-- Insert Tarkov Items by Category and Rarity

-- MEDICAL ITEMS
-- Common Medical Items
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Bandage', 'common', 50, 'medical', 'Basic medical bandage for treating wounds'),
('Painkillers', 'common', 75, 'medical', 'Over-the-counter pain medication'),
('AI-2 Medkit', 'common', 100, 'medical', 'Basic first aid kit from the Soviet era'),
('Splint', 'common', 80, 'medical', 'Medical splint for treating fractures'),
('Aseptic Bandage', 'common', 60, 'medical', 'Sterile bandage for wound treatment');

-- Uncommon Medical Items
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Salewa First Aid Kit', 'uncommon', 200, 'medical', 'Professional first aid kit'),
('Car First Aid Kit', 'uncommon', 180, 'medical', 'Automotive emergency medical kit'),
('Esmarch Tourniquet', 'uncommon', 150, 'medical', 'Medical tourniquet for stopping bleeding'),
('Hemostatic Drug', 'uncommon', 220, 'medical', 'Advanced bleeding control medication'),
('Analgin Painkillers', 'uncommon', 160, 'medical', 'Prescription strength pain medication');

-- Rare Medical Items
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('IFAK Personal Tactical First Aid Kit', 'rare', 500, 'medical', 'Military-grade individual first aid kit'),
('Augmentin Antibiotic', 'rare', 400, 'medical', 'Powerful antibiotic medication'),
('Vaseline Balm', 'rare', 450, 'medical', 'Medical petroleum jelly for various treatments'),
('Golden Star Balm', 'rare', 380, 'medical', 'Traditional healing balm'),
('Ibuprofen Painkillers', 'rare', 420, 'medical', 'High-strength anti-inflammatory medication');

-- Epic Medical Items
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Grizzly Medical Kit', 'epic', 1200, 'medical', 'Advanced military medical kit'),
('Surv12 Field Surgical Kit', 'epic', 1500, 'medical', 'Portable surgical equipment'),
('CMS Surgical Kit', 'epic', 1300, 'medical', 'Compact medical surgery kit'),
('Propital Injector', 'epic', 1000, 'medical', 'Combat stimulant injector'),
('Morphine Injector', 'epic', 1100, 'medical', 'Emergency pain relief injector');

-- Legendary Medical Items
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('LEDX Skin Transilluminator', 'legendary', 5000, 'medical', 'High-tech medical diagnostic device'),
('Ophthalmoscope', 'legendary', 4500, 'medical', 'Professional eye examination instrument'),
('Defibrillator', 'legendary', 6000, 'medical', 'Emergency cardiac resuscitation device');

-- ELECTRONICS ITEMS
-- Common Electronics
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Broken LCD', 'common', 40, 'electronics', 'Damaged liquid crystal display'),
('Damaged Hard Drive', 'common', 60, 'electronics', 'Corrupted computer storage device'),
('Old Phone', 'common', 80, 'electronics', 'Obsolete mobile phone'),
('Broken Lamp', 'common', 45, 'electronics', 'Non-functional electric lamp'),
('Used Battery', 'common', 35, 'electronics', 'Depleted electrical battery');

-- Uncommon Electronics
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('CPU Fan', 'uncommon', 150, 'electronics', 'Computer processor cooling fan'),
('RAM', 'uncommon', 200, 'electronics', 'Computer memory module'),
('Power Supply Unit', 'uncommon', 180, 'electronics', 'Computer power supply'),
('Motherboard', 'uncommon', 220, 'electronics', 'Computer main circuit board'),
('Network Card', 'uncommon', 160, 'electronics', 'Computer networking component');

-- Rare Electronics
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('SSD Drive', 'rare', 500, 'electronics', 'Solid state storage device'),
('Graphics Card', 'rare', 600, 'electronics', 'Computer graphics processing unit'),
('Processor', 'rare', 550, 'electronics', 'Computer central processing unit'),
('Webcam', 'rare', 400, 'electronics', 'Digital camera for video communication'),
('Smartphone', 'rare', 480, 'electronics', 'Modern mobile communication device');

-- Epic Electronics
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Tetriz Portable Game', 'epic', 1500, 'electronics', 'Rare handheld gaming device'),
('GreenBat Lithium Battery', 'epic', 1200, 'electronics', 'High-capacity rechargeable battery'),
('VPX Flash Storage Module', 'epic', 1300, 'electronics', 'Military-grade storage device'),
('Military Circuit Board', 'epic', 1100, 'electronics', 'Specialized electronic component'),
('Tactical Display Unit', 'epic', 1400, 'electronics', 'Military heads-up display');

-- Legendary Electronics
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('GPU (Graphics Processing Unit)', 'legendary', 8000, 'electronics', 'High-end graphics processing unit'),
('Military Power Filter', 'legendary', 6500, 'electronics', 'Advanced electrical filtering system'),
('AESA Radar Module', 'legendary', 7500, 'electronics', 'Advanced radar technology component');

-- CONSUMABLES ITEMS
-- Common Consumables
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Crackers', 'common', 30, 'consumables', 'Basic survival food'),
('Condensed Milk', 'common', 40, 'consumables', 'Preserved dairy product'),
('Water Bottle', 'common', 25, 'consumables', 'Basic hydration supply'),
('Canned Beef Stew', 'common', 50, 'consumables', 'Preserved meat meal'),
('Pack of Sugar', 'common', 35, 'consumables', 'Basic cooking ingredient');

-- Uncommon Consumables
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Tushonka Beef Stew', 'uncommon', 120, 'consumables', 'Military ration beef stew'),
('MRE (Meal Ready to Eat)', 'uncommon', 150, 'consumables', 'Complete military meal'),
('Energy Drink', 'uncommon', 100, 'consumables', 'Caffeinated beverage'),
('Herring', 'uncommon', 80, 'consumables', 'Preserved fish'),
('Oat Flakes', 'uncommon', 90, 'consumables', 'Nutritious breakfast cereal');

-- Rare Consumables
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Vodka', 'rare', 300, 'consumables', 'Premium Russian vodka'),
('Whiskey', 'rare', 350, 'consumables', 'High-quality whiskey'),
('Aquamari Water', 'rare', 250, 'consumables', 'Premium bottled water'),
('Slickers Chocolate Bar', 'rare', 200, 'consumables', 'Luxury chocolate treat'),
('Emelya Rye Croutons', 'rare', 180, 'consumables', 'Gourmet bread snack');

-- Epic Consumables
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Moonshine', 'epic', 800, 'consumables', 'Homemade high-proof alcohol'),
('Superwater', 'epic', 600, 'consumables', 'Enhanced hydration drink'),
('Premium Vodka', 'epic', 900, 'consumables', 'Top-shelf Russian vodka'),
('Luxury Chocolate', 'epic', 500, 'consumables', 'Artisanal chocolate bar'),
('Gourmet Coffee', 'epic', 400, 'consumables', 'Premium coffee beans');

-- Legendary Consumables
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Meldonin Injector', 'legendary', 3000, 'consumables', 'Performance enhancement drug'),
('SJ1 TGLabs Combat Stimulant', 'legendary', 3500, 'consumables', 'Military combat enhancement'),
('SJ6 TGLabs Combat Stimulant', 'legendary', 4000, 'consumables', 'Advanced combat stimulant');

-- VALUABLES ITEMS
-- Common Valuables
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Bolts', 'common', 20, 'valuables', 'Metal fastening hardware'),
('Screws', 'common', 25, 'valuables', 'Small metal fasteners'),
('Matches', 'common', 15, 'valuables', 'Fire-starting implements'),
('Duct Tape', 'common', 40, 'valuables', 'Adhesive repair tape'),
('Nails', 'common', 30, 'valuables', 'Construction fasteners');

-- Uncommon Valuables
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Gold Chain', 'uncommon', 200, 'valuables', 'Precious metal jewelry'),
('Silver Badge', 'uncommon', 150, 'valuables', 'Military or police insignia'),
('Chainlet', 'uncommon', 180, 'valuables', 'Small decorative chain'),
('Brass Knuckles', 'uncommon', 120, 'valuables', 'Metal hand weapon'),
('Cigarettes', 'uncommon', 100, 'valuables', 'Tobacco products');

-- Rare Valuables
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Rolex', 'rare', 800, 'valuables', 'Luxury Swiss timepiece'),
('Prokill Medallion', 'rare', 600, 'valuables', 'Commemorative medal'),
('Gold Skull Ring', 'rare', 700, 'valuables', 'Ornate gold jewelry'),
('Silver Lion', 'rare', 500, 'valuables', 'Decorative silver figurine'),
('Antique Book', 'rare', 450, 'valuables', 'Rare literary work');

-- Epic Valuables
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Antique Axe', 'epic', 1800, 'valuables', 'Historical weapon artifact'),
('Golden Rooster', 'epic', 2000, 'valuables', 'Ornate golden figurine'),
('Skull Ring', 'epic', 1500, 'valuables', 'Elaborate skull-themed jewelry'),
('Rare Painting', 'epic', 2200, 'valuables', 'Valuable artwork'),
('Antique Vase', 'epic', 1600, 'valuables', 'Historical ceramic piece');

-- Legendary Valuables
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Intelligence Folder', 'legendary', 10000, 'valuables', 'Classified military documents'),
('Bitcoin', 'legendary', 12000, 'valuables', 'Cryptocurrency storage device'),
('Rare Artifact', 'legendary', 15000, 'valuables', 'Mysterious ancient object');

-- KEYCARDS & KEYS ITEMS
-- Common Keys
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Factory Exit Key', 'common', 100, 'keycards', 'Basic facility access key'),
('Customs Office Key', 'common', 120, 'keycards', 'Administrative building access'),
('Gas Station Storage Key', 'common', 80, 'keycards', 'Fuel depot storage access'),
('Warehouse Key', 'common', 90, 'keycards', 'Industrial storage access'),
('Cabin Key', 'common', 70, 'keycards', 'Small building access key');

-- Uncommon Keys
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Dorm Room 114 Key', 'uncommon', 300, 'keycards', 'Dormitory room access'),
('Dorm Room 203 Key', 'uncommon', 350, 'keycards', 'Second floor dorm access'),
('Machinery Key', 'uncommon', 250, 'keycards', 'Industrial equipment access'),
('Office Key', 'uncommon', 280, 'keycards', 'Administrative office access'),
('Storage Room Key', 'uncommon', 200, 'keycards', 'General storage access');

-- Rare Keys
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('EMERCOM Medical Unit Key', 'rare', 800, 'keycards', 'Emergency medical facility access'),
('Sanitär Key', 'rare', 700, 'keycards', 'Sanitation facility access'),
('Checkpoint Key', 'rare', 900, 'keycards', 'Security checkpoint access'),
('Admin Office Key', 'rare', 750, 'keycards', 'High-level administrative access'),
('Secure Container Key', 'rare', 850, 'keycards', 'Secure storage access');

-- Epic Keys
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Red Keycard', 'epic', 3000, 'keycards', 'High-security laboratory access'),
('Violet Keycard', 'epic', 2800, 'keycards', 'Restricted research facility access'),
('ULTRA Medical Storage Key', 'epic', 2500, 'keycards', 'Premium medical storage access'),
('Manager Office Key', 'epic', 2200, 'keycards', 'Executive office access'),
('Arsenal Storage Key', 'epic', 2600, 'keycards', 'Weapons storage facility access');

-- Legendary Keys
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('Labs Access Keycard', 'legendary', 8000, 'keycards', 'TerraGroup Labs access card'),
('Marked Room Key', 'legendary', 10000, 'keycards', 'Special marked room access'),
('Reserve Marked Key', 'legendary', 12000, 'keycards', 'Military base marked room access');

-- Insert Case Types
INSERT INTO case_types (name, price, description, image_url, rarity_distribution) VALUES
('Scav Case', 500, 'Basic case containing common items found by Scavengers. Perfect for beginners looking to try their luck.', '/images/cases/scav-case.png', '{
    "common": 60,
    "uncommon": 25,
    "rare": 10,
    "epic": 4,
    "legendary": 1
}'::jsonb),

('PMC Case', 1500, 'Military-grade case with better odds for valuable items. Contains equipment used by Private Military Contractors.', '/images/cases/pmc-case.png', '{
    "common": 45,
    "uncommon": 30,
    "rare": 15,
    "epic": 8,
    "legendary": 2
}'::jsonb),

('Labs Case', 5000, 'Premium case from TerraGroup Labs with the highest chance for legendary items. Only for serious players.', '/images/cases/labs-case.png', '{
    "common": 30,
    "uncommon": 35,
    "rare": 20,
    "epic": 12,
    "legendary": 3
}'::jsonb);

-- Create case-item pool relationships
-- For simplicity, we'll add all items to all cases but with different weights based on rarity

-- Scav Case (focuses on common/uncommon items)
INSERT INTO case_item_pools (case_type_id, item_id, weight, value_multiplier)
SELECT 
    (SELECT id FROM case_types WHERE name = 'Scav Case'),
    ti.id,
    CASE ti.rarity
        WHEN 'common' THEN 10.0
        WHEN 'uncommon' THEN 5.0
        WHEN 'rare' THEN 2.0
        WHEN 'epic' THEN 0.8
        WHEN 'legendary' THEN 0.2
    END,
    CASE ti.rarity
        WHEN 'common' THEN 1.0
        WHEN 'uncommon' THEN 1.2
        WHEN 'rare' THEN 1.5
        WHEN 'epic' THEN 2.0
        WHEN 'legendary' THEN 3.0
    END
FROM tarkov_items ti;

-- PMC Case (balanced distribution)
INSERT INTO case_item_pools (case_type_id, item_id, weight, value_multiplier)
SELECT 
    (SELECT id FROM case_types WHERE name = 'PMC Case'),
    ti.id,
    CASE ti.rarity
        WHEN 'common' THEN 6.0
        WHEN 'uncommon' THEN 8.0
        WHEN 'rare' THEN 5.0
        WHEN 'epic' THEN 2.5
        WHEN 'legendary' THEN 0.5
    END,
    CASE ti.rarity
        WHEN 'common' THEN 1.2
        WHEN 'uncommon' THEN 1.5
        WHEN 'rare' THEN 2.0
        WHEN 'epic' THEN 2.5
        WHEN 'legendary' THEN 4.0
    END
FROM tarkov_items ti;

-- Labs Case (focuses on rare/epic/legendary items)
INSERT INTO case_item_pools (case_type_id, item_id, weight, value_multiplier)
SELECT 
    (SELECT id FROM case_types WHERE name = 'Labs Case'),
    ti.id,
    CASE ti.rarity
        WHEN 'common' THEN 3.0
        WHEN 'uncommon' THEN 4.0
        WHEN 'rare' THEN 8.0
        WHEN 'epic' THEN 6.0
        WHEN 'legendary' THEN 2.0
    END,
    CASE ti.rarity
        WHEN 'common' THEN 1.5
        WHEN 'uncommon' THEN 2.0
        WHEN 'rare' THEN 3.0
        WHEN 'epic' THEN 4.0
        WHEN 'legendary' THEN 6.0
    END
FROM tarkov_items ti;