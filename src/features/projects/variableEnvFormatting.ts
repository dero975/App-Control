import type { ProjectVariable } from '../../types/app'

export function formatVariablesEnvForCopy(variables: ProjectVariable[]) {
  const exportableVariables = variables
    .map((variable) => {
      const originalKey = variable.key.trim()
      const exportKey = normalizeEnvKey(originalKey)
      if (!originalKey || !exportKey) return null

      return {
        exportKey,
        value: variable.value.trim(),
      }
    })
    .filter((variable): variable is NonNullable<typeof variable> => Boolean(variable))

  if (!exportableVariables.length) return ''

  const variablesWithDerivedValues = addDerivedEnvExportValues(exportableVariables)
  return variablesWithDerivedValues
    .map((variable) => `${variable.exportKey}=${formatEnvValue(normalizeEnvExportValue(variable.exportKey, variable.value))}`)
    .join('\n')
}

export function isDeployField(key: string) {
  return key.trim().toLowerCase() === 'deploy con'
}

function addDerivedEnvExportValues(variables: Array<{ exportKey: string; value: string }>) {
  const nextVariables = [...variables]
  const derivedRules = [
    { sourceKey: 'SUPABASE_URL', targetKey: 'VITE_SUPABASE_URL' },
    { sourceKey: 'SUPABASE_ANON_KEY', targetKey: 'VITE_SUPABASE_ANON_KEY' },
    { sourceKey: 'DATABASE_URL', targetKey: 'SUPABASE_DB_URL' },
  ] as const

  for (const rule of derivedRules) {
    if (nextVariables.some((variable) => variable.exportKey === rule.targetKey)) continue

    const sourceIndex = nextVariables.findIndex((variable) => variable.exportKey === rule.sourceKey)
    if (sourceIndex === -1) continue

    nextVariables.splice(sourceIndex + 1, 0, {
      exportKey: rule.targetKey,
      value: nextVariables[sourceIndex].value,
    })
  }

  return nextVariables
}

function normalizeEnvKey(key: string) {
  return key.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
}

function formatEnvValue(value: string) {
  if (!value) return ''
  if (!/[\s"'`$\\]/.test(value)) return value
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function normalizeSupabaseProjectUrl(value: string) {
  return value.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

function normalizeEnvExportValue(key: string, value: string) {
  if (key === 'SUPABASE_URL' || key === 'VITE_SUPABASE_URL') {
    return normalizeSupabaseProjectUrl(value)
  }

  return value
}
