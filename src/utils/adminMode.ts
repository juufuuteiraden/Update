const SESSION_KEY = 'villa_susane_admin_session'

export function isAdminModeEnabled() {
  try {
    return localStorage.getItem(SESSION_KEY) === 'true'
  } catch {
    return false
  }
}

export function logoutAdminMode() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

