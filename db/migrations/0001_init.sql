-- Project Coffee Bean: initial relational schema.
--
-- Written in a portable SQL subset on purpose: the same file is applied to
-- PostgreSQL (source of truth) and to the SQLite snapshot shipped in the app.
-- Primary keys are stable text slugs so that ids survive rebuilds and can be
-- referenced by the knowledge graph and, later, by users' tasting logs.

CREATE TABLE country (
  code TEXT PRIMARY KEY,            -- ISO 3166-1 alpha-2
  name TEXT NOT NULL
);

CREATE TABLE roast_level (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE process (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT
);

CREATE TABLE variety (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('arabica', 'robusta', 'liberica', 'excelsa', 'hybrid'))
);

-- The flavour wheel (data/taxonomy/flavor-wheel.yaml): category > group > descriptor.
-- family_id is the tier-1 category every term belongs to (itself for a category).
CREATE TABLE flavor_note (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  tier      INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 3),
  parent_id TEXT REFERENCES flavor_note (id),
  family_id TEXT NOT NULL REFERENCES flavor_note (id)
);

CREATE TABLE drink_type (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('espresso', 'espresso-milk', 'filter', 'cold', 'other')),
  description TEXT
);

CREATE TABLE company (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  country_code      TEXT NOT NULL REFERENCES country (code),
  city              TEXT,
  founded_year      INTEGER,
  website           TEXT NOT NULL,
  description       TEXT,
  has_cafes         BOOLEAN,                   -- NULL = not known
  cafe_count_approx INTEGER,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  verified          BOOLEAN NOT NULL DEFAULT FALSE
);

-- Provenance: every company lists the pages its facts were taken from.
CREATE TABLE source (
  id           TEXT PRIMARY KEY,
  company_id   TEXT NOT NULL REFERENCES company (id),
  url          TEXT NOT NULL,
  retrieved_on DATE NOT NULL,
  note         TEXT
);

CREATE TABLE bean (
  id              TEXT PRIMARY KEY,            -- '<company>/<bean>'
  company_id      TEXT NOT NULL REFERENCES company (id),
  name            TEXT NOT NULL,
  roast_level_id  TEXT REFERENCES roast_level (id),
  process_id      TEXT REFERENCES process (id),
  is_blend        BOOLEAN NOT NULL DEFAULT FALSE,
  is_decaf        BOOLEAN NOT NULL DEFAULT FALSE,
  sold_whole_bean BOOLEAN NOT NULL DEFAULT TRUE,
  sold_ground     BOOLEAN NOT NULL DEFAULT FALSE,
  altitude_min_m  INTEGER,
  altitude_max_m  INTEGER,
  roaster_notes   TEXT,                        -- tasting notes as the roaster words them
  -- Sensory attributes, 1 = low, 2 = medium, 3 = medium-high, 4 = high.
  -- Only filled when the roaster publishes them; never estimated.
  sweetness       INTEGER CHECK (sweetness BETWEEN 1 AND 4),
  acidity         INTEGER CHECK (acidity BETWEEN 1 AND 4),
  body            INTEGER CHECK (body BETWEEN 1 AND 4),
  bitterness      INTEGER CHECK (bitterness BETWEEN 1 AND 4),
  serve           TEXT CHECK (serve IN ('black', 'milk', 'either')),  -- how the roaster suggests drinking it
  url             TEXT NOT NULL,
  availability    TEXT NOT NULL DEFAULT 'current' CHECK (availability IN ('current', 'seasonal', 'discontinued')),
  retrieved_on    DATE NOT NULL,
  CHECK (sold_whole_bean OR sold_ground)       -- instant coffee is out of scope
);

CREATE TABLE origin (
  id           TEXT PRIMARY KEY,
  country_code TEXT NOT NULL REFERENCES country (code),
  region       TEXT,
  producer     TEXT
);

CREATE TABLE bean_origin (
  bean_id   TEXT NOT NULL REFERENCES bean (id),
  origin_id TEXT NOT NULL REFERENCES origin (id),
  percent   INTEGER CHECK (percent BETWEEN 1 AND 100),
  PRIMARY KEY (bean_id, origin_id)
);

