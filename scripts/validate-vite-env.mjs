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

const supabaseUrl = envValues.get('VITE_SUPABASE_URL')?.trim() ?? ''
if (/\/rest\/v1\/?$/.test(supabaseUrl)) {
  console.error('VITE_SUPABASE_URL must be the Supabase project base URL, without /rest/v1.')
  process.exit(1)
}
