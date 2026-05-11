import type { Project, ProjectVariable } from '../../types/app'

export const supabaseServiceKey = 'SUPABASE_SERVICE_KEY'
export const supabaseServiceKeyAliases = [supabaseServiceKey, 'SUPABASE_SERVICE_ROLE_KEY'] as const

export const orderedProjectKeys = [
  'LINK_DEPLOY',
  'GITHUB_URL',
  'GITHUB_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  supabaseServiceKey,
  'DATABASE_URL',
] as const

export const deployPasswordFieldKey = 'Password deploy'
export const deployAdminLinkKey = 'LINK_DEPLOY ADMIN'

export function buildSheetFields(
  project: Project,
  normalizeSelectableValue?: (key: string, value: string) => string,
): ProjectVariable[] {
  const normalizeValue = normalizeSelectableValue ?? ((_key: string, value: string) => value)
  const deployPasswordField =
    project.dataFields?.find((field) => isDeployPasswordField(field.key)) ?? {
      id: 'sheet-password-deploy',
      key: deployPasswordFieldKey,
      value: '',
      sensitive: true,
    }
  const customDataFields = (project.dataFields ?? []).filter((field) => !isDeployPasswordField(field.key))

  return [
    {
      id: 'sheet-nome-progetto',
      key: 'nome progetto',
      value: project.name,
      sensitive: false,
    },
    {
      id: 'sheet-mail-github',
      key: 'mail github',
      value: project.githubAccountEmail,
      sensitive: false,
    },
    {
      id: 'sheet-psw',
      key: 'Password',
      value: project.linkedSecretLabel,
      sensitive: false,
    },
    {
      id: 'sheet-sviluppo-in',
      key: 'sviluppo in',
      value: normalizeValue('sviluppo in', project.developmentEnvironment),
      sensitive: false,
      accessAccounts: project.platformAccesses ?? [],
    },
    {
      id: 'sheet-deploy-con',
      key: 'deploy con',
      value: normalizeValue('deploy con', project.deploy.provider),
      sensitive: false,
    },
    deployPasswordField,
    ...customDataFields,
  ]
}

export function buildProjectVariables(project: Project): ProjectVariable[] {
  const variableMap = new Map(project.env.map((variable) => [variable.key, variable]))
  const deployLink = project.deploy.url
  const deployAdminLink = variableMap.get(deployAdminLinkKey)?.value ?? buildDefaultDeployAdminLink(deployLink)
  const serviceKeyVariable = supabaseServiceKeyAliases.map((key) => variableMap.get(key)).find(Boolean)

  return [
    {
      id: 'link-deploy',
      key: 'LINK_DEPLOY',
      value: deployLink,
      sensitive: false,
    },
    {
      id: 'link-deploy-admin',
      key: deployAdminLinkKey,
      value: deployAdminLink,
      sensitive: false,
    },
    {
      id: 'github-url',
      key: 'GITHUB_URL',
      value: project.githubRepoUrl,
      sensitive: false,
    },
    ...orderedProjectKeys
      .filter((key) => key !== 'LINK_DEPLOY' && key !== 'GITHUB_URL')
      .map((key) => {
        const sourceVariable =
          key === 'DATABASE_URL'
            ? variableMap.get('DATABASE_URL') ?? variableMap.get('SUPABASE_DB_URL')
            : key === supabaseServiceKey
              ? serviceKeyVariable
              : variableMap.get(key)
        return {
          id: key.toLowerCase().replaceAll('_', '-'),
          key,
          value: sourceVariable?.value ?? '',
          sensitive: sourceVariable?.sensitive ?? true,
        }
      }),
  ]
}

export function getProjectPreviewMeta(project: Project, normalizeSelectableValue?: (key: string, value: string) => string) {
  const sheetFields = buildSheetFields(project, normalizeSelectableValue)
  return `${getFieldValue(sheetFields, 'sviluppo in')} / ${getFieldValue(sheetFields, 'deploy con')}`
}

export function formatProjectUpdatedAt(value: string) {
  const updatedAtDate = new Date(value)
  if (Number.isNaN(updatedAtDate.getTime())) return 'Data ultima modifica non disponibile'

  const formatter = new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const formattedParts = formatter.formatToParts(updatedAtDate)
  const day = formattedParts.find((part) => part.type === 'day')?.value ?? ''
  const month = formattedParts.find((part) => part.type === 'month')?.value ?? ''
  const year = formattedParts.find((part) => part.type === 'year')?.value ?? ''
  const hour = formattedParts.find((part) => part.type === 'hour')?.value ?? ''
  const minute = formattedParts.find((part) => part.type === 'minute')?.value ?? ''
  const capitalizedMonth = month ? `${month.charAt(0).toUpperCase()}${month.slice(1)}` : ''

  return `${day} ${capitalizedMonth} ${year} - ${hour}.${minute}`
}

export function getFieldValue(fields: ProjectVariable[], key: string) {
  return fields.find((field) => field.key.trim().toLowerCase() === key.toLowerCase())?.value.trim() ?? ''
}

export function getDeployLink(fields: ProjectVariable[], project: Project) {
  const deployFieldValue = getFieldValue(fields, 'deploy con')
  if (deployFieldValue.startsWith('http://') || deployFieldValue.startsWith('https://')) {
    return deployFieldValue
  }

  return project.deploy.url
}

export function getDeployAdminLink(variables: ProjectVariable[], deployLink: string) {
  const storedAdminLink = getFieldValue(variables, deployAdminLinkKey.toLowerCase())
  if (storedAdminLink) return storedAdminLink
  return buildDefaultDeployAdminLink(deployLink)
}

export function buildDefaultDeployAdminLink(value: string) {
  const normalizedValue = value.trim().replace(/\/+$/, '')
  if (!normalizedValue) return ''
  return `${normalizedValue}/admina`
}

export function isDeployPasswordField(key: string) {
  return key.trim().toLowerCase() === deployPasswordFieldKey.toLowerCase()
}

export function inferScopeFromEnvKey(key: string) {
  if (key.startsWith('SUPABASE_') || key === 'DATABASE_URL') return 'Supabase' as const
  if (key.startsWith('GITHUB_')) return 'GitHub' as const
  if (key === 'LINK_DEPLOY') return 'Deploy' as const
  return 'Custom' as const
}
