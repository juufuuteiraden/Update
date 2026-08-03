import {createClient} from '@sanity/client'

const isBrowser = typeof window !== 'undefined'
const isVisualEditing = isBrowser && (
  window.self !== window.top ||
  new URLSearchParams(window.location.search).has('sanity-preview')
)
const studioUrl =
  import.meta.env.VITE_SANITY_STUDIO_URL ||
  (isBrowser && window.location.ancestorOrigins?.[0]) ||
  'https://villasusane.sanity.studio/'

export const client = createClient({
  projectId: 'rghbiwhc',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
  stega: {
    enabled: import.meta.env.DEV || isVisualEditing,
    studioUrl,
  },
})

export default client
