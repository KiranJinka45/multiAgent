--
-- PostgreSQL database dump
--

\restrict ffhFlvCCEaUlh2sdk3I0Z3tcYxjLfKIs8aNVfGdusLlfUwHmY6554hbxiUi9oCq

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Agent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Agent" (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'standby'::text NOT NULL,
    health integer DEFAULT 100 NOT NULL,
    "tenantId" text,
    "lastActive" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Agent" OWNER TO postgres;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "tenantId" text DEFAULT 'platform-admin'::text NOT NULL,
    "userId" text,
    action text NOT NULL,
    resource text NOT NULL,
    metadata jsonb,
    status text,
    "ipAddress" text,
    hash text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO postgres;

--
-- Name: BuildMetric; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."BuildMetric" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "tokensUsed" integer DEFAULT 0 NOT NULL,
    "durationMs" integer DEFAULT 0 NOT NULL,
    "costUsd" double precision DEFAULT 0 NOT NULL,
    status text DEFAULT 'completed'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BuildMetric" OWNER TO postgres;

--
-- Name: CodeModule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CodeModule" (
    id text NOT NULL,
    path text NOT NULL,
    content text,
    hash text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CodeModule" OWNER TO postgres;

--
-- Name: Event; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Event" (
    id text NOT NULL,
    type text NOT NULL,
    "userId" text,
    "tenantId" text,
    metadata jsonb,
    "eventId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Event" OWNER TO postgres;

--
-- Name: ExecutionLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ExecutionLog" (
    id text NOT NULL,
    "executionId" text NOT NULL,
    stage text NOT NULL,
    status text NOT NULL,
    message text,
    progress integer DEFAULT 0 NOT NULL,
    metadata jsonb,
    "tenantId" text,
    "eventId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ExecutionLog" OWNER TO postgres;

