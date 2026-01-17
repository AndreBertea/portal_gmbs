import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string to French locale
 */
export function formatDate(dateStr: string | null, options?: {
  withTime?: boolean
  short?: boolean
}): string {
  if (!dateStr) return "—"
  
  try {
    const date = new Date(dateStr)
    
    if (options?.short) {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short"
      }).format(date)
    }
    
    if (options?.withTime) {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date)
    }
    
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date)
  } catch {
    return dateStr
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + "..."
}
