-- ======================================================
-- Audit Quality Database Schema
-- Data: 2026-05-04
-- ======================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS audit_quality;
SET search_path TO audit_quality;

CREATE TYPE document_type AS ENUM ('RNC', 'RAQ', 'RHE');

CREATE TYPE audit_status AS ENUM (
    'CRIADO',
    'EM_PREENCHIMENTO',
    'ENVIADO_ASSINATURA',
    'ASSINADO',
    'BLOQUEIO_AUTORIZADO',
    'ENVIADO_FORNECEDOR',
    'RESPONDIDO_FORNECEDOR',
    'EM_VERIFICACAO',
    'CONCLUIDO'
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    contact_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_suppliers_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    type document_type NOT NULL,
    code VARCHAR(50) NOT NULL,
    status audit_status DEFAULT 'CRIADO',

    supplier_id UUID REFERENCES suppliers(id),
    item_description TEXT NOT NULL,
    defect_category VARCHAR(100) NOT NULL,

    gut_gravity INTEGER CHECK (gut_gravity BETWEEN 1 AND 5),
    gut_urgency INTEGER CHECK (gut_urgency BETWEEN 1 AND 5),
    gut_tendency INTEGER CHECK (gut_tendency BETWEEN 1 AND 5),

    received_at TIMESTAMP,
    material_disposal TEXT,

    conclusive_close TEXT,

    parent_doc_id UUID REFERENCES documents(id),
    is_automated_conversion BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_documents_type_code UNIQUE (type, code),

    CONSTRAINT chk_raq_fields
        CHECK (type <> 'RAQ' OR received_at IS NOT NULL),

    CONSTRAINT chk_rnc_fields
        CHECK (type <> 'RNC' OR conclusive_close IS NOT NULL)
);

CREATE TRIGGER trg_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    responsible_name VARCHAR(255),
    action TEXT NOT NULL,
    previous_status audit_status,
    new_status audit_status NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION validate_status_flow()
RETURNS TRIGGER AS $$
DECLARE
    allowed BOOLEAN := FALSE;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    allowed :=
        (OLD.status = 'CRIADO'               AND NEW.status = 'EM_PREENCHIMENTO') OR
        (OLD.status = 'EM_PREENCHIMENTO'     AND NEW.status = 'ENVIADO_ASSINATURA') OR
        (OLD.status = 'ENVIADO_ASSINATURA'   AND NEW.status = 'ASSINADO') OR
        (OLD.status = 'ASSINADO'             AND NEW.status = 'BLOQUEIO_AUTORIZADO') OR
        (OLD.status = 'BLOQUEIO_AUTORIZADO'  AND NEW.status = 'ENVIADO_FORNECEDOR') OR
        (OLD.status = 'ENVIADO_FORNECEDOR'   AND NEW.status = 'RESPONDIDO_FORNECEDOR') OR
        (OLD.status = 'RESPONDIDO_FORNECEDOR'AND NEW.status = 'EM_VERIFICACAO') OR
        (OLD.status = 'EM_VERIFICACAO'       AND NEW.status = 'CONCLUIDO');

    IF NOT allowed THEN
        RAISE EXCEPTION
            'Transição de status inválida: % → %',
            OLD.status, NEW.status;
    END IF;

    INSERT INTO audit_logs (
        document_id,
        action,
        previous_status,
        new_status
    )
    VALUES (
        OLD.id,
        'ALTERACAO_STATUS',
        OLD.status,
        NEW.status
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_status_flow
BEFORE UPDATE OF status ON documents
FOR EACH ROW EXECUTE FUNCTION validate_status_flow();

CREATE OR REPLACE FUNCTION auto_create_rnc_from_raq()
RETURNS VOID AS $$
DECLARE
    rec RECORD;
    new_rnc_id UUID;
BEGIN
    FOR rec IN
        SELECT
            supplier_id,
            defect_category,
            COUNT(*) AS total
        FROM documents
        WHERE type = 'RAQ'
          AND created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY supplier_id, defect_category
        HAVING COUNT(*) >= 3
    LOOP
        INSERT INTO documents (
            type,
            code,
            status,
            supplier_id,
            item_description,
            defect_category,
            is_automated_conversion
        )
        VALUES (
            'RNC',
            'RNC-AUTO-' || replace(uuid_generate_v4()::text, '-', ''),
            'CRIADO',
            rec.supplier_id,
            'RNC gerada automaticamente por reincidência de RAQs',
            rec.defect_category,
            TRUE
        )
        RETURNING id INTO new_rnc_id;

        INSERT INTO audit_logs (
            document_id,
            action,
            new_status
        )
        VALUES (
            new_rnc_id,
            'RNC GERADA AUTOMATICAMENTE (3 RAQs / 12 MESES)',
            'CRIADO'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;