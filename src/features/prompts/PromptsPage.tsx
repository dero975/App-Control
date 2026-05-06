import { useMemo, useState } from 'react'
import { CopyButton } from '../../components/CopyButton'
import { FieldGroup } from '../../components/FieldGroup'
import { SectionHeader } from '../../components/SectionHeader'
import { promptCategories, prompts, promptTypes } from '../../data/mockData'
import type { PromptCategory, PromptType } from '../../types/app'
import { PromptCard } from './PromptCard'

export function PromptsPage() {
  const [selectedId, setSelectedId] = useState(prompts[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'Tutti' | PromptType>('Tutti')
  const [category, setCategory] = useState<'Tutte' | PromptCategory>('Tutte')

  const filteredPrompts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return prompts.filter((prompt) => {
      const matchesQuery =
        !normalizedQuery ||
        prompt.title.toLowerCase().includes(normalizedQuery) ||
        prompt.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
        prompt.fullText.toLowerCase().includes(normalizedQuery)
      const matchesType = type === 'Tutti' || prompt.type === type
      const matchesCategory = category === 'Tutte' || prompt.category === category

      return matchesQuery && matchesType && matchesCategory
    })
  }, [category, query, type])

  const selectedPrompt = filteredPrompts.find((prompt) => prompt.id === selectedId) ?? filteredPrompts[0]

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Libreria operativa"
        title="Prompt"
        description="Card compatte con testo completo, note d'uso, tag, preferiti e copia rapida per gli agent."
      />

      <div className="toolbar toolbar--horizontal">
        <label>
          <span>Cerca</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Titolo, tag, testo" />
        </label>
        <label>
          <span>Tipo</span>
          <select value={type} onChange={(event) => setType(event.target.value as typeof type)}>
            <option value="Tutti">Tutti</option>
            {promptTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Categoria</span>
          <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
            <option value="Tutte">Tutte</option>
            {promptCategories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="split-workspace split-workspace--wide-index">
        <section className="card-grid" aria-label="Prompt disponibili">
          {filteredPrompts.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} selected={prompt.id === selectedPrompt?.id} onSelect={setSelectedId} />
          ))}
        </section>

        <aside className="detail-panel detail-panel--sticky">
          {selectedPrompt ? (
            <div className="detail-stack">
              <div className="detail-heading">
                <div>
                  <span className="meta-label">{selectedPrompt.category}</span>
                  <h2>{selectedPrompt.title}</h2>
                </div>
                <CopyButton value={selectedPrompt.fullText} />
              </div>

              <FieldGroup title="Testo completo">
                <textarea value={selectedPrompt.fullText} readOnly rows={9} />
              </FieldGroup>

              <FieldGroup title="Note d'uso">
                <p className="body-copy">{selectedPrompt.usageNotes}</p>
              </FieldGroup>

              <div className="metadata-grid">
                <InfoPill label="Tipo" value={selectedPrompt.type} />
                <InfoPill label="Ultima modifica" value={selectedPrompt.lastModified} />
                <InfoPill label="Preferito" value={selectedPrompt.favorite ? 'Si' : 'No'} />
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
