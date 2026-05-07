-- ══════════════════════════════════════════════════
--  Audit Quality — Tabela de usuários
--  Execute após o schema.sql inicial
-- ══════════════════════════════════════════════════

SET search_path TO audit_quality;

-- ─── Tabela de usuários ────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username     VARCHAR(50)  NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,  -- bcrypt hash
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) UNIQUE,
  role         VARCHAR(20)  NOT NULL DEFAULT 'gestor'
                 CHECK (role IN ('admin', 'gestor')),
  active       BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ
);

-- ─── Trigger updated_at ────────────────────────────
DROP TRIGGER IF EXISTS trg_updated_users ON audit_quality.users;
CREATE TRIGGER trg_updated_users
  BEFORE UPDATE ON audit_quality.users
  FOR EACH ROW
  EXECUTE FUNCTION audit_quality.set_updated_at();

-- ─── Usuário admin padrão (senha: admin) ──────────
-- Hash bcrypt de 'admin' com salt 10
INSERT INTO users (username, password, name, email, role, active)
VALUES (
  'admin',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
  'Administrador',
  'admin@auditquality.com',
  'admin',
  true
)
ON CONFLICT (username) DO NOTHING;

-- ─── Usuário gestor de exemplo ────────────────────
INSERT INTO users (username, password, name, email, role, active)
VALUES (
  'gestor',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
  'Gestor Padrão',
  'gestor@auditquality.com',
  'gestor',
  true
)
ON CONFLICT (username) DO NOTHING;
