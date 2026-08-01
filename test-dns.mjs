import dns from 'node:dns/promises'

const hosts = [
  'mqahrdxlahpbiavvzyem.supabase.co',
  'mqahrdxlahpbiavvzyem.supabase.in',
  'rghbiwhc.api.sanity.io',
]

for (const host of hosts) {
  try {
    const addrs = await dns.resolve4(host)
    console.log(`${host} -> ${addrs.join(', ')}`)
  } catch (e) {
    console.log(`${host} -> DNS FAIL: ${e.code || e.message}`)
  }
}

console.log('\n--- HTTPS fetch attempts ---')
const attempts = [
  ['https://mqahrdxlahpbiavvzyem.supabase.co/', {}],
  ['https://mqahrdxlahpbiavvzyem.supabase.co/auth/v1/health', {}],
  ['https://mqahrdxlahpbiavvzyem.supabase.co/rest/v1/', {}],
  ['https://mqahrdxlahpbiavvzyem.supabase.in/', {}],
]

for (const [url, opts] of attempts) {
  const started = Date.now()
  try {
    const res = await fetch(url, opts)
    console.log(`${url} -> ${res.status} (${Date.now() - started}ms)`)
  } catch (e) {
    console.log(`${url} -> ERROR: ${e.cause?.code || e.cause?.message || e.message} (${Date.now() - started}ms)`)
  }
}

