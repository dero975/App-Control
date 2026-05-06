# App Control

Web app privata locale per gestire progetti, prompt, variabili operative, immagini e note.

Prima di lavorare sul progetto, leggere `README_OPERATIVO.md`.

## Stack

- React
- TypeScript
- Vite
- CSS custom
- Mock locali solo per la libreria Prompt

## Stato attuale

- Supabase collegato nella sezione Progetti tramite client frontend e Auth.
- La sezione Progetti legge/scrive dati reali su Supabase dopo login.
- La sezione Prompt usa dati locali in `src/data/mockData.ts`.
- Nessun segreto reale deve stare nel repository.
- `.env` locale contiene le chiavi operative ed e escluso da Git.

## Avvio locale

```bash
npm install
npm run dev
```

## Script

- `npm run dev`: avvia Vite in sviluppo.
- `npm run build`: typecheck e build produzione.
- `npm run lint`: controlli ESLint.
- `npm run preview`: anteprima locale della build.
- `npm run typecheck`: controllo TypeScript senza build.
- `npm run check:all`: typecheck, lint e build in sequenza.
