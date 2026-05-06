import type { ReactNode } from 'react'

type FieldGroupProps = {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export function FieldGroup({ title, description, action, children }: FieldGroupProps) {
  return (
    <section className="field-group">
      <div className="field-group__header">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <div className="field-group__action">{action}</div> : null}
      </div>
      <div className="field-group__body">{children}</div>
    </section>
  )
}
