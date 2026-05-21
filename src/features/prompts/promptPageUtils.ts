import type { Prompt, PromptCategory } from '../../types/app'
import { defaultPromptCategory } from './promptCatalog'
import type { PromptDraft } from './promptPageTypes'

export function createEmptyPromptDraft(): PromptDraft {
  return {
    title: '',
    category: defaultPromptCategory,
    fullText: '',
  }
}

export function getNextPromptSortOrder(prompts: Prompt[], category: PromptCategory) {
  const categoryPrompts = prompts.filter((prompt) => prompt.category === category)
  if (!categoryPrompts.length) return 0
  return Math.max(...categoryPrompts.map((prompt) => prompt.sortOrder)) + 1
}

export function normalizePromptTitle(value: string) {
  if (!value) return ''
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

export function buildPromptClipboardValue(prompt: Prompt) {
  const title = prompt.title.trim()
  const fullText = stripPromptTitlePrefix(prompt.fullText, title)

  if (!title) return fullText
  if (!fullText) return title

  return `${title}\n\n${fullText}`
}

function stripPromptTitlePrefix(value: string, title: string) {
  const fullText = value.trim()
  if (!fullText) return ''

  const normalizedTitle = title.trim().toLowerCase()
  const lines = fullText.split(/\r?\n/)
  const firstLine = lines[0]?.trim().toLowerCase() ?? ''

  if (normalizedTitle && firstLine === `titolo: ${normalizedTitle}`) {
    return lines.slice(1).join('\n').trim()
  }

  return fullText
}
