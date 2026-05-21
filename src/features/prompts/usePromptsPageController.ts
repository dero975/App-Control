import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import type { Prompt, PromptCategory } from '../../types/app'
import { createPromptRecord, deletePromptRecord, fetchPrompts, updatePromptRecord } from './promptRepository'
import type { PromptDraft } from './promptPageTypes'
import { createEmptyPromptDraft, getNextPromptSortOrder, normalizePromptTitle } from './promptPageUtils'

export function usePromptsPageController() {
  const [promptList, setPromptList] = useState<Prompt[]>([])
  const [activeCategory, setActiveCategory] = useState<'Tutte' | PromptCategory>('Tutte')
  const [openPromptId, setOpenPromptId] = useState('')
  const [editingPromptId, setEditingPromptId] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteCandidate, setDeleteCandidate] = useState<Prompt | null>(null)
  const [draft, setDraft] = useState<PromptDraft>(() => createEmptyPromptDraft())
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [draggingPromptId, setDraggingPromptId] = useState('')
  const [dragPreviewOrder, setDragPreviewOrder] = useState<string[] | null>(null)
  const [dragOverPromptId, setDragOverPromptId] = useState('')
  const saveTimeoutsRef = useRef<Record<string, number>>({})
  const dragSourcePromptIdRef = useRef('')
  const dragStartOrderRef = useRef<string[]>([])

  const filteredPrompts = useMemo(() => {
    const nextPrompts = activeCategory === 'Tutte' ? promptList : promptList.filter((prompt) => prompt.category === activeCategory)

    if (activeCategory === 'Tutte') {
      return [...nextPrompts].sort((left, right) => left.title.localeCompare(right.title, 'it', { sensitivity: 'base' }))
    }

    if (dragPreviewOrder?.length) {
      const promptById = new Map(nextPrompts.map((prompt) => [prompt.id, prompt]))
      return dragPreviewOrder.map((promptId) => promptById.get(promptId)).filter((prompt): prompt is Prompt => Boolean(prompt))
    }

    return [...nextPrompts].sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
      return left.title.localeCompare(right.title, 'it', { sensitivity: 'base' })
    })
  }, [activeCategory, dragPreviewOrder, promptList])

  useEffect(() => {
    let active = true

    void loadPrompts()

    return () => {
      active = false
      for (const timeoutId of Object.values(saveTimeoutsRef.current)) {
        window.clearTimeout(timeoutId)
      }
      saveTimeoutsRef.current = {}
    }

    async function loadPrompts() {
      setIsLoading(true)
      try {
        const prompts = await fetchPrompts()
        if (!active) return
        setPromptList(prompts)
        setOpenPromptId((current) => (current && prompts.some((prompt) => prompt.id === current) ? current : ''))
        setEditingPromptId((current) => (current && prompts.some((prompt) => prompt.id === current) ? current : ''))
        setErrorMessage('')
      } catch (error) {
        if (!active) return
        setPromptList([])
        setErrorMessage(error instanceof Error ? error.message : 'Errore caricamento prompt')
      } finally {
        if (active) setIsLoading(false)
      }
    }
  }, [])

  function openCreatePromptModal() {
    setDraft(createEmptyPromptDraft())
    setCreateModalOpen(true)
    setErrorMessage('')
  }

  function setActivePromptCategory(nextCategory: 'Tutte' | PromptCategory) {
    clearDragState()
    setEditingPromptId('')
    setActiveCategory(nextCategory)
  }

  function closePromptModal() {
    setCreateModalOpen(false)
  }

  function handleDraftChange(field: keyof PromptDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: field === 'category' ? (value as PromptCategory) : field === 'title' ? normalizePromptTitle(value) : value,
    }))
  }

  async function savePrompt() {
    const title = normalizePromptTitle(draft.title.trim())
    const fullText = draft.fullText.trim()
    if (!title || !fullText) return

    try {
      const newPrompt = await createPromptRecord({
        title,
        category: draft.category,
        fullText,
        sortOrder: getNextPromptSortOrder(promptList, draft.category),
      })

      setPromptList((current) => [...current, newPrompt])
      setOpenPromptId(newPrompt.id)
      if (activeCategory !== 'Tutte' && activeCategory !== newPrompt.category) {
        setActiveCategory(newPrompt.category)
      }
      setErrorMessage('')
      closePromptModal()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Errore creazione prompt')
    }
  }

  function handlePromptChange(promptId: string, field: keyof PromptDraft, value: string) {
    if (field === 'category') {
      handlePromptCategoryChange(promptId, value as PromptCategory)
      return
    }

    const nextValue = field === 'title' ? normalizePromptTitle(value) : value

    setPromptList((current) => {
      const nextPrompts = current.map((prompt) => (prompt.id === promptId ? { ...prompt, [field]: nextValue } : prompt))
      const nextPrompt = nextPrompts.find((prompt) => prompt.id === promptId)
      if (nextPrompt) schedulePromptSave(nextPrompt)
      return nextPrompts
    })
  }

  function handlePromptCategoryChange(promptId: string, nextCategory: PromptCategory) {
    setPromptList((current) => {
      const targetPrompt = current.find((prompt) => prompt.id === promptId)
      if (!targetPrompt || targetPrompt.category === nextCategory) return current

      const nextSortOrder = getNextPromptSortOrder(current.filter((prompt) => prompt.id !== promptId), nextCategory)
      const nextPrompt = { ...targetPrompt, category: nextCategory, sortOrder: nextSortOrder }
      const nextPrompts = current.map((prompt) => (prompt.id === promptId ? nextPrompt : prompt))
      schedulePromptSave(nextPrompt)
      return nextPrompts
    })
  }

  function togglePromptOpen(promptId: string) {
    setOpenPromptId((currentPromptId) => {
      const isClosing = currentPromptId === promptId
      if (isClosing) {
        setEditingPromptId((currentEditingPromptId) => (currentEditingPromptId === promptId ? '' : currentEditingPromptId))
        return ''
      }

      return promptId
    })
  }

  function togglePromptEdit(promptId: string) {
    setOpenPromptId(promptId)
    setEditingPromptId((current) => (current === promptId ? '' : promptId))
  }

  async function deletePrompt() {
    if (!deleteCandidate) return

    const promptId = deleteCandidate.id
    clearScheduledPromptSave(promptId)

    try {
      await deletePromptRecord(promptId)
      setPromptList((current) => current.filter((prompt) => prompt.id !== promptId))
      setOpenPromptId((current) => (current === promptId ? '' : current))
      setEditingPromptId((current) => (current === promptId ? '' : current))
      setDeleteCandidate(null)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Errore eliminazione prompt')
    }
  }

  function handleDragStart(event: DragEvent<HTMLButtonElement>, promptId: string) {
    if (activeCategory === 'Tutte') return
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', promptId)
    dragSourcePromptIdRef.current = promptId
    dragStartOrderRef.current = filteredPrompts.map((prompt) => prompt.id)
    setDraggingPromptId(promptId)
    setDragPreviewOrder(filteredPrompts.map((prompt) => prompt.id))
    setDragOverPromptId(promptId)
  }

  function handleDragEnter(promptId: string) {
    if (activeCategory === 'Tutte') return
    const sourcePromptId = dragSourcePromptIdRef.current
    if (!sourcePromptId || sourcePromptId === promptId) return
    setDragOverPromptId(promptId)

    setDragPreviewOrder((current) => {
      const baseOrder = current?.length ? current : filteredPrompts.map((prompt) => prompt.id)
      const sourceIndex = baseOrder.indexOf(sourcePromptId)
      const targetIndex = baseOrder.indexOf(promptId)
      if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return baseOrder

      const nextOrder = [...baseOrder]
      nextOrder.splice(sourceIndex, 1)
      nextOrder.splice(targetIndex, 0, sourcePromptId)
      return nextOrder
    })
  }

  async function handleDragEnd() {
    if (activeCategory === 'Tutte') return

    const sourcePromptId = dragSourcePromptIdRef.current
    const previewOrder = dragPreviewOrder
    const startOrder = dragStartOrderRef.current

    clearDragState()

    if (!sourcePromptId || !previewOrder?.length || previewOrder.join('|') === startOrder.join('|')) {
      setDragPreviewOrder(null)
      return
    }

    await persistPromptOrder(previewOrder)
  }

  function clearDragState() {
    dragSourcePromptIdRef.current = ''
    dragStartOrderRef.current = []
    setDraggingPromptId('')
    setDragPreviewOrder(null)
    setDragOverPromptId('')
  }

  async function persistPromptOrder(previewOrder: string[]) {
    const category = activeCategory as PromptCategory
    const promptById = new Map(promptList.map((prompt) => [prompt.id, prompt]))
    const nextCategoryPrompts = previewOrder
      .map((promptId, index) => {
        const prompt = promptById.get(promptId)
        return prompt ? { ...prompt, sortOrder: index } : null
      })
      .filter((prompt): prompt is Prompt => Boolean(prompt))

    setPromptList((current) =>
      current.map((prompt) => {
        if (prompt.category !== category) return prompt
        const nextPrompt = nextCategoryPrompts.find((item) => item.id === prompt.id)
        return nextPrompt ?? prompt
      }),
    )

    try {
      await Promise.all(
        nextCategoryPrompts.map((prompt, index) =>
          updatePromptRecord(prompt.id, {
            title: normalizePromptTitle(prompt.title),
            category: prompt.category,
            fullText: prompt.fullText,
            sortOrder: index,
          }),
        ),
      )
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Errore riordino prompt')
      try {
        const prompts = await fetchPrompts()
        setPromptList(prompts)
      } catch {
        // keep current local state if reload fails
      }
    }
  }

  function schedulePromptSave(prompt: Prompt) {
    clearScheduledPromptSave(prompt.id)
    saveTimeoutsRef.current[prompt.id] = window.setTimeout(() => {
      void persistPrompt(prompt)
    }, 450)
  }

  function clearScheduledPromptSave(promptId: string) {
    const timeoutId = saveTimeoutsRef.current[promptId]
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      delete saveTimeoutsRef.current[promptId]
    }
  }

  async function persistPrompt(prompt: Prompt) {
    clearScheduledPromptSave(prompt.id)
    try {
      await updatePromptRecord(prompt.id, {
        title: normalizePromptTitle(prompt.title),
        category: prompt.category,
        fullText: prompt.fullText,
        sortOrder: prompt.sortOrder,
      })
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Errore aggiornamento prompt')
    }
  }

  return {
    activeCategory,
    createModalOpen,
    deleteCandidate,
    draft,
    dragOverPromptId,
    draggingPromptId,
    dragPreviewOrder,
    errorMessage,
    filteredPrompts,
    isLoading,
    openPromptId,
    editingPromptId,
    closePromptModal,
    deletePrompt,
    handleDraftChange,
    handleDragEnd,
    handleDragEnter,
    handleDragStart,
    handlePromptChange,
    openCreatePromptModal,
    savePrompt,
    setActivePromptCategory,
    setDeleteCandidate,
    togglePromptEdit,
    togglePromptOpen,
  }
}
