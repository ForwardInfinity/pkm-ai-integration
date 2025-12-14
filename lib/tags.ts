/**
 * Tag extraction utilities for Refinery notes
 *
 * Extracts #hashtag patterns from markdown content while
 * excluding tags inside code blocks and URLs.
 */

/**
 * Extract all hashtags from markdown content
 *
 * Rules:
 * - Tags must start with # followed by a letter
 * - Tags can contain letters, numbers, underscores, and hyphens
 * - Tags are case-insensitive (normalized to lowercase)
 * - Tags inside code blocks (``` or `) are excluded
 * - Tags in URLs are excluded
 * - Duplicate tags are removed
 *
 * @param markdown - The markdown content to extract tags from
 * @returns Array of unique, lowercase tag names (without the # prefix)
 */
export function extractTagsFromMarkdown(markdown: string): string[] {
  if (!markdown) return []

  // Remove fenced code blocks (```...```)
  let cleaned = markdown.replace(/```[\s\S]*?```/g, '')

  // Remove inline code (`...`)
  cleaned = cleaned.replace(/`[^`]+`/g, '')

  // Remove URLs to avoid matching anchors like example.com#section
  cleaned = cleaned.replace(/https?:\/\/[^\s)>\]]+/g, '')

  // Match hashtags: # at start or after whitespace, followed by letter, then alphanumeric/underscore/hyphen
  const hashtagRegex = /(?:^|[\s])#([a-zA-Z][a-zA-Z0-9_-]*)/g
  const tags = new Set<string>()

  let match
  while ((match = hashtagRegex.exec(cleaned)) !== null) {
    tags.add(match[1].toLowerCase())
  }

  return Array.from(tags).sort()
}

/**
 * Check if a string is a valid tag name
 *
 * @param tag - The tag name to validate (without # prefix)
 * @returns true if the tag is valid
 */
export function isValidTagName(tag: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(tag)
}

/**
 * Normalize a tag name to lowercase
 *
 * @param tag - The tag name to normalize
 * @returns Lowercase tag name
 */
export function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim()
}

/**
 * Format a tag for display (with # prefix)
 *
 * @param tag - The tag name
 * @returns Tag with # prefix
 */
export function formatTag(tag: string): string {
  return `#${tag}`
}
