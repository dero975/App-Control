import type { Prompt } from '../types/app'

export const prompts: Prompt[] = [
  {
    id: 'prompt-01',
    title: 'Avvio progetto ordinato',
    type: 'Iniziali / strutturali',
    category: 'Start progetto',
    fullText:
      'Crea una base React TypeScript modulare, senza dati sensibili, pronta per evolvere con Supabase in una fase successiva.',
    usageNotes: 'Da usare quando si inizializza una nuova app o si riorganizza una base esistente.',
    tags: ['bootstrap', 'react', 'codex'],
    favorite: true,
    lastModified: '2026-05-01',
  },
  {
    id: 'prompt-02',
    title: 'Analisi tecnica progetto',
    type: 'Ordinari / operativi',
    category: 'Analisi progetto',
    fullText:
      'Analizza struttura, dipendenze, script, rischi tecnici e prossimi passi. Non modificare file finche non e chiaro il piano.',
    usageNotes: 'Utile prima di refactor o interventi su repository non recenti.',
    tags: ['audit', 'qualita', 'repo'],
    favorite: false,
    lastModified: '2026-04-24',
  },
  {
    id: 'prompt-03',
    title: 'Pulizia sicura prima del deploy',
    type: 'Speciali / sensibili',
    category: 'Pulizia sicura',
    fullText:
      'Verifica che non ci siano token, password, chiavi service role o file locali versionati. Non stampare segreti nei log.',
    usageNotes: 'Da usare prima di commit, build pubbliche o collegamenti a provider esterni.',
    tags: ['sicurezza', 'deploy', 'env'],
    favorite: true,
    lastModified: '2026-04-29',
  },
]

export const promptTypes = ['Iniziali / strutturali', 'Ordinari / operativi', 'Speciali / sensibili'] as const

export const promptCategories = [
  'Start progetto',
  'Analisi progetto',
  'DNA documentazione',
  'GitHub',
  'Backup',
  'Supabase',
  'SQL',
  'Deploy',
  'Pulizia sicura',
  'Ottimizzazione',
  'Testing',
  'Asset / PWA',
] as const
