-- ============================================================================
-- Migration: 001_create_municipalities_table.sql
-- Description: Create municipalities table with PostGIS geometry support
-- Created: 2025-10-30
-- ============================================================================

-- Ensure we're working in the public schema
SET search_path TO public;

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop table if exists (for development only - remove in production)
DROP TABLE IF EXISTS public.municipalities CASCADE;

-- Create municipalities table
CREATE TABLE public.municipalities (
    -- Primary key
    id SERIAL PRIMARY KEY,

    -- Municipality identifiers
    objectid INTEGER UNIQUE NOT NULL,
    municipality_name VARCHAR(255) NOT NULL,
    municipality_code VARCHAR(50),

    -- Geographic/administrative data
    province VARCHAR(100),
    category VARCHAR(100),
    cat2 VARCHAR(100),
    cat_b VARCHAR(100),

    -- PostGIS geometry column (WGS84 - EPSG:4326)
    geom GEOMETRY(MultiPolygon, 4326),

    -- Calculated fields (will be computed after geometry insert)
    centroid_lat DECIMAL(10, 7),
    centroid_lon DECIMAL(10, 7),
    area_km2 DECIMAL(12, 2),

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Unique index on objectid (for joins with CSV data)
CREATE UNIQUE INDEX idx_municipalities_objectid
    ON public.municipalities(objectid);

-- Index on municipality name (for search/autocomplete)
CREATE INDEX idx_municipalities_name
    ON public.municipalities(municipality_name);

-- Index on province (for filtering by province)
CREATE INDEX idx_municipalities_province
    ON public.municipalities(province);

-- Spatial index on geometry (critical for map performance)
CREATE INDEX idx_municipalities_geom
    ON public.municipalities USING GIST(geom);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_municipalities_timestamp
    BEFORE UPDATE ON public.municipalities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically calculate centroid and area after geometry insert/update
CREATE OR REPLACE FUNCTION calculate_geom_properties()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.geom IS NOT NULL THEN
        -- Calculate centroid (in WGS84)
        NEW.centroid_lat := ST_Y(ST_Centroid(NEW.geom));
        NEW.centroid_lon := ST_X(ST_Centroid(NEW.geom));

        -- Calculate area in km² (transform to appropriate projection for accurate area)
        -- Using EPSG:3857 (Web Mercator) for approximate area calculation
        NEW.area_km2 := ST_Area(ST_Transform(NEW.geom, 3857)) / 1000000;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate centroid and area
CREATE TRIGGER trigger_calculate_geom_properties
    BEFORE INSERT OR UPDATE OF geom ON public.municipalities
    FOR EACH ROW
    EXECUTE FUNCTION calculate_geom_properties();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.municipalities IS 'Master table storing South African municipality boundaries and metadata';
COMMENT ON COLUMN public.municipalities.id IS 'Auto-incrementing primary key';
COMMENT ON COLUMN public.municipalities.objectid IS 'Original OBJECTID from source shapefiles/CSV - used for joins';
COMMENT ON COLUMN public.municipalities.municipality_name IS 'Official municipality name (e.g., "Dr Beyers Naude", "Makana")';
COMMENT ON COLUMN public.municipalities.municipality_code IS 'Official municipality code from source data';
COMMENT ON COLUMN public.municipalities.province IS 'Province name (e.g., "Eastern Cape", "KwaZulu-Natal")';
COMMENT ON COLUMN public.municipalities.geom IS 'PostGIS geometry - MultiPolygon in WGS84 (EPSG:4326)';
COMMENT ON COLUMN public.municipalities.centroid_lat IS 'Calculated centroid latitude (auto-computed)';
COMMENT ON COLUMN public.municipalities.centroid_lon IS 'Calculated centroid longitude (auto-computed)';
COMMENT ON COLUMN public.municipalities.area_km2 IS 'Calculated area in square kilometers (auto-computed)';

-- ============================================================================
-- GRANTS (adjust as needed for your database users)
-- ============================================================================

-- Grant permissions (uncomment and adjust as needed)
-- GRANT SELECT ON municipalities TO readonly_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON municipalities TO api_user;

-- ============================================================================
-- VERIFICATION QUERIES (for testing after data load)
-- ============================================================================

-- Verify table creation
-- SELECT COUNT(*) as total_municipalities FROM municipalities;

-- Check PostGIS geometry validity
-- SELECT municipality_name, ST_IsValid(geom) as is_valid, ST_GeometryType(geom) as geom_type
-- FROM municipalities
-- WHERE NOT ST_IsValid(geom);

-- Sample query: Get municipality with geometry as GeoJSON
-- SELECT municipality_name, province, ST_AsGeoJSON(geom) as geometry
-- FROM municipalities
-- LIMIT 1;