CREATE TABLE bean_variety (
  bean_id    TEXT NOT NULL REFERENCES bean (id),
  variety_id TEXT NOT NULL REFERENCES variety (id),
  PRIMARY KEY (bean_id, variety_id)
);

CREATE TABLE bean_flavor_note (
  bean_id        TEXT NOT NULL REFERENCES bean (id),
  flavor_note_id TEXT NOT NULL REFERENCES flavor_note (id),
  position       INTEGER NOT NULL,             -- order in which the roaster lists the note
  PRIMARY KEY (bean_id, flavor_note_id)
);

-- Brew methods the roaster recommends for a bean (drink_type ids such as espresso, moka-pot).
CREATE TABLE bean_brew_method (
  bean_id       TEXT NOT NULL REFERENCES bean (id),
  drink_type_id TEXT NOT NULL REFERENCES drink_type (id),
  PRIMARY KEY (bean_id, drink_type_id)
);

CREATE TABLE cafe (
  id           TEXT PRIMARY KEY,               -- '<company>/<cafe>'
  company_id   TEXT NOT NULL REFERENCES company (id),
  name         TEXT NOT NULL,
  city         TEXT NOT NULL,
  country_code TEXT NOT NULL REFERENCES country (code),
  address      TEXT,
  latitude     NUMERIC,
  longitude    NUMERIC,
  url          TEXT
);

CREATE TABLE menu_item (
  id            TEXT PRIMARY KEY,              -- '<company>/<item>'
  company_id    TEXT NOT NULL REFERENCES company (id),
  cafe_id       TEXT REFERENCES cafe (id),     -- NULL = served across the company's cafes
  drink_type_id TEXT NOT NULL REFERENCES drink_type (id),
  name          TEXT NOT NULL,
  notes         TEXT,
  sweetness     INTEGER CHECK (sweetness BETWEEN 1 AND 4),
  acidity       INTEGER CHECK (acidity BETWEEN 1 AND 4),
  body          INTEGER CHECK (body BETWEEN 1 AND 4),
  bitterness    INTEGER CHECK (bitterness BETWEEN 1 AND 4),
  beans_known   BOOLEAN NOT NULL DEFAULT FALSE, -- FALSE = the company does not publish which bean is used
  source_url    TEXT NOT NULL,
  retrieved_on  DATE NOT NULL
);

CREATE TABLE menu_item_bean (
  menu_item_id TEXT NOT NULL REFERENCES menu_item (id),
  bean_id      TEXT NOT NULL REFERENCES bean (id),
  PRIMARY KEY (menu_item_id, bean_id)
);

CREATE TABLE menu_item_flavor_note (
  menu_item_id   TEXT NOT NULL REFERENCES menu_item (id),
  flavor_note_id TEXT NOT NULL REFERENCES flavor_note (id),
  position       INTEGER NOT NULL,
  PRIMARY KEY (menu_item_id, flavor_note_id)
);

CREATE INDEX idx_company_country ON company (country_code);
CREATE INDEX idx_flavor_note_family ON flavor_note (family_id);
CREATE INDEX idx_bean_company ON bean (company_id);
CREATE INDEX idx_bean_flavor_note_note ON bean_flavor_note (flavor_note_id);
CREATE INDEX idx_bean_origin_origin ON bean_origin (origin_id);
CREATE INDEX idx_cafe_company ON cafe (company_id);
CREATE INDEX idx_menu_item_company ON menu_item (company_id);
CREATE INDEX idx_menu_item_bean_bean ON menu_item_bean (bean_id);

-- The uniform flavour profile: for every bean and drink, how many of its
-- tasting notes fall in each of the nine flavour-wheel families. This is what
-- the app draws, so anyone using the data gets the same picture.
CREATE VIEW bean_flavor_family AS
SELECT bfn.bean_id, n.family_id, count(*) AS notes
  FROM bean_flavor_note bfn
  JOIN flavor_note n ON n.id = bfn.flavor_note_id
 GROUP BY bfn.bean_id, n.family_id;

CREATE VIEW menu_item_flavor_family AS
SELECT mf.menu_item_id, n.family_id, count(*) AS notes
  FROM menu_item_flavor_note mf
  JOIN flavor_note n ON n.id = mf.flavor_note_id
 GROUP BY mf.menu_item_id, n.family_id;
