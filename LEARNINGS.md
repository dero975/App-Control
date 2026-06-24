# LEARNINGS — App Control

Pattern ricorrenti, errori e soluzioni emerse durante lo sviluppo dei progetti.
Aggiornato dagli agent solo per osservazioni significative. Non modificato automaticamente.

---

## Come usare questo file

L'agent aggiunge una riga quando rileva un pattern che vale la pena ricordare:
- Errori che si ripetono su più progetti
- Soluzioni non ovvie a problemi comuni
- Vincoli di free tier che hanno causato blocchi
- Fix che hanno richiesto più tentativi del previsto

Il formato è: `[data] — [categoria] — [osservazione in 1-2 righe]`

Esempio:
`[2026-06] — Supabase Free — La pausa automatica del DB avviene dopo 7gg anche se ci sono richieste REST frequenti ma solo GET su tabelle vuote. Il keepalive deve fare una vera query con risultati.`

---

## Log

`[2026-06] — Canale agent / RLS — Il tab Sync distribuisce lo SLUG (projects.agent_project_id) come projectId, ma le policy RLS del canale agent confrontavano projects.id (UUID): match sempre falso -> ogni progetto riceveva []. Lezione: identificare il progetto con slug + agent key insieme (lo slug da solo non e univoco), e testare il canale SEMPRE con lo slug reale del Sync, mai con l'UUID interno (un test con UUID dava 200 e nascondeva il bug). Fix: migration 20260619_01.`

`[2026-06] — projectId / dati — Cambiare projects.agent_project_id (lo slug del Sync) NON tocca i dati figli: variabili, campi e immagini sono legati a projects.id (UUID), non allo slug. Quindi rigenerare i projectId storici al formato prj-xxxxx e sicuro (verificato: 155 variabili invariate). Effetto collaterale voluto: invalida il vecchio .agent/app-control.json -> va riscaricato dal tab Sync. Migration 20260624_01 (uniforma 17 slug) + 20260624_02 (backfill 10 agent key mancanti sui progetti pre-generazione-automatica).`

`[2026-06] — Prompt Sync / auto-update — defaultSyncPrompt si propaga ai progetti esistenti via resolveSyncPrompt, che rimpiazza solo i valori in legacySyncPrompts. Regola: ogni volta che cambi defaultSyncPrompt, sposta il vecchio in una costante legacy e aggiungila a legacySyncPrompts, altrimenti i progetti che lo avevano non si aggiornano. Verifica: contare i sync_prompt nel DB non riconosciuti (devono essere 0).`

`[2026-06] — Agent anti-spreco — Per evitare loop e spreco crediti su progetti esterni: CLAUDE.md vive come FILE su disco (Claude Code lo carica nativo a ogni sessione, costo zero), si ri-scarica da App Control solo se manca/diverso. Esecuzione con gate: protocollo d'avvio una volta a sessione; riconciliazione variabili/link solo dopo eventi reali (nuova var, deploy, richiesta), mai a ogni messaggio. Regola: rigido nell'eseguire, ozioso quando non serve.`
