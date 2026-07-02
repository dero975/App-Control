import type { DashboardRow } from './dashboardModel'
import { formatDashboardDate, getDashboardValuePillClassName } from './dashboardModel'

export function DashboardTable({ rows }: { rows: DashboardRow[] }) {
  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Progetto</th>
            <th>GitHub</th>
            <th>Deploy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.project.id}>
              <td>
                <div className="dashboard-project-cell">
                  <strong>{row.project.name}</strong>
                  <span>Creato: {formatDashboardDate(row.project.createdAt)}</span>
                </div>
              </td>
              <td>
                {row.githubEmail ? (
                  <div className="dashboard-email-cell">
                    <strong>{row.githubEmail}</strong>
                  </div>
                ) : (
                  <span className="dashboard-muted">Nessuna email GitHub</span>
                )}
              </td>
              <td>
                <span className={getDashboardValuePillClassName(row.project.deploy.provider)}>
                  {row.project.deploy.provider || 'Non impostato'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
