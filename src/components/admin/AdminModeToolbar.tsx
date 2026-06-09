import { logoutAdminMode } from '../../utils/adminMode'
import './adminMode.css'

export default function AdminModeToolbar({
  onLogout,
}: {
  onLogout: () => void
}) {
  return (
    <div className="admin-mode-toolbar" role="banner" aria-label="Admin Mode">
      <div className="admin-mode-toolbar__left">Admin Mode</div>
      <div className="admin-mode-toolbar__right">
        <button
          className="admin-mode-toolbar__logout"
          onClick={() => {
            logoutAdminMode()
            onLogout()
          }}
        >
          Logout
        </button>
      </div>
    </div>
  )
}

