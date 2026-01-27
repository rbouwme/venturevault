'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
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

interface MetroAreaOption {
  id: string
  label: string
  count: number
}

export function FundingFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [country, setCountry] = useState(searchParams.get('country') || 'all')
  const [state, setState] = useState(searchParams.get('state') || 'all')
  const [city, setCity] = useState(searchParams.get('city') || '')
  const [metro, setMetro] = useState(searchParams.get('metro') || '')
  const [industry, setIndustry] = useState(searchParams.get('industry') || 'all')
  const [roundType, setRoundType] = useState(searchParams.get('roundType') || 'all')
  const [minAmount, setMinAmount] = useState(searchParams.get('minAmount') || '')
  const [maxAmount, setMaxAmount] = useState(searchParams.get('maxAmount') || '')
  const [hiringNow, setHiringNow] = useState(searchParams.get('hiringNow') === 'true')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'newest')
  const [metroAreas, setMetroAreas] = useState<MetroAreaOption[]>([])

  const stateOptions = country === 'US' ? US_STATES : country === 'CA' ? CA_PROVINCES : []

  // Fetch metro areas with counts on mount
  useEffect(() => {
    async function fetchMetroAreas() {
      try {
        const res = await fetch('/api/metro-areas')
        if (res.ok) {
          const data = await res.json()
          setMetroAreas(data.metros || [])
        }
      } catch {
        // Silently fail - buttons just won't show
      }
    }
    fetchMetroAreas()
  }, [])

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams()
    if (country && country !== 'all') params.set('country', country)
    if (state && state !== 'all') params.set('state', state)
    if (metro) params.set('metro', metro)
    else if (city) params.set('city', city)
    if (industry && industry !== 'all') params.set('industry', industry)
    if (roundType && roundType !== 'all') params.set('roundType', roundType)
    if (minAmount) params.set('minAmount', minAmount)
    if (maxAmount) params.set('maxAmount', maxAmount)
    if (hiringNow) params.set('hiringNow', 'true')
    if (sortBy !== 'newest') params.set('sortBy', sortBy)

    router.push(`/dashboard?${params.toString()}`)
  }, [router, country, state, city, metro, industry, roundType, minAmount, maxAmount, hiringNow, sortBy])

  const clearFilters = useCallback(() => {
    setCountry('all')
    setState('all')
    setCity('')
    setMetro('')
    setIndustry('all')
    setRoundType('all')
    setMinAmount('')
    setMaxAmount('')
    setHiringNow(false)
    setSortBy('newest')
    router.push('/dashboard')
  }, [router])

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Filters</h2>
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Clear all
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Country</Label>
          <Select value={country} onValueChange={(v) => { setCountry(v); setState('all') }}>
            <SelectTrigger>
              <SelectValue placeholder="All countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>State/Province</Label>
          <Select value={state} onValueChange={setState} disabled={country === 'all'}>
            <SelectTrigger>
              <SelectValue placeholder="All states" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              {stateOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
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
                  onClick={() => {
                    if (metro === area.id) {
                      setMetro('')
                    } else {
                      setMetro(area.id)
                      setCity('')
                    }
                  }}
                  className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                    metro === area.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                  }`}
                  suppressHydrationWarning
                >
                  {area.label} ({area.count.toLocaleString()})
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
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
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
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
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
    </div>
  )
}
