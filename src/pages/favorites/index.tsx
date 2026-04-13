import { View, Text, ScrollView } from '@tarojs/components'
import { useLoad, usePullDownRefresh, stopPullDownRefresh, useShareAppMessage, showToast, navigateTo, useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, Sparkles, Share2 } from 'lucide-react-taro'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import './index.config'

interface MarketEvent {
  id: string
  question: string
  probability: number
  price: number
  volume24h: number
  liquidity: number
  category: string
  change24h: number
}

interface AnalysisResult {
  summary: string
  implications: string[]
  riskFactors: string[]
  confidence: '高' | '中' | '低'
}

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState<MarketEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set())
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({})

  // 设置分享
  useShareAppMessage(() => {
    if (favorites.length > 0) {
      const event = favorites[0]
      return {
        title: `${event.question} - 概率${event.probability.toFixed(1)}%`,
        path: `/pages/detail/index?id=${event.id}`
      }
    }
    return {}
  })

  useLoad(() => {
    loadFavorites()
  })

  useDidShow(() => {
    // 每次页面显示时重新加载收藏列表
    loadFavorites()
  })

  usePullDownRefresh(async () => {
    await loadFavorites()
    stopPullDownRefresh()
  })

  const loadFavorites = async () => {
    setLoading(true)
    try {
      console.log('开始加载收藏列表...')
      const res = await Network.request({
        url: '/api/favorites'
      })

      console.log('Favorites raw response:', res)
      console.log('Favorites res.data:', res.data)
      console.log('Favorites res.data.code:', res.data?.code)
      console.log('Favorites res.data.data:', res.data?.data)

      if (res.data?.code === 200) {
        const data = res.data.data || []
        console.log('解析后的收藏数据:', data)
        console.log('Favorites count:', data.length)
        setFavorites(data)

        if (data.length > 0) {
          console.log('第一个收藏项:', data[0])
        }
      } else {
        console.error('Invalid response code:', res.data?.code)
        showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载收藏列表失败:', error)
      showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFavorite = async (eventId: string) => {
    try {
      await Network.request({
        url: `/api/favorites/${eventId}`,
        method: 'DELETE'
      })

      // 更新本地列表
      setFavorites(prev => prev.filter(e => e.id !== eventId))

      // 清除分析结果
      setAnalysisResults(prev => {
        const newResults = { ...prev }
        delete newResults[eventId]
        return newResults
      })

      showToast({
        title: '已取消收藏',
        icon: 'success'
      })
    } catch (error) {
      console.error('取消收藏失败:', error)
      showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  }

  const handleAnalyze = async (eventId: string) => {
    if (analyzingIds.has(eventId)) return

    try {
      setAnalyzingIds(prev => new Set([...prev, eventId]))

      const res = await Network.request({
        url: `/api/analysis/${eventId}`,
        method: 'POST'
      })

      console.log('Analysis Response:', res.data)

      if (res.data?.code === 200) {
        setAnalysisResults(prev => ({
          ...prev,
          [eventId]: res.data.data
        }))

        showToast({
          title: '分析完成',
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('分析失败:', error)
      showToast({
        title: '分析失败',
        icon: 'none'
      })
    } finally {
      setAnalyzingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(eventId)
        return newSet
      })
    }
  }

  const handleShare = async (_event: MarketEvent) => {
    showToast({
      title: '请在右上角菜单中分享',
      icon: 'none',
      duration: 2000
    })
  }

  const getProbabilityColor = (probability: number) => {
    if (probability >= 70) return '#00E5A0'
    if (probability >= 50) return '#FFB020'
    if (probability >= 30) return '#4A90D9'
    if (probability >= 20) return '#FF4D6A'
    return '#FF1744'
  }

  const getProbabilityLabel = (probability: number) => {
    if (probability >= 70) return '极有可能'
    if (probability >= 50) return '有可能'
    if (probability >= 30) return '悬而未决'
    if (probability >= 20) return '不太可能'
    return '极不可能'
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`
    }
    return `$${num}`
  }

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      '热榜': 'bg-orange-100 text-orange-700',
      '金融': 'bg-yellow-100 text-yellow-700',
      '体育': 'bg-green-100 text-green-700',
      '科技': 'bg-blue-100 text-blue-700',
      '其他': 'bg-gray-100 text-gray-700'
    }
    return colorMap[category] || 'bg-gray-100 text-gray-700'
  }

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 顶部状态栏 */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <Text className="block text-base font-bold text-gray-900">
          我的收藏
        </Text>
      </View>

      {/* 收藏列表 */}
      <ScrollView
        scrollY
        className="flex-1 px-4 py-3"
        style={{ height: 'calc(100vh - 60px)' }}
      >
        {loading ? (
          <View className="py-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <View key={i} className="bg-white rounded-2xl p-4">
                <View className="h-4 bg-gray-200 rounded w-3/4 mb-3"></View>
                <View className="h-3 bg-gray-200 rounded w-full mb-2"></View>
                <View className="h-2 bg-gray-200 rounded w-1/2"></View>
              </View>
            ))}
          </View>
        ) : favorites.length === 0 && !loading ? (
          <View className="flex flex-col items-center justify-center py-20">
            <Star size={48} color="#ddd" strokeWidth={2} className="mb-4" />
            <Text className="block text-center text-gray-500 text-sm mb-2">
              暂无收藏
            </Text>
            <Text className="block text-center text-gray-400 text-xs">
              在首页点击星标添加收藏
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {favorites.map((event) => {
              const analysis = analysisResults[event.id]
              const isAnalyzing = analyzingIds.has(event.id)

              return (
                <Card
                  key={event.id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden"
                  onClick={() => navigateTo({ url: `/pages/detail/index?id=${event.id}` })}
                >
                  <CardContent className="p-4">
                    {/* 分类标签和操作按钮 */}
                    <View className="flex items-center justify-between mb-3">
                      <Badge className={getCategoryColor(event.category)}>
                        <Text className="block text-xs">{event.category}</Text>
                      </Badge>
                      <View className="flex items-center gap-2">
                        <Share2
                          size={18}
                          color="#666"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleShare(event)
                          }}
                        />
                        <Star
                          size={20}
                          color="#FFD700"
                          strokeWidth={3}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveFavorite(event.id)
                          }}
                        />
                      </View>
                    </View>

                    {/* 问题文本 */}
                    <Text className="block text-sm text-gray-900 mb-4 line-clamp-2 leading-relaxed">
                      {event.question}
                    </Text>

                    {/* 概率进度条 */}
                    <View className="mb-3">
                      <View className="flex items-center justify-between mb-2">
                        <Text
                          className="block text-sm font-semibold"
                          style={{ color: getProbabilityColor(event.probability) }}
                        >
                          {getProbabilityLabel(event.probability)}
                        </Text>
                        <Text
                          className="block text-lg font-bold"
                          style={{ color: getProbabilityColor(event.probability) }}
                        >
                          {event.probability.toFixed(1)}%
                        </Text>
                      </View>
                      <Progress
                        value={event.probability}
                        className="h-2"
                        style={{
                          '--progress-background': getProbabilityColor(event.probability)
                        } as any}
                      />
                    </View>

                    {/* 底部信息 */}
                    <View className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <Text className="block">${event.price.toFixed(3)}</Text>
                      <Text className="block">
                        24h量 {formatNumber(event.volume24h)}
                      </Text>
                    </View>

                    {/* AI 分析按钮 */}
                    <View className="mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAnalyze(event.id)
                        }}
                      >
                        <Sparkles size={16} strokeWidth={2} color="#3B82F6" />
                        <Text className="block text-sm font-semibold text-blue-600">
                          {isAnalyzing ? 'AI 分析中...' : analysis ? '重新 AI 分析' : '一键 AI 智能分析'}
                        </Text>
                      </Button>
                    </View>

                    {/* AI 分析结果 */}
                    {analysis && (
                      <View className="bg-blue-50 rounded-xl p-3 mt-3">
                        <View className="flex items-center gap-2 mb-2">
                          <Sparkles size={14} strokeWidth={2} color="#3B82F6" />
                          <Text className="block text-xs font-semibold text-blue-700">
                            AI 分析
                          </Text>
                          <Badge className="bg-blue-100 text-blue-700 ml-auto">
                            <Text className="block text-xs">置信度: {analysis.confidence}</Text>
                          </Badge>
                        </View>
                        <Text className="block text-xs text-gray-700 mb-2 leading-relaxed">
                          {analysis.summary}
                        </Text>
                        <View className="mt-2">
                          <Text className="block text-xs font-semibold text-gray-700 mb-1">
                            潜在影响：
                          </Text>
                          {analysis.implications.map((imp, idx) => (
                            <Text key={idx} className="block text-xs text-gray-600 mb-1">
                              • {imp}
                            </Text>
                          ))}
                        </View>
                      </View>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default FavoritesPage
