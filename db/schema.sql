-- PostgreSQL schema for Audit Energy - Automated Energy Report System
-- Armazena faturas, processamento, análises e fluxos de aprovação
-- Data: 2026-04-27

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TIPOS ENUMERADOS
-- ============================================================================

CREATE TYPE status_relatorio AS ENUM (
  'carregado',
  'validando',
  'validado',
  'validacao_falhou',
  'processando',
  'processado',
  'pronto_revisao',
  'aprovado',
  'rejeitado',
  'enviado',
  'falha'
);

CREATE TYPE etapa_processamento AS ENUM (
  'ingestao',
  'validacao',
  'analise_ia',
  'geracao_pdf',
  'envio_email'
);

CREATE TYPE estado_processamento AS ENUM (
  'pendente',
  'executando',
  'sucesso',
  'aviso',
  'falha'
);

CREATE TYPE etapa_fluxo AS ENUM (
  'conferencia',
  'aprovacao',
  'envio'
);

CREATE TYPE estado_fluxo AS ENUM (
  'pendente',
  'em_revisao',
  'aprovado',
  'rejeitado',
  'enviado'
);

CREATE TYPE tipo_origem AS ENUM (
  'csv_direto',
  'calculado',
  'ia_gerado',
  'manual',
  'crm'
);

-- ============================================================================
-- TABELAS BASE (sem dependências externas)
-- ============================================================================

-- TABELA: Clientes (Dados Cadastrais de CRM/Sistema)
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  endereco TEXT NULL,
  cidade TEXT NULL,
  responsavel TEXT NULL,
  email_financeiro TEXT NULL,
  metadata_crm JSONB NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABELA: Templates PDF (Modelos Padrão de Relatórios)
CREATE TABLE templates_pdf (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_template TEXT NOT NULL UNIQUE,
  descricao TEXT NULL,
  caminho_arquivo TEXT NOT NULL,
  versao TEXT NOT NULL DEFAULT '1.0',
  mapeamento_campos JSONB NOT NULL,
  campos_calculados JSONB NULL,
  campos_tabelas_dinamicas JSONB NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABELA: Plataformas de Origem (Integrações Externas - ex: PowerHub)
CREATE TABLE plataformas_origem (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_plataforma TEXT NOT NULL UNIQUE,
  descricao TEXT NULL,
  url_api TEXT NULL,
  chave_api_encriptada TEXT NULL,
  status_integracao TEXT NOT NULL DEFAULT 'ativo',
  ultimo_sync TIMESTAMPTZ NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABELA: Arquivos CSV Carregados (Com origem de plataforma)
CREATE TABLE arquivos_csv (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_arquivo TEXT NOT NULL,
  chave_armazenamento TEXT NOT NULL UNIQUE,
  plataforma_origem_id UUID NULL,
  checksum TEXT NULL,
  tipo_conteudo TEXT NOT NULL DEFAULT 'text/csv',
  quantidade_linhas INTEGER NULL,
  carregado_por TEXT NULL,
  carregado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  id_externo_plataforma TEXT NULL,
  metadados JSONB NULL,
  CONSTRAINT fk_csv_plataforma FOREIGN KEY (plataforma_origem_id) REFERENCES plataformas_origem(id) ON DELETE SET NULL
);

-- ============================================================================
-- TABELAS PRINCIPAIS (relacionadas a relatórios)
-- ============================================================================

-- TABELA: Relatórios Principais
CREATE TABLE relatorios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_relatorio TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descricao TEXT NULL,
  cliente_id UUID NULL,
  template_id UUID NULL,
  arquivo_csv_id UUID NULL,
  chave_pdf_armazenamento TEXT NULL,
  status status_relatorio NOT NULL DEFAULT 'carregado',
  etapa_fluxo_atual etapa_fluxo NULL,
  estado_fluxo_atual estado_fluxo NOT NULL DEFAULT 'pendente',
  periodo_referencia DATE NULL,
  criado_por TEXT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_por TEXT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_relatorio_csv FOREIGN KEY (arquivo_csv_id) REFERENCES arquivos_csv(id) ON DELETE SET NULL,
  CONSTRAINT fk_relatorio_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  CONSTRAINT fk_relatorio_template FOREIGN KEY (template_id) REFERENCES templates_pdf(id) ON DELETE SET NULL
);

-- TABELA: Dados de Faturas (Origem CSV)
CREATE TABLE faturas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relatorio_id UUID NOT NULL,
  numero_linha INTEGER NOT NULL,
  
  -- Capa do Relatório
  periodo_referencia DATE NULL,
  cliente_nome TEXT NULL,
  numero_unidade TEXT NULL,
  concessionaria TEXT NULL,
  
  -- Identificação da Fatura
  periodo_medicao_inicio DATE NULL,
  periodo_medicao_fim DATE NULL,
  classe_tarifaria TEXT NULL,
  data_emissao DATE NULL,
  
  -- Valor da Fatura
  valor_total DECIMAL(12, 2) NULL,
  consumo_kwh DECIMAL(10, 2) NULL,
  tarifa_unitaria DECIMAL(10, 4) NULL,
  tributos_percentual DECIMAL(5, 2) NULL,
  valor_cip DECIMAL(12, 2) NULL,
  bandeira_tarifaria TEXT NULL,
  
  -- Análise de Consumo
  consumo_kwh_mes_anterior DECIMAL(10, 2) NULL,
  consumo_kwh_media DECIMAL(10, 2) NULL,
  diferenca_percentual DECIMAL(5, 2) NULL,
  
  processado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadados_origem JSONB NULL,
  
  CONSTRAINT fk_fatura_relatorio FOREIGN KEY (relatorio_id) REFERENCES relatorios(id) ON DELETE CASCADE
);

