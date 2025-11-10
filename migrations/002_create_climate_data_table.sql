-- ============================================================================
-- Migration: 002_create_climate_data_table.sql
-- Description: Create climate_data table for time series anomaly data
-- Created: 2025-10-30
-- ============================================================================

-- Ensure we're working in the public schema
SET search_path TO public;

-- Drop table if exists (for development only)
DROP TABLE IF EXISTS public.climate_data CASCADE;

-- Create climate_data table
CREATE TABLE public.climate_data (
    -- Primary key
    id SERIAL PRIMARY KEY,

    -- Foreign key to municipalities
    municipality_id INTEGER NOT NULL,

    -- Scenario and period identifiers
    scenario VARCHAR(10) NOT NULL,
    period VARCHAR(30) NOT NULL,
    period_start INTEGER,
    period_end INTEGER,

    -- ========================================================================
    -- PRECIPITATION INDICES (Anomalies from 1995-2014 baseline)
    -- All values represent CHANGES from historical baseline
    -- ========================================================================

    -- Consecutive Dry Days: longest run of days with PR < 1 mm (days)
    cdd DECIMAL(10, 4),

    -- Consecutive Wet Days: longest run of days with PR ≥ 1 mm (days)
    cwd DECIMAL(10, 4),

    -- Total precipitation on wet days ≥ 1 mm (mm)
    prcptot DECIMAL(10, 4),

    -- Count of days with precipitation ≥ 10 mm (days)
    r10mm DECIMAL(10, 4),

    -- Count of days with precipitation ≥ 20 mm (days)
    r20mm DECIMAL(10, 4),

    -- Precipitation from very wet days (>95th percentile) (mm)
    r95p DECIMAL(10, 4),

    -- Fraction of wet-day precipitation from very wet days (percentage points)
    r95ptot DECIMAL(10, 4),

    -- Precipitation from extremely wet days (>99th percentile) (mm)
    r99p DECIMAL(10, 4),

    -- Fraction of wet-day precipitation from extremely wet days (percentage points)
    r99ptot DECIMAL(10, 4),

    -- Maximum 1-day precipitation amount (mm)
    rx1day DECIMAL(10, 4),

    -- Maximum consecutive 5-day precipitation amount (mm)
    rx5day DECIMAL(10, 4),

    -- Simple Daily Intensity Index: mean precipitation on wet days (mm/day)
    sdii DECIMAL(10, 4),

    -- ========================================================================
    -- TEMPERATURE INDICES (Anomalies from 1995-2014 baseline)
    -- ========================================================================

    -- Frost days: count of days with tasmin < 0°C (days)
    fd DECIMAL(10, 4),

    -- Cold nights below 2°C: count of days with tasmin < 2°C (days)
    tnlt2 DECIMAL(10, 4),

    -- Hot days: count of days with tasmax ≥ 30°C (days)
    txge30 DECIMAL(10, 4),

    -- Share of days where tasmax exceeds 50th percentile (percentage points)
    txgt50p DECIMAL(10, 4),

    -- Cool days: percent of days with tasmax below 10th percentile (percentage points)
    tx10p DECIMAL(10, 4),

    -- Hot days: percent of days with tasmax above 90th percentile (percentage points)
    tx90p DECIMAL(10, 4),

    -- Cold nights: percent of days with tasmin below 10th percentile (percentage points)
    tn10p DECIMAL(10, 4),

    -- Warm nights: percent of days with tasmin above 90th percentile (percentage points)
    tn90p DECIMAL(10, 4),

    -- Annual maximum of daily maximum temperature - hottest day (°C)
    txx DECIMAL(10, 4),

    -- Annual minimum of daily maximum temperature - coolest day (°C)
    txn DECIMAL(10, 4),

    -- Annual maximum of daily minimum temperature - warmest night (°C)
    tnx DECIMAL(10, 4),

    -- Annual minimum of daily minimum temperature - coldest night (°C)
    tnn DECIMAL(10, 4),

    -- ========================================================================
    -- DURATION/SPELL INDICES (Anomalies from 1995-2014 baseline)
    -- ========================================================================

    -- Warm Spell Duration Index: days in spells ≥6 consecutive days (days)
    wsdi DECIMAL(10, 4),

    -- Cold Spell Duration Index: days in spells ≥6 consecutive days (days)
    csdi DECIMAL(10, 4),

    -- Joint TX-TN heatwave events: count of heatwave events (events)
    txd_tnd DECIMAL(10, 4),

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- ========================================================================
    -- CONSTRAINTS
    -- ========================================================================

    -- Foreign key to municipalities table
    CONSTRAINT fk_municipality
        FOREIGN KEY (municipality_id)
        REFERENCES public.municipalities(id)
        ON DELETE CASCADE,

    -- Unique constraint: one record per municipality/scenario/period
    CONSTRAINT uq_municipality_scenario_period
        UNIQUE (municipality_id, scenario, period),

    -- Check constraints for valid scenarios
    CONSTRAINT chk_scenario
        CHECK (scenario IN ('ssp126', 'ssp245', 'ssp370', 'ssp585')),

    -- Check constraints for valid periods
    CONSTRAINT chk_period
        CHECK (period IN ('near-term_2021-2040', 'mid-term_2041-2060', 'far-term_2081-2100'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index on municipality_id for joins
CREATE INDEX idx_climate_data_municipality_id
    ON public.climate_data(municipality_id);

-- Composite index for fast lookups by municipality + scenario + period
CREATE INDEX idx_climate_data_lookup
    ON public.climate_data(municipality_id, scenario, period);

-- Index on scenario for filtering
CREATE INDEX idx_climate_data_scenario
    ON public.climate_data(scenario);

-- Index on period for filtering
CREATE INDEX idx_climate_data_period
    ON public.climate_data(period);

-- Index on period_start for temporal queries
CREATE INDEX idx_climate_data_period_start
    ON public.climate_data(period_start);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_climate_data_timestamp
    BEFORE UPDATE ON public.climate_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set period_start and period_end based on period
CREATE OR REPLACE FUNCTION set_period_bounds()
RETURNS TRIGGER AS $$
BEGIN
    CASE NEW.period
        WHEN 'near-term_2021-2040' THEN
            NEW.period_start := 2021;
            NEW.period_end := 2040;
        WHEN 'mid-term_2041-2060' THEN
            NEW.period_start := 2041;
            NEW.period_end := 2060;
        WHEN 'far-term_2081-2100' THEN
            NEW.period_start := 2081;
            NEW.period_end := 2100;
    END CASE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set period bounds
CREATE TRIGGER trigger_set_period_bounds
    BEFORE INSERT OR UPDATE OF period ON public.climate_data
    FOR EACH ROW
    EXECUTE FUNCTION set_period_bounds();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.climate_data IS 'Time series climate anomaly data for municipalities - all values are CHANGES from 1995-2014 baseline';
COMMENT ON COLUMN public.climate_data.municipality_id IS 'Foreign key to municipalities table';
COMMENT ON COLUMN public.climate_data.scenario IS 'SSP scenario: ssp126 (low), ssp245 (moderate), ssp370 (high), ssp585 (very high)';
COMMENT ON COLUMN public.climate_data.period IS 'Time period: near-term (2021-2040), mid-term (2041-2060), far-term (2081-2100)';
COMMENT ON COLUMN public.climate_data.cdd IS 'Consecutive Dry Days anomaly (days)';
COMMENT ON COLUMN public.climate_data.prcptot IS 'Total precipitation anomaly (mm)';
COMMENT ON COLUMN public.climate_data.txge30 IS 'Hot days ≥30°C anomaly (days)';
COMMENT ON COLUMN public.climate_data.wsdi IS 'Warm Spell Duration Index anomaly (days) - heatwave indicator';
COMMENT ON COLUMN public.climate_data.txd_tnd IS 'Joint heatwave events anomaly (events)';

-- ============================================================================
-- VERIFICATION QUERIES (for testing after data load)
-- ============================================================================

-- Check total records (should be 2,544 = 213 municipalities × 4 scenarios × 3 periods)
-- SELECT COUNT(*) as total_records FROM public.climate_data;

-- Check data distribution
-- SELECT scenario, period, COUNT(*) as count
-- FROM public.climate_data
-- GROUP BY scenario, period
-- ORDER BY scenario, period;

-- Sample query: Get worst-case scenario data for a municipality
-- SELECT m.municipality_name, cd.scenario, cd.period, cd.txge30, cd.cdd, cd.wsdi
-- FROM public.climate_data cd
-- JOIN public.municipalities m ON m.id = cd.municipality_id
-- WHERE m.municipality_name = 'Dr Beyers Naude'
-- AND cd.scenario = 'ssp585'
-- ORDER BY cd.period_start;
