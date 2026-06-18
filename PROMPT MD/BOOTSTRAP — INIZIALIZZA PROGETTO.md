Inizializza questo progetto con App Control.

1. Crea il file `.agent/app-control.json` nella root con il JSON che incollo qui sotto (copiato dal tab Sync di App Control). Se non l'ho incollato, fermati: `AZIONE ORA: copia il testo del tab Sync e incollalo qui. Poi rispondi "fatto".`
2. Aggiungi `.env`, `.mcp.json` e `.agent/` al `.gitignore`.
3. Connettiti ad App Control (Supabase REST: header x-app-control-project-id + x-app-control-agent-key + anon key, dai valori del JSON).
4. Scarica il contenuto del prompt `CLAUDE.MD` da App Control e scrivilo come `CLAUDE.md` nella root.
5. Leggi le variabili del progetto da App Control e genera/aggiorna `.env` (mai a mano; per frontend Vite aggiungi le derivate `VITE_*`).
6. Applica `CLAUDE.md` al 100%: progetto nuovo -> struttura allo standard; esistente -> analizza e allinea (vale il codice).
7. Prima di ogni modifica, comunicami gli step separando "cosa fai tu / cosa devo fare io". Nessun commit o push senza mio ok.

<<incolla qui il testo del tab Sync>>

Al termine: riassunto sintetico (stato, connessioni, prossimo passo).
