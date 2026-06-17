export type SelectableFieldConfig = {
  options: readonly string[]
  promptLabel: string
  fallback: string
}

export const selectableFieldConfigs: Record<string, SelectableFieldConfig> = {
  'sviluppo in': {
    options: ['Claude Code', 'Windsurf', 'Replit'],
    promptLabel: 'Nuovo ambiente di sviluppo',
    fallback: 'Claude Code',
  },
  'deploy con': {
    options: ['Render', 'CloudeFlare'],
    promptLabel: 'Nuovo provider deploy',
    fallback: 'Render',
  },
}

export const addSelectOptionValue = '__add_option__'

export function getSelectableFieldConfig(key: string) {
  return selectableFieldConfigs[key.trim().toLowerCase()]
}

export function getSelectOptions(value: string, options: readonly string[]) {
  const normalizedValue = value.trim()
  if (!normalizedValue || options.includes(normalizedValue)) {
    return [...options]
  }

  return [normalizedValue, ...options]
}

export function getSelectValue(value: string, fieldConfig: SelectableFieldConfig) {
  const normalizedValue = value.trim()
  if (!normalizedValue || normalizedValue.toLowerCase() === 'codex') {
    return fieldConfig.fallback
  }

  return normalizedValue
}

export function normalizeSelectableFieldValue(key: string, value: string) {
  const fieldConfig = getSelectableFieldConfig(key)
  if (!fieldConfig) return value

  return fieldConfig.options.includes(value) ? value : fieldConfig.fallback
}
