export function DashboardSummary({
  summary,
}: {
  summary: {
    projectCount: number
    uniqueGithubEmails: number
    duplicatedGithubEmails: number
  }
}) {
  return (
    <div className="info-grid dashboard-summary-grid" aria-label="Riepilogo dashboard">
      <div className="info-pill">
        <span>Progetti</span>
        <strong>{summary.projectCount}</strong>
      </div>
      <div className="info-pill">
        <span>Email GitHub uniche</span>
        <strong>{summary.uniqueGithubEmails}</strong>
      </div>
      <div className="info-pill">
        <span>Email GitHub condivise</span>
        <strong>{summary.duplicatedGithubEmails}</strong>
      </div>
    </div>
  )
}
