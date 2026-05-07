import { ChevronDown, ChevronUp, Copy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CopyButton } from '../../components/CopyButton'
import { EmptyState } from '../../components/EmptyState'
import { SectionHeader } from '../../components/SectionHeader'
import { promptCategories, prompts } from '../../data/mockData'
import type { Prompt, PromptCategory } from '../../types/app'

export function PromptsPage() {
  const [activeCategory, setActiveCategory] = useState<'Tutte' | PromptCategory>('Tutte')
  const [openPromptId, setOpenPromptId] = useState(prompts[0]?.id ?? '')

  const filteredPrompts = useMemo(() => {
    return activeCategory === 'Tutte' ? prompts : prompts.filter((prompt) => prompt.category === activeCategory)
  }, [activeCategory])

  return (
    <div className="page-stack prompts-page">
      <SectionHeader
        eyebrow="Libreria prompt"
        title="Prompt"
        description="Una raccolta semplice di prompt pronti all'uso: scegli la categoria, apri la card e copia il testo quando serve."
      />

      <div className="prompt-category-bar" role="tablist" aria-label="Categorie prompt">
        <button
          type="button"
          className={activeCategory === 'Tutte' ? 'tab-button tab-button--active' : 'tab-button'}
          onClick={() => setActiveCategory('Tutte')}
        >
          Tutte
        </button>
        {promptCategories.map((category) => (
          <button
            type="button"
            key={category}
            className={activeCategory === category ? 'tab-button tab-button--active' : 'tab-button'}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {filteredPrompts.length ? (
        <div className="prompt-library" aria-label="Prompt disponibili">
          {filteredPrompts.map((prompt) => (
            <PromptLibraryCard
              key={prompt.id}
              prompt={prompt}
              open={prompt.id === openPromptId}
              onToggle={() => setOpenPromptId((current) => (current === prompt.id ? '' : prompt.id))}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nessun prompt in questa categoria"
          message="Aggiungi nuovi prompt oppure torna alla vista completa per consultarli tutti."
        />
      )}
    </div>
  )
}

function PromptLibraryCard({ prompt, open, onToggle }: { prompt: Prompt; open: boolean; onToggle: () => void }) {
  return (
    <article className={open ? 'prompt-library-card prompt-library-card--open' : 'prompt-library-card'}>
      <div className="prompt-library-card__header">
        <button type="button" className="prompt-library-card__toggle" onClick={onToggle} aria-expanded={open}>
          <div className="prompt-library-card__heading">
            <h3>{prompt.title}</h3>
          </div>
          <span className="prompt-library-card__toggle-icon" aria-hidden="true">
            {open ? <ChevronUp className="button-icon" /> : <ChevronDown className="button-icon" />}
          </span>
        </button>

        <div className="prompt-library-card__actions">
          <CopyButton value={prompt.fullText} />
        </div>
      </div>

      {open ? (
        <div className="prompt-library-card__content">
          <textarea value={prompt.fullText} readOnly rows={9} className="prompt-library-card__textarea" />
          <div className="prompt-library-card__footer">
            <CopyButton value={prompt.fullText} />
            <span className="prompt-library-card__hint">
              <Copy className="button-icon" aria-hidden="true" />
              Copia disponibile anche dalla card chiusa
            </span>
          </div>
        </div>
      ) : null}
    </article>
  )
}
