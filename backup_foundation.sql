--
-- PostgreSQL database dump
--

\restrict fBbw10SEAYzqLzW6cU0wrjbpohmUwei7E9ljfoNPNl8Ha7OrFJyYNV7YO55gxB7

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: audit_quality; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA audit_quality;


ALTER SCHEMA audit_quality OWNER TO postgres;

--
-- Name: log_status_change(); Type: FUNCTION; Schema: audit_quality; Owner: postgres
--

CREATE FUNCTION audit_quality.log_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION audit_quality.log_status_change() OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: audit_quality; Owner: postgres
--

CREATE FUNCTION audit_quality.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION audit_quality.set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: audit_quality; Owner: postgres
--

CREATE TABLE audit_quality.audit_logs (
    id bigint NOT NULL,
    document_id bigint NOT NULL,
    action character varying(100) NOT NULL,
    detail text,
    user_name character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE audit_quality.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: audit_quality; Owner: postgres
--

ALTER TABLE audit_quality.audit_logs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME audit_quality.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: documents; Type: TABLE; Schema: audit_quality; Owner: postgres
--

CREATE TABLE audit_quality.documents (
    id bigint NOT NULL,
    code character varying(50) NOT NULL,
    type character varying(10) NOT NULL,
    status character varying(30) DEFAULT 'ABERTO'::character varying NOT NULL,
    parent_doc_id bigint,
    supplier_id bigint,
    item_description text NOT NULL,
    defect_category character varying(30) DEFAULT 'QUALIDADE'::character varying NOT NULL,
    gut_gravity smallint DEFAULT 5 NOT NULL,
    gut_urgency smallint DEFAULT 5 NOT NULL,
    gut_tendency smallint DEFAULT 5 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT documents_defect_category_check CHECK (((defect_category)::text = ANY ((ARRAY['QUALIDADE'::character varying, 'PROCESSO'::character varying, 'MATERIAL'::character varying, 'SEGURANCA'::character varying])::text[]))),
    CONSTRAINT documents_gut_gravity_check CHECK (((gut_gravity >= 1) AND (gut_gravity <= 9))),
    CONSTRAINT documents_gut_tendency_check CHECK (((gut_tendency >= 1) AND (gut_tendency <= 9))),
    CONSTRAINT documents_gut_urgency_check CHECK (((gut_urgency >= 1) AND (gut_urgency <= 9))),
    CONSTRAINT documents_status_check CHECK (((status)::text = ANY ((ARRAY['ABERTO'::character varying, 'EM_ANALISE'::character varying, 'ENVIADO_FORNECEDOR'::character varying, 'CONCLUIDO'::character varying, 'CANCELADO'::character varying])::text[]))),
    CONSTRAINT documents_type_check CHECK (((type)::text = ANY ((ARRAY['RNC'::character varying, 'RAQ'::character varying, 'RHE'::character varying])::text[])))
);


ALTER TABLE audit_quality.documents OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: audit_quality; Owner: postgres
--

ALTER TABLE audit_quality.documents ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME audit_quality.documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: email_logs; Type: TABLE; Schema: audit_quality; Owner: postgres
--

CREATE TABLE audit_quality.email_logs (
    id bigint NOT NULL,
    recipient character varying(255) NOT NULL,
    subject character varying(500) NOT NULL,
    body text,
    status character varying(20) DEFAULT 'ENVIADO'::character varying NOT NULL,
    error_msg text,
    document_id bigint,
    triggered_by character varying(100),
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_logs_status_check CHECK (((status)::text = ANY ((ARRAY['ENVIADO'::character varying, 'FALHOU'::character varying])::text[])))
);


ALTER TABLE audit_quality.email_logs OWNER TO postgres;

--
-- Name: email_logs_id_seq; Type: SEQUENCE; Schema: audit_quality; Owner: postgres
--

ALTER TABLE audit_quality.email_logs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME audit_quality.email_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: status_history; Type: TABLE; Schema: audit_quality; Owner: postgres
--

CREATE TABLE audit_quality.status_history (
    id bigint NOT NULL,
    document_id bigint,
    old_status character varying(20),
    new_status character varying(20) NOT NULL,
    changed_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE audit_quality.status_history OWNER TO postgres;

--
-- Name: status_history_id_seq; Type: SEQUENCE; Schema: audit_quality; Owner: postgres
--

ALTER TABLE audit_quality.status_history ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME audit_quality.status_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: suppliers; Type: TABLE; Schema: audit_quality; Owner: postgres
--

CREATE TABLE audit_quality.suppliers (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    cnpj character varying(18),
    contact_name character varying(255),
    email character varying(255),
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone
);


ALTER TABLE audit_quality.suppliers OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: audit_quality; Owner: postgres
--

ALTER TABLE audit_quality.suppliers ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME audit_quality.suppliers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: audit_quality; Owner: postgres
--

CREATE TABLE audit_quality.users (
    id bigint NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    role character varying(20) DEFAULT 'gestor'::character varying NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'gestor'::character varying])::text[])))
);


ALTER TABLE audit_quality.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: audit_quality; Owner: postgres
--

