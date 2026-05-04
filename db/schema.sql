-- ══════════════════════════════════════════════════
-- Audit Quality — Schema base (INTEGER / IDENTITY)
-- ══════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS audit_quality;
SET search_path TO audit_quality;

-- ────────────────────────────────────────────────
-- SUPPLIERS
-- ────────────────────────────────────────────────
DROP TABLE IF EXISTS suppliers CASCADE;

CREATE TABLE suppliers (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  cnpj         VARCHAR(18)  UNIQUE,
  contact_name VARCHAR(255),
  email        VARCHAR(255),
  active       BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ
);

-- ────────────────────────────────────────────────
-- DOCUMENTS
-- ────────────────────────────────────────────────
DROP TABLE IF EXISTS documents CASCADE;

CREATE TABLE documents (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  code             VARCHAR(50)  NOT NULL UNIQUE,
  type             VARCHAR(10)  NOT NULL
                     CHECK (type IN ('RNC', 'RAQ', 'RHE')),

  status           VARCHAR(30)  NOT NULL DEFAULT 'ABERTO'
                     CHECK (status IN (
                       'ABERTO',
                       'EM_ANALISE',
                       'ENVIADO_FORNECEDOR',
                       'CONCLUIDO',
                       'CANCELADO'
                     )),

  parent_doc_id    BIGINT REFERENCES documents(id) ON DELETE SET NULL,
  supplier_id      BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,

  item_description TEXT NOT NULL,

  defect_category  VARCHAR(30) NOT NULL DEFAULT 'QUALIDADE'
                     CHECK (defect_category IN (
                       'QUALIDADE',
                       'PROCESSO',
                       'MATERIAL',
                       'SEGURANCA'
                     )),

  gut_gravity      SMALLINT NOT NULL DEFAULT 5 CHECK (gut_gravity  BETWEEN 1 AND 9),
  gut_urgency      SMALLINT NOT NULL DEFAULT 5 CHECK (gut_urgency  BETWEEN 1 AND 9),
  gut_tendency     SMALLINT NOT NULL DEFAULT 5 CHECK (gut_tendency BETWEEN 1 AND 9),

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

-- ────────────────────────────────────────────────
-- AUDIT LOGS
-- ────────────────────────────────────────────────
DROP TABLE IF EXISTS audit_logs CASCADE;

CREATE TABLE audit_logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id BIGINT NOT NULL
                REFERENCES documents(id) ON DELETE CASCADE,
  action      VARCHAR(100) NOT NULL,
  detail      TEXT,
  user_name   VARCHAR(100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- TRIGGER: UPDATED_AT
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_quality.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_updated_documents ON audit_quality.documents;
CREATE TRIGGER trg_updated_documents
  BEFORE UPDATE ON audit_quality.documents
  FOR EACH ROW
  EXECUTE FUNCTION audit_quality.set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_suppliers ON audit_quality.suppliers;
CREATE TRIGGER trg_updated_suppliers
  BEFORE UPDATE ON audit_quality.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION audit_quality.set_updated_at();

-- ────────────────────────────────────────────────
-- TRIGGER: LOG STATUS CHANGE
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_quality.log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_quality.audit_logs (
      document_id,
      action,
      detail,
      created_at
    ) VALUES (
      NEW.id,
      'Status alterado',
      'De "' || OLD.status || '" para "' || NEW.status || '"',
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_status ON audit_quality.documents;
CREATE TRIGGER trg_log_status
  AFTER UPDATE OF status ON audit_quality.documents
  FOR EACH ROW
  EXECUTE FUNCTION audit_quality.log_status_change();

-- ────────────────────────────────────────────────
-- DADOS DE EXEMPLO
-- ────────────────────────────────────────────────
INSERT INTO suppliers (name, cnpj, contact_name, email, active) VALUES
  ('Metalúrgica Souza Ltda',  '12.345.678/0001-99', 'Carlos Souza',  'carlos@souza.com',           true),
  ('Plásticos Norte S.A.',   '98.765.432/0001-11', 'Ana Lima',      'ana@plasticosnorte.com',     true),
  ('Têxtil Horizonte ME',    '55.111.222/0001-33', 'Bruno Reis',    'bruno@textilhorizonte.com',  false),
  ('Embalagens FastPack',    '77.888.999/0001-44', 'Fernanda Dias', 'fernanda@fastpack.com',      true);

INSERT INTO documents (
  code, type, status, supplier_id,
  item_description, defect_category,
  gut_gravity, gut_urgency, gut_tendency
) VALUES
  ('RNC-2026-001', 'RNC', 'ABERTO',      1, 'Parafuso fora de tolerância',       'QUALIDADE', 8, 7, 6),
  ('RAQ-2026-002', 'RAQ', 'EM_ANALISE',  2, 'Avaliação periódica fornecedor',    'PROCESSO',  5, 5, 4),
  ('RHE-2026-003', 'RHE', 'CONCLUIDO',   3, 'Homologação material têxtil',        'QUALIDADE', 3, 2, 2);
