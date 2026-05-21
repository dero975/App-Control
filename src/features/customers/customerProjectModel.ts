import type { CustomerProject, Project, ProjectVariable } from '../../types/app'
import {
  buildProjectVariables,
  buildSheetFields,
  formatProjectUpdatedAt,
  getProjectPreviewMeta,
  inferScopeFromEnvKey,
  normalizeProjectName,
} from '../projects/projectShared'
import { deployOptions, developmentOptions, type CustomerProjectListSortMode } from './customerPageConstants'
import { sortPinnedRecordsFirst } from '../../lib/pinnedRecords'

export function buildAdminLikeProject(project: CustomerProject): Project {
  return {
    id: project.id,
    name: normalizeProjectName(project.name),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    status: project.status,
    developmentEnvironment: project.developmentEnvironment,
    githubRepoUrl: project.githubRepoUrl,
    githubAccountEmail: project.githubAccountEmail,
    linkedSecretLabel: project.linkedSecretLabel,
    supabase: {
      projectUrl: '',
      anonKeyLabel: '',
      serviceRoleLabel: '',
      databaseUrlLabel: '',
    },
    deploy: {
      provider: project.deploy.provider,
      url: project.deploy.url,
      accountEmail: project.deploy.accountEmail,
    },
    operationalNotes: project.operationalNotes,
    agent: {
      projectId: '',
      agentKey: '',
      syncPrompt: '',
    },
    promptIds: [],
    assetIds: [],
    env: project.env,
    dataFields: project.dataFields,
    platformAccesses: project.platformAccesses,
    images: [],
  }
}

export function getSortedCustomerProjects(
  projects: CustomerProject[],
  query: string,
  sortMode: CustomerProjectListSortMode,
  pinnedProjectIds: string[] = [],
) {
  const normalizedQuery = query.trim().toLowerCase()
  const matchingProjects = projects.filter((project) => {
    const adminLikeProject = buildAdminLikeProject(project)
    return (
      !normalizedQuery ||
      project.name.toLowerCase().includes(normalizedQuery) ||
      getProjectPreviewMeta(adminLikeProject).toLowerCase().includes(normalizedQuery) ||
      formatProjectUpdatedAt(project.updatedAt).toLowerCase().includes(normalizedQuery)
    )
  })

  if (sortMode === 'recent-desc') {
    const sortedProjects = [...matchingProjects].sort((firstProject, secondProject) => (
      Date.parse(secondProject.updatedAt) - Date.parse(firstProject.updatedAt)
    ))
    return sortPinnedRecordsFirst(sortedProjects, pinnedProjectIds)
  }

  const sortedProjects = [...matchingProjects].sort((firstProject, secondProject) => {
    const sortResult = firstProject.name.localeCompare(secondProject.name, 'it', { sensitivity: 'base' })
    return sortMode === 'name-asc' ? sortResult : -sortResult
  })
  return sortPinnedRecordsFirst(sortedProjects, pinnedProjectIds)
}

export function applySheetFieldsToCustomerProject(project: CustomerProject, sheetFields: ProjectVariable[]): CustomerProject {
  const getField = (key: string) => sheetFields.find((field) => field.key.trim().toLowerCase() === key.toLowerCase())
  const customDataFields = sheetFields.filter((field) => {
    const normalizedKey = field.key.trim().toLowerCase()
    return !['nome progetto', 'mail github', 'password', 'sviluppo in', 'deploy con', 'password deploy'].includes(normalizedKey)
  })
  const deployPasswordField = getField('password deploy')
  const developmentField = getField('sviluppo in')

  return {
    ...project,
    name: normalizeProjectName(getField('nome progetto')?.value ?? project.name),
    githubAccountEmail: getField('mail github')?.value ?? '',
    linkedSecretLabel: getField('password')?.value ?? '',
    developmentEnvironment: getField('sviluppo in')?.value || developmentOptions[0],
    deploy: {
      ...project.deploy,
      provider: getField('deploy con')?.value || deployOptions[0],
    },
    platformAccesses: (developmentField?.accessAccounts ?? []).map((access) => ({
      id: access.id || createLocalId(),
      platform: access.platform,
      email: access.email,
      password: access.password,
    })),
    dataFields: [
      ...(deployPasswordField
        ? [{
            id: deployPasswordField.id,
            key: deployPasswordField.key,
            value: deployPasswordField.value,
            sensitive: deployPasswordField.sensitive,
          }]
        : []),
      ...customDataFields.map((field) => ({
        id: field.id,
        key: field.key,
        value: field.value,
        sensitive: field.sensitive,
      })),
    ],
  }
}

export function applyVariablesToCustomerProject(project: CustomerProject, variables: ProjectVariable[]): CustomerProject {
  const getVariable = (key: string) => variables.find((variable) => variable.key.trim().toUpperCase() === key.toUpperCase())

  return {
    ...project,
    githubRepoUrl: getVariable('GITHUB_URL')?.value ?? '',
    deploy: {
      ...project.deploy,
      url: getVariable('LINK_DEPLOY')?.value ?? '',
    },
    env: variables
      .filter((variable) => {
        const normalizedKey = variable.key.trim().toUpperCase()
        return normalizedKey !== 'GITHUB_URL' && normalizedKey !== 'LINK_DEPLOY ADMIN'
      })
      .map((variable) => ({
        key: variable.key,
        value: variable.value,
        scope: inferScopeFromEnvKey(variable.key),
        sensitive: variable.sensitive,
      })),
  }
}

export function getCustomerProjectComputedData(project: CustomerProject) {
  const adminLikeProject = buildAdminLikeProject(project)
  const sheetFields = buildSheetFields(adminLikeProject)
  const variables = buildProjectVariables(adminLikeProject)
  return { adminLikeProject, sheetFields, variables }
}

function createLocalId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
