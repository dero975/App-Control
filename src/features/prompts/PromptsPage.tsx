import { Plus } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'
import { SectionHeader } from '../../components/SectionHeader'
import { ConfirmDeletePromptModal } from './ConfirmDeletePromptModal'
import { PromptLibraryCard } from './PromptLibraryCard'
import { PromptModal } from './PromptModal'
import { promptCategories } from './promptCatalog'
import { usePromptsPageController } from './usePromptsPageController'

export function PromptsPage() {
  const controller = usePromptsPageController()

  return (
    <div className="page-stack prompts-page">
      <SectionHeader title="Libreria Prompt" />

      <div className="prompt-toolbar">
        <div className="prompt-category-bar" role="tablist" aria-label="Categorie prompt">
          <button
            type="button"
            className={controller.activeCategory === 'Tutte' ? 'tab-button tab-button--active' : 'tab-button'}
            onClick={() => controller.setActivePromptCategory('Tutte')}
          >
            Tutte
          </button>
          {promptCategories.map((category) => (
            <button
              type="button"
              key={category}
              className={controller.activeCategory === category ? 'tab-button tab-button--active' : 'tab-button'}
              onClick={() => controller.setActivePromptCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <button type="button" className="secondary-button prompt-toolbar__create" onClick={controller.openCreatePromptModal}>
          <Plus aria-hidden="true" className="button-icon" />
          Nuovo prompt
        </button>
      </div>

      {controller.errorMessage ? <p className="status-message status-message--error">{controller.errorMessage}</p> : null}

      {controller.isLoading ? (
        <EmptyState title="Caricamento prompt" message="Sto leggendo la libreria Prompt da Supabase." />
      ) : controller.filteredPrompts.length ? (
        <div className="prompt-library" aria-label="Prompt disponibili">
          {controller.filteredPrompts.map((prompt) => (
            <PromptLibraryCard
              key={prompt.id}
              prompt={prompt}
              open={prompt.id === controller.openPromptId}
              editing={prompt.id === controller.editingPromptId}
              draggable={controller.activeCategory !== 'Tutte'}
              isDragPreviewActive={Boolean(controller.dragPreviewOrder?.length)}
              isDragging={controller.draggingPromptId === prompt.id}
              isDragOver={controller.dragOverPromptId === prompt.id && controller.draggingPromptId !== prompt.id}
              onDragStart={(event) => controller.handleDragStart(event, prompt.id)}
              onDragEnter={() => controller.handleDragEnter(prompt.id)}
              onDragEnd={() => void controller.handleDragEnd()}
              onDelete={() => controller.setDeleteCandidate(prompt)}
              onChange={(field, value) => controller.handlePromptChange(prompt.id, field, value)}
              onEdit={() => controller.togglePromptEdit(prompt.id)}
              onToggle={() => controller.togglePromptOpen(prompt.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nessun prompt in questa categoria"
          message="Aggiungi un nuovo prompt oppure torna alla vista completa per consultarli tutti."
        />
      )}

      {controller.createModalOpen ? (
        <PromptModal
          draft={controller.draft}
          onChange={controller.handleDraftChange}
          onClose={controller.closePromptModal}
          onSave={controller.savePrompt}
        />
      ) : null}

      {controller.deleteCandidate ? (
        <ConfirmDeletePromptModal
          promptTitle={controller.deleteCandidate.title}
          onCancel={() => controller.setDeleteCandidate(null)}
          onConfirm={controller.deletePrompt}
        />
      ) : null}
    </div>
  )
}
