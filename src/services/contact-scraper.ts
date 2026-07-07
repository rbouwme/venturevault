import * as cheerio from 'cheerio'

export interface ScrapedContact {
  name: string
  title?: string
  email?: string
  role?: string
  confidence?: number // 0-1 confidence score
  source?: string // 'website' | 'yc' | 'github' | 'pattern'
}

// Common paths to check for team/about pages
const TEAM_PAGE_PATHS = [
  '/team',
  '/about',
  '/about-us',
  '/leadership',
  '/our-team',
  '/company',
  '/people',
  '/about/team',
]

// Keywords that indicate executive/founder roles
const EXECUTIVE_KEYWORDS = [
  'founder',
  'co-founder',
  'ceo',
  'chief executive',
  'cto',
  'chief technology',
  'cfo',
  'chief financial',
  'coo',
  'chief operating',
  'president',
  'vp',
  'vice president',
  'head of',
]

// Extract email from text using regex
function extractEmail(text: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const matches = text.match(emailRegex)
  return matches ? matches[0] : null
}

// Check if a title indicates an executive role
function isExecutiveRole(title: string): boolean {
  const lowerTitle = title.toLowerCase()
  return EXECUTIVE_KEYWORDS.some(keyword => lowerTitle.includes(keyword))
}

// Try to find team page URL
async function findTeamPage(domain: string): Promise<string | null> {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`

  // Try each common path
  for (const path of TEAM_PAGE_PATHS) {
    const url = `${baseUrl}${path}`
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      if (response.ok) {
        return url
      }
    } catch (error) {
      // Continue to next path
      continue
    }
  }

  return null
}

// Scrape contacts from a page
function scrapeContactsFromHtml(html: string): ScrapedContact[] {
  const $ = cheerio.load(html)
  const contacts: ScrapedContact[] = []
  const seen = new Set<string>()

  function addContact(name: string, title?: string, email?: string) {
    if (!name || name.length <= 2 || name.length >= 50) return
    if (!looksLikePersonName(name)) return
    const key = name.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    contacts.push({
      name,
      title: title || undefined,
      email: email || undefined,
      role: title ? (isExecutiveRole(title) ? 'executive' : undefined) : undefined,
    })
  }

  // Strategy 1: Find heading elements (h2-h4) that look like person names
  // Then check sibling elements for title and email
  $('h2, h3, h4').each((_, elem) => {
    const name = $(elem).text().trim()
    if (!looksLikePersonName(name)) return

    // Check sibling elements for title and email
    let title = ''
    let email: string | null = null
    $(elem).siblings('div, p, span').each((_, sib) => {
      const text = $(sib).text().trim()
      if (!title && text.length > 2 && text.length < 60) {
        // Check if it looks like a title/role
        if (EXECUTIVE_KEYWORDS.some(kw => text.toLowerCase().includes(kw)) ||
            text.match(/^(Director|Manager|Lead|Engineer|Designer|Analyst|Associate|Partner|Advisor)/i)) {
          title = text
        }
      }
      if (!email) {
        email = extractEmail(text)
      }
    })

    addContact(name, title, email || undefined)
  })

  // Strategy 2: Look for common team member card structures
  $('[class*="team"], [class*="member"], [class*="person"], [class*="employee"], [class*="leader"], [class*="staff"], [class*="bio"]').each((_, elem) => {
    const $elem = $(elem)

    // Skip large containers - look for individual member cards
    // If the element contains multiple h2/h3/h4, it's a container, not a card
    const headings = $elem.find('h2, h3, h4')
    if (headings.length > 1) {
      // Process each heading individually within this container
      headings.each((_, heading) => {
        const name = $(heading).text().trim()
        if (!looksLikePersonName(name)) return

        // Look at parent of heading for nearby title/email
        const parent = $(heading).parent()
        let title = ''
        let email: string | null = null
        parent.find('div, p, span').each((_, child) => {
          const text = $(child).text().trim()
          if (text === name) return // skip the name itself
          if (!title && text.length > 2 && text.length < 60) {
            if (EXECUTIVE_KEYWORDS.some(kw => text.toLowerCase().includes(kw)) ||
                text.match(/^(Director|Manager|Lead|Engineer|Designer|Analyst|Associate|Partner|Advisor)/i)) {
              title = text
            }
          }
          if (!email) {
            email = extractEmail(text)
          }
        })

        addContact(name, title, email || undefined)
      })
      return
    }

    // Single-card element
    let name = $elem.find('h2, h3, h4, [class*="name"]').first().text().trim()
    if (!name) {
      name = $elem.find('strong, b').first().text().trim()
    }

    let title = $elem.find('[class*="title"], [class*="role"], [class*="position"]').first().text().trim()
    if (!title) {
      title = $elem.find('p, span, div').filter((_, el) => {
        const text = $(el).text().toLowerCase()
        return EXECUTIVE_KEYWORDS.some(kw => text.includes(kw))
      }).first().text().trim()
    }

    const email = extractEmail($elem.text())
    addContact(name, title, email || undefined)
  })

  // Strategy 3: Look for schema.org structured data
  $('script[type="application/ld+json"]').each((_, elem) => {
    try {
      const jsonData = JSON.parse($(elem).html() || '{}')
      if (jsonData['@type'] === 'Person' || (Array.isArray(jsonData) && jsonData.some((item: any) => item['@type'] === 'Person'))) {
        const people = Array.isArray(jsonData) ? jsonData : [jsonData]
        people.forEach((person: any) => {
          if (person['@type'] === 'Person' && person.name) {
            addContact(person.name, person.jobTitle, person.email)
          }
        })
      }
    } catch {
      // Invalid JSON, skip
    }
  })

  // Filter to prioritize executives
  const executives = contacts.filter(c => c.title && isExecutiveRole(c.title))
  const others = contacts.filter(c => !c.title || !isExecutiveRole(c.title))

  return [...executives, ...others]
}

export async function scrapeCompanyContacts(
  domain: string,
  companyName?: string,
  ycUrl?: string,
  limit: number = 10
): Promise<ScrapedContact[]> {
  const allContacts: ScrapedContact[] = []
  const seen = new Set<string>()

  try {
    // 1. Try YC company page first (highest confidence)
    if (ycUrl) {
      const ycContacts = await scrapeYCCompanyPage(ycUrl)
      ycContacts.forEach(contact => {
        const key = contact.name.toLowerCase()
        if (!seen.has(key)) {
          seen.add(key)
          allContacts.push(contact)
        }
      })
    }

    // 2. Scrape company website for team page
    const teamPageUrl = await findTeamPage(domain)
    if (teamPageUrl) {
      const response = await fetch(teamPageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const html = await response.text()
        const websiteContacts = scrapeContactsFromHtml(html)
        websiteContacts.forEach(contact => {
          const key = contact.name.toLowerCase()
          if (!seen.has(key)) {
            seen.add(key)
            allContacts.push({
              ...contact,
              confidence: contact.email ? 0.8 : 0.7,
              source: 'website',
            })
          }
        })
      }
    }

    // 3. Try GitHub organization (if company name provided)
    if (companyName) {
      const githubOrg = extractGitHubOrg(domain, companyName)
      if (githubOrg) {
        const githubContacts = await findGitHubOrgMembers(githubOrg)
        githubContacts.forEach(contact => {
          const key = contact.name.toLowerCase()
          if (!seen.has(key)) {
            seen.add(key)
            allContacts.push(contact)
          }
        })
      }
    }

    // 4. For contacts without emails, generate email patterns
    allContacts.forEach(contact => {
      if (!contact.email) {
        const patterns = generateEmailPatterns(contact.name, domain)
        if (patterns.length > 0) {
          // Add the most likely pattern
          const bestPattern = patterns[0]
          contact.email = bestPattern.email
          contact.confidence = Math.min(contact.confidence || 0.5, bestPattern.confidence)
          if (!contact.source) {
            contact.source = 'pattern'
          }
        }
      }
    })

    // Sort by confidence and executive status, then return top results
    const sorted = allContacts.sort((a, b) => {
      const aExec = a.title && isExecutiveRole(a.title) ? 1 : 0
      const bExec = b.title && isExecutiveRole(b.title) ? 1 : 0
      if (aExec !== bExec) return bExec - aExec
      return (b.confidence || 0) - (a.confidence || 0)
    })

    return sorted.slice(0, limit)
  } catch (error) {
    console.error('Scraping error:', error)
    return allContacts.slice(0, limit)
  }
}

// Generate email patterns from name and domain
export function generateEmailPatterns(name: string, domain: string): Array<{ email: string; confidence: number }> {
  const cleanName = name.toLowerCase().replace(/[^a-z\s]/g, '')
  const parts = cleanName.split(/\s+/).filter(p => p.length > 0)

  if (parts.length < 2 || !domain) {
    return []
  }

  const firstName = parts[0]
  const lastName = parts[parts.length - 1]
  const patterns: Array<{ email: string; confidence: number }> = []

  // Common email patterns with confidence scores
  patterns.push(
    { email: `${firstName}@${domain}`, confidence: 0.7 },
    { email: `${firstName}.${lastName}@${domain}`, confidence: 0.9 },
    { email: `${firstName[0]}${lastName}@${domain}`, confidence: 0.6 },
    { email: `${firstName}${lastName}@${domain}`, confidence: 0.5 },
    { email: `${firstName}_${lastName}@${domain}`, confidence: 0.4 },
    { email: `${lastName}@${domain}`, confidence: 0.3 },
  )

  return patterns
}

// Common page section headings that should not be mistaken for names
const NON_NAME_PHRASES = [
  'about us', 'our team', 'our story', 'who we are', 'meet the team',
  'leadership team', 'executive team', 'management team', 'our leadership',
  'contact us', 'get in touch', 'learn more', 'read more', 'view all',
  'our mission', 'our vision', 'our values', 'company info', 'more info',
]

// Check if text looks like a person name (2-4 capitalized words)
function looksLikePersonName(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length < 3 || trimmed.length > 50) return false

  // Filter out common page headings
  if (NON_NAME_PHRASES.includes(trimmed.toLowerCase())) return false

  const words = trimmed.split(/\s+/)
  if (words.length < 2 || words.length > 5) return false
  // Each word should start with a capital letter
  return words.every(w => /^[A-Z]/.test(w))
}

// Scrape Y Combinator company page for founders
export async function scrapeYCCompanyPage(ycUrl: string): Promise<ScrapedContact[]> {
  try {
    const response = await fetch(ycUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return []
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    const contacts: ScrapedContact[] = []
    const seen = new Set<string>()

    // Strategy 1: Find avatar images from bookface-images S3 bucket
    // YC pages show founder photos with their name in the alt attribute
    // Structure: img[alt="Name"] inside a container with sibling div containing title
    $('img').each((_, elem) => {
      const src = $(elem).attr('src') || ''
      const alt = $(elem).attr('alt') || ''

      // Only process bookface avatar images with person-like alt text
      if (!src.includes('bookface-images') || !src.includes('avatar')) return
      if (!looksLikePersonName(alt)) return

      const name = alt.trim()
      const key = name.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)

      // Navigate up to find the parent container, then look for title text
      // The structure is: grandparent > [avatar div > img] + [info div > name + title]
      let title = ''
      const grandparent = $(elem).parent().parent()
      grandparent.find('div').each((_, div) => {
        const text = $(div).text().trim()
        const cls = $(div).attr('class') || ''
        // Title is typically in a div with gray text color class
        if (cls.includes('text-gray') && text.length < 50 && text.length > 2) {
          if (EXECUTIVE_KEYWORDS.some(kw => text.toLowerCase().includes(kw))) {
            title = text
          }
        }
      })

      contacts.push({
        name,
        title: title || 'Founder',
        confidence: 0.95,
        source: 'yc',
        role: 'founder',
      })
    })

    // Strategy 2: Find title text containing founder keywords and look for nearby names
    // This catches cases where avatar images don't have alt text
    if (contacts.length === 0) {
      $('div, span, p').each((_, elem) => {
        const text = $(elem).text().trim()
        const children = $(elem).children().length

        // Only match leaf text nodes with founder keywords
        if (children > 0 || text.length > 50 || text.length < 3) return
        if (!EXECUTIVE_KEYWORDS.some(kw => text.toLowerCase().includes(kw))) return

        // Look at siblings for the name
        $(elem).siblings().each((_, sib) => {
          const sibText = $(sib).text().trim()
          if (looksLikePersonName(sibText)) {
            const key = sibText.toLowerCase()
            if (!seen.has(key)) {
              seen.add(key)
              contacts.push({
                name: sibText,
                title: text,
                confidence: 0.95,
                source: 'yc',
                role: 'founder',
              })
            }
          }
        })
      })
    }

    return contacts
  } catch (error) {
    console.error('YC scraping error:', error)
    return []
  }
}

// Find GitHub organization members
export async function findGitHubOrgMembers(orgName: string): Promise<ScrapedContact[]> {
  try {
    // GitHub public API doesn't require auth for public data
    const response = await fetch(`https://api.github.com/orgs/${orgName}/members?per_page=20`, {
      headers: {
        'User-Agent': 'Startup-Funding-Tracker',
        'Accept': 'application/vnd.github.v3+json',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return []
    }

    const members = await response.json()
    const contacts: ScrapedContact[] = []

    for (const member of members) {
      // Fetch user details for name
      try {
        const userResponse = await fetch(member.url, {
          headers: {
            'User-Agent': 'Startup-Funding-Tracker',
            'Accept': 'application/vnd.github.v3+json',
          },
          signal: AbortSignal.timeout(5000),
        })

        if (userResponse.ok) {
          const userData = await userResponse.json()

          if (userData.name) {
            contacts.push({
              name: userData.name,
              email: userData.email || undefined,
              confidence: userData.email ? 0.9 : 0.5,
              source: 'github',
              role: undefined,
            })
          }
        }
      } catch {
        // Skip members we can't fetch details for
        continue
      }
    }

    return contacts
  } catch (error) {
    console.error('GitHub scraping error:', error)
    return []
  }
}

// Extract GitHub org name from domain or company info
export function extractGitHubOrg(domain: string, companyName: string): string | null {
  // Common patterns: company name or domain without TLD
  const cleanDomain = domain.replace(/^(www\.)/, '').replace(/\..+$/, '')
  const cleanCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, '')

  // Return the domain-based org name (most common)
  return cleanDomain
}
