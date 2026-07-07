'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, SearchIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ROUND_TYPES, COUNTRIES, US_STATES, CA_PROVINCES, INDUSTRIES, SORT_OPTIONS } from '@/lib/constants'

const STORAGE_KEY = 'dashboard-filters'

const HEADCOUNT_RANGES = [
  { value: '1-10', label: '1-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '501', label: '500+' },
]

function saveFiltersToStorage(params: URLSearchParams) {
  if (params.toString()) {
    localStorage.setItem(STORAGE_KEY, params.toString())
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

function loadFiltersFromStorage(): URLSearchParams | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? new URLSearchParams(saved) : null
  } catch {
    return null
  }
}

interface FilterState {
  country: string
  state: string
  city: string
  metro: string
  industry: string
  roundType: string
  minAmount: string
  maxAmount: string
  headcount: string
  hiringNow: boolean
  sortBy: string
  search: string
}

function buildParams(s: FilterState, lockedCountry?: string): URLSearchParams {
  const params = new URLSearchParams()
  if (s.search) params.set('search', s.search)
  const effectiveCountry = lockedCountry || (s.country !== 'all' ? s.country : undefined)
  if (effectiveCountry) params.set('country', effectiveCountry)
  if (s.state && s.state !== 'all') params.set('state', s.state)
  if (s.metro) params.set('metro', s.metro)
  else if (s.city) params.set('city', s.city)
  if (s.industry && s.industry !== 'all') params.set('industry', s.industry)
  if (s.roundType && s.roundType !== 'all') params.set('roundType', s.roundType)
  if (s.minAmount) params.set('minAmount', s.minAmount)
  if (s.maxAmount) params.set('maxAmount', s.maxAmount)
  if (s.headcount) params.set('headcount', s.headcount)
  if (s.hiringNow) params.set('hiringNow', 'true')
  if (s.sortBy !== 'newest') params.set('sortBy', s.sortBy)
  return params
}

interface MetroAreaOption {
  id: string
  label: string
  count: number
}

export function FundingFilters({ lockedCountry }: { lockedCountry?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const restored = useRef(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasParamsOnMount = !!searchParams.toString()

  // On mount: if URL has no filters, restore from localStorage
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    if (!searchParams.toString()) {
      const saved = loadFiltersFromStorage()
      if (saved && saved.toString()) {
        router.replace(`/dashboard?${saved.toString()}`)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [country, setCountry] = useState(searchParams.get('country') || 'all')
  const [state, setState] = useState(searchParams.get('state') || 'all')
  const [city, setCity] = useState(searchParams.get('city') || '')
  const [metro, setMetro] = useState(searchParams.get('metro') || '')
  const [industry, setIndustry] = useState(searchParams.get('industry') || 'all')
  const [roundType, setRoundType] = useState(searchParams.get('roundType') || 'all')
  const [minAmount, setMinAmount] = useState(searchParams.get('minAmount') || '')
  const [maxAmount, setMaxAmount] = useState(searchParams.get('maxAmount') || '')
  const [hiringNow, setHiringNow] = useState(searchParams.get('hiringNow') === 'true')
  const [headcount, setHeadcount] = useState(searchParams.get('headcount') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'newest')
  const [metroAreas, setMetroAreas] = useState<MetroAreaOption[]>([])
  const [isExpanded, setIsExpanded] = useState(!hasParamsOnMount)

  const stateOptions = country === 'US' ? US_STATES : country === 'CA' ? CA_PROVINCES : []

  // Fetch metro areas on mount
  useEffect(() => {
    async function fetchMetroAreas() {
      try {
        const res = await fetch('/api/metro-areas')
        if (res.ok) {
          const data = await res.json()
          setMetroAreas(data.metros || [])
        }
      } catch {
        // Silently fail
      }
    }
    fetchMetroAreas()
  }, [])

  const currentState = (): FilterState => ({
    search, country, state, city, metro, industry, roundType,
    minAmount, maxAmount, headcount, hiringNow, sortBy,
  })

  // Search: debounce auto-apply on every keystroke
  function handleSearchChange(value: string) {
    setSearch(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      const params = buildParams({
        search: value, country, state, city, metro, industry, roundType,
        minAmount, maxAmount, headcount, hiringNow, sortBy,
      }, lockedCountry)
      saveFiltersToStorage(params)
      router.push(`${window.location.pathname}?${params.toString()}`)
    }, 400)
  }

  const applyFilters = useCallback(() => {
    const params = buildParams(currentState(), lockedCountry)
    saveFiltersToStorage(params)
    setIsExpanded(false)
    router.push(`${window.location.pathname}?${params.toString()}`)
  }, [router, search, country, state, city, metro, headcount, industry, roundType, minAmount, maxAmount, hiringNow, sortBy]) // eslint-disable-line react-hooks/exhaustive-deps

  const clearFilters = useCallback(() => {
    setSearch('')
    setCountry('all')
    setState('all')
    setCity('')
    setMetro('')
    setIndustry('all')
    setRoundType('all')
    setMinAmount('')
    setMaxAmount('')
    setHeadcount('')
    setHiringNow(false)
    setSortBy('newest')
    localStorage.removeItem(STORAGE_KEY)
    setIsExpanded(true)
    router.push(window.location.pathname)
  }, [router])

  // Remove a single filter and immediately apply
  function removeFilter(key: keyof FilterState) {
    const next: FilterState = { ...currentState() }
    switch (key) {
      case 'search': next.search = ''; break
      case 'country': next.country = 'all'; next.state = 'all'; break
      case 'state': next.state = 'all'; break
      case 'city': next.city = ''; break
      case 'metro': next.metro = ''; break
      case 'industry': next.industry = 'all'; break
      case 'roundType': next.roundType = 'all'; break
      case 'minAmount': next.minAmount = ''; break
      case 'maxAmount': next.maxAmount = ''; break
      case 'headcount': next.headcount = ''; break
      case 'hiringNow': next.hiringNow = false; break
      case 'sortBy': next.sortBy = 'newest'; break
    }
    // Sync React state
    setSearch(next.search)
    setCountry(next.country)
    setState(next.state)
    setCity(next.city)
    setMetro(next.metro)
    setIndustry(next.industry)
    setRoundType(next.roundType)
    setMinAmount(next.minAmount)
    setMaxAmount(next.maxAmount)
    setHeadcount(next.headcount)
    setHiringNow(next.hiringNow)
    setSortBy(next.sortBy)
    const params = buildParams(next, lockedCountry)
    saveFiltersToStorage(params)
    router.push(`${window.location.pathname}?${params.toString()}`)
  }

  // Build the active filter chips list
  const activeFilters: { key: keyof FilterState; label: string }[] = []
  if (search) {
    activeFilters.push({ key: 'search', label: `Search: "${search}"` })
  }
  if (country !== 'all') {
    const label = COUNTRIES.find((c) => c.value === country)?.label || country
    activeFilters.push({ key: 'country', label: `Country: ${label}` })
  }
  if (state !== 'all') {
    const opts = country === 'US' ? US_STATES : CA_PROVINCES
    const label = opts.find((s) => s.value === state)?.label || state
    const stateLabel = (lockedCountry === 'CA' || country === 'CA') ? 'Province' : 'State'
    activeFilters.push({ key: 'state', label: `${stateLabel}: ${label}` })
  }
  if (metro) {
    const label = metroAreas.find((m) => m.id === metro)?.label || metro
    activeFilters.push({ key: 'metro', label: `Metro: ${label}` })
  } else if (city) {
    activeFilters.push({ key: 'city', label: `City: ${city}` })
  }
  if (industry !== 'all') {
    const label = INDUSTRIES.find((i) => i.value === industry)?.label || industry
    activeFilters.push({ key: 'industry', label: `Industry: ${label}` })
  }
  if (roundType !== 'all') {
    const label = ROUND_TYPES.find((r) => r.value === roundType)?.label || roundType
    activeFilters.push({ key: 'roundType', label: `Round: ${label}` })
  }
  if (minAmount) {
    activeFilters.push({ key: 'minAmount', label: `Min: $${Number(minAmount).toLocaleString('en-US')}` })
  }
  if (maxAmount) {
    activeFilters.push({ key: 'maxAmount', label: `Max: $${Number(maxAmount).toLocaleString('en-US')}` })
  }
  if (headcount) {
    const label = HEADCOUNT_RANGES.find((r) => r.value === headcount)?.label || headcount
    activeFilters.push({ key: 'headcount', label: `Employees: ${label}` })
  }
  if (hiringNow) {
    activeFilters.push({ key: 'hiringNow', label: 'Hiring Now' })
  }
  if (sortBy !== 'newest') {
    const label = SORT_OPTIONS.find((s) => s.value === sortBy)?.label || sortBy
    activeFilters.push({ key: 'sortBy', label: `Sort: ${label}` })
  }

  return (
    <div className="space-y-2">
      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        {/* Search — always visible */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search companies by name..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Header — always visible */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            suppressHydrationWarning
            className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors"
          >
            Filters
            {isExpanded
              ? <ChevronUpIcon className="h-4 w-4" />
              : <ChevronDownIcon className="h-4 w-4" />}
          </button>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>

        {/* Collapsible controls */}
        {isExpanded && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {!lockedCountry && (
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={country} onValueChange={(v) => { setCountry(v); setState('all') }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>State/Province</Label>
                <Select value={state} onValueChange={setState} disabled={country === 'all'}>
                  <SelectTrigger>
                    <SelectValue placeholder="All states" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All states</SelectItem>
                    {stateOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>City / Metro Area</Label>
                {metroAreas.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {metroAreas.map((area) => (
                      <button
                        key={area.id}
                        type="button"
                        suppressHydrationWarning
                        onClick={() => {
                          if (metro === area.id) { setMetro('') }
                          else { setMetro(area.id); setCity('') }
                        }}
                        className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                          metro === area.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        {area.label} ({area.count.toLocaleString('en-US')})
                      </button>
                    ))}
                  </div>
                )}
                <Input
                  placeholder="Or type a city name..."
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setMetro('') }}
                />
              </div>

              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="All industries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All industries</SelectItem>
                    {INDUSTRIES.map((i) => (
                      <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Employees</Label>
                <div className="flex flex-wrap gap-2">
                  {HEADCOUNT_RANGES.map((range) => (
                    <button
                      key={range.value}
                      type="button"
                      suppressHydrationWarning
                      onClick={() => setHeadcount(headcount === range.value ? '' : range.value)}
                      className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                        headcount === range.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Round Type</Label>
                <Select value={roundType} onValueChange={setRoundType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All rounds" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All rounds</SelectItem>
                    {ROUND_TYPES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Min Amount ($)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Amount ($)</Label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hiringNow"
                  checked={hiringNow}
                  onCheckedChange={(checked) => setHiringNow(!!checked)}
                />
                <Label htmlFor="hiringNow" className="cursor-pointer">
                  Hiring Now (jobs posted in last 30 days)
                </Label>
              </div>
              <Button onClick={applyFilters}>Apply Filters</Button>
            </div>
          </>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
            >
              {f.label}
              <button
                type="button"
                onClick={() => removeFilter(f.key)}
                className="ml-0.5 rounded-full hover:bg-primary/20 transition-colors p-0.5"
                aria-label={`Remove ${f.label} filter`}
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
