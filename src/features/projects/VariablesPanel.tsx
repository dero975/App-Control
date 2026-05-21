import { useEffect, useState, type FocusEvent } from 'react'
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { CopyButton } from '../../components/CopyButton'
import { FieldGroup } from '../../components/FieldGroup'
import { copyToClipboard } from '../../lib/clipboard'
import type { PlatformAccess, ProjectVariable } from '../../types/app'
import {
  buildDefaultDeployAdminLink,
  deployAdminLinkKey,
  isDeployPasswordField,
  isProjectNameField,
  normalizeProjectName,
  supabaseServiceKeyAliases,
} from './projectShared'
import { addSelectOptionValue, getSelectableFieldConfig, getSelectOptions, getSelectValue, selectableFieldConfigs } from './projectFieldOptions'

type VariableUpdateField = 'key' | 'value' | 'sensitive'

export function VariablesPanel({
  addLabel,
  variables,
  onChange,
  title,
  valueAriaLabel,
}: {
  addLabel: string
  variables: ProjectVariable[]
  onChange: (variables: ProjectVariable[]) => void
  title: string
  valueAriaLabel: string
}) {
  const [envBlockCopied, setEnvBlockCopied] = useState(false)
  const [editingVariableIds, setEditingVariableIds] = useState<Set<string>>(() => new Set())
  const [draftVariableIds, setDraftVariableIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (!envBlockCopied) return

    const timeout = window.setTimeout(() => setEnvBlockCopied(false), 1600)
    return () => window.clearTimeout(timeout)
  }, [envBlockCopied])

  function isDraftVariable(id: string) {
    return draftVariableIds.has(id)
  }

  function isEditingVariable(id: string) {
    return draftVariableIds.has(id) || editingVariableIds.has(id)
  }

  function isEditingVariableGroup(ids: string[]) {
    return ids.some((id) => draftVariableIds.has(id) || editingVariableIds.has(id))
  }

  function toggleVariableEditing(ids: string[]) {
    setEditingVariableIds((currentIds) => {
      const nextIds = new Set(currentIds)
      const isEditing = ids.some((id) => nextIds.has(id))

      ids.forEach((id) => {
        if (isEditing) {
          nextIds.delete(id)
          return
        }

        nextIds.add(id)
      })

      return nextIds
    })
  }

  function updateVariable(id: string, field: VariableUpdateField, value: string | boolean) {
    const currentVariables = variables
    const targetVariable = currentVariables.find((variable) => variable.id === id)

    if (targetVariable && field === 'value' && isLinkDeployField(targetVariable.key)) {
      const currentAdminVariable = currentVariables.find((variable) => isLinkDeployAdminField(variable.key))
      const currentAutoAdminValue = buildDefaultDeployAdminLink(targetVariable.value)
      const nextDeployValue = String(value)
      const nextAutoAdminValue = buildDefaultDeployAdminLink(nextDeployValue)

      onChange(
        currentVariables.map((variable) => {
          if (variable.id === id) return { ...variable, value: nextDeployValue }
          if (!currentAdminVariable || variable.id !== currentAdminVariable.id) return variable
          if (currentAdminVariable.value && currentAdminVariable.value !== currentAutoAdminValue) return variable
          return { ...variable, value: nextAutoAdminValue }
        }),
      )
      return
    }

    const nextValue = field === 'value' && targetVariable && isProjectNameField(targetVariable.key) ? normalizeProjectName(String(value)) : value
    onChange(currentVariables.map((variable) => (variable.id === id ? { ...variable, [field]: nextValue } : variable)))
  }

  function updatePlatformAccess(variableId: string, accessId: string, field: keyof Omit<PlatformAccess, 'id'>, value: string) {
    onChange(
      variables.map((variable) =>
        variable.id === variableId
          ? {
              ...variable,
              accessAccounts: (variable.accessAccounts ?? []).map((access) =>
                access.id === accessId ? { ...access, [field]: value } : access,
              ),
            }
          : variable,
      ),
    )
  }

  function addPlatformAccess(variableId: string) {
    onChange(
      variables.map((variable) => {
        if (variable.id !== variableId) return variable

        return {
          ...variable,
          accessAccounts: [
            ...(variable.accessAccounts ?? []),
            {
              id: `access-${Date.now()}`,
              platform: getSelectValue(variable.value, selectableFieldConfigs['sviluppo in']),
              email: '',
              password: '',
            },
          ],
        }
      }),
    )
  }

  function deletePlatformAccess(variableId: string, accessId: string) {
    onChange(
      variables.map((variable) =>
        variable.id === variableId
          ? { ...variable, accessAccounts: (variable.accessAccounts ?? []).filter((access) => access.id !== accessId) }
          : variable,
      ),
    )
  }

  function deleteVariable(id: string) {
    setEditingVariableIds((currentIds) => {
      const nextIds = new Set(currentIds)
      nextIds.delete(id)
      return nextIds
    })
    setDraftVariableIds((currentIds) => {
      const nextIds = new Set(currentIds)
      nextIds.delete(id)
      return nextIds
    })
    onChange(variables.filter((variable) => variable.id !== id))
  }

  function finalizeDraftVariable(id: string) {
    setDraftVariableIds((currentIds) => {
      if (!currentIds.has(id)) return currentIds

      const nextIds = new Set(currentIds)
      nextIds.delete(id)
      return nextIds
    })
  }

  function addVariable() {
    const variableId = `variable-${Date.now()}`
    setDraftVariableIds((currentIds) => new Set(currentIds).add(variableId))
    onChange([
      ...variables,
      {
        id: variableId,
        key: '',
        value: '',
        sensitive: true,
      },
    ])
  }

  async function copyEnvBlock() {
    const envBlock = formatVariablesEnvForCopy(variables)
    if (!envBlock) return

    await copyToClipboard(envBlock)
    setEnvBlockCopied(true)
  }

  const envBlock = formatVariablesEnvForCopy(variables)
  const isVariablesPanel = title === 'Variabili'
  const isBarePanel = title === 'Dati progetto' || title === 'Variabili'
  const githubEmailIndex = variables.findIndex((variable) => isGithubEmailField(variable.key))
  const githubPasswordIndex = variables.findIndex((variable) => isGithubPasswordField(variable.key))
  const hasGroupedGithubCredentials = title === 'Dati progetto' && githubEmailIndex !== -1 && githubPasswordIndex !== -1
  const githubCredentialsStartIndex = hasGroupedGithubCredentials ? Math.min(githubEmailIndex, githubPasswordIndex) : -1
  const githubCredentialsEndIndex = hasGroupedGithubCredentials ? Math.max(githubEmailIndex, githubPasswordIndex) : -1
  const deployIndex = variables.findIndex((variable) => isDeployField(variable.key))
  const deployPasswordIndex =
    deployIndex === -1 ? -1 : variables.findIndex((variable, index) => index > deployIndex && isDeployPasswordField(variable.key))
  const hasGroupedDeployCredentials = title === 'Dati progetto' && deployIndex !== -1 && deployPasswordIndex !== -1
  const deployCredentialsStartIndex = hasGroupedDeployCredentials ? Math.min(deployIndex, deployPasswordIndex) : -1
  const deployCredentialsEndIndex = hasGroupedDeployCredentials ? Math.max(deployIndex, deployPasswordIndex) : -1
  const linkDeployIndex = variables.findIndex((variable) => isLinkDeployField(variable.key))
  const linkDeployAdminIndex =
    linkDeployIndex === -1 ? -1 : variables.findIndex((variable, index) => index > linkDeployIndex && isLinkDeployAdminField(variable.key))
  const hasGroupedDeployLinks = title === 'Variabili' && linkDeployIndex !== -1 && linkDeployAdminIndex !== -1
  const deployLinksStartIndex = hasGroupedDeployLinks ? Math.min(linkDeployIndex, linkDeployAdminIndex) : -1
  const deployLinksEndIndex = hasGroupedDeployLinks ? Math.max(linkDeployIndex, linkDeployAdminIndex) : -1

  return (
    <div className="tab-panel-stack">
      <FieldGroup
        className={isBarePanel ? 'field-group--bare' : ''}
        title={isBarePanel ? undefined : title}
        action={
          <div className="field-group-action-row">
            {isVariablesPanel ? (
              <button
                type="button"
                className="secondary-button secondary-button--compact"
                disabled={!envBlock}
                onClick={copyEnvBlock}
                title="Copia tutte le variabili in formato .env"
              >
                <FileText aria-hidden="true" className="button-icon" />
                {envBlockCopied ? 'Copiato' : '.env render'}
              </button>
            ) : null}
            <button type="button" className="secondary-button" onClick={addVariable}>
              <Plus aria-hidden="true" className="button-icon" />
              {addLabel}
            </button>
          </div>
        }
      >
        <div className="editable-variable-list">
          {variables.map((variable, index) => {
            if (hasGroupedGithubCredentials && index === githubCredentialsStartIndex) {
              return (
                <GitHubCredentialsCard
                  key="github-credentials"
                  emailVariable={variables[githubEmailIndex]}
                  passwordVariable={variables[githubPasswordIndex]}
                  editable={isEditingVariableGroup([variables[githubEmailIndex].id, variables[githubPasswordIndex].id])}
                  onDelete={deleteVariable}
                  onEdit={() => toggleVariableEditing([variables[githubEmailIndex].id, variables[githubPasswordIndex].id])}
                  onUpdate={updateVariable}
                  valueAriaLabel={valueAriaLabel}
                />
              )
            }

            if (hasGroupedDeployLinks && index === deployLinksStartIndex) {
              return (
                <DeployLinksCard
                  key="deploy-links"
                  deployLinkVariable={variables[linkDeployIndex]}
                  deployAdminLinkVariable={variables[linkDeployAdminIndex]}
                  editable={isEditingVariableGroup([variables[linkDeployIndex].id, variables[linkDeployAdminIndex].id])}
                  onDelete={deleteVariable}
                  onEdit={() => toggleVariableEditing([variables[linkDeployIndex].id, variables[linkDeployAdminIndex].id])}
                  onUpdate={updateVariable}
                  valueAriaLabel={valueAriaLabel}
                />
              )
            }

            if (hasGroupedDeployCredentials && index === deployCredentialsStartIndex) {
              return (
                <DeployCredentialsCard
                  key="deploy-credentials"
                  deployVariable={variables[deployIndex]}
                  passwordVariable={variables[deployPasswordIndex]}
                  editable={isEditingVariableGroup([variables[deployIndex].id, variables[deployPasswordIndex].id])}
                  onDelete={deleteVariable}
                  onEdit={() => toggleVariableEditing([variables[deployIndex].id, variables[deployPasswordIndex].id])}
                  onUpdate={updateVariable}
                  valueAriaLabel={valueAriaLabel}
                />
              )
            }

            if (hasGroupedGithubCredentials && index === githubCredentialsEndIndex) {
              return null
            }

            if (hasGroupedDeployLinks && index === deployLinksEndIndex) {
              return null
            }

            if (hasGroupedDeployCredentials && index === deployCredentialsEndIndex) {
              return null
            }

            return (
              <VariableEditorCard
                key={variable.id}
                variable={variable}
                editable={isEditingVariable(variable.id)}
                isDraft={isDraftVariable(variable.id)}
                onAddAccess={addPlatformAccess}
                onDelete={deleteVariable}
                onDeleteAccess={deletePlatformAccess}
                onDraftCommit={finalizeDraftVariable}
                onEdit={() => toggleVariableEditing([variable.id])}
                onUpdateAccess={updatePlatformAccess}
                onUpdate={updateVariable}
                valueAriaLabel={valueAriaLabel}
              />
            )
          })}
        </div>
      </FieldGroup>
    </div>
  )
}

