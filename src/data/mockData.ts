import type { Prompt, PromptCategory } from '../types/app'

export const prompts: Prompt[] = [
  {
    id: 'prompt-01',
    title: 'Crea struttura iniziale progetto',
    category: 'Prompt iniziali',
    fullText:
      'Crea la struttura iniziale del progetto in modo ordinato, modulare e coerente. Imposta cartelle, file base, configurazioni essenziali e convenzioni pulite senza introdurre codice inutile o dati sensibili. Mantieni il progetto leggero, leggibile e pronto per evoluzioni future.',
  },
  {
    id: 'prompt-02',
    title: 'Avvio sicuro con documentazione DNA',
    category: 'Prompt iniziali',
    fullText:
      'Analizza il repository, verifica la struttura reale del codice e crea o aggiorna i file DNA strettamente necessari in modo coerente con il progetto. Non inventare informazioni, non duplicare documentazione e non modificare logiche runtime senza conferma.',
  },
  {
    id: 'prompt-03',
    title: 'Pulizia codice sicura',
    category: 'Prompt manutenzione',
    fullText:
      'Analizza il progetto e applica solo pulizie sicure: rimuovi codice morto verificato, ridondanze evidenti e piccoli sprechi, senza alterare logiche, UX, database, routing o deploy. Se trovi rischi o dubbi, fermati e genera prima un report.',
  },
  {
    id: 'prompt-04',
    title: 'Aggiorna file MD, backup e commit',
    category: 'Prompt manutenzione',
    fullText:
      'Aggiorna la documentazione operativa realmente necessaria, crea un nuovo backup coerente con la convenzione del progetto, esegui i controlli minimi sensati e solo dopo procedi con commit e push se il repository e pulito e i controlli sono verdi.',
  },
]

export const promptCategories: readonly PromptCategory[] = ['Prompt iniziali', 'Prompt manutenzione'] as const
