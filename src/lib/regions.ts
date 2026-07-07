export type RegionId = 'canada' | 'us'

export interface CityConfig {
  id: string
  label: string
  description: string
  // For Canada: maps to state (province)
  state?: string
  // For US: maps to city query param
  city?: string
}

export interface RegionConfig {
  id: RegionId
  label: string
  country: string
  flag: string
  cities: CityConfig[]
}

export const REGIONS: Record<RegionId, RegionConfig> = {
  canada: {
    id: 'canada',
    label: 'Canada',
    country: 'CA',
    flag: '🇨🇦',
    cities: [
      { id: 'toronto', label: 'Toronto', description: 'Greater Toronto Area', state: 'ON' },
      { id: 'vancouver', label: 'Vancouver', description: 'Metro Vancouver', state: 'BC' },
      { id: 'montreal', label: 'Montréal', description: 'Greater Montréal', state: 'QC' },
      { id: 'calgary', label: 'Calgary', description: 'Calgary & area', state: 'AB' },
    ],
  },
  us: {
    id: 'us',
    label: 'United States',
    country: 'US',
    flag: '🇺🇸',
    cities: [
      { id: 'sf', label: 'San Francisco', description: 'Bay Area', city: 'San Francisco' },
      { id: 'nyc', label: 'New York', description: 'NYC Metro', city: 'New York' },
      { id: 'austin', label: 'Austin', description: 'Austin & area', city: 'Austin' },
      { id: 'boston', label: 'Boston', description: 'Greater Boston', city: 'Boston' },
      { id: 'la', label: 'Los Angeles', description: 'LA Metro', city: 'Los Angeles' },
      { id: 'seattle', label: 'Seattle', description: 'Seattle & area', city: 'Seattle' },
    ],
  },
}

export interface RegionPreference {
  region: RegionId
  city: string
}

export const REGION_PREF_KEY = 'region-preference'

/** Maps a city selection to URL query params for the funding feed */
export function getCityParams(region: RegionId, cityId: string): Record<string, string> {
  const regionConfig = REGIONS[region]
  const cityConfig = regionConfig.cities.find((c) => c.id === cityId)
  if (!cityConfig) return {}
  if (cityConfig.state) return { state: cityConfig.state }
  if (cityConfig.city) return { city: cityConfig.city }
  return {}
}

/** Builds the feed URL for a region + city selection */
export function getRegionFeedUrl(region: RegionId, cityId: string): string {
  const params = getCityParams(region, cityId)
  const qs = new URLSearchParams(params).toString()
  return `/dashboard/${region}${qs ? `?${qs}` : ''}`
}

/** Finds a city config by its param value (state or city string) */
export function findCityByParam(region: RegionId, params: Record<string, string | undefined>): CityConfig | undefined {
  const cities = REGIONS[region].cities
  return cities.find((c) => {
    if (c.state && params.state === c.state) return true
    if (c.city && params.city === c.city) return true
    return false
  })
}
