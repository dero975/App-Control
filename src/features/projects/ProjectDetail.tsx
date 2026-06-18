import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { CopyButton } from '../../components/CopyButton'
import { FieldGroup } from '../../components/FieldGroup'
import { handleExternalLinkClick } from '../../lib/externalLink'
import type { Project, ProjectVariable } from '../../types/app'
import { buildProjectVariables, formatProjectUpdatedAt, getDeployAdminLink, getDeployLink, getFieldValue } from './projectShared'
import { buildProjectImageSlots, getProjectImageSlotsSignature, type ProjectImageSlot } from './projectImageModel'
import { getProjectDetailSignature, buildNormalizedSheetFields } from './projectPageModel'
import { projectTabs, type ProjectSaveState, type ProjectTab } from './projectPageConstants'
import { ProjectAgentPanel } from './ProjectAgentPanel'
import { VariablesPanel } from './VariablesPanel'
import type { ProjectSnapshot } from './projectRepository'

const ProjectImagesPanel = lazy(() => import('./ProjectImagesPanel').then((module) => ({ default: module.ProjectImagesPanel })))

export function ProjectDetail({
  project,
  activeTab,
  mobileModal = false,
  onSave,
  onRequestDelete,
  onTabChange,
}: {
  project: Project
  activeTab: ProjectTab
  mobileModal?: boolean
  onSave?: (snapshot: ProjectSnapshot) => Promise<void>
  onRequestDelete: () => void
  onTabChange: (tab: ProjectTab) => void
}) {
  const [sheetFields, setSheetFields] = useState<ProjectVariable[]>(() => buildNormalizedSheetFields(project))
  const [variables, setVariables] = useState<ProjectVariable[]>(() => buildProjectVariables(project))
  const [imageSlots, setImageSlots] = useState<ProjectImageSlot[]>(() => buildProjectImageSlots(project.images))
  const [operationalNotes, setOperationalNotes] = useState(project.operationalNotes)
  const [saveState, setSaveState] = useState<ProjectSaveState>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const imageSlotsSignature = useMemo(() => getProjectImageSlotsSignature(imageSlots), [imageSlots])
  const detailSignature = useMemo(
    () => getProjectDetailSignature({ imageSlotsSignature, operationalNotes, sheetFields, variables }),
    [imageSlotsSignature, operationalNotes, sheetFields, variables],
  )
  const lastSavedSignatureRef = useRef(detailSignature)
  const saveContextRef = useRef({ onSave, project })
  const saveVersionRef = useRef(0)
  const projectTitle = getFieldValue(sheetFields, 'nome progetto') || project.name
  const deployLink = getDeployLink(sheetFields, project)
  const deployAdminLink = getDeployAdminLink(variables, deployLink)
  const createdAtLabel = formatProjectUpdatedAt(project.createdAt)

  useEffect(() => {
    saveContextRef.current = { onSave, project }
  }, [onSave, project])

  useEffect(() => {
    if (saveState !== 'saved') return

    const resetTimer = window.setTimeout(() => {
      setSaveState((currentState) => (currentState === 'saved' ? 'idle' : currentState))
      setSaveMessage((currentMessage) => (currentMessage === 'Salvataggio completato' ? '' : currentMessage))
    }, 1600)

    return () => window.clearTimeout(resetTimer)
  }, [saveState])

  useEffect(() => {
    if (detailSignature === lastSavedSignatureRef.current) return

    const currentSaveVersion = saveVersionRef.current + 1
    saveVersionRef.current = currentSaveVersion

    const saveTimer = window.setTimeout(() => {
      const { onSave: saveSnapshot, project: currentProject } = saveContextRef.current
      if (!saveSnapshot) return

      setSaveState('saving')
      setSaveMessage('Salvataggio in corso')

      void saveSnapshot({
        project: {
          ...currentProject,
          operationalNotes,
        },
        sheetFields,
        variables,
        images: imageSlots,
      })
        .then(() => {
          if (saveVersionRef.current !== currentSaveVersion) return
          lastSavedSignatureRef.current = detailSignature
          setSaveState('saved')
          setSaveMessage('Salvataggio completato')
        })
        .catch((error) => {
          if (saveVersionRef.current !== currentSaveVersion) return
          setSaveState('error')
          setSaveMessage(error instanceof Error ? error.message : 'Errore salvataggio progetto')
        })
    }, 650)

    return () => window.clearTimeout(saveTimer)
  }, [detailSignature, imageSlots, operationalNotes, sheetFields, variables])

  function handleImageSlotsChange(nextImageSlots: ProjectImageSlot[]) {
    setImageSlots(nextImageSlots)
  }

  const hasOperationalNotes = operationalNotes.trim().length > 0

  return (
    <div className={mobileModal ? 'detail-stack detail-stack--mobile-modal' : 'detail-stack'}>
      <div className="detail-heading">
        <div>
          <h2>{projectTitle}</h2>
          {deployLink ? (
            <div className="project-deploy-link">
              <a href={deployLink} target="_blank" rel="noreferrer" onClick={(event) => handleExternalLinkClick(event, deployLink)}>
                {deployLink}
              </a>
              <CopyButton value={deployLink} iconOnly />
            </div>
          ) : null}
          {deployAdminLink ? (
            <div className="project-deploy-link">
              <a href={deployAdminLink} target="_blank" rel="noreferrer" onClick={(event) => handleExternalLinkClick(event, deployAdminLink)}>
                {deployAdminLink}
              </a>
              <CopyButton value={deployAdminLink} iconOnly />
            </div>
          ) : null}
          <p className="project-created-at">{`Data creazione: ${createdAtLabel}`}</p>
        </div>
        <div className="detail-heading__actions">
          <button type="button" className="danger-button" onClick={onRequestDelete}>
            <Trash2 aria-hidden="true" className="button-icon" />
            Elimina progetto
          </button>
        </div>
      </div>

      <div className="tab-row" role="tablist" aria-label="Sezioni progetto">
        {projectTabs.map((tab) => (
          <button
            type="button"
            key={tab}
            className={[
              'tab-button',
              activeTab === tab ? 'tab-button--active' : '',
              tab === 'Note' && hasOperationalNotes ? 'tab-button--has-content' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {saveMessage ? (
        <p
          className={[
            'status-message',
            saveState === 'error' ? 'status-message--error' : '',
            saveState === 'saving' ? 'status-message--progress' : '',
            saveState === 'saved' ? 'status-message--success' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {saveMessage}
        </p>
      ) : null}

      <div className="tab-scroll-area">
        {activeTab === 'Dati progetto' ? (
          <VariablesPanel
            addLabel="Aggiungi campo"
            onChange={setSheetFields}
            title="Dati progetto"
            toneStorageKey={`app-control-variable-tones:project:${project.id}:data`}
            valueAriaLabel="Valore campo foglio"
            variables={sheetFields}
          />
        ) : null}
        {activeTab === 'Variabili' ? (
          <VariablesPanel
            addLabel="Aggiungi variabile"
            onChange={setVariables}
            title="Variabili"
            toneStorageKey={`app-control-variable-tones:project:${project.id}:env`}
            valueAriaLabel="Valore variabile"
            variables={variables}
          />
        ) : null}
        {activeTab === 'Immagini' ? (
          <Suspense fallback={<div className="status-message status-message--progress">Caricamento immagini</div>}>
            <ProjectImagesPanel slots={imageSlots} onChange={handleImageSlotsChange} />
          </Suspense>
        ) : null}
        {activeTab === 'Note' ? (
          <div className="notes-panel">
            <FieldGroup title="Note operative" className="field-group--bare">
              <textarea
                value={operationalNotes}
                rows={7}
                className="notes-panel-textarea"
                onChange={(event) => setOperationalNotes(event.target.value)}
              />
            </FieldGroup>
          </div>
        ) : null}
        {activeTab === 'Sync' ? <ProjectAgentPanel project={project} /> : null}
      </div>
    </div>
  )
}
