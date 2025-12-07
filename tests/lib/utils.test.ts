import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn utility', () => {
  it('should merge class names', () => {
    const result = cn('text-red-500', 'bg-blue-500')
    expect(result).toBe('text-red-500 bg-blue-500')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const result = cn('base-class', isActive && 'active-class')
    expect(result).toBe('base-class active-class')
  })

  it('should filter out falsy values', () => {
    const result = cn('base-class', false, undefined, null, '', 'valid-class')
    expect(result).toBe('base-class valid-class')
  })

  it('should merge conflicting Tailwind classes', () => {
    // twMerge should keep the last conflicting class
    const result = cn('p-4', 'p-2')
    expect(result).toBe('p-2')
  })

  it('should merge conflicting text colors', () => {
    const result = cn('text-red-500', 'text-blue-500')
    expect(result).toBe('text-blue-500')
  })

  it('should handle array of classes', () => {
    const result = cn(['class-1', 'class-2'])
    expect(result).toBe('class-1 class-2')
  })

  it('should handle object syntax', () => {
    const result = cn({
      'active-class': true,
      'disabled-class': false,
    })
    expect(result).toBe('active-class')
  })

  it('should handle mixed inputs', () => {
    const result = cn(
      'base',
      ['array-class'],
      { 'object-class': true },
      undefined,
      'final'
    )
    expect(result).toBe('base array-class object-class final')
  })

  it('should handle empty inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should properly merge responsive classes', () => {
    const result = cn('md:text-lg', 'md:text-xl')
    expect(result).toBe('md:text-xl')
  })

  it('should preserve different variant classes', () => {
    const result = cn('hover:bg-blue-500', 'focus:bg-green-500')
    expect(result).toBe('hover:bg-blue-500 focus:bg-green-500')
  })
})
