const SUPABASE_URL = 'https://mqahrdxlahpbiavvzyem.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xYWhyZHhsYWhwYmlhdnZ5emVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0Mzg3NzUsImV4cCI6MjEwMTAxNDc3NX0.wNwPGR5V0YSRxwQq9jFcUVFqlVMdtQuEJU-tB_XnIh8'

const targets = [
  ['Supabase REST (no key)', `${SUPABASE_URL}/rest/v1/`],
  ['Supabase REST (anon key)', `${SUPABASE_URL}/rest/v1/gallery?select=id&limit=1`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }],
  ['Sanity query CDN', 'https://rghbiwhc.apicdn.sanity.io/v2021-06-07/data/query/production?query=*%5B_type%20%3D%3D%20%22siteSettings%22%5D%5B0%5D'],
  ['Sanity query API', 'https://rghbiwhc.api.sanity.io/v2021-06-07/data/query/production?query=*%5B_type%20%3D%3D%20%22siteSettings%22%5D%5B0%5D'],
]

for (const [name, url, opts] of targets) {
  try {
    const res = await fetch(url, opts)
    const text = await res.text()
    console.log(`\n=== ${name} ===`)
    console.log('STATUS:', res.status)
    console.log('BODY:', text.slice(0, 200))
  } catch (e) {
    console.log(`\n=== ${name} ===`)
    console.log('ERROR:', e.message)
  }
}

