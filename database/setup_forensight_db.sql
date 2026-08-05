-- ForenSight: AI-Powered Digital Evidence Investigation and Analysis Platform
-- PostgreSQL Database Schema Setup Script
-- Designed for compliance with ISO/IEC 27037 & Chain-of-Custody specifications

BEGIN;

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------
-- Clean up existing tables (Clean build)
-- -------------------------------------------------------------
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS search_index CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS timeline CASCADE;
DROP TABLE IF EXISTS entities CASCADE;
DROP TABLE IF EXISTS ocr_text CASCADE;
DROP TABLE IF EXISTS evidence_metadata CASCADE;
DROP TABLE IF EXISTS evidence CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- -------------------------------------------------------------
-- 1. ROLES TABLE DEFINITION
-- -------------------------------------------------------------
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    clearance_level INT NOT NULL
);

-- -------------------------------------------------------------
-- 2. USERS TABLE DEFINITION
-- -------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

-- -------------------------------------------------------------
-- 3. CASES TABLE DEFINITION
-- -------------------------------------------------------------
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    lead_investigator_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_case_investigator FOREIGN KEY (lead_investigator_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_case_status CHECK (status IN ('ACTIVE', 'UNDER_REVIEW', 'ARCHIVED'))
);

-- -------------------------------------------------------------
-- 4. EVIDENCE TABLE DEFINITION
-- -------------------------------------------------------------
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_path VARCHAR(1024),
    file_size_bytes BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    sha256_hash VARCHAR(64) UNIQUE NOT NULL,
    sha3_hash VARCHAR(64) UNIQUE NOT NULL,
    storage_vault_key VARCHAR(1024) NOT NULL,
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_evidence_case FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    CONSTRAINT chk_file_size CHECK (file_size_bytes > 0)
);

-- -------------------------------------------------------------
-- 5. EVIDENCE_METADATA TABLE DEFINITION
-- -------------------------------------------------------------
CREATE TABLE evidence_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id UUID UNIQUE NOT NULL,
    camera_model VARCHAR(100),
    gps_coordinates VARCHAR(100),
    original_creation_timestamp TIMESTAMP WITH TIME ZONE,
    mime_type VARCHAR(100),
    system_owner VARCHAR(100),
    raw_properties JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT fk_metadata_evidence FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- 6. OCR_TEXT TABLE DEFINITION
-- -------------------------------------------------------------
CREATE TABLE ocr_text (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id UUID NOT NULL,
    page_number INT DEFAULT 1,
    extracted_text TEXT NOT NULL,
    bounding_boxes JSONB,
    confidence_score NUMERIC(5,2),
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ocr_evidence FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
    CONSTRAINT chk_confidence CHECK (confidence_score BETWEEN 0.00 AND 100.00)
);

-- -------------------------------------------------------------
-- 7. ENTITIES TABLE DEFINITION
-- -------------------------------------------------------------
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id UUID NOT NULL,
    entity_value VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    confidence NUMERIC(5,2),
    context_snippet TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_entity_evidence FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- 8. TIMELINE TABLE DEFINITION
-- -------------------------------------------------------------
CREATE TABLE timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL,
    evidence_id UUID,
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    timestamp_source VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'INFO',
    CONSTRAINT fk_timeline_case FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    CONSTRAINT fk_timeline_evidence FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE SET NULL,
    CONSTRAINT chk_timeline_severity CHECK (severity IN ('INFO', 'WARNING', 'HIGH', 'CRITICAL'))
);

-- -------------------------------------------------------------
-- 9. REPORTS TABLE DEFINITION
-- -------------------------------------------------------------
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL,
    generated_by_id UUID,
    report_number VARCHAR(50) UNIQUE NOT NULL,
    content_summary TEXT,
    file_vault_key VARCHAR(1024) NOT NULL,
    cryptographic_checksum VARCHAR(64) NOT NULL,
    digital_signature TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_report_case FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    CONSTRAINT fk_report_user FOREIGN KEY (generated_by_id) REFERENCES users(id) ON DELETE SET NULL
);

-- -------------------------------------------------------------
-- 10. ACTIVITY_LOGS (Chain of Custody Ledger) TABLE DEFINITION
-- -------------------------------------------------------------
CREATE TABLE activity_logs (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID,
    action_type VARCHAR(100) NOT NULL,
    associated_item_id UUID,
    record_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    previous_block_hash VARCHAR(64) NOT NULL,
    active_block_hash VARCHAR(64) UNIQUE NOT NULL,
    signature_proof VARCHAR(128),
    CONSTRAINT fk_activity_operator FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL
);

-- -------------------------------------------------------------
-- 11. SEARCH_INDEX TABLE DEFINITION
-- -------------------------------------------------------------
CREATE TABLE search_index (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id UUID NOT NULL,
    content_block TEXT NOT NULL,
    fts_vector TSVECTOR,
    embedding_vector REAL[] NOT NULL, -- Holds local Sentence Transformer floats
    CONSTRAINT fk_search_evidence FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- 12. NOTIFICATIONS TABLE DEFINITION
-- -------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- INDEX DEFINITIONS FOR QUERY OPTIMIZATION
-- -------------------------------------------------------------

-- Indexes on Foreign Keys (Accelerate Joins)
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_cases_lead ON cases(lead_investigator_id);
CREATE INDEX idx_evidence_case ON evidence(case_id);
CREATE INDEX idx_metadata_evidence ON evidence_metadata(evidence_id);
CREATE INDEX idx_ocr_evidence ON ocr_text(evidence_id);
CREATE INDEX idx_entities_evidence ON entities(evidence_id);
CREATE INDEX idx_timeline_case ON timeline(case_id);
CREATE INDEX idx_timeline_evidence ON timeline(evidence_id);
CREATE INDEX idx_reports_case ON reports(case_id);
CREATE INDEX idx_reports_user ON reports(generated_by_id);
CREATE INDEX idx_activity_operator ON activity_logs(operator_id);
CREATE INDEX idx_search_evidence ON search_index(evidence_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);

-- GIN Index for PostgreSQL Full Text Search (FTS)
CREATE INDEX idx_search_fts ON search_index USING gin(fts_vector);

-- GIN Index for JSONB properties in Evidence Metadata (Enables nested object lookups)
CREATE INDEX idx_metadata_properties ON evidence_metadata USING gin(raw_properties);

-- B-Tree index on event timestamps (Accelerates chronological sorting in timeline)
CREATE INDEX idx_timeline_timestamp ON timeline(event_timestamp);

-- B-Tree index on audit block timestamps (Chaining checks)
CREATE INDEX idx_activity_timestamp ON activity_logs(record_timestamp);

-- -------------------------------------------------------------
-- SEED VALUES DEFINITION (Initial baseline data)
-- -------------------------------------------------------------

-- Inject platform security clearance roles
INSERT INTO roles (id, name, description, clearance_level) VALUES
('d1a3c6b5-773a-4421-a4b5-992a7fb3a121', 'SysAdmin', 'System Administrator - Configures database, rotates keys, manages user accounts.', 4),
('d2a3c6b5-773a-4421-a4b5-992a7fb3a122', 'LeadInvestigator', 'Lead Forensic Examiner - Owns cases, uploads evidence, annotations, and signs reports.', 3),
('d3a3c6b5-773a-4421-a4b5-992a7fb3a123', 'Analyst', 'Forensic Analyst - Views cases, performs searches, adds annotations to timeline.', 2),
('d4a3c6b5-773a-4421-a4b5-992a7fb3a124', 'LegalAuditor', 'Legal Auditor / Observer - Read-only auditing access to timeline and ledger files.', 1);

COMMIT;
