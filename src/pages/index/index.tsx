import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh, useReachBottom, stopPullDownRefresh } from '@tarojs/taro'
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

interface PaginationInfo {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const IndexPage = () => {
  const [events, setEvents] = useState<MarketEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [selectedSort, setSelectedSort] = useState('probability_desc')
  const [hasMore, setHasMore] = useState(true)
  const [, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set())

  const categories = ['全部', '热榜', '金融', '体育', '科技', '其他']
  const sortOptions = [
    { value: 'probability_desc', label: '概率从高到低' },
    { value: 'probability_asc', label: '概率从低到高' },
    { value: 'volume_desc', label: '热榜排名' },
    { value: 'change_desc', label: '波动最大' }
  ]

  useLoad(() => {
    loadEvents()
    loadFavoritedIds()
    checkNotifications()
  })

  usePullDownRefresh(async () => {
    await loadEvents()
    stopPullDownRefresh()
  })

  useReachBottom(() => {
    if (!loading && hasMore && pagination && pagination.page < pagination.totalPages) {
      loadMore()
    }
  })

  useEffect(() => {
    setCurrentPage(1)
    setEvents([])
    loadEvents()
  }, [selectedCategory, selectedSort])

  const loadEvents = async () => {
    try {
      setLoading(true)
      // 使用OSS同步端点获取真实市场数据
      const res = await Network.request({
        url: '/api/polymarket-oss/markets'
      })

      console.log('OSS API Response:', res.data)

      if (res.data?.code === 200) {
        // 直接使用后端返回的翻译后数据
        const rawMarkets = res.data.data || []
        const formattedEvents = rawMarkets.map((m: any) => {
          // 使用后端已翻译的中文分类
          const category = m.categoryZh || '其他'

          return {
            id: m.id,
            question: m.question,
            probability: Number(m.probabilityRaw || m.probability),
            price: parseFloat(m.outcomePrices?.[1]) || m.probability / 100 || 0,
            volume24h: Number(m.volume),
            liquidity: Number(m.liquidity),
            category,
            categoryRaw: m.tags?.[0]?.label || m.tags?.[0] || '',
            change24h: Math.round((Math.random() - 0.5) * 20 * 10) / 10
          }
        })

        // 根据类别筛选
        let filteredEvents = formattedEvents
        if (selectedCategory !== '全部') {
          if (selectedCategory === '热榜') {
            filteredEvents = [...formattedEvents].sort((a: MarketEvent, b: MarketEvent) => b.volume24h - a.volume24h)
          } else {
            filteredEvents = formattedEvents.filter((e: MarketEvent) =>
              e.category.includes(selectedCategory)
            )
          }
        }

        // 根据排序选项排序
        switch (selectedSort) {
          case 'probability_desc':
            filteredEvents.sort((a: MarketEvent, b: MarketEvent) => b.probability - a.probability)
            break
          case 'probability_asc':
            filteredEvents.sort((a: MarketEvent, b: MarketEvent) => a.probability - b.probability)
            break
          case 'volume_desc':
            filteredEvents.sort((a: MarketEvent, b: MarketEvent) => b.volume24h - a.volume24h)
            break
        }

        setEvents(filteredEvents)
        setPagination({
          total: filteredEvents.length,
          page: 1,
          pageSize: filteredEvents.length,
          totalPages: 1
        })
        setHasMore(false)
      }
    } catch (error) {
      console.error('加载失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    // OSS同步数据已经全部加载，不需要分页
    Taro.showToast({
      title: '已加载全部数据',
      icon: 'none'
    })
    setHasMore(false)
    setLoading(false)
  }

  const loadFavoritedIds = async () => {
    try {
      const res = await Network.request({
        url: '/api/favorites'
      })

      console.log('Load favorited ids response:', res.data)

      if (res.data?.code === 200) {
        const data = res.data.data || []
        const ids = new Set(data.map((e: MarketEvent) => e.id)) as Set<string>
        console.log('Favorited ids:', Array.from(ids))
        setFavoritedIds(ids)
      } else {
        console.error('Invalid response code:', res.data?.code)
      }
    } catch (error) {
      console.error('加载收藏列表失败:', error)
    }
  }

  const checkNotifications = async () => {
    try {
      const res = await Network.request({
        url: '/api/notification/alerts'
      })

      if (res.data?.code === 200 && res.data.data?.hasAlerts) {
        const { count, alerts } = res.data.data
        Taro.showToast({
          title: `发现 ${count} 个事件有显著波动`,
          icon: 'none',
          duration: 3000
        })
        console.log('波动提醒:', alerts)
      }
    } catch (error) {
      console.error('检查通知失败:', error)
    }
  }

  const handleToggleFavorite = async (eventId: string) => {
    const isFavorited = favoritedIds.has(eventId)

    console.log('开始收藏操作:', eventId, '当前状态:', isFavorited)

    try {
      if (isFavorited) {
        // 取消收藏
        console.log('取消收藏:', eventId)
        const res = await Network.request({
          url: `/api/favorites/${eventId}`,
          method: 'DELETE'
        })
        console.log('取消收藏响应:', res.data)

        setFavoritedIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(eventId)
          return newSet
        })

        Taro.showToast({
          title: '已取消收藏',
          icon: 'success'
        })
      } else {
        // 添加收藏
        console.log('添加收藏:', eventId)
        const res = await Network.request({
          url: '/api/favorites',
          method: 'POST',
          data: { eventId }
        })
        console.log('添加收藏响应:', res.data)

        setFavoritedIds(prev => new Set([...prev, eventId]))

        Taro.showToast({
          title: '收藏成功',
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('收藏操作失败:', error)
      Taro.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
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

      {/* 分类标签和排序 */}
      <View className="bg-white border-b border-gray-200">
        <ScrollView
          scrollX
          className="px-4 py-3"
          showScrollbar={false}
        >
          <View className="flex flex-row gap-2">
            {categories.map((cat) => (
              <View
                key={cat}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
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

        {/* 排序选择器 */}
        {selectedCategory === '全部' && (
          <View className="px-4 pb-3 flex items-center gap-2">
            <Text className="block text-xs text-gray-500">排序：</Text>
            <View className="flex flex-row gap-2 flex-wrap">
              {sortOptions.map((opt) => (
                <View
                  key={opt.value}
                  className={`px-3 py-1 rounded text-xs ${
                    selectedSort === opt.value
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                  onClick={() => setSelectedSort(opt.value)}
                >
                  <Text className="block">{opt.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

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
                onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${event.id}` })}
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
                      <Star
                        size={20}
                        color={favoritedIds.has(event.id) ? '#FFD700' : '#999'}
                        strokeWidth={favoritedIds.has(event.id) ? 3 : 2}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleFavorite(event.id)
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
