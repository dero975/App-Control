type EmptyStateProps = {
  title: string
  message: string
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      <p>{message}</p>
    </div>
  )
}
