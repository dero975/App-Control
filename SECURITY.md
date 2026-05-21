# Security Policy

## Reporting

Do not open public issues with secrets, tokens, passwords, database URLs, logs containing credentials, or customer data.

Report security problems privately to the repository owner. Include:

- affected area;
- reproduction steps without real secrets;
- expected and actual impact;
- package or commit version, when relevant.

## Secret Handling

- Keep `.env` files local and out of Git.
- Never expose Supabase service role keys, database URLs, GitHub tokens or Render API keys in frontend code.
- Use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the static Render frontend.
- Do not hardcode real PINs, password defaults, or backup tokens in tracked source files. Store verifier hashes only when they are high-entropy and required by database policy/RPC code.
- Trusted-device access must use high-entropy local tokens and database-side hashes; never persist the PIN or PIN hash in local storage.
