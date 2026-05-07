import { supabase } from '../../lib/supabase'
import type { Prompt, PromptCategory } from '../../types/app'

type PromptRow = {
  id: string
  title: string
  category: PromptCategory
  full_text: string
}

export async function fetchPrompts() {
  const client = requireSupabase()
  const { data, error } = await client.from('prompts').select('id, title, category, full_text').order('created_at', { ascending: true })
  if (error) throw error

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
    })
    .select('id, title, category, full_text')
    .single()
  if (error) throw error

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
    })
    .eq('id', promptId)
  if (error) throw error
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
  }
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase non configurato')
  return supabase
}
