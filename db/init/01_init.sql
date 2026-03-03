-- Initial database setup for Keşke Alsaydım
-- This runs when Docker container starts for the first time

-- Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE keskealsaydim TO keske;

-- Create schema for better organization (optional)
-- CREATE SCHEMA IF NOT EXISTS keske;
-- SET search_path TO keske, public;
