CREATE TABLE IF NOT EXISTS audit_events (id BIGSERIAL PRIMARY KEY,event_type TEXT NOT NULL,occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),payload_json JSONB NOT NULL,payload_hash CHAR(64) NOT NULL UNIQUE);
CREATE INDEX IF NOT EXISTS audit_events_occurred_at_idx ON audit_events(occurred_at);
CREATE TABLE IF NOT EXISTS telemetry_snapshots (id BIGSERIAL PRIMARY KEY,provider TEXT NOT NULL,coin TEXT NOT NULL,captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),payload_json JSONB NOT NULL,payload_hash CHAR(64) NOT NULL UNIQUE);
CREATE INDEX IF NOT EXISTS telemetry_provider_time_idx ON telemetry_snapshots(provider,captured_at);
CREATE TABLE IF NOT EXISTS fleet_assets (id BIGSERIAL PRIMARY KEY,asset_tag TEXT UNIQUE NOT NULL,serial_number TEXT,model TEXT,site TEXT,expected_count INTEGER DEFAULT 1,status TEXT DEFAULT 'ACTIVE',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS energy_readings (id BIGSERIAL PRIMARY KEY,meter_id TEXT NOT NULL,site TEXT NOT NULL,reading_at TIMESTAMPTZ NOT NULL,kwh NUMERIC(30,10) NOT NULL,source TEXT NOT NULL,UNIQUE(meter_id,reading_at));
CREATE TABLE IF NOT EXISTS energy_rates (id BIGSERIAL PRIMARY KEY,site TEXT NOT NULL,effective_from TIMESTAMPTZ NOT NULL,usd_per_kwh NUMERIC(20,10) NOT NULL,source TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reconciliation_records (id BIGSERIAL PRIMARY KEY,period_start TIMESTAMPTZ NOT NULL,period_end TIMESTAMPTZ NOT NULL,provider TEXT NOT NULL,pool_reward NUMERIC(30,12),onchain_payout NUMERIC(30,12),variance NUMERIC(30,12),status TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
