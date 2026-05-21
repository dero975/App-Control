export function readPinnedRecordIds(storageKey: string) {
  if (typeof window === 'undefined') return []

  try {
    const parsedValue = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]')
    if (!Array.isArray(parsedValue)) return []
    return parsedValue.filter((value): value is string => typeof value === 'string' && value.length > 0)
  } catch {
    return []
  }
}

export function writePinnedRecordIds(storageKey: string, recordIds: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(recordIds))
}

export function getNextPinnedRecordIds(currentRecordIds: string[], recordId: string) {
  if (currentRecordIds.includes(recordId)) {
    return currentRecordIds.filter((currentRecordId) => currentRecordId !== recordId)
  }

  return [recordId, ...currentRecordIds]
}

export function sortPinnedRecordsFirst<TRecord extends { id: string }>(records: TRecord[], pinnedRecordIds: string[]) {
  if (!pinnedRecordIds.length) return records

  const pinnedRecordIdSet = new Set(pinnedRecordIds)
  const pinnedRecords: TRecord[] = []
  const regularRecords: TRecord[] = []

  records.forEach((record) => {
    if (pinnedRecordIdSet.has(record.id)) {
      pinnedRecords.push(record)
      return
    }

    regularRecords.push(record)
  })

  return [...pinnedRecords, ...regularRecords]
}

export function sortPinnedRecordIdsFirst(recordIds: string[], pinnedRecordIds: string[]) {
  return sortPinnedRecordsFirst(recordIds.map((id) => ({ id })), pinnedRecordIds).map((record) => record.id)
}
