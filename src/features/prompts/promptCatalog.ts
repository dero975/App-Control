import type { PromptCategory } from '../../types/app'

export const promptCategories: readonly PromptCategory[] = ['Prompt iniziali', 'Prompt manutenzione', 'Prompt vari'] as const

export const defaultPromptCategory = promptCategories[0]
