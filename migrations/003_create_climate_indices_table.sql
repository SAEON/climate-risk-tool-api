-- ============================================================================
-- Migration: 003_create_climate_indices_table.sql
-- Description: Create climate_indices metadata table
-- Created: 2025-10-30
-- ============================================================================

-- Ensure we're working in the public schema
SET search_path TO public;

-- Drop table if exists (for development only)
DROP TABLE IF EXISTS public.climate_indices CASCADE;

-- Create climate_indices table
CREATE TABLE public.climate_indices (
    -- Primary key
    id SERIAL PRIMARY KEY,

    -- Index identifier (matches column name in climate_data table)
    index_code VARCHAR(20) UNIQUE NOT NULL,

    -- Display name
    index_name VARCHAR(255) NOT NULL,

    -- Category grouping
    category VARCHAR(50) NOT NULL,

    -- Full description
    description TEXT,

    -- Unit of measurement
    unit VARCHAR(50),

    -- Interpretation guidance
    interpretation TEXT,

    -- Risk direction: how to interpret higher/lower values
    -- 'higher_worse' = higher values indicate worse conditions (e.g., drought days, hot days)
    -- 'lower_worse' = lower values indicate worse conditions (e.g., cold nights, frost days)
    -- 'neutral' = context-dependent (e.g., precipitation can be too much or too little)
    risk_direction VARCHAR(20),

    -- Baseline period for anomalies
    baseline_period VARCHAR(20) DEFAULT '1995-2014',

    -- Display order for UI
    display_order INTEGER,

    -- Suggested color scheme for mapping
    color_scheme VARCHAR(50),

    -- Whether this index is active/visible in the UI
    is_active BOOLEAN DEFAULT true,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- ========================================================================
    -- CONSTRAINTS
    -- ========================================================================

    -- Check constraint for category
    CONSTRAINT chk_category
        CHECK (category IN ('precipitation', 'temperature', 'duration')),

    -- Check constraint for risk direction
    CONSTRAINT chk_risk_direction
        CHECK (risk_direction IN ('higher_worse', 'lower_worse', 'neutral'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Unique index on index_code
CREATE UNIQUE INDEX idx_climate_indices_code
    ON public.climate_indices(index_code);

-- Index on category for filtering
CREATE INDEX idx_climate_indices_category
    ON public.climate_indices(category);

-- Index on display_order for sorting
CREATE INDEX idx_climate_indices_display_order
    ON public.climate_indices(display_order);

-- Index on is_active for filtering
CREATE INDEX idx_climate_indices_active
    ON public.climate_indices(is_active);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_climate_indices_timestamp
    BEFORE UPDATE ON public.climate_indices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.climate_indices IS 'Metadata for climate indices - definitions, units, and interpretation guidance';
COMMENT ON COLUMN public.climate_indices.index_code IS 'Unique code matching column names in climate_data table (e.g., "cdd", "prcptot")';
COMMENT ON COLUMN public.climate_indices.index_name IS 'Human-readable name (e.g., "Consecutive Dry Days")';
COMMENT ON COLUMN public.climate_indices.category IS 'Category: precipitation, temperature, or duration';
COMMENT ON COLUMN public.climate_indices.risk_direction IS 'How to interpret values: higher_worse, lower_worse, or neutral';
COMMENT ON COLUMN public.climate_indices.color_scheme IS 'Suggested ColorBrewer scheme for choropleth maps';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Get all indices grouped by category
-- SELECT category, COUNT(*) as count
-- FROM public.climate_indices
-- GROUP BY category
-- ORDER BY category;

-- Get all active indices for UI
-- SELECT index_code, index_name, category, unit
-- FROM public.climate_indices
-- WHERE is_active = true
-- ORDER BY display_order;
