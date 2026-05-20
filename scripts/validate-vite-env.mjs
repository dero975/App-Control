import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const requiredEnvKeys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local']
const envValues = new Map()

for (const envFile of envFiles) {
  const filePath = resolve(process.cwd(), envFile)
  if (!existsSync(filePath)) continue

  const content = readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) continue

    const separatorIndex = trimmedLine.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmedLine.slice(0, separatorIndex).trim()
    const value = trimmedLine.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    envValues.set(key, value)
  }
}

for (const [key, value] of Object.entries(process.env)) {
  if (typeof value === 'string') envValues.set(key, value)
}

const missingKeys = requiredEnvKeys.filter((key) => !envValues.get(key)?.trim())

if (missingKeys.length) {
  console.error(`Missing required Vite environment variables: ${missingKeys.join(', ')}`)
  console.error('Render Static Site must define these variables before running npm run build.')
  process.exit(1)
}

const forbiddenClientKeyPattern = /^VITE_.*(SERVICE|SERVICE_ROLE|SECRET|PASSWORD|TOKEN|DATABASE|DB_URL|PRIVATE)/i
const forbiddenClientKeys = [...envValues.keys()].filter((key) => forbiddenClientKeyPattern.test(key))

if (forbiddenClientKeys.length) {
  console.error(`Forbidden client-side environment variables: ${forbiddenClientKeys.join(', ')}`)
  console.error('VITE_* variables are bundled into the static frontend. Keep service keys, tokens and database URLs server-side only.')
  process.exit(1)
}

const serverOnlyKeys = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_DB_URL',
  'DATABASE_URL',
  'GITHUB_TOKEN',
  'RENDER_API_KEY',
]
const serverOnlyValues = serverOnlyKeys
  .map((key) => [key, envValues.get(key)?.trim()])
  .filter((entry) => Boolean(entry[1]))

const leakedClientValues = [...envValues.entries()]
  .filter(([key]) => key.startsWith('VITE_'))
  .flatMap(([clientKey, clientValue]) =>
    serverOnlyValues
      .filter(([serverKey, serverValue]) => clientValue.trim() === serverValue && clientKey !== serverKey)
      .map(([serverKey]) => `${clientKey} matches ${serverKey}`),
  )

if (leakedClientValues.length) {
  console.error(`Server-only secret exposed to Vite build: ${leakedClientValues.join(', ')}`)
  console.error('Move server-only secrets out of VITE_* variables before building.')
  process.exit(1)
}

const supabaseUrl = envValues.get('VITE_SUPABASE_URL')?.trim() ?? ''
if (/\/rest\/v1\/?$/.test(supabaseUrl)) {
  console.error('VITE_SUPABASE_URL must be the Supabase project base URL, without /rest/v1.')
  process.exit(1)
}
