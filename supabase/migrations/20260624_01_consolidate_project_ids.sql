-- Consolida i projectId (projects.agent_project_id) dei progetti storici al nuovo
-- formato alfanumerico casuale `prj-xxxxx`, coerente con generateProjectId()
-- (src/features/projects/projectPageModel.ts). I progetti creati prima della
-- modifica avevano slug derivati dal nome (es. "isyapp", "nuovo-progetto-18"):
-- ambigui e riusabili dopo un'eliminazione. Il nuovo formato e' univoco e stabile.
--
-- SICUREZZA DATI (verificata):
--   - I dati figli (project_env_variables, project_data_fields, project_images,
--     project_platform_accesses, project_agent_keys) sono legati all'UUID interno
--     projects.id, NON allo slug -> cambiare lo slug NON tocca alcun dato.
--   - Il canale agent autorizza su (agent_project_id + agent key): cambiando lo slug,
--     il vecchio .agent/app-control.json smette di funzionare finche' l'utente non
--     ricarica il nuovo dal tab Sync (comportamento voluto, parte del consolidamento).
--   - Il backup Google Sheets / keepalive non usano lo slug come chiave.
--
-- Additiva e idempotente: ogni UPDATE e' condizionato allo slug vecchio esatto,
-- quindi rieseguirla non produce effetti (gli slug nuovi non corrispondono piu').
-- Non tocca schema, policy, ne' altri dati. I nuovi id sono pre-generati con lo
-- stesso alfabeto di generateAgentKeyGroup() e verificati univoci (nessuna collisione
-- con "prj-sq82d" gia' presente).

update public.projects set agent_project_id = 'prj-cwl78' where agent_project_id = 'siteccv';
update public.projects set agent_project_id = 'prj-vzt5j' where agent_project_id = 'isyapp';
update public.projects set agent_project_id = 'prj-d5rr9' where agent_project_id = 'badgenode';
update public.projects set agent_project_id = 'prj-fuzzr' where agent_project_id = 'app-control';
update public.projects set agent_project_id = 'prj-8bg7f' where agent_project_id = 'wedding-app';
update public.projects set agent_project_id = 'prj-ajxdh' where agent_project_id = 'enoteca-italiana';
update public.projects set agent_project_id = 'prj-llqq3' where agent_project_id = 'diagonale';
update public.projects set agent_project_id = 'prj-l6h2r' where agent_project_id = 'rsvp';
update public.projects set agent_project_id = 'prj-348eh' where agent_project_id = 'money-box';
update public.projects set agent_project_id = 'prj-3ywrl' where agent_project_id = 'lazzaro';
update public.projects set agent_project_id = 'prj-ncatk' where agent_project_id = 'nuovo-progetto-12';
update public.projects set agent_project_id = 'prj-9u5rg' where agent_project_id = 'nuovo-progetto-13';
update public.projects set agent_project_id = 'prj-nbp8r' where agent_project_id = 'nuovo-progetto-14';
update public.projects set agent_project_id = 'prj-u6dl7' where agent_project_id = 'nuovo-progetto-15';
update public.projects set agent_project_id = 'prj-he3qq' where agent_project_id = 'nuovo-progetto-16';
update public.projects set agent_project_id = 'prj-n4xjr' where agent_project_id = 'nuovo-progetto-17';
update public.projects set agent_project_id = 'prj-u5ltb' where agent_project_id = 'nuovo-progetto-18';