ALTER TABLE audit_quality.users ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME audit_quality.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: audit_quality; Owner: postgres
--

COPY audit_quality.audit_logs (id, document_id, action, detail, user_name, created_at) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: audit_quality; Owner: postgres
--

COPY audit_quality.documents (id, code, type, status, parent_doc_id, supplier_id, item_description, defect_category, gut_gravity, gut_urgency, gut_tendency, created_at, updated_at) FROM stdin;
1	RNC-2026-001	RNC	ABERTO	\N	1	Parafuso fora de tolerância	QUALIDADE	8	7	6	2026-05-04 17:01:22.382722-03	\N
2	RAQ-2026-002	RAQ	EM_ANALISE	\N	2	Avaliação periódica fornecedor	PROCESSO	5	5	4	2026-05-04 17:01:22.382722-03	\N
3	RHE-2026-003	RHE	CONCLUIDO	\N	3	Homologação material têxtil	QUALIDADE	3	2	2	2026-05-04 17:01:22.382722-03	\N
4	RAQ-3858-002	RAQ	EM_ANALISE	\N	2	O material foi rasgado durante o manuseio dos operadores na zona de embarque	MATERIAL	3	3	2	2026-05-05 09:35:50.483223-03	2026-05-05 09:36:03.064-03
5	RHE-3034-6748	RHE	CANCELADO	\N	5	Demora a entregar os iPads solicitados para a implementação da linha nova	PROCESSO	9	8	7	2026-05-05 09:41:23.261178-03	2026-05-05 09:41:49.537309-03
\.


--
-- Data for Name: email_logs; Type: TABLE DATA; Schema: audit_quality; Owner: postgres
--

COPY audit_quality.email_logs (id, recipient, subject, body, status, error_msg, document_id, triggered_by, sent_at) FROM stdin;
\.


--
-- Data for Name: status_history; Type: TABLE DATA; Schema: audit_quality; Owner: postgres
--

COPY audit_quality.status_history (id, document_id, old_status, new_status, changed_by, created_at) FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: audit_quality; Owner: postgres
--

COPY audit_quality.suppliers (id, name, cnpj, contact_name, email, active, created_at, updated_at) FROM stdin;
1	Metalúrgica Souza Ltda	12.345.678/0001-99	Carlos Souza	carlos@souza.com	t	2026-05-04 17:01:12.052261-03	\N
4	Embalagens FastPack	77.888.999/0001-44	Fernanda Dias	fernanda@fastpack.com	t	2026-05-04 17:01:12.052261-03	\N
3	Têxtil Horizonte ME	55.111.222/0001-33	Bruno Reis	bruno@textilhorizonte.com	t	2026-05-04 17:01:12.052261-03	2026-05-05 09:20:37.976422-03
5	iDropLab	86.865.929/0003-49	Vinicius Lima	idroplab@gmail.com	t	2026-05-05 09:37:59.101933-03	2026-05-05 09:39:29.861947-03
2	Plásticos Norte S.A.	98.765.432/0001-11	Ana Matos	ana@plasticosnorte.com	t	2026-05-04 17:01:12.052261-03	2026-05-05 09:39:42.82862-03
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: audit_quality; Owner: postgres
--

COPY audit_quality.users (id, username, password, name, email, role, active, created_at, updated_at) FROM stdin;
1	admin	$2b$10$E9FBlGbvRPRTEM/uTrY47utsoJCWn3sXOnTO45Clz1MML0Ht9BZgG	Administrador	admin@auditquality.com	admin	t	2026-05-05 14:20:27.95576-03	2026-05-05 15:53:56.874314-03
2	gestor	$2b$10$9SYF4H4Ec796LAxb2cOG3e84ly7xJW3buvBTJ85l1JVkfwOyFr/Ta	Gestor Padrão	gestor@auditquality.com	gestor	t	2026-05-05 14:20:40.493035-03	2026-05-05 16:30:03.703417-03
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: audit_quality; Owner: postgres
--

SELECT pg_catalog.setval('audit_quality.audit_logs_id_seq', 1, false);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: audit_quality; Owner: postgres
--

SELECT pg_catalog.setval('audit_quality.documents_id_seq', 5, true);


--
-- Name: email_logs_id_seq; Type: SEQUENCE SET; Schema: audit_quality; Owner: postgres
--

SELECT pg_catalog.setval('audit_quality.email_logs_id_seq', 1, false);


--
-- Name: status_history_id_seq; Type: SEQUENCE SET; Schema: audit_quality; Owner: postgres
--

SELECT pg_catalog.setval('audit_quality.status_history_id_seq', 1, false);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: audit_quality; Owner: postgres
--

