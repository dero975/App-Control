import { sortPinnedRecordsFirst } from '../../lib/pinnedRecords'
import type { Project, ProjectVariable } from '../../types/app'
import {
  buildSheetFields,
  deployPasswordFieldKey,
  normalizeProjectName,
  supabaseServiceKey,
} from './projectShared'
import { defaultSyncPrompt, type ProjectListSortMode } from './projectPageConstants'

export function getProjectDetailSignature({
  imageSlotsSignature,
  operationalNotes,
  sheetFields,
  variables,
}: {
  imageSlotsSignature: string
  operationalNotes: string
  sheetFields: ProjectVariable[]
  variables: ProjectVariable[]
}) {
  return JSON.stringify({
    imageSlotsSignature,
    operationalNotes,
    sheetFields: sheetFields.map(normalizeProjectVariableForSignature),
    variables: variables.map(normalizeProjectVariableForSignature),
  })
}

export function getSortedProjects(projects: Project[], query: string, sortMode: ProjectListSortMode, pinnedProjectIds: string[] = []) {
  const normalizedQuery = query.trim().toLowerCase()
  const matchingProjects = projects.filter(
    (project) =>
      !normalizedQuery ||
      project.name.toLowerCase().includes(normalizedQuery) ||
      project.status.toLowerCase().includes(normalizedQuery),
  )

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

export function getVisibleProjectIds(
  projects: Project[],
  query: string,
  sortMode: ProjectListSortMode,
  pinnedProjectIds: string[] = [],
  previousIds?: string[],
) {
  const nextCandidateIds = getSortedProjects(projects, query, sortMode, pinnedProjectIds).map((project) => project.id)
  if (!previousIds?.length) return nextCandidateIds

  const nextCandidateIdSet = new Set(nextCandidateIds)
  const preservedIds = previousIds.filter((projectId) => nextCandidateIdSet.has(projectId))
  const appendedIds = nextCandidateIds.filter((projectId) => !preservedIds.includes(projectId))
  return sortPinnedRecordsFirst([...preservedIds, ...appendedIds].map((id) => ({ id })), pinnedProjectIds).map((project) => project.id)
}

export function createEmptyProject(projectName: string): Project {
  const name = normalizeProjectName(projectName)
  const projectId = generateProjectId()

  return {
    id: `project-${Date.now()}`,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'Attivo',
    githubRepoUrl: '',
    githubAccountEmail: '',
    linkedSecretLabel: '',
    supabase: {
      projectUrl: '',
      anonKeyLabel: '',
      serviceRoleLabel: '',
      databaseUrlLabel: '',
    },
    deploy: {
      provider: 'Render',
      url: '',
      accountEmail: '',
    },
    operationalNotes: '',
    agent: {
      projectId,
      agentKey: generateAgentKey(),
      syncPrompt: defaultSyncPrompt,
    },
    promptIds: [],
    assetIds: [],
    images: [],
    dataFields: [{ id: `data-password-deploy-${Date.now()}`, key: deployPasswordFieldKey, value: '', sensitive: true }],
    env: [
      { key: 'SUPABASE_URL', value: '', scope: 'Supabase', sensitive: false },
      { key: 'SUPABASE_ANON_KEY', value: '', scope: 'Supabase', sensitive: true },
      { key: supabaseServiceKey, value: '', scope: 'Supabase', sensitive: true },
      { key: 'DATABASE_URL', value: '', scope: 'Supabase', sensitive: true },
      { key: 'GITHUB_TOKEN', value: '', scope: 'GitHub', sensitive: true },
    ],
  }
}

export function buildNormalizedSheetFields(project: Project) {
  return buildSheetFields(project)
}

function normalizeProjectVariableForSignature(variable: ProjectVariable) {
  return {
    id: variable.id,
    key: variable.key,
    value: variable.value,
    sensitive: variable.sensitive,
  }
}

// projectId univoco e stabile per i nuovi progetti: codice alfanumerico casuale,
// non derivato dal nome. Evita slug ambigui ("nuovo-progetto-18") e il riuso dello
// stesso slug dopo un'eliminazione. I progetti esistenti mantengono il loro slug.
function generateProjectId() {
  // 10 caratteri casuali (2 gruppi da 5): 32^10 combinazioni, collisioni di fatto
  // impossibili. I vecchi ID (prj- + 5 char) restano validi: solo i nuovi sono piu lunghi.
  return `prj-${generateAgentKeyGroup()}${generateAgentKeyGroup()}`.toLowerCase()
}

function generateAgentKey() {
  return Array.from({ length: 4 }, () => generateAgentKeyGroup()).join('-')
}

function generateAgentKeyGroup() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const values = new Uint32Array(5)
  crypto.getRandomValues(values)

  return Array.from(values, (value) => chars[value % chars.length]).join('')
}
