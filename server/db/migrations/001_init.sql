-- btree_gist lets a GiST index compare plain columns with "=", which the
-- bookings exclusion constraint below needs (istiraha_id WITH =).
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('guest', 'owner', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive unique email: "Ali@x.com" and "ali@x.com" are the same user.
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE istirahas (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id        INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name_en         TEXT NOT NULL,
  name_ar         TEXT NOT NULL,
  description_en  TEXT NOT NULL DEFAULT '',
  description_ar  TEXT NOT NULL DEFAULT '',
  city            TEXT NOT NULL,
  district        TEXT NOT NULL DEFAULT '',
  price_per_night NUMERIC(10, 0) NOT NULL CHECK (price_per_night > 0),
  capacity        INTEGER NOT NULL CHECK (capacity > 0),
  amenities       TEXT[] NOT NULL DEFAULT '{}',
  photos          TEXT[] NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX istirahas_city_idx ON istirahas (city) WHERE status = 'approved';
CREATE INDEX istirahas_owner_idx ON istirahas (owner_id);

-- One table holds both guest bookings and dates an owner blocked, so a single
-- constraint protects against every kind of overlap.
CREATE TABLE bookings (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  istiraha_id INTEGER NOT NULL REFERENCES istirahas (id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind        TEXT NOT NULL DEFAULT 'booking' CHECK (kind IN ('booking', 'block')),
  check_in    DATE NOT NULL,
  check_out   DATE NOT NULL,
  guests      INTEGER CHECK (guests > 0),
  total_price NUMERIC(10, 0) NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (check_out > check_in),

  -- '[)' means check_in is included and check_out is not, so one guest can
  -- check out on the same day the next guest checks in.
  stay DATERANGE GENERATED ALWAYS AS (daterange(check_in, check_out, '[)')) STORED,

  -- The core rule of the app: two confirmed rows for the same istiraha can
  -- never have overlapping (&&) date ranges. Postgres enforces this itself,
  -- even when two requests arrive at the exact same moment.
  CONSTRAINT no_double_booking
    EXCLUDE USING gist (istiraha_id WITH =, stay WITH &&)
    WHERE (status = 'confirmed')
);

CREATE INDEX bookings_user_idx ON bookings (user_id);