SELECT pg_catalog.setval('audit_quality.suppliers_id_seq', 5, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: audit_quality; Owner: postgres
--

SELECT pg_catalog.setval('audit_quality.users_id_seq', 4, true);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: audit_quality; Owner: postgres
--

ALTER TABLE ONLY audit_quality.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: documents documents_code_key; Type: CONSTRAINT; Schema: audit_quality; Owner: postgres
--

ALTER TABLE ONLY audit_quality.documents
    ADD CONSTRAINT documents_code_key UNIQUE (code);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: audit_quality; Owner: postgres
--

ALTER TABLE ONLY audit_quality.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: audit_quality; Owner: postgres
--

ALTER TABLE ONLY audit_quality.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: status_history status_history_pkey; Type: CONSTRAINT; Schema: audit_quality; Owner: postgres
--

ALTER TABLE ONLY audit_quality.status_history
    ADD CONSTRAINT status_history_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_cnpj_key; Type: CONSTRAINT; Schema: audit_quality; Owner: postgres
--

ALTER TABLE ONLY audit_quality.suppliers
    ADD CONSTRAINT suppliers_cnpj_key UNIQUE (cnpj);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: audit_quality; Owner: postgres
--

ALTER TABLE ONLY audit_quality.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: audit_quality; Owner: postgres
--

ALTER TABLE ONLY audit_quality.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: audit_quality; Owner: postgres
--

ALTER TABLE ONLY audit_quality.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: audit_quality; Owner: postgres
--

ALTER TABLE ONLY audit_quality.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_email_logs_document; Type: INDEX; Schema: audit_quality; Owner: postgres
--

CREATE INDEX idx_email_logs_document ON audit_quality.email_logs USING btree (document_id);


--
-- Name: idx_email_logs_sent_at; Type: INDEX; Schema: audit_quality; Owner: postgres
--

CREATE INDEX idx_email_logs_sent_at ON audit_quality.email_logs USING btree (sent_at DESC);


--
-- Name: idx_email_logs_status; Type: INDEX; Schema: audit_quality; Owner: postgres
--

CREATE INDEX idx_email_logs_status ON audit_quality.email_logs USING btree (status);


--
-- Name: idx_status_history_doc; Type: INDEX; Schema: audit_quality; Owner: postgres
--

CREATE INDEX idx_status_history_doc ON audit_quality.status_history USING btree (document_id);


--
-- Name: documents trg_log_status; Type: TRIGGER; Schema: audit_quality; Owner: postgres
--

CREATE TRIGGER trg_log_status AFTER UPDATE OF status ON audit_quality.documents FOR EACH ROW EXECUTE FUNCTION audit_quality.log_status_change();


--
-- Name: documents trg_updated_documents; Type: TRIGGER; Schema: audit_quality; Owner: postgres
--

CREATE TRIGGER trg_updated_documents BEFORE UPDATE ON audit_quality.documents FOR EACH ROW EXECUTE FUNCTION audit_quality.set_updated_at();


--
-- Name: suppliers trg_updated_suppliers; Type: TRIGGER; Schema: audit_quality; Owner: postgres
--

CREATE TRIGGER trg_updated_suppliers BEFORE UPDATE ON audit_quality.suppliers FOR EACH ROW EXECUTE FUNCTION audit_quality.set_updated_at();


--
-- Name: users trg_updated_users; Type: TRIGGER; Schema: audit_quality; Owner: postgres
--

CREATE TRIGGER trg_updated_users BEFORE UPDATE ON audit_quality.users FOR EACH ROW EXECUTE FUNCTION audit_quality.set_updated_at();


--
-- Name: audit_logs audit_logs_document_id_fkey; Type: FK CONSTRAINT; Schema: audit_quality; Owner: postgres
--

ALTER TABLE ONLY audit_quality.audit_logs
    ADD CONSTRAINT audit_logs_document_id_fkey FOREIGN KEY (document_id) REFERENCES audit_quality.documents(id) ON DELETE CASCADE;


--
-- Name: documents documents_parent_doc_id_fkey; Type: FK CONSTRAINT; Schema: audit_quality; Owner: postgres
--

ALTER TABLE ONLY audit_quality.documents
    ADD CONSTRAINT documents_parent_doc_id_fkey FOREIGN KEY (parent_doc_id) REFERENCES audit_quality.documents(id) ON DELETE SET NULL;


--
-- Name: documents documents_supplier_id_fkey; Type: FK CONSTRAINT; Schema: audit_quality; Owner: postgres
--

ALTER TABLE ONLY audit_quality.documents
    ADD CONSTRAINT documents_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES audit_quality.suppliers(id) ON DELETE SET NULL;


--
-- Name: email_logs email_logs_document_id_fkey; Type: FK CONSTRAINT; Schema: audit_quality; Owner: postgres
--

ALTER TABLE ONLY audit_quality.email_logs
    ADD CONSTRAINT email_logs_document_id_fkey FOREIGN KEY (document_id) REFERENCES audit_quality.documents(id) ON DELETE SET NULL;


--
-- Name: status_history status_history_document_id_fkey; Type: FK CONSTRAINT; Schema: audit_quality; Owner: postgres
--

ALTER TABLE ONLY audit_quality.status_history
    ADD CONSTRAINT status_history_document_id_fkey FOREIGN KEY (document_id) REFERENCES audit_quality.documents(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict fBbw10SEAYzqLzW6cU0wrjbpohmUwei7E9ljfoNPNl8Ha7OrFJyYNV7YO55gxB7

