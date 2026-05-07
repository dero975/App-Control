# App Control

Web app privata in React, TypeScript e Vite per gestire progetti, prompt, variabili operative, immagini, note e dashboard riepilogativa.

Prima di lavorare sul progetto, leggere `README_OPERATIVO.md`.

## Stato reale

- Accesso app con PIN a 6 cifre sincronizzato su Supabase.
- Sezioni applicative: `Progetti`, `Prompt`, `Impostazioni`, `Dashboard`.
- `Progetti` e `Prompt` leggono/scrivono dati reali su Supabase via client frontend anon.
- Deploy produzione attuale su Render `Static Site`.
- Workflow GitHub Actions presente solo per keepalive Supabase.

## Stack

- React
- TypeScript
- Vite
- CSS custom
- Supabase JS

## Avvio locale

```bash
npm install
npm run dev
```

Richiede `.env` locale con:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Script

- `npm run dev`: avvia Vite in sviluppo
- `npm run build`: typecheck e build produzione
- `npm run lint`: controlli ESLint
- `npm run preview`: anteprima locale build
- `npm run typecheck`: controllo TypeScript senza build
- `npm run check:all`: typecheck, lint e build in sequenza
