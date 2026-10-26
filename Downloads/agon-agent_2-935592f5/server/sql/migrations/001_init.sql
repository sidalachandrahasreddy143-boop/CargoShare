-- ════════════════════════════════════════════════════════════════
-- CargoShare — PostgreSQL schema  |  migration 001_init
-- Apply: psql "$DATABASE_URL" -f sql/migrations/001_init.sql
-- Idempotent: uses IF NOT EXISTS / DO blocks throughout.
-- ════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ─────────────────────────── ENUM TYPES
DO $$ BEGIN
  CREATE TYPE user_role       AS ENUM ('trader', 'lsp', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE kyc_status      AS ENUM ('unverified', 'pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lsp_approval    AS ENUM ('pending', 'under_review', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transport_mode  AS ENUM ('rail', 'road', 'ship', 'air');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE container_status AS ENUM ('draft', 'active', 'paused', 'full', 'departed', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status   AS ENUM ('locked', 'payment_pending', 'confirmed', 'rejected', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status   AS ENUM ('created', 'authorized', 'captured', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payout_status    AS ENUM ('pending', 'processing', 'paid', 'on_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dispute_status   AS ENUM ('open', 'investigating', 'resolved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────── USERS (traders, LSP owners, admins)
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role            user_role NOT NULL DEFAULT 'trader',
  name            TEXT NOT NULL,
  company         TEXT,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,             -- bcrypt, self-built auth
  gstin           TEXT,                      -- 15-char GST identification number (traders)
  business_type   TEXT,                      -- manufacturer | wholesaler | exporter | ...
  address         TEXT,
  phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  kyc_status      kyc_status NOT NULL DEFAULT 'unverified',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─────────────────────────── OTP CHALLENGES (self-built OTP, SMS via provider)
CREATE TABLE IF NOT EXISTS otp_challenges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        TEXT NOT NULL,
  purpose      TEXT NOT NULL DEFAULT 'login',  -- login | register | reset
  otp_hash     TEXT NOT NULL,                  -- bcrypt hash of 6-digit code
  attempts     INT  NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_challenges(phone, created_at DESC);

-- ─────────────────────────── LSP PROFILES + APPROVAL WORKFLOW
CREATE TABLE IF NOT EXISTS lsp_profiles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name       TEXT NOT NULL,
  license_doc_url    TEXT,                    -- MinIO object URL
  license_number     TEXT,
  mode               transport_mode NOT NULL,
  fleet_details      JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { trucks: 12, wagons: 40, ... }
  hub_locations      JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ city, code, lat, lng }]
  bank_details       JSONB NOT NULL DEFAULT '{}'::jsonb,   -- encrypted-at-rest in prod (KMS/pgcrypto)
  approval_status    lsp_approval NOT NULL DEFAULT 'pending',
  rejection_reason   TEXT,
  inspection_notes   TEXT,                    -- editable ONLY by admin role
  data_quality_score INT  CHECK (data_quality_score BETWEEN 0 AND 100),  -- admin-only, feeds ranking
  reviewed_by        UUID REFERENCES users(id),
  reviewed_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lsp_status ON lsp_profiles(approval_status);

-- ─────────────────────────── CONTAINERS (spare space listings)
CREATE TABLE IF NOT EXISTS containers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lsp_id              UUID NOT NULL REFERENCES lsp_profiles(id) ON DELETE CASCADE,
  mode                transport_mode NOT NULL,
  container_ref       TEXT NOT NULL,           -- company's own container/wagon id
  origin              TEXT NOT NULL,
  origin_code         TEXT NOT NULL,           -- UN/LOCODE e.g. INMUN (Mundra)
  destination         TEXT NOT NULL,
  destination_code    TEXT NOT NULL,
  origin_lat          DOUBLE PRECISION,
  origin_lng          DOUBLE PRECISION,
  destination_lat     DOUBLE PRECISION,
  destination_lng     DOUBLE PRECISION,
  departure_datetime  TIMESTAMPTZ NOT NULL,
  arrival_datetime    TIMESTAMPTZ,
  total_capacity      NUMERIC(12,2) NOT NULL CHECK (total_capacity > 0),
  booked_capacity     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (booked_capacity >= 0),
  unit                TEXT NOT NULL DEFAULT 'MT',  -- MT | CBM | pallets | TEU
  rate_per_unit       NUMERIC(12,2) NOT NULL CHECK (rate_per_unit >= 0),
  min_booking_qty     NUMERIC(12,2) NOT NULL DEFAULT 1,
  cutoff_datetime     TIMESTAMPTZ,             -- booking cutoff
  cargo_types         TEXT[] NOT NULL DEFAULT '{}', -- ['FMCG','Pharma','Agri']
  status              container_status NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT booked_within_total CHECK (booked_capacity <= total_capacity)
);
CREATE INDEX IF NOT EXISTS idx_containers_route   ON containers(origin_code, destination_code, mode);
CREATE INDEX IF NOT EXISTS idx_containers_status  ON containers(status, departure_datetime);
CREATE INDEX IF NOT EXISTS idx_containers_lsp     ON containers(lsp_id);
-- Hot query: available space on a route, soonest departure
CREATE INDEX IF NOT EXISTS idx_containers_avail   ON containers(origin_code, destination_code, status, departure_datetime)
  WHERE status = 'active';

