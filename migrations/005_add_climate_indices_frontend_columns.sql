-- ============================================================================
-- Migration: 005_add_climate_indices_frontend_columns.sql
-- Description: Add frontend-required columns to climate_indices table
-- Created: 2025-12-02
-- ============================================================================

SET search_path TO public;

-- Add columns required by frontend application
ALTER TABLE public.climate_indices
  ADD COLUMN IF NOT EXISTS plain_language_description TEXT,
  ADD COLUMN IF NOT EXISTS technical_definition TEXT,
  ADD COLUMN IF NOT EXISTS sector VARCHAR(100),
  ADD COLUMN IF NOT EXISTS color_palette_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS anomaly_direction VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN public.climate_indices.plain_language_description IS 'Simple, non-technical explanation for general users';
COMMENT ON COLUMN public.climate_indices.technical_definition IS 'Detailed scientific/technical definition';
COMMENT ON COLUMN public.climate_indices.sector IS 'Relevant sectors (comma-separated): AFS=Agriculture/Food Security, H=Hydrology, WRH=Water Resources/Health';
COMMENT ON COLUMN public.climate_indices.color_palette_type IS 'Color palette category for visualization: diverging or sequential';
COMMENT ON COLUMN public.climate_indices.anomaly_direction IS 'How to interpret anomaly values: positive_bad, negative_bad, or neutral';

-- Create index for sector filtering
CREATE INDEX IF NOT EXISTS idx_climate_indices_sector
    ON public.climate_indices(sector);
