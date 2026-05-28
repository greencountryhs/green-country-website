/** Merge per-row checklist inputs and optional multiline paste box into one array. */
export function mergeChecklistInputs(rowItems: string[], bulkText: string): string[] {
    const fromRows = rowItems.map((line) => line.trim()).filter(Boolean)
    const fromBulk = bulkText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    return [...fromRows, ...fromBulk]
}
