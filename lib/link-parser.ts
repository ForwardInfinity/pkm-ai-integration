/**
 * Link Parser Utility
 * Extracts and parses wikilinks from markdown content
 */

export interface ParsedWikiLink {
  title: string
  displayText: string | null
  fullMatch: string
  startIndex: number
  endIndex: number
}

/**
 * Extracts all wikilinks from markdown content
 * Supports both [[Title]] and [[Title|Display Text]] formats
 */
export function extractWikiLinks(markdown: string): ParsedWikiLink[] {
  const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
  const links: ParsedWikiLink[] = []
  let match

  while ((match = regex.exec(markdown)) !== null) {
    links.push({
      title: match[1].trim(),
      displayText: match[2]?.trim() || null,
      fullMatch: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  return links
}

/**
 * Extracts unique link titles from markdown content
 */
export function extractUniqueLinkTitles(markdown: string): string[] {
  const links = extractWikiLinks(markdown)
  const uniqueTitles = new Set(links.map((link) => link.title))
  return Array.from(uniqueTitles)
}

/**
 * Checks if a markdown string contains any wikilinks
 */
export function hasWikiLinks(markdown: string): boolean {
  return /\[\[[^\]]+\]\]/.test(markdown)
}

/**
 * Replaces wikilinks in markdown with a custom format
 */
export function replaceWikiLinks(
  markdown: string,
  replacer: (link: ParsedWikiLink) => string
): string {
  const links = extractWikiLinks(markdown)
  
  // Sort by startIndex descending to replace from end to start
  // This prevents index shifting issues
  const sortedLinks = [...links].sort((a, b) => b.startIndex - a.startIndex)
  
  let result = markdown
  for (const link of sortedLinks) {
    result =
      result.slice(0, link.startIndex) +
      replacer(link) +
      result.slice(link.endIndex)
  }
  
  return result
}

/**
 * Converts wikilinks to standard markdown links
 */
export function wikiLinksToMarkdownLinks(
  markdown: string,
  titleToUrl: (title: string) => string
): string {
  return replaceWikiLinks(markdown, (link) => {
    const displayText = link.displayText || link.title
    const url = titleToUrl(link.title)
    return `[${displayText}](${url})`
  })
}
