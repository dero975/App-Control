-- 20260702_01 — Rimozione "sviluppo in" e "Accessi piattaforme"
--
-- Il campo `development_environment` (UI "sviluppo in") e la tabella
-- `project_platform_accesses` (UI "Accessi piattaforme") non sono più usati
-- dall'app: rimossi da codice, dashboard e documentazione.
-- Migrazione distruttiva eseguita dopo backup dei dati (2026-07-02):
--   - development_environment: 21 progetti
--   - project_platform_accesses: 1 riga
-- Idempotente (IF EXISTS) e ripetibile.

alter table if exists public.projects
  drop column if exists development_environment;

drop table if exists public.project_platform_accesses cascade;
