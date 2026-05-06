import { CopyButton } from '../../components/CopyButton'
import type { Prompt } from '../../types/app'

type PromptCardProps = {
  prompt: Prompt
  selected: boolean
  onSelect: (promptId: string) => void
}

export function PromptCard({ prompt, selected, onSelect }: PromptCardProps) {
  return (
    <article className={selected ? 'prompt-card prompt-card--active' : 'prompt-card'}>
      <button type="button" className="prompt-card__body" onClick={() => onSelect(prompt.id)}>
        <div className="prompt-card__topline">
          <span>{prompt.type}</span>
          {prompt.favorite ? <strong>Preferito</strong> : null}
        </div>
        <h3>{prompt.title}</h3>
        <p>{prompt.usageNotes}</p>
        <div className="tag-row">
          {prompt.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </button>
      <div className="prompt-card__actions">
        <CopyButton value={prompt.fullText} />
        <button type="button" className="secondary-button">
          Modifica
        </button>
      </div>
    </article>
  )
}