-- TABELA: Levantamento de Equipamentos (Checklist Manual)
CREATE TABLE equipamentos_levantamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relatorio_id UUID NOT NULL,
  cliente_id UUID NULL,
  
  tipo_equipamento TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  potencia_watts DECIMAL(12, 2) NOT NULL,
  horas_dia DECIMAL(5, 2) NOT NULL,
  dias_mes DECIMAL(5, 2) NOT NULL DEFAULT 22,
  consumo_mensal_kwh DECIMAL(10, 2) GENERATED ALWAYS AS (
    (potencia_watts * horas_dia * dias_mes * quantidade) / 1000
  ) STORED,
  
  observacoes TEXT NULL,
  levantado_por TEXT NULL,
  levantado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_equip_relatorio FOREIGN KEY (relatorio_id) REFERENCES relatorios(id) ON DELETE CASCADE,
  CONSTRAINT fk_equip_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
);

-- TABELA: Análises de IA (Insights Gerados)
CREATE TABLE analises_ia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relatorio_id UUID NOT NULL,
  fatura_id UUID NULL,
  
  tipo_analise TEXT NOT NULL,
  anomalias_detectadas JSONB NULL,
  tendencias TEXT NULL,
  recomendacoes JSONB NULL,
  score_confianca DECIMAL(3, 2) NULL,
  
  processado_por TEXT NULL,
  processado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadados JSONB NULL,
  
  CONSTRAINT fk_analise_relatorio FOREIGN KEY (relatorio_id) REFERENCES relatorios(id) ON DELETE CASCADE,
  CONSTRAINT fk_analise_fatura FOREIGN KEY (fatura_id) REFERENCES faturas(id) ON DELETE SET NULL
);

-- TABELA: Rastreabilidade de Origem (Auditoria de Campos)
CREATE TABLE rastreabilidade_campos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relatorio_id UUID NOT NULL,
  nome_campo TEXT NOT NULL,
  valor_preenchido TEXT NULL,
  tipo_origem tipo_origem NOT NULL,
  origem_especifica TEXT NULL,
  validado BOOLEAN NOT NULL DEFAULT FALSE,
  observacoes TEXT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_rastreab_relatorio FOREIGN KEY (relatorio_id) REFERENCES relatorios(id) ON DELETE CASCADE
);

-- TABELA: Histórico de Processamento (Por Etapa)
CREATE TABLE historico_processamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relatorio_id UUID NOT NULL,
  etapa etapa_processamento NOT NULL,
  estado estado_processamento NOT NULL DEFAULT 'pendente',
  iniciado_em TIMESTAMPTZ NULL,
  finalizado_em TIMESTAMPTZ NULL,
  duracao_ms INTEGER NULL,
  detalhes JSONB NULL,
  tentado_por TEXT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_historico_relatorio FOREIGN KEY (relatorio_id) REFERENCES relatorios(id) ON DELETE CASCADE
);

