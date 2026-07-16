-- Interview Ready Program — database schema (Neon Postgres)
-- Run this once in the Neon SQL editor after creating the database.

create extension if not exists "pgcrypto";

create table if not exists sessions (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  candidate_name text,
  role           text,
  pl_email       text,
  average        numeric,
  fluidity       numeric,
  sentiment      text,
  question_count integer,
  data           jsonb not null,   -- full answers + per-question evaluations
  report_html    text              -- pre-rendered report, ready to download
);

create index if not exists sessions_created_at_idx on sessions (created_at desc);
