-- Canale agent: lettura della libreria Prompt (tabella public.prompts).
-- La tabella prompts e' globale (non legata a un singolo progetto): contiene i
-- prompt iniziali/manutenzione, incluso "CLAUDE.MD" che l'agent scarica al bootstrap.
-- Finora il canale agent (slug + agent key) non poteva leggerla -> l'agent
-- riportava "CLAUDE.MD vuoto". Questa policy additiva la rende leggibile a
-- qualsiasi agent autorizzato per un progetto valido (slug + key che combaciano).
-- Additiva e reversibile: aggiunge solo una policy SELECT, non tocca le altre.

drop policy if exists prompts_agent_select on public.prompts;
create policy prompts_agent_select on public.prompts
  for select to anon, authenticated
  using (public.app_control_request_authorized_project_uuid() is not null);
