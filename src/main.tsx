import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { enableVisualEditing } from '@sanity/visual-editing'

// Disable Sanity "Open in studio" highlighters on the public site.
// Only enable them when explicitly on the dedicated admin panel route.
try {
  if (window.location.pathname === '/admin-vs-2024') {
    enableVisualEditing()
  }
} catch {
  // ignore
}



createRoot(document.getElementById('root')!).render(
  <App />
)