--
-- Name: IdempotencyRecord; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."IdempotencyRecord" (
    id text NOT NULL,
    key text NOT NULL,
    response jsonb,
    status text DEFAULT 'completed'::text NOT NULL,
    "executionId" text,
    region text,
    "lockedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."IdempotencyRecord" OWNER TO postgres;

--
-- Name: IntelligencePolicy; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."IntelligencePolicy" (
    id text NOT NULL,
    name text NOT NULL,
    "tenantId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "costWeight" double precision NOT NULL,
    "performanceWeight" double precision NOT NULL,
    "reliabilityWeight" double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."IntelligencePolicy" OWNER TO postgres;

--
-- Name: IntelligenceROI; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."IntelligenceROI" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    period text DEFAULT 'all-time'::text NOT NULL,
    optimizations integer DEFAULT 0 NOT NULL,
    "failureRate" double precision DEFAULT 0 NOT NULL,
    "estimatedSavings" double precision DEFAULT 0 NOT NULL,
    "efficiencyGain" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."IntelligenceROI" OWNER TO postgres;

--
-- Name: Mission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Mission" (
    id text NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'idle'::text NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    type text DEFAULT 'exploration'::text NOT NULL,
    description text,
    margin double precision DEFAULT 0,
    "tenantId" text,
    metadata jsonb,
    "assignedRegion" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "computeDurationMs" integer DEFAULT 0,
    "internalOptimizationCost" double precision DEFAULT 0,
    "queueWaitMs" integer DEFAULT 0,
    "scalingImpact" double precision DEFAULT 0,
    "totalCostUsd" double precision DEFAULT 0
);


ALTER TABLE public."Mission" OWNER TO postgres;

--
-- Name: Pattern; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Pattern" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Pattern" OWNER TO postgres;

--
-- Name: PaymentEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PaymentEvent" (
    id text NOT NULL,
    amount double precision NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    status text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PaymentEvent" OWNER TO postgres;

--
-- Name: Product; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    price double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Product" OWNER TO postgres;

--
-- Name: ProductMetric; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProductMetric" (
    id text NOT NULL,
    "productId" text NOT NULL,
    metric text NOT NULL,
    value double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ProductMetric" OWNER TO postgres;

--
-- Name: Project; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'draft'::text NOT NULL,
    "tenantId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Project" OWNER TO postgres;

--
-- Name: ProjectFile; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProjectFile" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    path text NOT NULL,
    content text,
    language text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProjectFile" OWNER TO postgres;

--
-- Name: ProposedChange; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProposedChange" (
    id text NOT NULL,
    "agentId" text NOT NULL,
    "targetPath" text NOT NULL,
    "changeType" text NOT NULL,
    reason text NOT NULL,
    patch text NOT NULL,
    "expectedImpact" jsonb,
    "validationScore" double precision,
    status text DEFAULT 'proposed'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProposedChange" OWNER TO postgres;

--
-- Name: SideEffectRecord; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SideEffectRecord" (
    id text NOT NULL,
    "idempotencyKey" text NOT NULL,
    "operationType" text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "attemptNumber" integer DEFAULT 1 NOT NULL,
    metadata jsonb,
    "executionId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SideEffectRecord" OWNER TO postgres;

--
-- Name: Subscription; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Subscription" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tenantId" text,
    "stripeId" text,
    "productId" text,
    plan text DEFAULT 'free'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Subscription" OWNER TO postgres;

--
-- Name: Tenant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Tenant" (
    id text NOT NULL,
    name text NOT NULL,
    "dailyQuota" integer DEFAULT 10 NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Tenant" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    role text DEFAULT 'viewer'::text NOT NULL,
    password text,
    "tenantId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: UserSession; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserSession" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "deviceInfo" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "lastActiveAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."UserSession" OWNER TO postgres;

--
-- Name: ZtanActiveLease; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ZtanActiveLease" (
    id character varying(50) NOT NULL,
    generation integer DEFAULT 0 NOT NULL,
    owner_pid integer NOT NULL,
    owner_host character varying(255) NOT NULL,
    heartbeat timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ZtanActiveLease" OWNER TO postgres;

--
-- Name: ZtanIdentity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ZtanIdentity" (
    id text NOT NULL,
    "nodeId" text NOT NULL,
    "publicKey" text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ZtanIdentity" OWNER TO postgres;

--
-- Name: ZtanLedgerBlock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ZtanLedgerBlock" (
    id integer NOT NULL,
    "blockId" text NOT NULL,
    "prevHash" text NOT NULL,
    hash text NOT NULL,
    type text NOT NULL,
    payload text NOT NULL,
    operator text NOT NULL,
    signature text NOT NULL,
    status text NOT NULL,
    epoch text NOT NULL,
    "timeToken" text,
    "tpmQuote" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ZtanLedgerBlock" OWNER TO postgres;

--
-- Name: ZtanLedgerBlock_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ZtanLedgerBlock_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."ZtanLedgerBlock_id_seq" OWNER TO postgres;

--
-- Name: ZtanLedgerBlock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ZtanLedgerBlock_id_seq" OWNED BY public."ZtanLedgerBlock".id;


--
-- Name: ZtanPayloadAttestation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ZtanPayloadAttestation" (
    id text NOT NULL,
    "blockId" text NOT NULL,
    "payloadSanitized" boolean DEFAULT true NOT NULL,
    transformations text NOT NULL,
    "originalByteLength" integer NOT NULL,
    "sanitizedByteLength" integer NOT NULL,
    "sanitizationEpochId" text DEFAULT '1'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ZtanPayloadAttestation" OWNER TO postgres;

--
-- Name: ZtanQuarantineBlob; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ZtanQuarantineBlob" (
    id text NOT NULL,
    "blockId" text NOT NULL,
    "rawBlob" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ZtanQuarantineBlob" OWNER TO postgres;

--
-- Name: ZtanRegisteredKey; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ZtanRegisteredKey" (
    id text NOT NULL,
    "actorId" text NOT NULL,
    "publicKey" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ZtanRegisteredKey" OWNER TO postgres;

--
-- Name: ZtanSnapshot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ZtanSnapshot" (
    id text NOT NULL,
    epoch integer NOT NULL,
    "lastSeq" integer NOT NULL,
    "lastHash" text NOT NULL,
    "stateData" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ZtanSnapshot" OWNER TO postgres;

--
-- Name: ZtanWalLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ZtanWalLog" (
    id integer NOT NULL,
    seq integer NOT NULL,
    type text NOT NULL,
    payload text NOT NULL,
    status text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ZtanWalLog" OWNER TO postgres;

--
-- Name: ZtanWalLog_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ZtanWalLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."ZtanWalLog_id_seq" OWNER TO postgres;

--
-- Name: ZtanWalLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ZtanWalLog_id_seq" OWNED BY public."ZtanWalLog".id;


--
-- Name: governance_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.governance_events (
    event_id text NOT NULL,
    event_type text NOT NULL,
    correlation_id text NOT NULL,
    parent_event_id text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actor text NOT NULL,
    service text NOT NULL,
    risk_level text,
    payload_hash text NOT NULL,
    payload text NOT NULL,
    signature text,
    previous_event_hash text,
    current_event_hash text NOT NULL
);


ALTER TABLE public.governance_events OWNER TO postgres;

--
-- Name: ZtanLedgerBlock id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ZtanLedgerBlock" ALTER COLUMN id SET DEFAULT nextval('public."ZtanLedgerBlock_id_seq"'::regclass);


--
-- Name: ZtanWalLog id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ZtanWalLog" ALTER COLUMN id SET DEFAULT nextval('public."ZtanWalLog_id_seq"'::regclass);


--
-- Data for Name: Agent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Agent" (id, name, type, status, health, "tenantId", "lastActive") FROM stdin;
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AuditLog" (id, "tenantId", "userId", action, resource, metadata, status, "ipAddress", hash, "createdAt") FROM stdin;
cb6d9153-0b05-4081-a9ae-7210eb20212c	tenant-alice-001	\N	INSTITUTIONAL_GENESIS	sovereign-root	{"epoch": 0, "entropy": "PHYSICAL_ENTROPY_09123", "service": "unknown", "version": "v1.12", "prevHash": "0000000000000000000000000000000000000000000000000000000000000000", "timestamp": "2026-05-15T13:15:22.428Z"}	SUCCESS	\N	716a22510e4944ea3240516397f3876adfd8ddadbeafd221b16ecdbc3f9979e0	2026-05-15 13:15:22.428
17c94e69-c1d3-4bf9-b24d-9ee0462f6136	tenant-alice-001	\N	MISSION_UPDATE_01	mission-engine	{"service": "unknown", "prevHash": "716a22510e4944ea3240516397f3876adfd8ddadbeafd221b16ecdbc3f9979e0", "sequence": 1, "timestamp": "2026-05-15T13:15:22.607Z"}	SUCCESS	\N	388369b28f851f7e33b3b3bf65bef8aa755f74b9945106f1d2f5eb817fdfb564	2026-05-15 13:15:22.607
e3423ae3-2033-4ca3-872b-413ec0febfec	tenant-alice-001	\N	MISSION_UPDATE_03	mission-engine	{"service": "unknown", "prevHash": "18e988c0baa78c10a3126652a5db0f1db7fc70b8afbe9def5ccf346e6f05b367", "sequence": 3, "timestamp": "2026-05-15T13:15:22.712Z"}	SUCCESS	\N	22ce167aebc4767bd210c59fc0170c57dfa5e85839b6ad53bff13eff571336db	2026-05-15 13:15:22.712
2cb3b97d-9bae-4085-8d7e-d9154631b7e7	tenant-alice-001	\N	MISSION_UPDATE_04	mission-engine	{"service": "unknown", "prevHash": "22ce167aebc4767bd210c59fc0170c57dfa5e85839b6ad53bff13eff571336db", "sequence": 4, "timestamp": "2026-05-15T13:15:22.757Z"}	SUCCESS	\N	6337c2188ecc35f2c617fe4a781283415b1176d757d58a64b733c92005f10b03	2026-05-15 13:15:22.757
548c2523-a895-4ba4-8f40-c39ef261f39d	tenant-alice-001	\N	MISSION_UPDATE_02	mission-engine	{"service": "unknown", "prevHash": "388369b28f851f7e33b3b3bf65bef8aa755f74b9945106f1d2f5eb817fdfb564", "sequence": 2, "timestamp": "2026-05-15T13:15:22.645Z"}	SUCCESS	\N	18e988c0baa78c10a3126652a5db0f1db7fc70b8afbe9def5ccf346e6f05b367	2026-05-15 13:15:22.645
4582d213-ef06-48a0-a20f-092019d0b957	7d31a0c2-27e4-439d-8922-378018c1526d	90ff2d46-c7d8-4757-b8c8-9f3f5841ea11	USER_SIGNUP	auth-layer	{"email": "e2e-test-1780850267575@example.com", "service": "unknown", "prevHash": "0000000000000000000000000000000000000000000000000000000000000000", "timestamp": "2026-06-07T16:37:48.186Z"}	SUCCESS	\N	c5b8a7b7f85660fe2329fd7850c94aaeded8c45241bd05621dfdf76ffce1bb08	2026-06-07 16:37:48.186
\.


--
-- Data for Name: BuildMetric; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."BuildMetric" (id, "projectId", "tokensUsed", "durationMs", "costUsd", status, "createdAt") FROM stdin;
\.


--
-- Data for Name: CodeModule; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CodeModule" (id, path, content, hash, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Event; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Event" (id, type, "userId", "tenantId", metadata, "eventId", "createdAt") FROM stdin;
\.


--
-- Data for Name: ExecutionLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ExecutionLog" (id, "executionId", stage, status, message, progress, metadata, "tenantId", "eventId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: IdempotencyRecord; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."IdempotencyRecord" (id, key, response, status, "executionId", region, "lockedAt", "completedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: IntelligencePolicy; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."IntelligencePolicy" (id, name, "tenantId", "isActive", "costWeight", "performanceWeight", "reliabilityWeight", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: IntelligenceROI; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."IntelligenceROI" (id, "tenantId", period, optimizations, "failureRate", "estimatedSavings", "efficiencyGain", "createdAt", "updatedAt") FROM stdin;
8f8ae9fe-de5b-4ef2-98fd-1b37ebdfc4bb	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:24:15.433	2026-06-07 16:24:15.433
0a0012d4-aecb-4095-98ea-686371a036d1	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:24:46.276	2026-06-07 16:24:46.276
d5049fcb-71f2-40ae-8d46-1404109823a3	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:25:43.777	2026-06-07 16:25:43.777
c6b4e369-fe1f-4d7d-9a3c-1da8457fabc7	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:26:17.303	2026-06-07 16:26:17.303
a75d3950-1a1b-4fd7-bf2c-62db61de79c7	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:26:29.288	2026-06-07 16:26:29.288
28162c46-fbe6-423a-ad23-2a12f28b1cb7	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:27:27.113	2026-06-07 16:27:27.113
0021aad0-3a57-4a57-b15e-34ded335b1ca	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:28:27.098	2026-06-07 16:28:27.098
4cb110d0-8f6d-4f76-877f-29b2a4a75d44	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:29:27.091	2026-06-07 16:29:27.091
c79e1329-95f9-4a7f-b845-3b3ec8e58e0e	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:30:27.086	2026-06-07 16:30:27.086
c4925429-fca1-440e-bea3-effb03cb4098	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:31:27.079	2026-06-07 16:31:27.079
f1755bda-1d93-4012-9f1d-7f1aef99ac94	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:32:27.077	2026-06-07 16:32:27.077
feb5ab7a-5b50-44fa-a47b-5cc957e23803	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:33:27.062	2026-06-07 16:33:27.062
3311797c-43e5-474c-99c8-53ec9888e14a	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:34:27.057	2026-06-07 16:34:27.057
e91409a9-d8ee-48fa-a8e4-30165f45285e	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:35:27.05	2026-06-07 16:35:27.05
8af48392-70f5-40a0-afc5-bef2359bbd31	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:36:27.043	2026-06-07 16:36:27.043
e34289c3-e67e-4c2e-b6a4-944c0ec36039	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:37:27.042	2026-06-07 16:37:27.042
9bb12305-bfca-4eab-95d6-f020fb3111af	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:38:27.029	2026-06-07 16:38:27.029
215d2ff2-13da-460a-9b96-d0aede6574e3	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:39:27.024	2026-06-07 16:39:27.024
3a726e8e-15ea-4a55-aa1d-ca84fee66e45	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:40:27.017	2026-06-07 16:40:27.017
939abccc-4d58-4964-83c9-1d5599db40d0	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:41:27.016	2026-06-07 16:41:27.016
c20f9513-b56b-471d-823f-960f7659b138	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:42:27.025	2026-06-07 16:42:27.025
a48395aa-515f-449c-8856-3d8cb6f3afc7	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:43:27.002	2026-06-07 16:43:27.002
d1d8b75c-ca61-4cfa-b5f0-21538f9e1dcd	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:44:26.994	2026-06-07 16:44:26.994
b311b335-6084-4d8d-90f5-e259eacca2bd	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:45:26.989	2026-06-07 16:45:26.989
633f6219-32c3-417b-8f2e-2a0f32440444	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:46:26.982	2026-06-07 16:46:26.982
5ac6012a-cc4f-411f-8dfc-ef9efb5b8d00	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:47:26.986	2026-06-07 16:47:26.986
d5e12f32-4b56-43f2-9386-556e9c2ec0fb	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:48:26.97	2026-06-07 16:48:26.97
af15c3b3-b5ee-4521-862a-879556f27a27	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:49:26.976	2026-06-07 16:49:26.976
2f0fe493-61a6-4306-aabf-5d54258bf056	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:49:41.133	2026-06-07 16:49:41.133
7a6a0f21-a8e4-4360-bb38-26ed1718eebc	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:50:26.959	2026-06-07 16:50:26.959
11a9dc92-7bd2-4161-b8ed-77f4f5adf551	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:50:37.439	2026-06-07 16:50:37.439
efb96cc2-8ace-4d14-9be6-e06991c7cfa9	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:51:26.963	2026-06-07 16:51:26.963
7384bfbe-58d0-4e7c-a3c2-d91328771590	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:51:37.433	2026-06-07 16:51:37.433
878c13cc-30ec-4a4a-8b0a-610e3257e036	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:52:26.952	2026-06-07 16:52:26.952
c5b324c3-92cc-442f-8dd1-ce4ad965b736	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:52:37.429	2026-06-07 16:52:37.429
1b1cb6c1-b01a-4c20-a71a-e185c4162e15	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:53:26.961	2026-06-07 16:53:26.961
e2a982f9-b999-4750-bde4-0eaf33f88bd1	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:53:37.624	2026-06-07 16:53:37.624
bab6583f-7d9d-480b-a68e-34229f7dd893	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:54:26.945	2026-06-07 16:54:26.945
082f2d62-f114-4e8b-87e7-6773d3de62d1	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:54:37.417	2026-06-07 16:54:37.417
cc873b42-acfe-4126-89ab-73f3d0b6b244	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:55:26.937	2026-06-07 16:55:26.937
ac153d04-fe28-41de-b8da-740686c255b5	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:55:37.414	2026-06-07 16:55:37.414
4025bf9a-de94-4a7e-8bc4-66d70883f44f	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:56:26.931	2026-06-07 16:56:26.931
2d111a85-9ae3-4eb8-be83-0a4e2088bb0c	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:56:37.402	2026-06-07 16:56:37.402
7a48fcfe-e460-4814-926a-b5ab60c03b9b	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:57:26.938	2026-06-07 16:57:26.938
7e83c446-ff6c-4204-b716-d22e63dfff2c	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:57:37.411	2026-06-07 16:57:37.411
24ddeef2-ab73-4868-ae4b-487470e5ad75	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:58:26.92	2026-06-07 16:58:26.92
07cb240a-4a98-42e1-8039-09ff64116824	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:58:37.404	2026-06-07 16:58:37.404
27e018dd-0adf-4b36-9d77-428ecfeae3b3	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:59:26.914	2026-06-07 16:59:26.914
cdbac041-ee78-4e72-a4dd-3bfc9c97ab99	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 16:59:37.389	2026-06-07 16:59:37.389
11d838ac-136b-4f28-a420-7eec6e1fd0ca	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:00:26.907	2026-06-07 17:00:26.907
c106719b-de12-4e1f-bad4-dd44aed1e611	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:00:37.394	2026-06-07 17:00:37.394
7c4bdf62-f701-41a2-8471-aa8abe311a62	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:01:26.906	2026-06-07 17:01:26.906
80f2e0d6-489f-42d6-b3a2-5f623dd80db2	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:01:37.376	2026-06-07 17:01:37.376
bad2f8fe-3d09-423a-b036-241b019e2cbc	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:02:26.947	2026-06-07 17:02:26.947
5c755bfc-409a-46d3-9cb0-5acd3a0ad7f1	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:02:37.371	2026-06-07 17:02:37.371
52c2d996-3e52-492d-bd9c-3ebe0ee3801a	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:03:26.896	2026-06-07 17:03:26.896
37dd814e-a237-4194-9282-bb49924dde04	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:03:37.366	2026-06-07 17:03:37.366
33c13bd0-6155-4dd1-bddd-1aacb3e9a1fc	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:04:26.892	2026-06-07 17:04:26.892
71ddd9fc-41b5-4d42-acb7-9c99af4fd4ad	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:04:37.359	2026-06-07 17:04:37.359
e5328702-43d2-4cde-b735-37066fe3fedf	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:05:26.886	2026-06-07 17:05:26.886
1d4d432c-bc21-46df-a0ee-d7263c29eeed	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:05:37.358	2026-06-07 17:05:37.358
2a1b0404-b2e6-436c-8ee5-d3ef22c37039	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:06:26.88	2026-06-07 17:06:26.88
512773b1-a022-4552-afcc-dfb78dc87988	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:06:37.348	2026-06-07 17:06:37.348
7758eb69-70fa-4859-b0b1-6d68b509a8e1	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:07:26.884	2026-06-07 17:07:26.884
66610017-2d61-4041-9dcd-7674b8bd6ecc	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:07:37.344	2026-06-07 17:07:37.344
54419c92-9da7-481e-ad3d-7d1ed1d34b0c	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:08:26.883	2026-06-07 17:08:26.883
861204ee-adb3-42ae-975b-2585f3e441ce	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:08:37.339	2026-06-07 17:08:37.339
f7d72da8-d048-4b96-a4fd-0b77e85475fe	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:09:26.865	2026-06-07 17:09:26.865
75adcf79-9c7f-40ba-9d8c-8367b5d84043	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:09:37.334	2026-06-07 17:09:37.334
2e38b506-7c54-48c7-ad97-25d3e4ba0e54	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:10:26.863	2026-06-07 17:10:26.863
35696df2-fe97-4994-99ad-6abd734c68f3	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:10:37.342	2026-06-07 17:10:37.342
14eb44b3-c9ce-47aa-87b4-ec83a41614b6	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:11:26.852	2026-06-07 17:11:26.852
5b3bfc47-6fe9-4750-b02b-f32acd499a40	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:11:37.329	2026-06-07 17:11:37.329
01646c0e-dde4-4c53-88c8-62017dd75f6f	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:12:26.847	2026-06-07 17:12:26.847
d055b1ce-20bc-4553-9f59-064a279f9137	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:12:37.319	2026-06-07 17:12:37.319
9decc520-deaa-4509-857e-52dcd8985508	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:13:26.849	2026-06-07 17:13:26.849
cffd8cc0-ccdd-4ccc-9573-cb8a5ec04cc8	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:13:37.316	2026-06-07 17:13:37.316
1ae36f58-ec5b-4cb7-be65-74d1c4a06fe1	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:14:26.837	2026-06-07 17:14:26.837
39281aad-b2f3-473a-a000-f6dab5a9a7d8	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:14:37.32	2026-06-07 17:14:37.32
84ba9a5f-6015-45fb-a4a0-77fefbc0d477	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:15:26.832	2026-06-07 17:15:26.832
b8f44266-d523-4b65-96b7-d7f5000063f0	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:15:37.313	2026-06-07 17:15:37.313
ea3a112c-6cfc-4da7-a3f8-e2ce6a4d72ed	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:16:26.829	2026-06-07 17:16:26.829
e6dcfcea-04e3-40c9-9184-f852c2145c27	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:16:37.304	2026-06-07 17:16:37.304
fd12e30d-c756-4e0c-b457-9329cd018178	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:17:26.822	2026-06-07 17:17:26.822
a52796fa-86f5-434a-a67a-a9509ede49af	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:17:37.298	2026-06-07 17:17:37.298
f303a684-fa28-436a-9965-c6fdcc82856c	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:18:26.825	2026-06-07 17:18:26.825
7527938b-0fe0-4253-88e5-4b66e37e9727	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:18:37.291	2026-06-07 17:18:37.291
78db91eb-d7e5-4d5f-a8f3-fad39fae7130	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:19:26.816	2026-06-07 17:19:26.816
a25eb861-436a-42aa-b4e2-0a82d4d08c2a	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:19:37.286	2026-06-07 17:19:37.286
2b275141-c501-4d29-8ca0-0f2aa8a49e0e	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:20:26.808	2026-06-07 17:20:26.808
71f958bf-ba48-408c-8325-cfbc9dc08e4f	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:20:37.292	2026-06-07 17:20:37.292
5de053a0-2fb5-4008-983b-afb0eb1eaac3	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:21:26.804	2026-06-07 17:21:26.804
21a29ae4-b344-4529-9b43-a4bf20fe50cb	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:21:37.274	2026-06-07 17:21:37.274
6a9df07b-d340-48ac-afb7-396bdbfb6841	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:22:26.8	2026-06-07 17:22:26.8
64f74e10-3c53-412d-a642-d6972114332e	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 17:22:37.269	2026-06-07 17:22:37.269
9ae3bc1c-4296-4c7e-b9d7-cf9ec6a1dc57	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:17:27.749	2026-06-07 18:17:27.749
c3f64bb2-f7e6-4d91-92fd-11152c1330f0	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:17:38.217	2026-06-07 18:17:38.217
5bad20cb-547f-4a7b-8525-220c8b6bd670	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:18:27.743	2026-06-07 18:18:27.743
c28eeeb4-f8d8-4381-b7c2-998b6ae6ea0d	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:18:38.214	2026-06-07 18:18:38.214
5ecb11ba-32c8-486b-b964-562b9c60ff68	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:19:27.741	2026-06-07 18:19:27.741
b9e24218-6389-4497-9862-cb1eaef1687b	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:19:38.234	2026-06-07 18:19:38.234
186b6adc-e1d1-4aa9-9f6f-7145081542a6	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:20:27.738	2026-06-07 18:20:27.738
a297fae3-ec73-4a95-8f80-e9ddcc98cb8a	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:20:38.207	2026-06-07 18:20:38.207
f6baac79-c946-434a-9a60-257244db74bc	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:21:27.735	2026-06-07 18:21:27.735
62835a6c-f889-43c1-b7f0-fab063092d7d	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:21:38.202	2026-06-07 18:21:38.202
37514fea-7ad2-464a-9f53-66f0c713fbe6	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:22:27.744	2026-06-07 18:22:27.744
e6967686-d3ad-4331-9e74-48f33d5936fd	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:22:38.196	2026-06-07 18:22:38.196
69f96366-7c93-46a1-9f83-2bb2769d7e4f	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:23:27.763	2026-06-07 18:23:27.763
f5901c0e-f482-45b4-a997-4cc669c8261a	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:23:38.192	2026-06-07 18:23:38.192
29f896d9-975f-4202-8c1e-67144b608889	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:24:27.718	2026-06-07 18:24:27.718
31a371d5-7c09-422d-89e8-2e0a9d68a9d2	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:24:38.185	2026-06-07 18:24:38.185
2b0dd7e1-2edd-44f7-9594-1b19a545ddaf	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:25:27.706	2026-06-07 18:25:27.706
a5c135b4-9d2f-45d5-ae0e-2e3f478f14d0	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:25:38.176	2026-06-07 18:25:38.176
722290a7-7d57-45e7-9861-398f8ab4463a	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:26:27.7	2026-06-07 18:26:27.7
0d1efdba-38a9-4af5-9900-84d66d8c8d8c	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:26:38.167	2026-06-07 18:26:38.167
4b4bac77-cd33-46de-b93d-a004b485c25a	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:27:27.693	2026-06-07 18:27:27.693
3ed6030b-f4d1-4391-89a4-a28a0f5c2103	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:27:38.163	2026-06-07 18:27:38.163
f8651a60-27d8-467a-8450-d4ca222c03d3	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:28:27.701	2026-06-07 18:28:27.701
604331c6-6f58-4ba5-9aef-10bb5e555772	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:28:38.452	2026-06-07 18:28:38.452
af0ec254-7c18-4c9a-ac46-b1aef7a29d91	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:29:27.836	2026-06-07 18:29:27.836
92725613-00a8-4149-bb89-4c305e26737b	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:29:38.15	2026-06-07 18:29:38.15
5e6fb99e-9fdb-4db5-9bfb-d64de06dcf7f	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:30:27.668	2026-06-07 18:30:27.668
b417af5f-2a6c-43cd-a6e4-d7f46f2e9fd9	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:30:38.151	2026-06-07 18:30:38.151
5d547be5-0793-4462-9479-3e7b1c1b0548	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:31:27.663	2026-06-07 18:31:27.663
1d42b8a0-8c00-4543-9b6c-635002fde68c	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:31:38.141	2026-06-07 18:31:38.141
98366968-a9bb-4cf1-aafe-b3351f0f72b3	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:32:27.661	2026-06-07 18:32:27.661
037949d5-4b1b-41a3-b68b-6c4a7ecb75f8	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:32:38.137	2026-06-07 18:32:38.137
cdd6aca5-b731-413a-a6bd-5f0f3fb214e7	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:33:27.863	2026-06-07 18:33:27.863
0059e3ae-c0d3-4f84-aa72-6dcefc6a2535	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:33:38.239	2026-06-07 18:33:38.239
135bf8bb-76b3-49e6-9496-f05ecebe5436	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:34:27.648	2026-06-07 18:34:27.648
77b230f7-06da-45e4-a017-0074927cc850	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:34:38.116	2026-06-07 18:34:38.116
adaa83c0-ce4b-4a36-b012-a6037935bc2c	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:35:27.627	2026-06-07 18:35:27.627
73bb8718-e95c-4d7a-b466-3c7d5aa1d7e3	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:35:38.1	2026-06-07 18:35:38.1
cb26030c-5a17-4bfb-afc9-af54c1da3b62	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:36:27.617	2026-06-07 18:36:27.617
9a1b69c5-96fb-421c-86a0-a6a88ebcaf36	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:36:38.096	2026-06-07 18:36:38.096
63490fea-7deb-4e23-b053-60d82a69301a	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:37:27.602	2026-06-07 18:37:27.602
309f096d-9a5e-4158-9fe3-ece0ed9920ad	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:37:38.088	2026-06-07 18:37:38.088
f2d1d991-56bf-41b4-ac6c-b0299b070423	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:38:27.594	2026-06-07 18:38:27.594
fae08fc0-ae67-4d91-a118-2b4aab60d1f2	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:38:38.071	2026-06-07 18:38:38.071
7abb34be-419f-4beb-9b19-25271954d079	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:39:27.584	2026-06-07 18:39:27.584
79cf5c0a-1123-446d-b2af-1faa2f44b509	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:39:38.066	2026-06-07 18:39:38.066
a961e834-7133-47f4-a5a9-3fc3f5e1fa67	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:40:27.575	2026-06-07 18:40:27.575
94440b35-549f-41e9-8bc5-5cb7fcc4905f	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:40:38.047	2026-06-07 18:40:38.047
6a8da52c-3dad-4835-b115-8907a3e20576	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:41:27.568	2026-06-07 18:41:27.568
3232df3c-7408-402a-8683-dfb8014b4bfb	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:41:38.037	2026-06-07 18:41:38.037
406d480a-a55e-4c9e-bbcc-a50ada35d0a2	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:42:27.684	2026-06-07 18:42:27.684
1b4d300f-9f24-4f2f-9269-1cb877b523a8	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:42:38.205	2026-06-07 18:42:38.205
82ccd2f3-afab-4f5e-951a-8fc59c6fdeeb	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:43:27.596	2026-06-07 18:43:27.596
e3a64449-8338-45c1-ab3f-3e4ce8cff7b8	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:43:38.022	2026-06-07 18:43:38.022
5bb62d77-17aa-4678-b580-fa84ca5a6e44	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:44:27.568	2026-06-07 18:44:27.568
51ba0676-d622-48d5-855b-db3aa80acefe	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:44:38.052	2026-06-07 18:44:38.052
41d79fd3-5ce9-4f5e-b04f-d578dfd030b6	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:45:27.55	2026-06-07 18:45:27.55
e383389a-ec52-4e6d-b03f-57abd5dcafdc	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:45:38.001	2026-06-07 18:45:38.001
8f89416f-20c9-4353-9f13-159946ad9092	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:46:27.543	2026-06-07 18:46:27.543
31b7e791-1d24-4e38-8940-5b3f8dbe6167	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:46:38.014	2026-06-07 18:46:38.014
bcd5b45c-01a4-41c9-a667-1060d1f1d613	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:47:27.534	2026-06-07 18:47:27.534
565a398d-f089-4dc5-b20b-9525dfe1a668	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:47:37.995	2026-06-07 18:47:37.995
5ab88cc7-8673-48bf-b20e-9acee218df6d	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:48:27.519	2026-06-07 18:48:27.519
874837e7-f97e-4212-b7fb-dc1251b81adf	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:48:37.966	2026-06-07 18:48:37.966
3f2746f6-2c12-4433-9d2a-722dd9a88601	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:49:27.525	2026-06-07 18:49:27.525
617ff012-4f97-4a57-b101-ab9c291869e0	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:49:37.971	2026-06-07 18:49:37.971
1945d73b-a8c3-491e-b97a-45704e83c802	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:50:27.498	2026-06-07 18:50:27.498
66b9c6c5-0a7d-4426-a3f3-bed5909b4691	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:50:37.95	2026-06-07 18:50:37.95
d217402f-81b5-4398-a531-019485a09099	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:51:27.488	2026-06-07 18:51:27.488
c96d572b-21fb-405d-9f29-d17179decfe7	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:51:37.936	2026-06-07 18:51:37.936
853738fe-7c9a-44fb-9b7d-918c5f67a9fb	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:52:27.479	2026-06-07 18:52:27.479
58e195e6-efac-46f2-a235-50d2d7fb183f	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:52:37.927	2026-06-07 18:52:37.927
c1c134ef-1010-49f6-850c-c82c541ab417	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:53:27.468	2026-06-07 18:53:27.468
6766d696-c883-45f4-8785-0e493b6c9a86	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:53:37.918	2026-06-07 18:53:37.918
70529b2f-f055-402a-b1d5-415b12b86bb5	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:54:27.509	2026-06-07 18:54:27.509
acfcee3d-8376-46b2-8411-86f2ded74cdf	system	PULSE-2026-06-07	0	0	0	0	2026-06-07 18:54:37.928	2026-06-07 18:54:37.928
206072b1-1884-4766-80a0-57bd8d9e8174	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:23:07.286	2026-06-08 03:23:07.286
af215bc7-ab29-47c2-af61-080831d53656	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:23:08.679	2026-06-08 03:23:08.679
78669971-9e08-4d32-af90-afed4c32186f	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:24:02.201	2026-06-08 03:24:02.201
1e742b52-f1ae-4a22-a61a-b547e0a1fcf2	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:24:02.489	2026-06-08 03:24:02.489
1f480b31-85ed-45a8-a8f4-2b3b9059d577	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:25:02.182	2026-06-08 03:25:02.182
6d9cf4cb-ff75-435c-926c-dc1f241a49aa	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:26:02.167	2026-06-08 03:26:02.167
c165a2e7-b0a4-46fc-b14c-344c282c96db	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:27:02.181	2026-06-08 03:27:02.181
7c595f7e-f8eb-4769-8c39-233c8de11171	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:28:02.157	2026-06-08 03:28:02.157
47e2bb28-24e3-4164-8536-c611ff2892f4	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:25:02.475	2026-06-08 03:25:02.475
0587c64d-1615-4c2e-81b4-f5960b60c113	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:26:02.46	2026-06-08 03:26:02.46
ad4adeeb-9204-409f-a21d-b04cf3418fb4	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:27:02.46	2026-06-08 03:27:02.46
99a4813f-2e7d-4693-b6e1-23993779cfa4	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:28:02.46	2026-06-08 03:28:02.46
60b093e3-aae3-403a-a369-4882e11acdb6	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:29:02.441	2026-06-08 03:29:02.441
1144fc51-3bf3-440e-b119-126da8d42fef	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:29:02.722	2026-06-08 03:29:02.722
33a41da7-3360-4cc3-91af-c501f10a927b	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:29:09.688	2026-06-08 03:29:09.688
22df82a7-1ead-4265-8ca0-a345daf80cd2	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:30:02.78	2026-06-08 03:30:02.78
7316bae3-9cb2-4855-b2eb-34b607cfc192	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:30:03.066	2026-06-08 03:30:03.066
eb0752ac-e365-481b-9c4e-b5e524cb1b93	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:30:10.001	2026-06-08 03:30:10.001
27744c93-184b-4d2e-9a48-d8fe78fb267d	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:31:02.772	2026-06-08 03:31:02.772
cc59e567-9bb0-4c4c-90fb-ba4599403efd	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:31:03.077	2026-06-08 03:31:03.077
dd5bcde7-d16d-4803-81fd-c67f74499d1a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:31:09.986	2026-06-08 03:31:09.986
72541e36-a6b4-43f3-91f3-f80669eee8a6	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:32:02.757	2026-06-08 03:32:02.757
0cf1a039-9582-4256-8fd3-79986e345d3b	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:32:03.048	2026-06-08 03:32:03.048
756d84e5-f556-4ef9-b6ea-236b2f9a4df2	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:32:09.967	2026-06-08 03:32:09.967
c5004fd6-c099-44c4-8c8d-3de599460c41	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:33:03.039	2026-06-08 03:33:03.039
0d35b85d-3dd3-4d5f-803c-9c73064da500	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:33:09.964	2026-06-08 03:33:09.964
8c410151-6c7e-4768-aea9-1928d3e095a7	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:34:03.076	2026-06-08 03:34:03.076
9f4b87bf-cf06-4a89-9a80-eede6d492f83	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:34:09.966	2026-06-08 03:34:09.966
b06712af-89a3-48f3-9ab6-596eab92ce0a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:35:03.026	2026-06-08 03:35:03.026
1c39651c-e1d4-4430-8f96-cbea28998fef	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:35:09.946	2026-06-08 03:35:09.946
2e76ad01-8e82-48be-a698-454acbdd5d0e	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:36:03.02	2026-06-08 03:36:03.02
e9dd1037-2cfd-4117-b32c-5b378a7ba2fa	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:36:09.948	2026-06-08 03:36:09.948
001482e5-b851-4964-be3d-3190d461f603	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:37:03.009	2026-06-08 03:37:03.009
842aa19e-1619-4b32-a7c8-6d1728d3f8e1	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:37:09.931	2026-06-08 03:37:09.931
7ddaf97e-5a81-489a-842f-861d8440c26a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:38:03.002	2026-06-08 03:38:03.002
ee77eb01-7840-460a-8f07-5ee9279741a8	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:38:09.925	2026-06-08 03:38:09.925
0305fb1c-79f7-4c58-aeda-50966f35d02a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:39:03.006	2026-06-08 03:39:03.006
0fdda7d7-29bf-46a2-9c5f-891789434bc6	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:39:09.981	2026-06-08 03:39:09.981
7d00b0b6-97ba-4e16-a65e-1d2b67c0c382	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:40:02.991	2026-06-08 03:40:02.991
d67d5e2c-3ba3-4ced-bda2-c1f92ae6d796	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:40:09.907	2026-06-08 03:40:09.907
054151d4-6051-40d4-8277-7896b2b87e6a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:41:02.983	2026-06-08 03:41:02.983
e1546793-053d-40ec-82ca-97b4019686eb	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:41:09.898	2026-06-08 03:41:09.898
75e1a0bb-d564-4cd5-91e4-7bee2fb44924	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:42:02.978	2026-06-08 03:42:02.978
97567233-02ad-4c2e-a120-6a8e5da6c7d1	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:42:09.894	2026-06-08 03:42:09.894
40e97c76-0a93-4126-95c2-5efed4641391	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:42:12.881	2026-06-08 03:42:12.881
6844911a-98ff-4af1-8ca7-0fcfb622b78b	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:43:09.885	2026-06-08 03:43:09.885
0a05631e-5f7b-4105-860c-9231843ebb61	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:43:12.8	2026-06-08 03:43:12.8
a7b75235-f3d4-4451-ad84-d5fd023b88ba	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:44:09.877	2026-06-08 03:44:09.877
184da5da-1ada-4a3f-94ae-62b2434dac83	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:44:12.771	2026-06-08 03:44:12.771
b677ce7e-72d8-44af-a3dd-075843e9e743	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:45:09.871	2026-06-08 03:45:09.871
42165388-fdd8-420d-bb7d-95e722a80208	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:45:12.764	2026-06-08 03:45:12.764
28b90aab-2f34-4c0b-9e57-abf9fee1a87f	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:46:09.863	2026-06-08 03:46:09.863
56393446-d62d-48b7-8a7c-718e8f3cab12	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:46:12.762	2026-06-08 03:46:12.762
36b52204-0f0e-4528-9d96-fa93edd4bace	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:47:09.859	2026-06-08 03:47:09.859
8665c0ec-1cfd-4a84-8094-eea7eb1dd1e7	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:47:12.753	2026-06-08 03:47:12.753
df246391-7a9d-42b2-a404-b92421b07769	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:48:09.849	2026-06-08 03:48:09.849
cb946713-d4e8-494b-867d-1405338352e8	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:48:12.752	2026-06-08 03:48:12.752
e6cbf01d-6230-4712-acdd-0950519d44a9	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:49:09.847	2026-06-08 03:49:09.847
b842f9ae-bcf1-494d-b6de-f76234c48ccc	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:49:12.738	2026-06-08 03:49:12.738
a73365f9-71e0-436b-9449-6e070d9d6709	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:50:09.843	2026-06-08 03:50:09.843
7171158f-4cb8-4c7f-a242-12ed003ab81a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:50:12.732	2026-06-08 03:50:12.732
557f861f-d233-4326-aa38-9c786db53563	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:51:09.831	2026-06-08 03:51:09.831
25b95989-f0f8-40f4-9ef3-c73244948e8c	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:51:12.727	2026-06-08 03:51:12.727
04d594f2-0250-4e57-8a95-06f8cbfb4e68	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:52:09.821	2026-06-08 03:52:09.821
5c539659-7e8c-436f-b4e5-79a4b5f485f9	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:52:12.817	2026-06-08 03:52:12.817
45af0b91-c427-4f60-8977-41794acf0c3b	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:53:09.815	2026-06-08 03:53:09.815
8b0f3cfd-4a31-487a-b3f9-c55a0f577f06	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:53:12.713	2026-06-08 03:53:12.713
6d8cd3a3-4985-42e0-9a9a-f47480a2ea63	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:54:12.707	2026-06-08 03:54:12.707
9d5debdd-fa70-4deb-a5dc-df9a103dc032	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:54:09.809	2026-06-08 03:54:09.809
a56fcbf3-73f9-4cc0-98ca-8a6cc40ad9b0	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:55:09.803	2026-06-08 03:55:09.803
f0095b52-a3b5-4e2f-bf9d-da9a8829258a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:55:12.701	2026-06-08 03:55:12.701
7d1aa564-1426-48ae-bc31-7a6d7e2bf56a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:56:09.794	2026-06-08 03:56:09.794
971802b1-9ef5-4b25-9126-f6b283293c23	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:56:12.689	2026-06-08 03:56:12.689
81d78fb1-095e-4327-885b-6396e63bd7ad	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:57:09.79	2026-06-08 03:57:09.79
8868dbed-528b-465b-b897-0601505f38c9	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:57:12.686	2026-06-08 03:57:12.686
f9188578-6b31-4b08-a121-7346d983eb27	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:58:09.786	2026-06-08 03:58:09.786
be57bf14-d766-4c97-bd3a-64f115028ae5	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:58:12.677	2026-06-08 03:58:12.677
80f7134b-69f4-4968-b407-3ec18a97bd2f	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:59:09.777	2026-06-08 03:59:09.777
e3bec1ff-42b7-4af7-9eb7-470f9210bb04	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 03:59:12.672	2026-06-08 03:59:12.672
a8da5947-3d9f-4645-b7ca-31a5a58269db	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:00:09.771	2026-06-08 04:00:09.771
f6d1ba57-96ce-4af6-a636-084fa26fdb66	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:00:12.663	2026-06-08 04:00:12.663
66090bf0-0cf9-42ab-bb4c-3ca3c3d7ca61	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:01:09.765	2026-06-08 04:01:09.765
07526953-20a1-4c7f-8ee6-8e17cfa92862	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:01:12.724	2026-06-08 04:01:12.724
910cdac5-467b-4660-b0d4-ae28f7e3ed3a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:02:09.77	2026-06-08 04:02:09.77
2c5741c6-1f95-415b-9710-8fd32d8cac96	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:02:12.675	2026-06-08 04:02:12.675
d8e53c08-a0b9-4f81-b13a-c4cf3b7fddf9	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:03:09.734	2026-06-08 04:03:09.734
8d7d42ac-da9b-4c69-abdd-aa7c48ec7000	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:03:12.674	2026-06-08 04:03:12.674
e2ef875a-7a00-4523-9a3c-6714335995b1	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:04:09.725	2026-06-08 04:04:09.725
a02b7ed6-20cd-47c3-a47e-d40f56b9b5e2	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:04:12.681	2026-06-08 04:04:12.681
4737376c-a69d-41ab-92ae-e8ffe7d5a317	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:05:09.719	2026-06-08 04:05:09.719
f8f47c12-4398-492c-b2c2-4f59294964b6	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:05:12.644	2026-06-08 04:05:12.644
3d7d0dcd-c78d-4787-8055-390068fe8e57	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:06:09.482	2026-06-08 04:06:09.482
5846ce60-0fb2-4386-80c5-4ba095a08989	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:06:12.418	2026-06-08 04:06:12.418
d19b551c-c469-4e62-b363-ed2597ee75ab	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:07:11.544	2026-06-08 04:07:11.544
b18b315a-64f1-4a97-b76d-15844b2d7102	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:07:12.095	2026-06-08 04:07:12.095
72971e97-8f1e-47ed-868c-232406fd3d9b	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:08:10.8	2026-06-08 04:08:10.8
2a03e5f3-56ef-4625-9c47-6e8bddad7734	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:08:12.272	2026-06-08 04:08:12.272
f1a7f102-8331-42e8-80f4-2c37fef9dc58	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:09:10.779	2026-06-08 04:09:10.779
0b8cbc19-5d4b-4471-b916-a787b6537e39	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:09:12.237	2026-06-08 04:09:12.237
2588d30b-b086-4de5-b1f5-7fbf9591587b	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:10:10.747	2026-06-08 04:10:10.747
af6caf52-952b-4a96-8e10-afd5f886cd1f	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:10:12.21	2026-06-08 04:10:12.21
7224c92e-8637-42a4-8835-b3fff520e150	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:11:10.736	2026-06-08 04:11:10.736
a85bb386-8423-4657-bf77-baf9a352ee2b	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:11:12.189	2026-06-08 04:11:12.189
60edde84-b1d1-4892-a75d-a1702d253232	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:12:10.726	2026-06-08 04:12:10.726
54cd71f8-c032-4219-8fda-228dcd1e4a01	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:12:12.18	2026-06-08 04:12:12.18
1f53a903-f9e0-4c19-be8c-b957f3a13ddb	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:13:10.752	2026-06-08 04:13:10.752
54c71687-c430-4b37-8c8f-476376f20cf1	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:13:12.166	2026-06-08 04:13:12.166
9062b90c-d626-4b01-95b6-44d3038fe691	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:14:10.708	2026-06-08 04:14:10.708
cda83e96-b7a9-4c2d-9202-24e9e289d1af	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:14:12.159	2026-06-08 04:14:12.159
9754f581-9555-4c7b-bf9f-0cb7a998bdb3	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:15:10.7	2026-06-08 04:15:10.7
2812a6c8-13a8-444c-bc82-f6a7d6a65d7b	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:15:12.155	2026-06-08 04:15:12.155
39b0b74e-f567-45c3-83d7-ca58193847a1	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:16:10.696	2026-06-08 04:16:10.696
13e8515f-d5ec-450c-8a97-f02576a63f20	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:16:12.138	2026-06-08 04:16:12.138
2478956d-5260-40ef-a381-6a281ff2d8b4	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:17:10.674	2026-06-08 04:17:10.674
9e4020d3-b4ca-4a2d-b090-af1dc470f234	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:17:12.127	2026-06-08 04:17:12.127
dc53fbd7-5266-461c-beb1-debcac93e193	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:18:10.675	2026-06-08 04:18:10.675
853ea9d7-acf6-4130-9036-7a03bdf7425a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:18:12.128	2026-06-08 04:18:12.128
39c9fe6e-f246-465c-86f7-2f0bf304ba4a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:19:10.769	2026-06-08 04:19:10.769
85500ef9-1780-41bc-9278-9d11a84fca73	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:19:12.116	2026-06-08 04:19:12.116
569f3abf-3e7f-4fcd-83f4-8721f5785018	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:20:10.658	2026-06-08 04:20:10.658
1173f304-2466-4647-9467-85c624c7d2f8	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:20:12.11	2026-06-08 04:20:12.11
cd612a7c-b23c-48fd-837b-b301103e6c8e	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:21:10.655	2026-06-08 04:21:10.655
acb09140-fc49-4093-8fe8-39cf4e442448	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:21:12.103	2026-06-08 04:21:12.103
ff2f0608-7b30-44f2-9f2a-9a48cb64a557	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:22:10.652	2026-06-08 04:22:10.652
679047c3-e73e-45d9-b667-5b70a7d7da74	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:22:12.117	2026-06-08 04:22:12.117
3fd2eb9d-2490-4670-9207-f46c70cf8273	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:23:10.638	2026-06-08 04:23:10.638
d45d1e90-88e5-419b-ad0b-df6f64f786ca	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:23:12.094	2026-06-08 04:23:12.094
daee40b4-f3ee-4f22-880b-76adfb4823f8	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:24:12.082	2026-06-08 04:24:12.082
e564bd37-216e-43cb-9379-98a6ac908384	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:25:12.067	2026-06-08 04:25:12.067
802f3cca-7e48-4bd7-8d45-2f836e63a39b	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:26:12.055	2026-06-08 04:26:12.055
37ac6c29-c7c6-44b0-b2ae-2cbdfacbc68c	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:27:12.041	2026-06-08 04:27:12.041
852900a1-b122-4129-980f-82efd98e6492	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:24:10.632	2026-06-08 04:24:10.632
29c5fc6e-0409-4dd8-aef0-6e94cc1957f4	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:25:10.738	2026-06-08 04:25:10.738
3433715e-f910-41c3-9d29-dd76f461a169	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:26:10.609	2026-06-08 04:26:10.609
faf6a00f-de6b-45ca-862a-4f875e9de579	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:27:10.596	2026-06-08 04:27:10.596
86e5a72e-3532-4ead-9cb1-22580295c338	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:28:10.585	2026-06-08 04:28:10.585
39cd6053-4726-4c60-a5df-21ba3381ab77	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:28:12.037	2026-06-08 04:28:12.037
c1b0dc8e-f7b4-471d-ad78-a764a133c4fe	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:29:10.573	2026-06-08 04:29:10.573
6df025bb-5195-4c9a-b43d-b2930ca31937	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:29:12.019	2026-06-08 04:29:12.019
fc19c191-ea78-403f-a658-c57718b47e3d	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:30:10.582	2026-06-08 04:30:10.582
6fed0a3e-d081-47db-8e65-32410bd5f795	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:30:12.003	2026-06-08 04:30:12.003
959bdcb5-2a41-4a74-8cc8-4a0b21d1e944	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:31:10.663	2026-06-08 04:31:10.663
4f40958d-be65-4d40-bfae-8bc65180e266	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:31:12.001	2026-06-08 04:31:12.001
0aa0e223-0985-4dbe-a234-0db4ad0b8c52	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:32:10.556	2026-06-08 04:32:10.556
eb463661-807c-49a9-ab9b-7349a75a081e	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:32:11.983	2026-06-08 04:32:11.983
07c032a3-a492-4642-8ee3-b702ccb2bd85	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:33:10.538	2026-06-08 04:33:10.538
7e383861-0940-43f6-86c9-1fe744f0dddd	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:33:12.02	2026-06-08 04:33:12.02
54028ea2-0dd9-489d-881c-c1e87fad0bd7	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:34:10.536	2026-06-08 04:34:10.536
a67c80ba-81f5-465c-bc7c-83f708ecc2a9	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:34:11.965	2026-06-08 04:34:11.965
c01458af-8fa0-481f-a5e5-c3b166e8f37a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:35:10.524	2026-06-08 04:35:10.524
a8d645e2-f1bb-4ce6-8b11-e3bf5cd85f27	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:35:11.959	2026-06-08 04:35:11.959
1f921678-4ef3-4ed0-996a-428dd7baabc2	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:36:10.505	2026-06-08 04:36:10.505
f5cefa28-af78-48f9-9cf1-0940c65e03f3	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:36:11.945	2026-06-08 04:36:11.945
5016c172-a8b7-4ee6-a1e1-90c8296a79c7	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:37:10.679	2026-06-08 04:37:10.679
1a0a6740-696c-4d78-8ec9-1f187b13d994	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:37:11.932	2026-06-08 04:37:11.932
c2340318-7d60-4b0d-815f-6cf1f9b40cd3	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:38:10.484	2026-06-08 04:38:10.484
97389024-7bad-4a8c-b68b-5feab0cda28b	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:38:11.927	2026-06-08 04:38:11.927
a565b31a-9491-47f1-abc7-91997c684a7b	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:39:10.468	2026-06-08 04:39:10.468
ba393f0b-1964-4888-8b48-a16546afa0fe	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:39:11.911	2026-06-08 04:39:11.911
24969725-02d2-4755-bcc3-e5c0aedeb6d8	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:40:10.459	2026-06-08 04:40:10.459
f41aa354-78b4-47af-907f-619ad4a75f08	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:40:11.896	2026-06-08 04:40:11.896
9587946f-1811-4deb-8d72-5685ab1e4016	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:41:10.46	2026-06-08 04:41:10.46
a34d359f-6ea0-4169-9737-6a6820d4a771	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:41:11.96	2026-06-08 04:41:11.96
84afa951-ce84-4820-b118-0155109e7635	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:42:10.419	2026-06-08 04:42:10.419
57a32bb1-543d-412a-a8f5-65e69b474b45	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:42:11.89	2026-06-08 04:42:11.89
52a20ade-66a0-473c-aca2-f205b8add3c1	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:43:10.501	2026-06-08 04:43:10.501
6de82d5e-8d1d-468c-beb8-7c93209e2801	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:43:11.843	2026-06-08 04:43:11.843
a89fe51b-d73b-4931-bb72-c7a7d620c853	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:44:10.388	2026-06-08 04:44:10.388
c7382b3b-8b39-47f3-92c1-1f60db68c0cc	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:44:11.841	2026-06-08 04:44:11.841
84df38b3-32ce-4946-a43d-dba5b1f3abec	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:45:10.374	2026-06-08 04:45:10.374
0197e3a8-ffae-4e64-833b-f5749a9cdccc	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:45:11.818	2026-06-08 04:45:11.818
21b51068-07db-47c8-a791-8adc7362a602	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:46:10.374	2026-06-08 04:46:10.374
35f16b50-0eca-4569-9156-6dadb82c4aaa	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:46:11.807	2026-06-08 04:46:11.807
398f7921-c6a2-40a8-be26-8c18908427b1	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:47:10.346	2026-06-08 04:47:10.346
57cc4d33-c3ff-4951-944c-d2cfa464f977	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:47:11.785	2026-06-08 04:47:11.785
3ea5aaad-648c-49c2-8291-fa270573a45c	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:48:10.32	2026-06-08 04:48:10.32
76a962d3-b0ab-4185-980b-2e00c047ba30	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:48:11.754	2026-06-08 04:48:11.754
84415a90-f0e8-49d3-afb7-70415d1f91bc	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:49:10.312	2026-06-08 04:49:10.312
edf18771-1e72-4ff2-90ac-799ac035c041	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:49:11.754	2026-06-08 04:49:11.754
42f4a194-a9a4-4201-ab21-ae255307e82e	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:50:10.3	2026-06-08 04:50:10.3
5a630ebb-849c-46e5-a926-cf2539e40b8c	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:50:11.745	2026-06-08 04:50:11.745
648e9b9e-c280-410b-ae2a-59e1bbf615df	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:51:10.293	2026-06-08 04:51:10.293
e6a690c9-fefb-4195-abf0-4cd5431d3f75	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:51:11.738	2026-06-08 04:51:11.738
fec46671-f1d5-4b49-867c-d8177992eeca	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:52:10.28	2026-06-08 04:52:10.28
66495886-4b04-413c-953f-76efa4b86eca	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:52:11.732	2026-06-08 04:52:11.732
228a0db9-8293-4d0f-aef1-9faac9e91a2f	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:53:10.275	2026-06-08 04:53:10.275
b93a0499-07e9-4d2a-a18a-1b05328e5316	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:53:11.713	2026-06-08 04:53:11.713
adfb4886-bb36-42a0-b4f8-93f1376cbc5f	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:54:10.349	2026-06-08 04:54:10.349
06a6c3e4-e551-40a5-91e0-35964a71e2f0	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:54:11.72	2026-06-08 04:54:11.72
cb9b886c-44c6-4ce9-be93-bc05a7e3642c	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:55:10.251	2026-06-08 04:55:10.251
7bc56a43-6b87-457a-aa82-4e421a72c492	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:56:10.243	2026-06-08 04:56:10.243
40f98e9b-8edd-4efc-b9a7-99ab36dd6795	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:57:10.227	2026-06-08 04:57:10.227
617f1148-b2be-4932-98f9-4c961e108366	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:58:10.219	2026-06-08 04:58:10.219
e333b180-7fd4-4dbd-825a-06e49c89e548	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:55:11.703	2026-06-08 04:55:11.703
be81f84e-f694-46cd-bd66-bbd7fa68d3ff	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:56:11.703	2026-06-08 04:56:11.703
a01cf217-cdee-4cb1-96f9-1d23cf22c558	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:57:11.663	2026-06-08 04:57:11.663
3341458a-a9e7-4d29-b9cd-a2aa635870c7	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:58:11.671	2026-06-08 04:58:11.671
e605aeea-3166-4d08-9a1b-ac46ebae5d1a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:59:10.49	2026-06-08 04:59:10.49
cbc16907-f6ba-4f79-9b5c-6868f5928669	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 04:59:11.633	2026-06-08 04:59:11.633
52ac4387-85a4-4166-9fb2-8bab7d485eef	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:00:10.181	2026-06-08 05:00:10.181
54c64734-2099-4b91-abc6-6b5ca346ed29	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:00:11.65	2026-06-08 05:00:11.65
5fd3c95b-d468-410a-ad1b-9df5c5e7e38a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:01:10.162	2026-06-08 05:01:10.162
7160d9b2-506e-46d5-b850-fad1f2b728a6	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:01:11.609	2026-06-08 05:01:11.609
2b94dc01-bbd4-458c-8390-7e2fd816f321	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:02:10.546	2026-06-08 05:02:10.546
93732018-9282-4d07-bf84-aace1fd1239e	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:02:11.613	2026-06-08 05:02:11.613
4d41016b-8dd6-4509-8c1b-2eccc860d541	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:03:10.195	2026-06-08 05:03:10.195
8e35c251-3a04-4de3-b360-6c296ad1207c	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:03:11.602	2026-06-08 05:03:11.602
e7c8816a-1906-4bdd-b477-44d58d30747f	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:04:10.163	2026-06-08 05:04:10.163
6195cced-fccd-4c3f-984a-3afa26b7a7e0	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:04:11.575	2026-06-08 05:04:11.575
f2241006-9e65-4e58-b933-e129dbede545	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:05:10.129	2026-06-08 05:05:10.129
50376a7d-fb5f-4571-b363-670093624d8a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:05:11.569	2026-06-08 05:05:11.569
b4f3d7af-f449-4668-94b7-1c0ab3a11c26	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:06:10.112	2026-06-08 05:06:10.112
be80b0bb-3c84-4080-9fc2-bb6eb6e06f74	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:06:11.539	2026-06-08 05:06:11.539
46d0c10b-dbd5-4e55-ac29-7a09e1277e5c	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:07:10.095	2026-06-08 05:07:10.095
35a1aced-0fb6-46ed-a8f3-5420c6e88e23	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:07:11.538	2026-06-08 05:07:11.538
50427d54-67e7-4c09-8dc2-e7d231d3cb61	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:08:10.345	2026-06-08 05:08:10.345
73b4a3a6-1447-4eed-84a6-28aad1e27903	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:08:11.552	2026-06-08 05:08:11.552
4b408ff9-5445-4f54-814d-a6dec258e9cd	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:09:10.081	2026-06-08 05:09:10.081
d4098d7b-0815-469d-831e-9ad2b76e4f1d	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:09:11.489	2026-06-08 05:09:11.489
5cedc8b9-ded6-4450-b95c-516b94bc4e3e	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:10:10.066	2026-06-08 05:10:10.066
38499fef-94e6-48bc-a8dd-ddcfb5220170	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:10:11.496	2026-06-08 05:10:11.496
23f8da79-0a68-4acd-92ff-4893c4d37874	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:11:10.06	2026-06-08 05:11:10.06
57f06c12-5f03-4d0e-82f1-11b1d35d0f4a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:11:11.482	2026-06-08 05:11:11.482
173acc29-7d05-4000-89ac-0d7b01037b2b	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:12:10.058	2026-06-08 05:12:10.058
1877eb99-64e3-4387-8a89-689504aa8812	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:12:11.475	2026-06-08 05:12:11.475
55689557-1df8-4598-b6b8-116904164853	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:13:10.049	2026-06-08 05:13:10.049
be5e98f7-168b-46a7-a5dd-4cffdd9f58d6	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:13:11.471	2026-06-08 05:13:11.471
45947670-ae05-4fd7-aa08-569e22ad1742	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:14:10.043	2026-06-08 05:14:10.043
0a2630bc-9bf1-4523-8fc0-337b8af95a04	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:14:11.466	2026-06-08 05:14:11.466
fd3dbf63-e419-4c3f-b3a7-f2d76c5a8af7	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:15:10.038	2026-06-08 05:15:10.038
b017d96e-9bbe-4b6e-ae90-f7c3641ba4c3	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:15:11.462	2026-06-08 05:15:11.462
ee0d172e-54ea-4b64-8770-d3ce0f235731	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:16:10.03	2026-06-08 05:16:10.03
9bb32b2c-8c75-44dd-9333-b0493cfbeeae	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:16:11.474	2026-06-08 05:16:11.474
3668fb0a-762c-4260-8ca8-a0fcf850dce2	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:22:50.36	2026-06-08 05:22:50.36
e121b109-fcf7-438b-b327-64d34287227a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:22:51.784	2026-06-08 05:22:51.784
11de15e9-72b7-4072-b164-af37b29276a9	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:23:50.356	2026-06-08 05:23:50.356
7350fa52-9b6e-4e5c-8dec-a4c52ba5acdb	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:23:51.78	2026-06-08 05:23:51.78
858e5e70-629b-46a3-9b59-b6474c8e9d7d	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:24:40.338	2026-06-08 05:24:40.338
6a03fbf2-674b-468c-b2c5-be9e90d4165e	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:24:50.359	2026-06-08 05:24:50.359
10bc27a8-7b13-417d-adb4-b6e5be87ed88	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:24:51.776	2026-06-08 05:24:51.776
8dfd6a8c-42de-41ab-b615-be74d918f6b7	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:25:39.941	2026-06-08 05:25:39.941
09963d04-64e4-46a2-a656-0eb5fcb76617	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:25:50.341	2026-06-08 05:25:50.341
487c7255-4c71-410a-86e0-a49ba8a0a536	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:25:51.762	2026-06-08 05:25:51.762
72238d47-9335-4a2c-817c-055b04df7999	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:26:39.921	2026-06-08 05:26:39.921
34158f67-8e0a-40d5-8016-8bd2e4d53fa9	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:26:50.334	2026-06-08 05:26:50.334
d49486ea-9029-4574-9e40-459277bb9c55	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:26:51.758	2026-06-08 05:26:51.758
8a39881f-b3d9-4a10-992c-e5e238d5dfbb	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:27:39.918	2026-06-08 05:27:39.918
a0511602-3ac5-480b-a4d1-26f430f5fb72	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:27:50.332	2026-06-08 05:27:50.332
a8195671-8075-4cce-9a88-4e9b3d4b29ed	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:27:51.755	2026-06-08 05:27:51.755
92853aac-12f6-4f45-bbc4-866f2b1293f9	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:28:39.915	2026-06-08 05:28:39.915
163ba546-fb2b-49a1-aa07-03b729f3ff92	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:28:50.327	2026-06-08 05:28:50.327
113cc2e9-0cf5-4909-a435-e94c036a7d4d	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:28:51.751	2026-06-08 05:28:51.751
5199e98d-0088-46be-af36-bf4b48009849	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:29:51.743	2026-06-08 05:29:51.743
52d15eb3-8d6f-4b74-a47c-eeced21dbde2	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:30:51.74	2026-06-08 05:30:51.74
a89dc8df-30eb-4db8-903d-0736fa0e4ef0	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:31:51.735	2026-06-08 05:31:51.735
44d920d9-5c6b-43b2-9fb9-4582a16ab6ac	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:32:51.739	2026-06-08 05:32:51.739
3cbf52f2-a927-452a-86ef-11120951a814	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:29:39.912	2026-06-08 05:29:39.912
2e661500-05f4-46b0-aad4-603316eca96e	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:29:50.321	2026-06-08 05:29:50.321
1d82ece0-68db-4cef-8eec-eeee2ca7f954	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:30:39.92	2026-06-08 05:30:39.92
ab12c788-284e-47e8-ab27-51d8a4e143f3	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:31:39.901	2026-06-08 05:31:39.901
2acccf7a-cd0b-4c32-bb59-174b60172dcb	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:32:39.902	2026-06-08 05:32:39.902
23a0ba0a-7bb9-478b-bb74-69c0a7f14907	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:33:39.917	2026-06-08 05:33:39.917
ec6a48ed-1a12-4e0e-a6d0-7d86d8652063	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:33:51.768	2026-06-08 05:33:51.768
69b2f07e-2fab-4b00-92f8-f4ca3477fc45	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:34:39.917	2026-06-08 05:34:39.917
30d8d05b-ad53-478e-848e-0c8ef5343c8e	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:34:51.747	2026-06-08 05:34:51.747
490dafbe-22a9-4ab9-9f58-4352012805f5	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:35:39.908	2026-06-08 05:35:39.908
a9304bea-318f-4e16-aad9-5e49c9f49f6e	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:35:51.737	2026-06-08 05:35:51.737
06811780-f05a-4e40-93e9-d83bcefbd5bc	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:36:39.905	2026-06-08 05:36:39.905
564a856f-4c86-4425-b5e5-360d2f46692c	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:36:51.742	2026-06-08 05:36:51.742
d1cda9d5-ee59-4052-9c07-beb0fdc0f4ea	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:37:39.903	2026-06-08 05:37:39.903
df62ef52-b504-4f40-96b1-9c0607c4dad1	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:37:51.726	2026-06-08 05:37:51.726
dfd32008-93ff-4965-a6fd-aa449b5e7ace	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:38:39.928	2026-06-08 05:38:39.928
62a85083-b929-42fe-bc99-99e2eab48f0c	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:38:51.73	2026-06-08 05:38:51.73
35670d64-dcb7-4a92-9371-451bdce989a5	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:39:39.886	2026-06-08 05:39:39.886
eda64248-2668-452d-b802-609afdd53d43	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:39:51.707	2026-06-08 05:39:51.707
995c4f64-7ef7-4523-8877-08f39f325d80	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:40:10.491	2026-06-08 05:40:10.491
aa30b17e-1d8c-4d84-b69f-244fa22a8da9	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:40:39.879	2026-06-08 05:40:39.879
d5c05bc4-bda1-431b-b2f8-1eecd97c1717	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:41:10.261	2026-06-08 05:41:10.261
edf3000e-857f-4d63-8fa7-b09939188e97	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:41:39.888	2026-06-08 05:41:39.888
7c4d532a-f967-48d9-ae10-e0aa6bf8c9ea	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:42:10.247	2026-06-08 05:42:10.247
79a52fee-073f-40e2-87dc-a1245043b23c	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:42:39.866	2026-06-08 05:42:39.866
16905ddf-7e2e-463e-9398-d378b4ab6f0b	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:43:10.234	2026-06-08 05:43:10.234
4a34f259-09fc-49f1-b5b8-66ea0fb8c16b	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:43:39.873	2026-06-08 05:43:39.873
ecc3e652-5174-41fb-8c3c-ad25129daeb6	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:44:10.229	2026-06-08 05:44:10.229
855925df-9f0b-43b2-9ef2-dcc86089ce55	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:44:39.838	2026-06-08 05:44:39.838
266b9be3-350e-4185-bfce-733cacc62fcc	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:45:10.302	2026-06-08 05:45:10.302
1636d3c0-11f3-4ea2-b141-e9994e80478e	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:45:39.83	2026-06-08 05:45:39.83
5528c4fd-8bf7-4bde-bae2-9a7fc2de8975	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:46:10.206	2026-06-08 05:46:10.206
4870e093-c894-4f1c-bf26-9205242e2903	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:46:39.82	2026-06-08 05:46:39.82
e9b48a54-74e5-4d4a-8ea3-fe4ee6594687	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:47:10.194	2026-06-08 05:47:10.194
b3fd1f9e-0cba-4a39-8a21-f6e651f002f5	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:47:39.811	2026-06-08 05:47:39.811
b65a6c1c-715b-4c9c-ba8e-8b14fef7e84a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:48:10.224	2026-06-08 05:48:10.224
e234d340-8260-477b-a8bb-2c4e6b35b53c	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:48:39.819	2026-06-08 05:48:39.819
5511fa4c-7f29-48b2-b4bb-3d888487073a	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:49:10.264	2026-06-08 05:49:10.264
86a2425b-d623-4b79-af55-5f8790c5defe	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:49:39.791	2026-06-08 05:49:39.791
743cc8e9-6113-40f6-805d-f19b0a4175b8	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:50:10.169	2026-06-08 05:50:10.169
59519025-77e8-4bae-9539-13ecffc0bd69	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:50:29.436	2026-06-08 05:50:29.436
fbf6c725-4116-406a-98c2-f904d6257d81	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:50:39.751	2026-06-08 05:50:39.751
c9995ab6-59da-44ad-a91e-c0574e7c1288	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:51:10.182	2026-06-08 05:51:10.182
0fb5f47c-7215-47d5-a26e-1765f8fb04f0	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:51:29.266	2026-06-08 05:51:29.266
a287e9f8-84f3-4e5c-85cd-23c1588356c2	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:51:39.737	2026-06-08 05:51:39.737
e88fc9c5-c53a-43db-ad9f-fcab5830f683	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:52:10.147	2026-06-08 05:52:10.147
d8d38758-fb06-4f36-9238-a143dafc1467	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:52:29.244	2026-06-08 05:52:29.244
a3d34998-905c-411a-904a-95feffe95262	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:52:39.726	2026-06-08 05:52:39.726
c6cc2ecd-2a0f-4748-953b-eaa908f7b7e1	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:53:10.126	2026-06-08 05:53:10.126
0633d8ba-cab0-442e-b688-63f19af70823	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:53:29.234	2026-06-08 05:53:29.234
9c5af016-e7b2-4d2c-b124-b49b44dc3045	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:53:39.709	2026-06-08 05:53:39.709
d1113b63-6aaa-4cc9-9ad1-57230a0b2080	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:54:10.12	2026-06-08 05:54:10.12
da6ea62e-6106-4384-b248-ee4b9f84d717	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:54:29.22	2026-06-08 05:54:29.22
928676a4-566d-4d5b-843c-3d44a6802f36	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:54:39.703	2026-06-08 05:54:39.703
ccd78d38-76d5-451d-860e-0394f9b33ec4	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:55:10.093	2026-06-08 05:55:10.093
0005b9fc-7ff7-4113-bf7a-ad384418b659	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:55:29.211	2026-06-08 05:55:29.211
235d4bab-66e9-4a9e-876b-deb73de68851	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:55:39.696	2026-06-08 05:55:39.696
b0bc3730-96da-4602-8b68-d28b91086af9	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:56:29.194	2026-06-08 05:56:29.194
2894f908-4050-42d1-89a4-6c8e5c32b349	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:56:39.669	2026-06-08 05:56:39.669
45b98366-abfc-4201-a91a-c2279a4cd6d7	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:57:39.654	2026-06-08 05:57:39.654
b7ebd83c-a07c-464a-b8b6-3e251c363464	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:57:29.183	2026-06-08 05:57:29.183
ea996c83-424a-49e5-919c-9bbaa0304123	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:58:29.168	2026-06-08 05:58:29.168
1321abee-4b08-4008-a1a7-8f48f39effc2	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:58:39.641	2026-06-08 05:58:39.641
7911e4ec-6e1b-4b6b-a365-f7ff777603dd	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:59:29.155	2026-06-08 05:59:29.155
b3dc75d2-3b0a-488d-a405-17ab0655b55b	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 05:59:39.631	2026-06-08 05:59:39.631
c10b07fe-07ea-4741-9667-f5ed3a70fb7f	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 06:00:29.186	2026-06-08 06:00:29.186
7d75b954-4457-40a3-b75a-bd8482071c3c	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 06:00:39.621	2026-06-08 06:00:39.621
5806d39d-add8-4f39-80f5-8383c0a9533b	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 06:01:29.125	2026-06-08 06:01:29.125
d7303e27-8c31-43f8-9d8e-f2709ad9059b	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 06:01:39.6	2026-06-08 06:01:39.6
875837c5-6842-4caa-8f6a-aa8a2007e58f	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 06:02:29.115	2026-06-08 06:02:29.115
45740cfb-608b-42db-9882-f7804bd02eed	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 06:02:39.589	2026-06-08 06:02:39.589
6822829c-3f7f-42ba-8e14-3ce1615d44da	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 06:03:29.102	2026-06-08 06:03:29.102
614a7ade-c88f-4b6f-a326-80bdbc9ad145	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 06:03:39.578	2026-06-08 06:03:39.578
16c7c333-45f8-475b-9502-fab8287ecc72	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 06:04:29.08	2026-06-08 06:04:29.08
81fcb698-7ade-4236-9221-d9ddf9319606	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 06:04:39.564	2026-06-08 06:04:39.564
6304f7c0-ed54-4d2b-8b9d-9d87e57e6a22	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 06:05:29.075	2026-06-08 06:05:29.075
71b458ff-729d-4d54-bafa-2000ae6aa5b8	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 06:05:39.558	2026-06-08 06:05:39.558
a784820e-5574-4b01-9310-6d807c607cd5	system	PULSE-2026-06-08	0	0	0	0	2026-06-08 06:05:50.294	2026-06-08 06:05:50.294
\.


--
-- Data for Name: Mission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Mission" (id, title, status, progress, type, description, margin, "tenantId", metadata, "assignedRegion", "createdAt", "updatedAt", "computeDurationMs", "internalOptimizationCost", "queueWaitMs", "scalingImpact", "totalCostUsd") FROM stdin;
\.


--
-- Data for Name: Pattern; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Pattern" (id, name, description, metadata, "createdAt") FROM stdin;
\.


--
-- Data for Name: PaymentEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PaymentEvent" (id, amount, currency, status, "createdAt") FROM stdin;
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Product" (id, name, description, price, "createdAt") FROM stdin;
\.


--
-- Data for Name: ProductMetric; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProductMetric" (id, "productId", metric, value, "createdAt") FROM stdin;
\.


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Project" (id, name, description, status, "tenantId", "createdAt", "updatedAt") FROM stdin;
6530e833-a909-4902-92f5-4ab8172befcb	Strategic Scout Alpha 🛰️	Initial deployment to calibrate the neural bridge and baseline workspace connectivity.	active	7d31a0c2-27e4-439d-8922-378018c1526d	2026-06-07 16:37:48.179	2026-06-07 16:37:48.179
\.


--
-- Data for Name: ProjectFile; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProjectFile" (id, "projectId", path, content, language, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ProposedChange; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProposedChange" (id, "agentId", "targetPath", "changeType", reason, patch, "expectedImpact", "validationScore", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SideEffectRecord; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SideEffectRecord" (id, "idempotencyKey", "operationType", status, "attemptNumber", metadata, "executionId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Subscription; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Subscription" (id, "userId", "tenantId", "stripeId", "productId", plan, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Tenant; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Tenant" (id, name, "dailyQuota", metadata, "createdAt") FROM stdin;
7d31a0c2-27e4-439d-8922-378018c1526d	E2E Test User's Workspace	10	\N	2026-06-07 16:37:48.095
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, name, role, password, "tenantId", "createdAt") FROM stdin;
90ff2d46-c7d8-4757-b8c8-9f3f5841ea11	e2e-test-1780850267575@example.com	E2E Test User	viewer	$2b$10$BSp3ajvV8JaMWOQXh/ELkumQ2cgwz1BoV7wMUEkU/ysLKcv0bGs4G	7d31a0c2-27e4-439d-8922-378018c1526d	2026-06-07 16:37:48.108
\.


--
-- Data for Name: UserSession; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserSession" (id, "userId", "tokenHash", "deviceInfo", "expiresAt", "lastActiveAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: ZtanActiveLease; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ZtanActiveLease" (id, generation, owner_pid, owner_host, heartbeat) FROM stdin;
\.


--
-- Data for Name: ZtanIdentity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ZtanIdentity" (id, "nodeId", "publicKey", status, "updatedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: ZtanLedgerBlock; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ZtanLedgerBlock" (id, "blockId", "prevHash", hash, type, payload, operator, signature, status, epoch, "timeToken", "tpmQuote", "createdAt") FROM stdin;
\.


--
-- Data for Name: ZtanPayloadAttestation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ZtanPayloadAttestation" (id, "blockId", "payloadSanitized", transformations, "originalByteLength", "sanitizedByteLength", "sanitizationEpochId", "createdAt") FROM stdin;
\.


--
-- Data for Name: ZtanQuarantineBlob; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ZtanQuarantineBlob" (id, "blockId", "rawBlob", "createdAt") FROM stdin;
\.


--
-- Data for Name: ZtanRegisteredKey; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ZtanRegisteredKey" (id, "actorId", "publicKey", "createdAt") FROM stdin;
\.


--
-- Data for Name: ZtanSnapshot; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ZtanSnapshot" (id, epoch, "lastSeq", "lastHash", "stateData", "createdAt") FROM stdin;
\.


--
-- Data for Name: ZtanWalLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ZtanWalLog" (id, seq, type, payload, status, "createdAt") FROM stdin;
\.


--
-- Data for Name: governance_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.governance_events (event_id, event_type, correlation_id, parent_event_id, "timestamp", actor, service, risk_level, payload_hash, payload, signature, previous_event_hash, current_event_hash) FROM stdin;
\.


--
-- Name: ZtanLedgerBlock_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ZtanLedgerBlock_id_seq"', 1, false);


--
-- Name: ZtanWalLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ZtanWalLog_id_seq"', 1, false);


--
-- Name: Agent Agent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Agent"
    ADD CONSTRAINT "Agent_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: BuildMetric BuildMetric_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BuildMetric"
    ADD CONSTRAINT "BuildMetric_pkey" PRIMARY KEY (id);


--
-- Name: CodeModule CodeModule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CodeModule"
    ADD CONSTRAINT "CodeModule_pkey" PRIMARY KEY (id);


--
-- Name: Event Event_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_pkey" PRIMARY KEY (id);


--
-- Name: ExecutionLog ExecutionLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExecutionLog"
    ADD CONSTRAINT "ExecutionLog_pkey" PRIMARY KEY (id);


--
-- Name: IdempotencyRecord IdempotencyRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IdempotencyRecord"
    ADD CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY (id);


--
-- Name: IntelligencePolicy IntelligencePolicy_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IntelligencePolicy"
    ADD CONSTRAINT "IntelligencePolicy_pkey" PRIMARY KEY (id);


--
-- Name: IntelligenceROI IntelligenceROI_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IntelligenceROI"
    ADD CONSTRAINT "IntelligenceROI_pkey" PRIMARY KEY (id);


--
-- Name: Mission Mission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Mission"
    ADD CONSTRAINT "Mission_pkey" PRIMARY KEY (id);


--
-- Name: Pattern Pattern_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pattern"
    ADD CONSTRAINT "Pattern_pkey" PRIMARY KEY (id);


--
-- Name: PaymentEvent PaymentEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaymentEvent"
    ADD CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY (id);


--
-- Name: ProductMetric ProductMetric_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductMetric"
    ADD CONSTRAINT "ProductMetric_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: ProjectFile ProjectFile_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProjectFile"
    ADD CONSTRAINT "ProjectFile_pkey" PRIMARY KEY (id);


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: ProposedChange ProposedChange_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProposedChange"
    ADD CONSTRAINT "ProposedChange_pkey" PRIMARY KEY (id);


--
-- Name: SideEffectRecord SideEffectRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SideEffectRecord"
    ADD CONSTRAINT "SideEffectRecord_pkey" PRIMARY KEY (id);


--
-- Name: Subscription Subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY (id);


--
-- Name: Tenant Tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);


--
-- Name: UserSession UserSession_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserSession"
    ADD CONSTRAINT "UserSession_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: ZtanActiveLease ZtanActiveLease_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ZtanActiveLease"
    ADD CONSTRAINT "ZtanActiveLease_pkey" PRIMARY KEY (id);


--
-- Name: ZtanIdentity ZtanIdentity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ZtanIdentity"
    ADD CONSTRAINT "ZtanIdentity_pkey" PRIMARY KEY (id);


--
-- Name: ZtanLedgerBlock ZtanLedgerBlock_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ZtanLedgerBlock"
    ADD CONSTRAINT "ZtanLedgerBlock_pkey" PRIMARY KEY (id);


--
-- Name: ZtanPayloadAttestation ZtanPayloadAttestation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ZtanPayloadAttestation"
    ADD CONSTRAINT "ZtanPayloadAttestation_pkey" PRIMARY KEY (id);


--
-- Name: ZtanQuarantineBlob ZtanQuarantineBlob_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ZtanQuarantineBlob"
    ADD CONSTRAINT "ZtanQuarantineBlob_pkey" PRIMARY KEY (id);


--
-- Name: ZtanRegisteredKey ZtanRegisteredKey_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ZtanRegisteredKey"
    ADD CONSTRAINT "ZtanRegisteredKey_pkey" PRIMARY KEY (id);


--
-- Name: ZtanSnapshot ZtanSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ZtanSnapshot"
    ADD CONSTRAINT "ZtanSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: ZtanWalLog ZtanWalLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ZtanWalLog"
    ADD CONSTRAINT "ZtanWalLog_pkey" PRIMARY KEY (id);


--
-- Name: governance_events governance_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.governance_events
    ADD CONSTRAINT governance_events_pkey PRIMARY KEY (event_id);


--
-- Name: AuditLog_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_tenantId_idx" ON public."AuditLog" USING btree ("tenantId");


--
-- Name: AuditLog_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_userId_idx" ON public."AuditLog" USING btree ("userId");


--
-- Name: BuildMetric_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "BuildMetric_projectId_idx" ON public."BuildMetric" USING btree ("projectId");


--
-- Name: CodeModule_path_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "CodeModule_path_key" ON public."CodeModule" USING btree (path);


--
-- Name: Event_eventId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Event_eventId_key" ON public."Event" USING btree ("eventId");


--
-- Name: Event_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Event_tenantId_idx" ON public."Event" USING btree ("tenantId");


--
-- Name: Event_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Event_type_idx" ON public."Event" USING btree (type);


--
-- Name: ExecutionLog_eventId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ExecutionLog_eventId_key" ON public."ExecutionLog" USING btree ("eventId");


--
-- Name: ExecutionLog_executionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ExecutionLog_executionId_idx" ON public."ExecutionLog" USING btree ("executionId");


--
-- Name: IdempotencyRecord_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IdempotencyRecord_key_key" ON public."IdempotencyRecord" USING btree (key);


--
-- Name: IntelligencePolicy_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IntelligencePolicy_name_key" ON public."IntelligencePolicy" USING btree (name);


--
-- Name: IntelligenceROI_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IntelligenceROI_id_key" ON public."IntelligenceROI" USING btree (id);


--
-- Name: IntelligenceROI_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IntelligenceROI_tenantId_idx" ON public."IntelligenceROI" USING btree ("tenantId");


--
-- Name: ProductMetric_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProductMetric_productId_idx" ON public."ProductMetric" USING btree ("productId");


--
-- Name: ProjectFile_projectId_path_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ProjectFile_projectId_path_key" ON public."ProjectFile" USING btree ("projectId", path);


--
-- Name: Project_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Project_tenantId_idx" ON public."Project" USING btree ("tenantId");


--
-- Name: SideEffectRecord_executionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SideEffectRecord_executionId_idx" ON public."SideEffectRecord" USING btree ("executionId");


--
-- Name: SideEffectRecord_operationType_idempotencyKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SideEffectRecord_operationType_idempotencyKey_key" ON public."SideEffectRecord" USING btree ("operationType", "idempotencyKey");


--
-- Name: Subscription_stripeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Subscription_stripeId_idx" ON public."Subscription" USING btree ("stripeId");


--
-- Name: Subscription_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Subscription_tenantId_idx" ON public."Subscription" USING btree ("tenantId");


--
-- Name: Subscription_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Subscription_userId_key" ON public."Subscription" USING btree ("userId");


--
-- Name: UserSession_tokenHash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON public."UserSession" USING btree ("tokenHash");


--
-- Name: UserSession_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserSession_userId_idx" ON public."UserSession" USING btree ("userId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: ZtanIdentity_nodeId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ZtanIdentity_nodeId_key" ON public."ZtanIdentity" USING btree ("nodeId");


--
-- Name: ZtanLedgerBlock_blockId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ZtanLedgerBlock_blockId_key" ON public."ZtanLedgerBlock" USING btree ("blockId");


--
-- Name: ZtanLedgerBlock_epoch_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ZtanLedgerBlock_epoch_idx" ON public."ZtanLedgerBlock" USING btree (epoch);


--
-- Name: ZtanLedgerBlock_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ZtanLedgerBlock_status_idx" ON public."ZtanLedgerBlock" USING btree (status);


--
-- Name: ZtanPayloadAttestation_blockId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ZtanPayloadAttestation_blockId_idx" ON public."ZtanPayloadAttestation" USING btree ("blockId");


--
-- Name: ZtanPayloadAttestation_blockId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ZtanPayloadAttestation_blockId_key" ON public."ZtanPayloadAttestation" USING btree ("blockId");


--
-- Name: ZtanQuarantineBlob_blockId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ZtanQuarantineBlob_blockId_idx" ON public."ZtanQuarantineBlob" USING btree ("blockId");


--
-- Name: ZtanQuarantineBlob_blockId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ZtanQuarantineBlob_blockId_key" ON public."ZtanQuarantineBlob" USING btree ("blockId");


--
-- Name: ZtanRegisteredKey_actorId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ZtanRegisteredKey_actorId_key" ON public."ZtanRegisteredKey" USING btree ("actorId");


--
-- Name: ZtanSnapshot_epoch_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ZtanSnapshot_epoch_idx" ON public."ZtanSnapshot" USING btree (epoch);


--
-- Name: ZtanSnapshot_epoch_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ZtanSnapshot_epoch_key" ON public."ZtanSnapshot" USING btree (epoch);


--
-- Name: ZtanWalLog_seq_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ZtanWalLog_seq_idx" ON public."ZtanWalLog" USING btree (seq);


--
-- Name: ZtanWalLog_seq_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ZtanWalLog_seq_key" ON public."ZtanWalLog" USING btree (seq);


--
-- Name: ZtanWalLog_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ZtanWalLog_status_idx" ON public."ZtanWalLog" USING btree (status);


--
-- Name: governance_events_correlation_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX governance_events_correlation_id_idx ON public.governance_events USING btree (correlation_id);


--
-- Name: governance_events_event_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX governance_events_event_type_idx ON public.governance_events USING btree (event_type);


--
-- Name: Agent Agent_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Agent"
    ADD CONSTRAINT "Agent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: BuildMetric BuildMetric_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BuildMetric"
    ADD CONSTRAINT "BuildMetric_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Mission Mission_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Mission"
    ADD CONSTRAINT "Mission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProjectFile ProjectFile_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProjectFile"
    ADD CONSTRAINT "ProjectFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Project Project_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserSession UserSession_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserSession"
    ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict ffhFlvCCEaUlh2sdk3I0Z3tcYxjLfKIs8aNVfGdusLlfUwHmY6554hbxiUi9oCq