function DeployCredentialsCard({
  deployVariable,
  editable,
  passwordVariable,
  onDelete,
  onEdit,
  onUpdate,
  valueAriaLabel,
}: {
  deployVariable: ProjectVariable
  editable: boolean
  passwordVariable: ProjectVariable
  onDelete: (id: string) => void
  onEdit: () => void
  onUpdate: (id: string, field: VariableUpdateField, value: string | boolean) => void
  valueAriaLabel: string
}) {
  const selectFieldConfig = getSelectableFieldConfig(deployVariable.key)
  const selectValue = selectFieldConfig ? getSelectValue(deployVariable.value, selectFieldConfig) : deployVariable.value
  const selectOptions = selectFieldConfig ? getSelectOptions(selectValue, selectFieldConfig.options) : []

  function addSelectOption() {
    if (!selectFieldConfig) return

    const nextValue = window.prompt(selectFieldConfig.promptLabel)
    const normalizedValue = nextValue?.trim()
    if (!normalizedValue) return

    onUpdate(deployVariable.id, 'value', normalizedValue)
  }

  function handleSelectChange(value: string) {
    if (value === addSelectOptionValue) {
      addSelectOption()
      return
    }

    onUpdate(deployVariable.id, 'value', value)
  }

  return (
    <article className={editable ? 'editable-variable-card editable-variable-card--grouped editable-variable-card--deploy editable-variable-card--editing' : 'editable-variable-card editable-variable-card--grouped editable-variable-card--deploy'}>
      <div className="grouped-variable-stack">
        <div className="grouped-card-title grouped-card-title--deploy">Deploy con</div>
        <div className="grouped-variable-row">
          <label className="variable-value-input" aria-label={valueAriaLabel}>
            <span className="fixed-field-name fixed-field-name--hidden" aria-hidden="true">
              {deployVariable.key}
            </span>
            {selectFieldConfig ? (
              <div className="variable-select-row">
                <select value={selectValue} disabled={!editable} onChange={(event) => handleSelectChange(event.target.value)}>
                  {selectOptions.map((option) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                  <option value={addSelectOptionValue}>+ Aggiungi</option>
                </select>
              </div>
            ) : null}
          </label>
          <div className="grouped-variable-row__actions">
            <VariableEditButton active={editable} onClick={onEdit} />
            <button
              type="button"
              className="inline-icon-button trash-button"
              onClick={() => onDelete(deployVariable.id)}
              aria-label="Elimina deploy con"
              title="Elimina deploy con"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grouped-variable-row">
          <label className="variable-value-input" aria-label={valueAriaLabel}>
            <span className="fixed-field-name">Password</span>
            <input
              value={passwordVariable.value}
              type="text"
              readOnly={!editable}
              onChange={(event) => onUpdate(passwordVariable.id, 'value', event.target.value)}
            />
            <CopyButton value={passwordVariable.value} iconOnly className="copy-button--inside-input" />
          </label>
          <div className="grouped-variable-row__actions grouped-variable-row__actions--single">
            <button
              type="button"
              className="inline-icon-button trash-button"
              onClick={() => onDelete(passwordVariable.id)}
              aria-label="Elimina Password deploy"
              title="Elimina Password deploy"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function formatVariablesEnvForCopy(variables: ProjectVariable[]) {
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

function VariableFieldTitle({
  canEdit,
  editable,
  onChange,
  value,
}: {
  canEdit: boolean
  editable: boolean
  onChange: (value: string) => void
  value: string
}) {
  if (editable && canEdit) {
    return (
      <span className="field-title-edit-row">
        <input
          className="field-title-input"
          value={value}
          placeholder="Titolo campo"
          aria-label="Titolo campo"
          onChange={(event) => onChange(event.target.value)}
        />
        <CopyButton value={value} iconOnly className="copy-button--field-title" label="Copia titolo" />
      </span>
    )
  }

  return (
    <span className="fixed-field-name fixed-field-name--with-inline-copy">
      <span>{value || 'Titolo campo'}</span>
      <CopyButton value={value} iconOnly className="copy-button--field-title" label="Copia titolo" />
    </span>
  )
}

function VariableEditButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={active ? 'inline-icon-button variable-edit-button variable-edit-button--active' : 'inline-icon-button variable-edit-button'}
      onClick={onClick}
      aria-label={active ? 'Blocca modifica campo' : 'Modifica campo'}
      aria-pressed={active}
      title={active ? 'Blocca modifica campo' : 'Modifica campo'}
    >
      <Pencil aria-hidden="true" className="button-icon" />
    </button>
  )
}

function DeployLinksCard({
  deployLinkVariable,
  deployAdminLinkVariable,
  editable,
  onDelete,
  onEdit,
  onUpdate,
  valueAriaLabel,
}: {
  deployLinkVariable: ProjectVariable
  deployAdminLinkVariable: ProjectVariable
  editable: boolean
  onDelete: (id: string) => void
  onEdit: () => void
  onUpdate: (id: string, field: VariableUpdateField, value: string | boolean) => void
  valueAriaLabel: string
}) {
  return (
    <article className={editable ? 'editable-variable-card editable-variable-card--grouped editable-variable-card--editing' : 'editable-variable-card editable-variable-card--grouped'}>
      <div className="grouped-variable-stack">
        <div className="grouped-variable-row">
          <label className="variable-value-input" aria-label={valueAriaLabel}>
            <span className="fixed-field-name">{deployLinkVariable.key}</span>
            <input
              value={deployLinkVariable.value}
              type="text"
              readOnly={!editable}
              onChange={(event) => onUpdate(deployLinkVariable.id, 'value', event.target.value)}
            />
            <CopyButton value={deployLinkVariable.value} iconOnly className="copy-button--inside-input" />
          </label>
          <div className="grouped-variable-row__actions">
            <VariableEditButton active={editable} onClick={onEdit} />
            <button
              type="button"
              className="inline-icon-button trash-button"
              onClick={() => onDelete(deployLinkVariable.id)}
              aria-label="Elimina LINK_DEPLOY"
              title="Elimina LINK_DEPLOY"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grouped-variable-row">
          <label className="variable-value-input" aria-label={valueAriaLabel}>
            <span className="fixed-field-name">{deployAdminLinkVariable.key}</span>
            <input
              value={deployAdminLinkVariable.value}
              type="text"
              readOnly={!editable}
              onChange={(event) => onUpdate(deployAdminLinkVariable.id, 'value', event.target.value)}
            />
            <CopyButton value={deployAdminLinkVariable.value} iconOnly className="copy-button--inside-input" />
          </label>
          <div className="grouped-variable-row__actions grouped-variable-row__actions--single">
            <button
              type="button"
              className="inline-icon-button trash-button"
              onClick={() => onDelete(deployAdminLinkVariable.id)}
              aria-label="Elimina LINK_DEPLOY ADMIN"
              title="Elimina LINK_DEPLOY ADMIN"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
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


function VariableEditorCard({
  editable,
  isDraft,
  variable,
  onAddAccess,
  onDelete,
  onDeleteAccess,
  onDraftCommit,
  onEdit,
  onUpdateAccess,
  onUpdate,
  valueAriaLabel,
}: {
  editable: boolean
  isDraft: boolean
  variable: ProjectVariable
  onAddAccess: (variableId: string) => void
  onDelete: (id: string) => void
  onDeleteAccess: (variableId: string, accessId: string) => void
  onDraftCommit: (id: string) => void
  onEdit: () => void
  onUpdateAccess: (variableId: string, accessId: string, field: keyof Omit<PlatformAccess, 'id'>, value: string) => void
  onUpdate: (id: string, field: VariableUpdateField, value: string | boolean) => void
  valueAriaLabel: string
}) {
  const selectFieldConfig = getSelectableFieldConfig(variable.key)
  const isDevelopmentField = variable.key.trim().toLowerCase() === 'sviluppo in'
  const isGitHubVariable = ['GITHUB_URL', 'GITHUB_TOKEN'].includes(variable.key.trim().toUpperCase())
  const isSupabaseVariable = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', ...supabaseServiceKeyAliases, 'DATABASE_URL'].includes(
    variable.key.trim().toUpperCase(),
  )
  const selectValue = selectFieldConfig ? getSelectValue(variable.value, selectFieldConfig) : variable.value
  const selectOptions = selectFieldConfig ? getSelectOptions(selectValue, selectFieldConfig.options) : []
  const canEditTitle = isDraft || !isProtectedVariableTitle(variable)

  function addSelectOption() {
    if (!selectFieldConfig) return

    const nextValue = window.prompt(selectFieldConfig.promptLabel)
    const normalizedValue = nextValue?.trim()
    if (!normalizedValue) return

    onUpdate(variable.id, 'value', normalizedValue)
  }

  function handleSelectChange(value: string) {
    if (value === addSelectOptionValue) {
      addSelectOption()
      return
    }

    onUpdate(variable.id, 'value', value)
  }

  function handleCardBlur(event: FocusEvent<HTMLElement>) {
    if (!isDraft) return
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
    if (!variable.key.trim() && !variable.value.trim() && !(variable.accessAccounts ?? []).length) return

    onDraftCommit(variable.id)
  }

  return (
    <article
      className={[
        'editable-variable-card',
        isGitHubVariable ? 'editable-variable-card--github' : '',
        isSupabaseVariable ? 'editable-variable-card--deploy' : '',
        editable ? 'editable-variable-card--editing' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onBlur={handleCardBlur}
    >
      <div className="variable-field-stack">
        <label className="variable-value-input" aria-label={valueAriaLabel}>
          <VariableFieldTitle
            canEdit={canEditTitle}
            editable={editable}
            onChange={(value) => onUpdate(variable.id, 'key', value)}
            value={variable.key}
          />
          {selectFieldConfig ? (
            <div className="variable-select-row">
              <select value={selectValue} disabled={!editable} onChange={(event) => handleSelectChange(event.target.value)}>
                {selectOptions.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
                <option value={addSelectOptionValue}>+ Aggiungi</option>
              </select>
            </div>
          ) : (
            <>
              <input
                value={variable.value}
                type="text"
                readOnly={!editable}
                onChange={(event) => onUpdate(variable.id, 'value', event.target.value)}
              />
              <CopyButton value={variable.value} iconOnly className="copy-button--inside-input" />
            </>
          )}
        </label>
        {isDevelopmentField ? (
          <PlatformAccessList
            accounts={variable.accessAccounts ?? []}
            editable={editable}
            platformOptions={selectFieldConfig?.options ?? []}
            onAdd={() => onAddAccess(variable.id)}
            onDelete={(accessId) => onDeleteAccess(variable.id, accessId)}
            onUpdate={(accessId, field, value) => onUpdateAccess(variable.id, accessId, field, value)}
          />
        ) : null}
      </div>
      <div className="editable-variable-card__actions">
        {isDraft ? null : <VariableEditButton active={editable} onClick={onEdit} />}
        <button
          type="button"
          className="inline-icon-button trash-button"
          onClick={() => onDelete(variable.id)}
          aria-label="Elimina variabile"
          title="Elimina variabile"
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}

function GitHubCredentialsCard({
  editable,
  emailVariable,
  passwordVariable,
  onDelete,
  onEdit,
  onUpdate,
  valueAriaLabel,
}: {
  editable: boolean
  emailVariable: ProjectVariable
  passwordVariable: ProjectVariable
  onDelete: (id: string) => void
  onEdit: () => void
  onUpdate: (id: string, field: VariableUpdateField, value: string | boolean) => void
  valueAriaLabel: string
}) {
  return (
    <article className={editable ? 'editable-variable-card editable-variable-card--grouped editable-variable-card--github editable-variable-card--editing' : 'editable-variable-card editable-variable-card--grouped editable-variable-card--github'}>
      <div className="grouped-variable-stack">
        <div className="grouped-card-title">GitHub</div>
        <div className="grouped-variable-row">
          <label className="variable-value-input" aria-label={valueAriaLabel}>
            <span className="fixed-field-name">Mail accesso</span>
            <input
              value={emailVariable.value}
              type="text"
              readOnly={!editable}
              onChange={(event) => onUpdate(emailVariable.id, 'value', event.target.value)}
            />
            <CopyButton value={emailVariable.value} iconOnly className="copy-button--inside-input" />
          </label>
          <div className="grouped-variable-row__actions">
            <VariableEditButton active={editable} onClick={onEdit} />
            <button
              type="button"
              className="inline-icon-button trash-button"
              onClick={() => onDelete(emailVariable.id)}
              aria-label="Elimina Mail accesso"
              title="Elimina Mail accesso"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grouped-variable-row">
          <label className="variable-value-input" aria-label={valueAriaLabel}>
            <span className="fixed-field-name">{passwordVariable.key}</span>
            <input
              value={passwordVariable.value}
              type="text"
              readOnly={!editable}
              onChange={(event) => onUpdate(passwordVariable.id, 'value', event.target.value)}
            />
            <CopyButton value={passwordVariable.value} iconOnly className="copy-button--inside-input" />
          </label>
          <div className="grouped-variable-row__actions grouped-variable-row__actions--single">
            <button
              type="button"
              className="inline-icon-button trash-button"
              onClick={() => onDelete(passwordVariable.id)}
              aria-label="Elimina Password"
              title="Elimina Password"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function PlatformAccessList({
  accounts,
  editable,
  platformOptions,
  onAdd,
  onDelete,
  onUpdate,
}: {
  accounts: PlatformAccess[]
  editable: boolean
  platformOptions: readonly string[]
  onAdd: () => void
  onDelete: (accessId: string) => void
  onUpdate: (accessId: string, field: keyof Omit<PlatformAccess, 'id'>, value: string) => void
}) {
  function handlePlatformChange(accessId: string, value: string) {
    if (value === addSelectOptionValue) {
      const nextValue = window.prompt('Nuova piattaforma')
      const normalizedValue = nextValue?.trim()
      if (!normalizedValue) return

      onUpdate(accessId, 'platform', normalizedValue)
      return
    }

    onUpdate(accessId, 'platform', value)
  }

  return (
    <div className="platform-access-list">
      <div className="platform-access-list__header">
        <span>Accessi piattaforme</span>
        <button type="button" className="secondary-button platform-access-add-button" disabled={!editable} onClick={onAdd}>
          <Plus aria-hidden="true" className="button-icon" />
          Aggiungi accesso
        </button>
      </div>
      {accounts.map((access) => (
        <div className="platform-access-row" key={access.id}>
          <select value={access.platform} disabled={!editable} onChange={(event) => handlePlatformChange(access.id, event.target.value)}>
            {getSelectOptions(access.platform, platformOptions).map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
            <option value={addSelectOptionValue}>+ Aggiungi</option>
          </select>
          <input
            value={access.email}
            type="email"
            placeholder="Mail accesso"
            aria-label={`Mail accesso ${access.platform}`}
            readOnly={!editable}
            onChange={(event) => onUpdate(access.id, 'email', event.target.value)}
          />
          <input
            value={access.password}
            type="text"
            placeholder="Password"
            aria-label={`Password ${access.platform}`}
            readOnly={!editable}
            onChange={(event) => onUpdate(access.id, 'password', event.target.value)}
          />
          <button
            type="button"
            className="inline-icon-button trash-button"
            disabled={!editable}
            onClick={() => onDelete(access.id)}
            aria-label={`Elimina accesso ${access.platform}`}
            title={`Elimina accesso ${access.platform}`}
          >
            <Trash2 aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}

function isGithubEmailField(key: string) {
  return key.trim().toLowerCase() === 'mail github'
}

function isGithubPasswordField(key: string) {
  return key.trim().toLowerCase() === 'password'
}

function isProtectedVariableTitle(variable: ProjectVariable) {
  const normalizedKey = variable.key.trim().toLowerCase()
  const normalizedEnvKey = variable.key.trim().toUpperCase()
  const protectedDataKeys = new Set(['nome progetto', 'mail github', 'password', 'sviluppo in', 'deploy con', 'password deploy'])
  const protectedEnvKeys = new Set(['LINK_DEPLOY', deployAdminLinkKey, 'GITHUB_URL', 'GITHUB_TOKEN', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', ...supabaseServiceKeyAliases, 'DATABASE_URL'])

  return protectedDataKeys.has(normalizedKey) || protectedEnvKeys.has(normalizedEnvKey)
}

function isDeployField(key: string) {
  return key.trim().toLowerCase() === 'deploy con'
}

function isLinkDeployField(key: string) {
  return key.trim().toUpperCase() === 'LINK_DEPLOY'
}

function isLinkDeployAdminField(key: string) {
  return key.trim().toUpperCase() === deployAdminLinkKey.toUpperCase()
}
