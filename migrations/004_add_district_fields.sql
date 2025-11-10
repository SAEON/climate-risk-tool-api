-- ============================================================================
-- Migration: 004_add_district_fields.sql
-- Description: Add district-level fields to municipalities table
-- Created: 2025-10-30
-- ============================================================================

-- Ensure we're working in the public schema
SET search_path TO public;

-- Add district fields to municipalities table
ALTER TABLE public.municipalities
    ADD COLUMN IF NOT EXISTS district_code VARCHAR(10),
    ADD COLUMN IF NOT EXISTS district_name VARCHAR(100);

-- Create index on district_code for fast district-level aggregations
CREATE INDEX IF NOT EXISTS idx_municipalities_district_code
    ON public.municipalities(district_code);

-- Create index on district_name for filtering
CREATE INDEX IF NOT EXISTS idx_municipalities_district_name
    ON public.municipalities(district_name);

-- Add comments
COMMENT ON COLUMN public.municipalities.district_code IS 'District code (e.g., "DC3" for Overberg)';
COMMENT ON COLUMN public.municipalities.district_name IS 'District name (e.g., "Overberg")';

-- Verification query
-- SELECT DISTINCT district_code, district_name, COUNT(*) as municipality_count
-- FROM public.municipalities
-- WHERE district_code IS NOT NULL
-- GROUP BY district_code, district_name
-- ORDER BY district_code;
