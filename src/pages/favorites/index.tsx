import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh, stopPullDownRefresh } from '@tarojs/taro'
import { useState } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star } from 'lucide-react-taro'
import { Progress } from '@/components/ui/progress'
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

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState<MarketEvent[]>([])
  const [loading, setLoading] = useState(false)

  useLoad(() => {
    loadFavorites()
  })

  usePullDownRefresh(async () => {
    await loadFavorites()
    stopPullDownRefresh()
  })

  const loadFavorites = async () => {
    setLoading(true)
    try {
      const res = await Network.request({
        url: '/api/favorites'
      })

      console.log('Favorites Response:', res.data)

      if (res.data?.code === 200) {
        setFavorites(res.data.data || [])
      }
    } catch (error) {
      console.error('加载收藏列表失败:', error)
      Taro.showToast({
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

      Taro.showToast({
        title: '已取消收藏',
        icon: 'success'
      })
    } catch (error) {
      console.error('取消收藏失败:', error)
      Taro.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
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
      '科技': 'bg-blue-100 text-blue-700'
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
        ) : favorites.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-20">
            <Star size={48} color="#ddd" strokeWidth={2} className="mb-4" />
            <Text className="block text-center text-gray-500 text-sm mb-2">
              暂无收藏
            </Text>
            <Text className="block text-center text-gray-400 text-xs">
              点击首页卡片的星标添加收藏
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {favorites.map((event) => (
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
                    <Star
                      size={20}
                      color="#FFD700"
                      strokeWidth={3}
                      onClick={() => handleRemoveFavorite(event.id)}
                    />
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
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default FavoritesPage
