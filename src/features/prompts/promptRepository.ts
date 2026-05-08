import { supabase } from '../../lib/supabase'
import type { Prompt, PromptCategory } from '../../types/app'

type PromptRow = {
  id: string
  title: string
  category: PromptCategory
  full_text: string
  sort_order: number | null
}

export async function fetchPrompts() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('prompts')
    .select('id, title, category, full_text, sort_order')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })
  if (error) {
    if (!isMissingSortOrderError(error)) throw error

    const fallback = await client
      .from('prompts')
      .select('id, title, category, full_text')
      .order('category', { ascending: true })
      .order('title', { ascending: true })
    if (fallback.error) throw fallback.error

    return ((fallback.data as Omit<PromptRow, 'sort_order'>[] | null) ?? []).map((row) =>
      mapPromptRow({ ...row, sort_order: 0 }),
    )
  }

  return ((data as PromptRow[] | null) ?? []).map(mapPromptRow)
}

export async function createPromptRecord(prompt: Omit<Prompt, 'id'>) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('prompts')
    .insert({
      title: prompt.title,
      category: prompt.category,
      full_text: prompt.fullText,
      sort_order: prompt.sortOrder,
    })
    .select('id, title, category, full_text, sort_order')
    .single()
  if (error) {
    if (!isMissingSortOrderError(error)) throw error

    const fallback = await client
      .from('prompts')
      .insert({
        title: prompt.title,
        category: prompt.category,
        full_text: prompt.fullText,
      })
      .select('id, title, category, full_text')
      .single()
    if (fallback.error) throw fallback.error

    return mapPromptRow({ ...(fallback.data as Omit<PromptRow, 'sort_order'>), sort_order: 0 })
  }

  return mapPromptRow(data as PromptRow)
}

export async function updatePromptRecord(promptId: string, prompt: Omit<Prompt, 'id'>) {
  const client = requireSupabase()
  const { error } = await client
    .from('prompts')
    .update({
      title: prompt.title,
      category: prompt.category,
      full_text: prompt.fullText,
      sort_order: prompt.sortOrder,
    })
    .eq('id', promptId)
  if (error) {
    if (!isMissingSortOrderError(error)) throw error

    const fallback = await client
      .from('prompts')
      .update({
        title: prompt.title,
        category: prompt.category,
        full_text: prompt.fullText,
      })
      .eq('id', promptId)
    if (fallback.error) throw fallback.error
  }
}

export async function deletePromptRecord(promptId: string) {
  const client = requireSupabase()
  const { error } = await client.from('prompts').delete().eq('id', promptId)
  if (error) throw error
}

function mapPromptRow(row: PromptRow): Prompt {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    fullText: row.full_text,
    sortOrder: row.sort_order ?? 0,
  }
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase non configurato')
  return supabase
}

function isMissingSortOrderError(error: { code?: string; message?: string; details?: string | null; hint?: string | null }) {
  const message = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase()
  return error.code === '42703' || message.includes('sort_order')
}
