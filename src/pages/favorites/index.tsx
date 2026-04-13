import { View, Text, ScrollView } from '@tarojs/components'
import { useLoad, usePullDownRefresh, stopPullDownRefresh, showToast, navigateTo, useDidShow } from '@tarojs/taro'
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

      if (res.data?.code === 200) {
        const data = res.data.data || []
        console.log('解析后的收藏数据:', data)
        console.log('Favorites count:', data.length)
        setFavorites(data)

        if (data.length > 0) {
          console.log('第一个收藏项:', data[0])
        } else {
          console.log('收藏列表为空')
        }
      } else {
        console.error('Invalid response code:', res.data?.code)
        console.error('Error message:', res.data?.msg)
        showToast({
          title: res.data?.msg || '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载收藏列表失败:', error)
      console.error('Error details:', error?.message || error)
      showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
      console.log('加载完成，loading状态:', false)
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const getProbabilityColor = (prob: number) => {
    if (prob >= 70) return '#00E5A0'
    if (prob >= 50) return '#FFB020'
    if (prob >= 30) return '#4A90D9'
    if (prob >= 20) return '#FF4D6A'
    return '#FF1744'
  }

  const getProbabilityLabel = (prob: number) => {
    if (prob >= 70) return '极有可能'
    if (prob >= 50) return '很有希望'
    if (prob >= 30) return '有可能'
    if (prob >= 20) return '不太确定'
    return '机会渺茫'
  }

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      '金融': 'bg-blue-100 text-blue-700',
      '体育': 'bg-green-100 text-green-700',
      '科技': 'bg-purple-100 text-purple-700',
      '其他': 'bg-gray-100 text-gray-700'
    }
    return colorMap[category] || 'bg-gray-100 text-gray-700'
  }

  const handleCardClick = (eventId: string) => {
    navigateTo({
      url: `/pages/detail/index?id=${eventId}`
    })
  }

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView scrollY className="p-4" style={{ paddingBottom: '100px' }}>
        {/* 标题 */}
        <View className="mb-4">
          <Text className="block text-xl font-bold text-gray-900">我的收藏</Text>
          <Text className="block text-sm text-gray-500">
            管理您关注的预测事件
          </Text>
        </View>

        {/* 收藏列表 */}
        {loading ? (
          <View className="flex items-center justify-center py-8">
            <Text className="block text-sm text-gray-500">加载中...</Text>
          </View>
        ) : favorites.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-12">
            <Text className="block text-sm text-gray-500 mb-2">暂无收藏</Text>
            <Text className="block text-xs text-gray-400">
              在首页点击星星图标收藏事件
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {favorites.map((event) => (
              <Card
                key={event.id}
                className="active:bg-gray-50 cursor-pointer"
                onClick={() => handleCardClick(event.id)}
              >
                <CardContent className="p-4">
                  {/* 分类标签和操作按钮 */}
                  <View className="flex items-center justify-between mb-3">
                    <Badge className={getCategoryColor(event.category)}>
                      <Text className="block text-xs">{event.category}</Text>
                    </Badge>
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
