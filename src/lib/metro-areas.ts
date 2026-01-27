/**
 * Metro area mappings for city filtering.
 *
 * Many YC companies have state data but no city data.
 * Metro areas match by city name OR by state fallback
 * (when the state only has one major startup hub).
 *
 * For states with multiple hubs (e.g., CA has SF and LA),
 * state-only fallback is not used to avoid mixing metros.
 */

export interface MetroArea {
  id: string
  label: string
  cities: string[]
  /** If set, also match companies with this state and no city */
  stateFallback?: string
}

export const METRO_AREAS: MetroArea[] = [
  {
    id: 'san-francisco',
    label: 'San Francisco',
    cities: ['San Francisco', 'Palo Alto', 'Mountain View', 'Sunnyvale', 'San Jose', 'Menlo Park', 'Redwood City', 'Santa Clara', 'San Mateo', 'Oakland', 'Berkeley', 'Fremont'],
    // No state fallback — CA has multiple metros (SF + LA)
  },
  {
    id: 'new-york',
    label: 'New York',
    cities: ['New York', 'Brooklyn', 'Manhattan', 'NYC', 'Jersey City', 'Hoboken'],
    stateFallback: 'NY',
  },
  {
    id: 'los-angeles',
    label: 'Los Angeles',
    cities: ['Los Angeles', 'Santa Monica', 'Pasadena', 'Long Beach', 'Burbank', 'Culver City', 'Venice'],
    // No state fallback — CA has multiple metros
  },
  {
    id: 'boston',
    label: 'Boston',
    cities: ['Boston', 'Cambridge', 'Somerville', 'Brookline'],
    stateFallback: 'MA',
  },
  {
    id: 'chicago',
    label: 'Chicago',
    cities: ['Chicago', 'Evanston'],
    stateFallback: 'IL',
  },
  {
    id: 'seattle',
    label: 'Seattle',
    cities: ['Seattle', 'Bellevue', 'Redmond', 'Kirkland'],
    stateFallback: 'WA',
  },
  {
    id: 'austin',
    label: 'Austin',
    cities: ['Austin', 'Round Rock', 'Cedar Park'],
    stateFallback: 'TX',
  },
  {
    id: 'denver',
    label: 'Denver',
    cities: ['Denver', 'Boulder', 'Aurora'],
    stateFallback: 'CO',
  },
  {
    id: 'miami',
    label: 'Miami',
    cities: ['Miami', 'Fort Lauderdale', 'Miami Beach', 'Coral Gables'],
    stateFallback: 'FL',
  },
]

export function getMetroArea(id: string): MetroArea | undefined {
  return METRO_AREAS.find((m) => m.id === id)
}

/**
 * Build a Prisma OR condition for matching companies in a metro area.
 * Matches by city names (contains) OR state fallback (when city is null).
 */
export function buildMetroAreaFilter(metro: MetroArea): Record<string, unknown> {
  const conditions: Record<string, unknown>[] = metro.cities.map((city) => ({
    city: { contains: city },
  }))

  if (metro.stateFallback) {
    conditions.push({
      state: metro.stateFallback,
      city: null,
    })
  }

  return { OR: conditions }
}
