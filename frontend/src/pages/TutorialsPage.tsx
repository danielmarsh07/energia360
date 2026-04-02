import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Sun, FileText, Activity, Wrench, HelpCircle, TrendingDown, ArrowLeft, Clock, BookOpen
} from 'lucide-react'
import { tutorialsApi } from '@/services/api'
import { TutorialArticle, TutorialCategory, TUTORIAL_CATEGORY_LABELS } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

const categoryIcons: Record<TutorialCategory, React.ReactNode> = {
  SOLAR_BASICS: <Sun size={18} />,
  BILLING: <FileText size={18} />,
  MONITORING: <Activity size={18} />,
  MAINTENANCE: <Wrench size={18} />,
  FAQ: <HelpCircle size={18} />,
  SAVINGS: <TrendingDown size={18} />,
}

const categoryColors: Record<TutorialCategory, string> = {
  SOLAR_BASICS: 'bg-yellow-50 text-yellow-600',
  BILLING: 'bg-blue-50 text-blue-600',
  MONITORING: 'bg-purple-50 text-purple-600',
  MAINTENANCE: 'bg-orange-50 text-orange-600',
  FAQ: 'bg-gray-100 text-gray-600',
  SAVINGS: 'bg-green-50 text-green-600',
}

function ArticleCard({ article, onClick }: { article: TutorialArticle; onClick: () => void }) {
  const category = article.category as TutorialCategory
  return (
    <Card hover onClick={onClick} className="cursor-pointer group">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${categoryColors[category]}`}>
          {categoryIcons[category]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-sm group-hover:text-primary-600 transition-colors leading-snug">
              {article.title}
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{article.summary}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="default">{TUTORIAL_CATEGORY_LABELS[category]}</Badge>
            {article.readingTime && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={10} />
                {article.readingTime} min
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function ArticleDetail({ slug }: { slug: string }) {
  const navigate = useNavigate()
  const { data: article, isLoading } = useQuery<TutorialArticle>({
    queryKey: ['tutorial', slug],
    queryFn: () => tutorialsApi.get(slug),
  })

  if (isLoading) return <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
  if (!article) return null

  const category = article.category as TutorialCategory

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/dicas')}>
        Voltar
      </Button>

      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${categoryColors[category]}`}>
          {categoryIcons[category]}
        </div>
        <div>
          <Badge variant="default">{TUTORIAL_CATEGORY_LABELS[category]}</Badge>
          {article.readingTime && (
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <Clock size={10} /> {article.readingTime} minutos de leitura
            </p>
          )}
        </div>
      </div>

      <Card>
        <h1 className="text-xl font-bold text-gray-900 mb-4">{article.title}</h1>
        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
          {article.content?.split('\n').map((line, i) => {
            if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-gray-900 mt-4 mb-2">{line.slice(2)}</h1>
            if (line.startsWith('## ')) return <h2 key={i} className="text-base font-semibold text-gray-900 mt-4 mb-2">{line.slice(3)}</h2>
            if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-semibold text-gray-800 mt-3 mb-1">{line.slice(4)}</h3>
            if (line.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-primary-300 pl-4 py-2 bg-primary-50 rounded-r-xl text-sm text-primary-800 my-3">{line.slice(2)}</blockquote>
            if (line.startsWith('- ')) return <li key={i} className="ml-4 text-sm text-gray-600 list-disc">{line.slice(2)}</li>
            if (line.match(/^\d+\. /)) return <li key={i} className="ml-4 text-sm text-gray-600 list-decimal">{line.replace(/^\d+\. /, '')}</li>
            if (line === '') return <br key={i} />
            return <p key={i} className="text-sm text-gray-700 leading-relaxed my-1.5">{line}</p>
          })}
        </div>
      </Card>
    </div>
  )
}

export default function TutorialsPage() {
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState<string>('')

  const { data: articles = [], isLoading } = useQuery<TutorialArticle[]>({
    queryKey: ['tutorials', activeCategory],
    queryFn: () => tutorialsApi.list(activeCategory || undefined),
    enabled: !slug,
  })

  if (slug) return <ArticleDetail slug={slug} />

  const categories = Object.entries(TUTORIAL_CATEGORY_LABELS) as [TutorialCategory, string][]

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="page-title">Dicas e Tutoriais</h1>
        <p className="text-muted mt-1">Aprenda a entender e acompanhar melhor sua energia solar</p>
      </div>

      {/* Filtros por categoria */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory('')}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
            !activeCategory ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Todos
        </button>
        {categories.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setActiveCategory(value)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeCategory === value ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {categoryIcons[value]}
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : articles.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen size={28} />}
            title="Nenhum artigo encontrado"
            description="Em breve teremos mais conteúdo sobre energia solar."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {articles.map(article => (
            <ArticleCard
              key={article.id}
              article={article}
              onClick={() => navigate(`/dicas/${article.slug}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