-- TABELA: Status do Fluxo de Trabalho (Conferência, Aprovação, Envio)
CREATE TABLE status_fluxo_trabalho (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relatorio_id UUID NOT NULL,
  etapa etapa_fluxo NOT NULL,
  estado estado_fluxo NOT NULL DEFAULT 'pendente',
  atribuido_para TEXT NULL,
  ultimo_comentario TEXT NULL,
  vence_em TIMESTAMPTZ NULL,
  atualizado_por TEXT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadados JSONB NULL,
  
  CONSTRAINT fk_status_fluxo_relatorio FOREIGN KEY (relatorio_id) REFERENCES relatorios(id) ON DELETE CASCADE,
  CONSTRAINT uq_relatorio_etapa UNIQUE (relatorio_id, etapa)
);

-- TABELA: Histórico de Transições do Fluxo
CREATE TABLE historico_fluxo_trabalho (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relatorio_id UUID NOT NULL,
  etapa etapa_fluxo NOT NULL,
  estado_anterior estado_fluxo NOT NULL,
  estado_novo estado_fluxo NOT NULL,
  alterado_por TEXT NULL,
  comentario TEXT NULL,
  alterado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadados JSONB NULL,
  
  CONSTRAINT fk_historico_fluxo_relatorio FOREIGN KEY (relatorio_id) REFERENCES relatorios(id) ON DELETE CASCADE
);

-- TABELA: Logs de Auditoria
CREATE TABLE logs_auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo_objeto TEXT NOT NULL,
  id_objeto UUID NULL,
  acao TEXT NOT NULL,
  usuario TEXT NULL,
  mensagem TEXT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadados JSONB NULL
);

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Clientes
CREATE INDEX idx_clientes_cnpj ON clientes(cnpj);
CREATE INDEX idx_clientes_email ON clientes(email_financeiro);

-- Templates
CREATE INDEX idx_templates_ativo ON templates_pdf(ativo);

-- Plataformas de Origem
CREATE INDEX idx_plataformas_nome ON plataformas_origem(nome_plataforma);
CREATE INDEX idx_plataformas_status ON plataformas_origem(status_integracao);

-- Arquivos CSV
CREATE INDEX idx_arquivos_csv_chave ON arquivos_csv(chave_armazenamento);
CREATE INDEX idx_arquivos_csv_plataforma ON arquivos_csv(plataforma_origem_id);
CREATE INDEX idx_arquivos_csv_id_externo ON arquivos_csv(id_externo_plataforma);

-- Relatórios
CREATE INDEX idx_relatorios_status ON relatorios(status);
CREATE INDEX idx_relatorios_atualizado_em ON relatorios(atualizado_em);
CREATE INDEX idx_relatorios_periodo_ref ON relatorios(periodo_referencia);
CREATE INDEX idx_relatorios_cliente_id ON relatorios(cliente_id);
CREATE INDEX idx_relatorios_template_id ON relatorios(template_id);

-- Faturas
CREATE INDEX idx_faturas_relatorio_id ON faturas(relatorio_id);
CREATE INDEX idx_faturas_numero_unidade ON faturas(numero_unidade);
CREATE INDEX idx_faturas_concessionaria ON faturas(concessionaria);

-- Equipamentos
CREATE INDEX idx_equipamentos_relatorio_id ON equipamentos_levantamento(relatorio_id);
CREATE INDEX idx_equipamentos_cliente_id ON equipamentos_levantamento(cliente_id);

-- Análises IA
CREATE INDEX idx_analises_ia_relatorio_id ON analises_ia(relatorio_id);
CREATE INDEX idx_analises_ia_fatura_id ON analises_ia(fatura_id);

-- Rastreabilidade
CREATE INDEX idx_rastreabilidade_relatorio ON rastreabilidade_campos(relatorio_id);
CREATE INDEX idx_rastreabilidade_tipo_origem ON rastreabilidade_campos(tipo_origem);

-- Histórico de Processamento
CREATE INDEX idx_historico_proc_relatorio_id ON historico_processamento(relatorio_id);
CREATE INDEX idx_historico_proc_etapa ON historico_processamento(etapa);

-- Status de Fluxo
CREATE INDEX idx_status_fluxo_relatorio_id ON status_fluxo_trabalho(relatorio_id);
CREATE INDEX idx_status_fluxo_etapa ON status_fluxo_trabalho(etapa);

-- Histórico de Fluxo
CREATE INDEX idx_historico_fluxo_relatorio_id ON historico_fluxo_trabalho(relatorio_id);
CREATE INDEX idx_historico_fluxo_etapa ON historico_fluxo_trabalho(etapa);

-- Auditoria
CREATE INDEX idx_logs_auditoria_objeto ON logs_auditoria(tipo_objeto, id_objeto);
CREATE INDEX idx_logs_auditoria_usuario ON logs_auditoria(usuario, criado_em);
