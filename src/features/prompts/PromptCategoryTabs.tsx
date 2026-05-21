import type { PromptCategory } from '../../types/app'
import { promptCategories } from './promptCatalog'

export function PromptCategoryTabs({
  disabled = false,
  value,
  onChange,
}: {
  disabled?: boolean
  value: PromptCategory
  onChange: (category: PromptCategory) => void
}) {
  return (
    <div className="prompt-category-tabs" role="tablist" aria-label="Sezione prompt">
      {promptCategories.map((category) => (
        <button
          key={category}
          type="button"
          role="tab"
          aria-selected={value === category}
          disabled={disabled}
          className={value === category ? 'tab-button tab-button--active' : 'tab-button'}
          onClick={() => onChange(category)}
        >
          {category}
        </button>
      ))}
    </div>
  )
}
