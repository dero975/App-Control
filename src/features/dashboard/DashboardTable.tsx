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
            <th>Sviluppo</th>
            <th>Accessi piattaforme</th>
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
                <span className={getDashboardValuePillClassName(row.project.developmentEnvironment)}>
                  {row.project.developmentEnvironment || 'Non impostato'}
                </span>
              </td>
              <td>
                {row.platformAccesses.length ? (
                  <div className="dashboard-access-list">
                    {row.platformAccesses.map((access) => (
                      <div key={access.id} className="dashboard-access-item">
                        <span>{access.email || 'Nessuna email'}</span>
                        {access.email && access.emailUsageCount > 1 ? (
                          <span className="dashboard-badge">{access.emailUsageCount} progetti</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="dashboard-muted">Nessun accesso piattaforma</span>
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
