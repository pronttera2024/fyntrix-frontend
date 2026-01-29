/**
 * Top Picks Cache Manager
 * 
 * Implements smart caching for top-picks to improve UX:
 * - localStorage persistence across sessions
 * - Mode-specific cache keys
 * - Automatic stale cache invalidation
 * - Cache age tracking
 */

import { isWithinLastTradingSessionIst, isWithinTodayIst } from './time'

const CACHE_KEY_PREFIX = 'fyntrix_top_picks'

export interface TopPicksCacheEntry {
  picks: any[]
  as_of: string
  universe: string
  mode: string
  generated_at?: string
  cached?: boolean
  cache_age_seconds?: number
  last_updated?: string
}

/**
 * Generate cache key for universe + mode combination
 */
function getCacheKey(universe: string, mode: string): string {
  return `${CACHE_KEY_PREFIX}_${universe.toLowerCase()}_${mode.toLowerCase()}`
}

/**
 * Save top picks to localStorage cache
 */
export function saveTopPicksToCache(
  universe: string,
  mode: string,
  data: any
): void {
  try {
    const cacheEntry: TopPicksCacheEntry = {
      picks: data.picks || [],
      as_of: data.generated_at || data.as_of || new Date().toISOString(),
      universe,
      mode,
      generated_at: data.generated_at,
      cached: data.cached,
      cache_age_seconds: data.cache_age_seconds,
      last_updated: data.last_updated,
    }

    const key = getCacheKey(universe, mode)
    localStorage.setItem(key, JSON.stringify(cacheEntry))
    
    console.log(`✓ Cached ${cacheEntry.picks.length} picks for ${universe}/${mode}`)
  } catch (error) {
    console.warn('Failed to save top picks to cache:', error)
  }
}

/**
 * Load top picks from localStorage cache
 * Returns null if cache is invalid or stale
 */
export function loadTopPicksFromCache(
  universe: string,
  mode: string,
  isMarketOpen: boolean
): TopPicksCacheEntry | null {
  try {
    const key = getCacheKey(universe, mode)
    const cached = localStorage.getItem(key)
    
    if (!cached) {
      return null
    }

    const entry: TopPicksCacheEntry = JSON.parse(cached)

    // Validate cache structure
    if (!entry.picks || !entry.as_of || entry.universe !== universe || entry.mode !== mode) {
      console.warn(`Invalid cache structure for ${universe}/${mode}`)
      clearTopPicksCache(universe, mode)
      return null
    }

    // Check if cache is fresh
    const isFresh = isMarketOpen 
      ? isWithinTodayIst(entry.as_of)
      : isWithinLastTradingSessionIst(entry.as_of)

    if (!isFresh) {
      console.log(`Cache expired for ${universe}/${mode}`)
      clearTopPicksCache(universe, mode)
      return null
    }

    // Calculate cache age
    const cacheAgeMs = Date.now() - new Date(entry.as_of).getTime()
    const cacheAgeMinutes = Math.floor(cacheAgeMs / 60000)

    console.log(`✓ Loaded ${entry.picks.length} picks from cache (${cacheAgeMinutes}m old)`)
    
    return entry
  } catch (error) {
    console.warn('Failed to load top picks from cache:', error)
    return null
  }
}

/**
 * Check if cache needs refresh based on age and mode
 */
export function shouldRefreshCache(
  cacheEntry: TopPicksCacheEntry | null,
  mode: string,
  isMarketOpen: boolean
): boolean {
  if (!cacheEntry || !cacheEntry.as_of) {
    return true
  }

  // Don't refresh outside market hours
  if (!isMarketOpen) {
    return false
  }

  try {
    const cacheAgeMs = Date.now() - new Date(cacheEntry.as_of).getTime()
    const cacheAgeMinutes = cacheAgeMs / 60000

    // Mode-specific staleness thresholds
    const staleThresholds: Record<string, number> = {
      'Scalping': 10,    // 10 minutes
      'Intraday': 30,    // 30 minutes
      'Swing': 60,       // 1 hour
      'Options': 30,     // 30 minutes
      'Futures': 30,     // 30 minutes
    }

    const threshold = staleThresholds[mode] || 60

    if (cacheAgeMinutes > threshold) {
      console.log(`Cache stale for ${mode} (${cacheAgeMinutes.toFixed(1)}m > ${threshold}m)`)
      return true
    }

    return false
  } catch (error) {
    console.warn('Error checking cache staleness:', error)
    return true
  }
}

/**
 * Clear cache for specific universe + mode
 */
export function clearTopPicksCache(universe: string, mode: string): void {
  try {
    const key = getCacheKey(universe, mode)
    localStorage.removeItem(key)
    console.log(`✓ Cleared cache for ${universe}/${mode}`)
  } catch (error) {
    console.warn('Failed to clear cache:', error)
  }
}

/**
 * Clear all top picks caches
 */
export function clearAllTopPicksCaches(): void {
  try {
    const keys = Object.keys(localStorage)
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX))
    
    cacheKeys.forEach(key => localStorage.removeItem(key))
    console.log(`✓ Cleared ${cacheKeys.length} top picks caches`)
  } catch (error) {
    console.warn('Failed to clear all caches:', error)
  }
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): Record<string, any> {
  try {
    const keys = Object.keys(localStorage)
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX))
    
    const stats = cacheKeys.map(key => {
      try {
        const entry: TopPicksCacheEntry = JSON.parse(localStorage.getItem(key) || '{}')
        const cacheAgeMs = Date.now() - new Date(entry.as_of).getTime()
        const cacheAgeMinutes = Math.floor(cacheAgeMs / 60000)
        
        return {
          key,
          universe: entry.universe,
          mode: entry.mode,
          picks_count: entry.picks?.length || 0,
          age_minutes: cacheAgeMinutes,
          as_of: entry.as_of,
        }
      } catch {
        return null
      }
    }).filter(Boolean)

    return {
      total_caches: cacheKeys.length,
      caches: stats,
    }
  } catch (error) {
    console.warn('Failed to get cache stats:', error)
    return { total_caches: 0, caches: [] }
  }
}
