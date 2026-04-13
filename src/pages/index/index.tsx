import { View, Text, ScrollView } from '@tarojs/components'
import { useLoad, usePullDownRefresh, useReachBottom, showToast, stopPullDownRefresh } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Star, RefreshCw } from 'lucide-react-taro'
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

const IndexPage = () => {
  const [events, setEvents] = useState<MarketEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [hasMore, setHasMore] = useState(true)

  const categories = ['全部', '热榜', '金融', '体育', '科技']

  useLoad(() => {
    loadEvents()
  })

  usePullDownRefresh(async () => {
    await loadEvents()
    stopPullDownRefresh()
  })

  useReachBottom(() => {
    if (!loading && hasMore) {
      loadMore()
    }
  })

  useEffect(() => {
    loadEvents()
  }, [selectedCategory])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const res = await Network.request({
        url: '/api/market/events',
        data: {
          category: selectedCategory === '全部' ? 'all' : selectedCategory
        }
      })

      console.log('API Response:', res.data)

      if (res.data?.code === 200) {
        setEvents(res.data.data || [])
        setHasMore(false) // 模拟数据有限
      }
    } catch (error) {
      console.error('加载失败:', error)
      showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    // TODO: 实现分页加载
    console.log('加载更多')
  }

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      '热榜': 'bg-orange-100 text-orange-700',
      '金融': 'bg-yellow-100 text-yellow-700',
      '体育': 'bg-green-100 text-green-700',
      '科技': 'bg-blue-100 text-blue-700',
      '全部': 'bg-gray-100 text-gray-700'
    }
    return colorMap[category] || 'bg-gray-100 text-gray-700'
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

  const handleRefresh = () => {
    setRefreshing(true)
    loadEvents().finally(() => {
      setRefreshing(false)
    })
  }

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 顶部状态栏 */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex items-center justify-between">
          <Text className="block text-base font-bold text-gray-900">
            概率之眼
          </Text>
          <RefreshCw
            size={20}
            color="#666"
            className={refreshing ? 'animate-spin' : ''}
            onClick={handleRefresh}
          />
        </View>
        <View className="flex items-center gap-2 mt-2">
          <View className="w-2 h-2 rounded-full bg-green-500"></View>
          <Text className="block text-xs text-gray-500">数据正常</Text>
          <Text className="block text-xs text-gray-400">
            最后更新: {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
        </View>
      </View>

      {/* 分类标签 */}
      <ScrollView
        scrollX
        className="bg-white border-b border-gray-200"
        showScrollbar={false}
      >
        <View className="flex flex-row px-4 py-3 gap-2">
          {categories.map((cat) => (
            <View
              key={cat}
              className={`px-4 py-2 rounded-full text-sm ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
              onClick={() => setSelectedCategory(cat)}
            >
              <Text className="block">{cat}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 事件列表 */}
      <ScrollView
        scrollY
        className="flex-1 px-4 py-3"
        style={{ height: 'calc(100vh - 120px)' }}
      >
        {loading && events.length === 0 ? (
          <View className="py-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <View key={i} className="bg-white rounded-2xl p-4">
                <View className="h-4 bg-gray-200 rounded w-3/4 mb-3"></View>
                <View className="h-3 bg-gray-200 rounded w-full mb-2"></View>
                <View className="h-2 bg-gray-200 rounded w-1/2"></View>
              </View>
            ))}
          </View>
        ) : events.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-20">
            <Text className="block text-center text-gray-500 text-sm">
              暂无数据
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {events.map((event) => (
              <Card
                key={event.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                <CardContent className="p-4">
                  {/* 分类标签和收藏按钮 */}
                  <View className="flex items-center justify-between mb-3">
                    <Badge className={getCategoryColor(event.category)}>
                      <Text className="block text-xs">{event.category}</Text>
                    </Badge>
                    <View className="flex items-center gap-2">
                      {Math.abs(event.change24h) > 5 && (
                        <Text
                          className={`block text-xs ${
                            event.change24h > 0 ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {event.change24h > 0 ? '↑' : '↓'}
                          {Math.abs(event.change24h).toFixed(1)}%
                        </Text>
                      )}
                      <Star size={20} color="#999" />
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
                  <View className="flex items-center gap-4 text-xs text-gray-500">
                    <Text className="block">${event.price.toFixed(3)}</Text>
                    <Text className="block">
                      24h量 {formatNumber(event.volume24h)}
                    </Text>
                    <Text className="block">
                      流动性 {formatNumber(event.liquidity)}
                    </Text>
                  </View>
                </CardContent>
              </Card>
            ))}

            {loading && events.length > 0 && (
              <View className="text-center py-4">
                <Text className="block text-xs text-gray-500">加载中...</Text>
              </View>
            )}

            {!hasMore && events.length > 0 && (
              <View className="text-center py-4">
                <Text className="block text-xs text-gray-400">没有更多了</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default IndexPage
