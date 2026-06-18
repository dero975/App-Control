-- Rimozione della sezione Clienti (workspace Customers). Funzione deprecata, non piu usata.
-- Elimina le 5 tabelle dedicate e gli oggetti dipendenti (policy, vincoli) via CASCADE.
-- Operazione distruttiva eseguita su richiesta esplicita dell'owner.

drop table if exists public.customer_project_data_fields cascade;
drop table if exists public.customer_project_env_variables cascade;
drop table if exists public.customer_project_platform_accesses cascade;
drop table if exists public.customer_projects cascade;
drop table if exists public.customers cascade;
