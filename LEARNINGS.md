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

<!-- L'agent aggiunge qui le osservazioni quando rilevanti -->
