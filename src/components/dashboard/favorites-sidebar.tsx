'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface Folder {
  id: string
  name: string
  color: string | null
  icon: string | null
  order: number
  industries: FavoriteIndustry[]
}

interface FavoriteIndustry {
  id: string
  industry: string
  folderId: string | null
  order: number
  folder?: Folder | null
}

interface FavoritesSidebarProps {
  onIndustrySelect: (industry: string) => void
  selectedIndustry: string | null
}

export function FavoritesSidebar({ onIndustrySelect, selectedIndustry }: FavoritesSidebarProps) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [favorites, setFavorites] = useState<FavoriteIndustry[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [foldersRes, favoritesRes] = await Promise.all([
        fetch('/api/folders'),
        fetch('/api/favorites/industries'),
      ])

      if (foldersRes.ok) {
        const foldersData = await foldersRes.json()
        setFolders(foldersData)
        // Expand all folders by default
        setExpandedFolders(new Set(foldersData.map((f: Folder) => f.id)))
      }

      if (favoritesRes.ok) {
        const favoritesData = await favoritesRes.json()
        setFavorites(favoritesData)
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName }),
      })

      if (res.ok) {
        setNewFolderName('')
        setShowNewFolder(false)
        fetchData()
      }
    } catch (error) {
      console.error('Failed to create folder:', error)
    }
  }

  const deleteFolder = async (folderId: string) => {
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Failed to delete folder:', error)
    }
  }

  const removeFavorite = async (favoriteId: string) => {
    try {
      const res = await fetch(`/api/favorites/industries/${favoriteId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Failed to remove favorite:', error)
    }
  }

  const moveToFolder = async (favoriteId: string, folderId: string | null) => {
    try {
      const res = await fetch(`/api/favorites/industries/${favoriteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      })

      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Failed to move favorite:', error)
    }
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  // Get unfiled favorites
  const unfiledFavorites = favorites.filter((f) => !f.folderId)

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <div className="h-6 bg-muted rounded animate-pulse" />
        <div className="h-6 bg-muted rounded animate-pulse" />
        <div className="h-6 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="border rounded-lg bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Favorite Industries</h3>
          <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewFolder(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createFolder}>Create</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-2 space-y-1">
        {favorites.length === 0 && folders.length === 0 ? (
          <p className="text-sm text-muted-foreground p-2">
            No favorites yet. Click the star icon on industries to add them here.
          </p>
        ) : (
          <>
            {/* Folders */}
            {folders.map((folder) => {
              const folderIndustries = favorites.filter((f) => f.folderId === folder.id)
              const isExpanded = expandedFolders.has(folder.id)

              return (
                <div key={folder.id} className="space-y-1">
                  <button
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-left"
                    onClick={() => toggleFolder(folder.id)}
                  >
                    <svg
                      className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-90')}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <svg
                      className="w-4 h-4"
                      fill={folder.color || '#6366f1'}
                      stroke={folder.color || '#6366f1'}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className="flex-1 text-sm font-medium text-foreground">{folder.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {folderIndustries.length}
                    </Badge>
                  </button>

                  {isExpanded && folderIndustries.length > 0 && (
                    <div className="ml-6 space-y-0.5">
                      {folderIndustries.map((fav) => (
                        <button
                          key={fav.id}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1 rounded text-sm text-left',
                            selectedIndustry === fav.industry
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                              : 'hover:bg-muted text-muted-foreground'
                          )}
                          onClick={() => onIndustrySelect(fav.industry)}
                        >
                          <span className="flex-1 truncate">{fav.industry}</span>
                          <button
                            className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFavorite(fav.id)
                            }}
                          >
                            <svg className="w-3 h-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Unfiled favorites */}
            {unfiledFavorites.length > 0 && (
              <div className="space-y-0.5 pt-2 border-t border-border mt-2">
                <span className="text-xs text-muted-foreground px-2">Unfiled</span>
                {unfiledFavorites.map((fav) => (
                  <button
                    key={fav.id}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1 rounded text-sm text-left group',
                      selectedIndustry === fav.industry
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'hover:bg-muted text-muted-foreground'
                    )}
                    onClick={() => onIndustrySelect(fav.industry)}
                  >
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="flex-1 truncate">{fav.industry}</span>
                    <button
                      className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFavorite(fav.id)
                      }}
                    >
                      <svg className="w-3 h-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
