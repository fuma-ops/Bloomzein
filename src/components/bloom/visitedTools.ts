const VISITED_TOOLS_KEY = "bloomzein_visited_tools";

export function getVisitedTools(): string[] {
  try {
    const raw = localStorage.getItem(VISITED_TOOLS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isToolVisited(slug: string): boolean {
  return getVisitedTools().includes(slug);
}

export function markToolVisited(slug: string): void {
  try {
    const visited = getVisitedTools();
    if (!visited.includes(slug)) {
      localStorage.setItem(VISITED_TOOLS_KEY, JSON.stringify([...visited, slug]));
    }
  } catch {}
}
