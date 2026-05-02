export function parseMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_.-]+)/g) ?? []
  return matches.map((m) => m.slice(1))
}

export function renderMentions(text: string, profiles: { id: string; full_name: string }[]): string {
  const nameMap = Object.fromEntries(profiles.map((p) => [p.id, p.full_name]))
  return text.replace(/@([a-f0-9-]{36})/g, (_, id) =>
    nameMap[id] ? `@${nameMap[id]}` : `@${id}`
  )
}
