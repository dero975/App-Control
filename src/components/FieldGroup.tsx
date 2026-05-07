import type { ReactNode } from 'react'

type FieldGroupProps = {
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function FieldGroup({ title, description, action, children, className = '' }: FieldGroupProps) {
  return (
    <section className={`field-group ${className}`.trim()}>
      {title || description || action ? (
        <div className="field-group__header">
          <div>
            {title ? <h3>{title}</h3> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {action ? <div className="field-group__action">{action}</div> : null}
        </div>
      ) : null}
      <div className="field-group__body">{children}</div>
    </section>
  )
}
