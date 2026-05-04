'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from './store'
import ReactMarkdown from 'react-markdown'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'

import {
  Search,
  BookOpen,
  Eye,
  X,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface KBArticle {
  id: string
  title: string
  content: string
  category: string
  isPublished: boolean
  views: number
  createdAt: string
  updatedAt: string
}

// ─── Category Colors ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Technical: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  Billing: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  General: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  HR: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Security: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Getting_Started: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function ArticleCardSkeleton() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-6 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function KnowledgeBaseView() {
  const searchQuery = useAppStore((s) => s.searchQuery)

  // Data
  const [articles, setArticles] = useState<KBArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Expanded article (modal)
  const [expandedArticle, setExpandedArticle] = useState<KBArticle | null>(null)

  // Accordion open state
  const [accordionValue, setAccordionValue] = useState<string>('')

  // Sync search query from global
  useEffect(() => {
    if (searchQuery) setSearch(searchQuery)
  }, [searchQuery])

  // Fetch articles
  const fetchArticles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (search.trim()) params.set('search', search.trim())
      if (selectedCategory !== 'all') params.set('category', selectedCategory)

      const res = await fetch(`/api/knowledge-base?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch articles')
      const data = await res.json()
      setArticles(data.articles || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles')
    } finally {
      setLoading(false)
    }
  }, [search, selectedCategory])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  // Extract unique categories from articles
  const categories = Array.from(new Set(articles.map((a) => a.category)))

  // Filter by category on client side (if not filtering via API)
  const filteredArticles = selectedCategory === 'all'
    ? articles
    : articles.filter((a) => a.category === selectedCategory)

  // Excerpt helper
  function getExcerpt(content: string, maxLength = 120): string {
    // Strip markdown for excerpt
    const stripped = content
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\n/g, ' ')
      .trim()
    if (stripped.length <= maxLength) return stripped
    return stripped.slice(0, maxLength).trim() + '...'
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
          <BookOpen className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground">Find helpful articles and documentation</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setSearch('')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
          className={selectedCategory === 'all' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
        >
          All
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className={selectedCategory === cat ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-destructive font-medium">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchArticles}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ArticleCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredArticles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No articles found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {search
              ? 'No articles match your search. Try a different keyword.'
              : 'There are no knowledge base articles yet.'}
          </p>
        </div>
      )}

      {/* Article Grid */}
      {!loading && !error && filteredArticles.length > 0 && (
        <>
          {/* Desktop: Grid cards */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArticles.map((article) => (
              <Card
                key={article.id}
                className="border-border/50 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setExpandedArticle(article)}
              >
                <CardContent className="p-6 space-y-3">
                  <h3 className="font-semibold text-sm leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={`text-xs ${getCategoryColor(article.category)}`}>
                      {article.category}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      {article.views}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {getExcerpt(article.content)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Mobile: Accordion */}
          <div className="md:hidden">
            <Accordion value={accordionValue} onValueChange={setAccordionValue}>
              {filteredArticles.map((article) => (
                <AccordionItem key={article.id} value={article.id}>
                  <AccordionTrigger className="text-left text-sm hover:no-underline">
                    <div className="flex flex-col items-start gap-1 pr-2">
                      <span className="font-medium">{article.title}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${getCategoryColor(article.category)}`}>
                          {article.category}
                        </Badge>
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Eye className="h-2.5 w-2.5" />
                          {article.views}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none pb-2">
                      <ReactMarkdown>{article.content}</ReactMarkdown>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </>
      )}

      {/* Article Detail Modal (Desktop) */}
      <Dialog open={!!expandedArticle} onOpenChange={(open) => !open && setExpandedArticle(null)}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-lg">{expandedArticle?.title}</DialogTitle>
          </DialogHeader>
          {expandedArticle && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className={`text-xs ${getCategoryColor(expandedArticle.category)}`}>
                  {expandedArticle.category}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="h-3 w-3" />
                  {expandedArticle.views} views
                </span>
              </div>
              <ScrollArea className="max-h-[55vh] pr-3">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{expandedArticle.content}</ReactMarkdown>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