-- ─────────────────────────── BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref      TEXT NOT NULL UNIQUE DEFAULT ('CS-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  container_id     UUID NOT NULL REFERENCES containers(id),
  trader_id        UUID NOT NULL REFERENCES users(id),
  lsp_id           UUID NOT NULL REFERENCES lsp_profiles(id),
  cargo_details    JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { commodity, weight, packages, notes }
  qty_booked       NUMERIC(12,2) NOT NULL CHECK (qty_booked > 0),
  unit             TEXT NOT NULL DEFAULT 'MT',
  rate_per_unit    NUMERIC(12,2) NOT NULL,
  total_price      NUMERIC(12,2) NOT NULL,
  platform_fee     NUMERIC(12,2) NOT NULL DEFAULT 0,
  booking_status   booking_status NOT NULL DEFAULT 'locked',
  payment_status   payment_status NOT NULL DEFAULT 'created',
  lock_expires_at  TIMESTAMPTZ,                 -- mirrors Redis lock TTL (10 min)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bookings_trader    ON bookings(trader_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_container ON bookings(container_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status    ON bookings(booking_status);

-- ─────────────────────────── PAYMENTS (Razorpay/Cashfree — sandbox first)
CREATE TABLE IF NOT EXISTS payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  gateway           TEXT NOT NULL DEFAULT 'razorpay',
  gateway_order_id  TEXT UNIQUE,               -- order_xxx
  gateway_txn_id    TEXT,                      -- pay_xxx
  gateway_signature TEXT,
  amount            NUMERIC(12,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'INR',
  status            payment_status NOT NULL DEFAULT 'created',
  payout_status     payout_status NOT NULL DEFAULT 'pending',   -- settlement to LSP
  invoice_url       TEXT,                      -- MinIO path of generated PDF invoice
  raw_webhook       JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_order   ON payments(gateway_order_id);

-- ─────────────────────────── CHAT (Socket.io rooms, 1 room per booking)
CREATE TABLE IF NOT EXISTS chat_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID REFERENCES bookings(id) ON DELETE CASCADE,
  thread_id      UUID,                          -- for pre-booking inquiry threads
  sender_id      UUID NOT NULL REFERENCES users(id),
  receiver_id    UUID NOT NULL REFERENCES users(id),
  message_text   TEXT,
  attachment_url TEXT,                          -- MinIO object URL
  attachment_name TEXT,
  read_status    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_booking ON chat_messages(booking_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_thread  ON chat_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_unread  ON chat_messages(receiver_id, read_status) WHERE read_status = FALSE;

-- ─────────────────────────── REVIEWS & RATINGS
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  trader_id   UUID NOT NULL REFERENCES users(id),
  lsp_id      UUID NOT NULL REFERENCES lsp_profiles(id),
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_lsp ON reviews(lsp_id);

-- ─────────────────────────── DISPUTES (admin-mediated)
CREATE TABLE IF NOT EXISTS disputes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES bookings(id),
  raised_by    UUID NOT NULL REFERENCES users(id),
  reason       TEXT NOT NULL,
  description  TEXT,
  status       dispute_status NOT NULL DEFAULT 'open',
  resolution   TEXT,
  resolved_by  UUID REFERENCES users(id),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────── NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,    -- booking_confirmed | lsp_approved | payment_failed | chat_message | ...
  title       TEXT NOT NULL,
  body        TEXT,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ─────────────────────────── AUDIT LOG (admin actions)
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────── updated_at trigger
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','lsp_profiles','containers','bookings','payments']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_%1$s ON %1$s;
      CREATE TRIGGER trg_touch_%1$s BEFORE UPDATE ON %1$s
      FOR EACH ROW EXECUTE FUNCTION touch_updated_at();', t);
  END LOOP;
END $$;

-- ─────────────────────────── Atomic booking commit function
-- Called inside a transaction after the Redis lock is held:
--   lock → INSERT booking → SELECT ... FOR UPDATE container → check capacity → bump booked_capacity → COMMIT.
CREATE OR REPLACE FUNCTION commit_booking(
  p_container_id UUID,
  p_trader_id    UUID,
  p_lsp_id       UUID,
  p_qty          NUMERIC,
  p_cargo        JSONB,
  p_unit         TEXT
) RETURNS UUID AS $$
DECLARE
  v_total      NUMERIC;
  v_booked     NUMERIC;
  v_rate       NUMERIC;
  v_booking_id UUID;
  v_avail      NUMERIC;
BEGIN
  SELECT total_capacity, booked_capacity, rate_per_unit
    INTO v_total, v_booked, v_rate
    FROM containers
   WHERE id = p_container_id
     FOR UPDATE;                      -- row-level lock, serialises concurrent commits

  IF NOT FOUND THEN RAISE EXCEPTION 'CONTAINER_NOT_FOUND'; END IF;

  v_avail := v_total - v_booked;
  IF v_avail < p_qty THEN RAISE EXCEPTION 'INSUFFICIENT_CAPACITY:%', v_avail; END IF;

  UPDATE containers
     SET booked_capacity = booked_capacity + p_qty,
         status = CASE WHEN booked_capacity + p_qty >= total_capacity THEN 'full'::container_status
                       ELSE status END
   WHERE id = p_container_id;

  INSERT INTO bookings (container_id, trader_id, lsp_id, cargo_details, qty_booked,
                        unit, rate_per_unit, total_price, booking_status)
  VALUES (p_container_id, p_trader_id, p_lsp_id, p_cargo, p_qty,
          p_unit, v_rate, v_rate * p_qty, 'payment_pending')
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END $$ LANGUAGE plpgsql;
