import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { Network } from '@/network'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Star } from 'lucide-react-taro'
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
  history7Days?: Array<{ date: string; probability: number }>
}

const DetailPage = () => {
  const router = useRouter()
  const [event, setEvent] = useState<MarketEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [favorited, setFavorited] = useState(false)
  const [historyData, setHistoryData] = useState<Array<{ date: string; probability: number }>>([])

  useLoad(() => {
    const { id } = router.params
    if (id) {
      loadEventDetail(id)
      loadMarketHistory(id)
      checkFavorited(id)
    }
  })

  // 从COS获取市场历史数据
  const loadMarketHistory = async (id: string) => {
    try {
      const res = await Network.request({
        url: '/api/polymarket-oss/history'
      })

      console.log('Market History Response:', res.data)

      if (res.data?.code === 200 && res.data.data?.snapshots) {
        const snapshots = res.data.data.snapshots
        const marketHistory: Array<{ date: string; probability: number }> = []

        // 从每个快照中提取该市场的概率
        snapshots.forEach((snapshot: { timestamp: string; markets: Array<{ id: string; probability: number }> }) => {
          const market = snapshot.markets.find((m: { id: string; probability: number }) => m.id === id)
          if (market) {
            const date = new Date(snapshot.timestamp)
            marketHistory.push({
              date: date.toISOString().split('T')[0],
              probability: market.probability
            })
          }
        })

        // 只保留最近7天的数据，每天取最后一个值
        const last7Days = marketHistory.slice(-7)
        setHistoryData(last7Days)
      }
    } catch (error) {
      console.error('加载历史数据失败:', error)
      // 失败时使用空数组，不显示历史
      setHistoryData([])
    }
  }

  const loadEventDetail = async (id: string) => {
    try {
      setLoading(true)
      // 使用OSS同步端点获取真实市场数据
      const res = await Network.request({
        url: `/api/polymarket-oss/markets/${id}`
      })

      console.log('OSS Event Detail Response:', res.data)

      if (res.data?.code === 200) {
        const m = res.data.data
        // 使用后端返回的翻译后数据
        const formattedEvent: MarketEvent = {
          id: m.id,
          question: m.question,
          probability: Number(m.probabilityRaw || m.probability),
          price: parseFloat(m.outcomePrices?.[1]) || m.probability / 100 || 0,
          volume24h: Number(m.volume),
          liquidity: Number(m.liquidity),
          category: m.categoryZh || m.tags?.[0]?.label || m.tags?.[0] || '其他',
          change24h: m.change24h || 0,
          history7Days: historyData.length > 0 ? historyData : undefined
        }
        setEvent(formattedEvent)
      }
    } catch (error) {
      console.error('加载事件详情失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  const checkFavorited = async (id: string) => {
    try {
      const res = await Network.request({
        url: `/api/favorites/check/${id}`
      })

      if (res.data?.code === 200) {
        setFavorited(res.data.data.isFavorited)
      }
    } catch (error) {
      console.error('检查收藏状态失败:', error)
    }
  }

  const handleToggleFavorite = async () => {
    if (!event) return

    try {
      if (favorited) {
        await Network.request({
          url: `/api/favorites/${event.id}`,
          method: 'DELETE'
        })
        setFavorited(false)
        Taro.showToast({
          title: '已取消收藏',
          icon: 'success'
        })
      } else {
        await Network.request({
          url: '/api/favorites',
          method: 'POST',
          data: { eventId: event.id }
        })
        setFavorited(true)
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

  if (loading) {
    return (
      <View className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Text className="block text-sm text-gray-500">加载中...</Text>
      </View>
    )
  }

  if (!event) {
    return (
      <View className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Text className="block text-sm text-gray-500">事件不存在</Text>
      </View>
    )
  }

  return (
    <ScrollView
      scrollY
      className="min-h-screen bg-gray-50"
    >
      {/* 顶部信息 */}
      <View className="bg-white px-4 py-6 border-b border-gray-200">
        {/* 分类标签和收藏按钮 */}
        <View className="flex items-center justify-between mb-4">
          <Badge className={getCategoryColor(event.category)}>
            <Text className="block text-xs">{event.category}</Text>
          </Badge>
          <Star
            size={24}
            color={favorited ? '#FFD700' : '#999'}
            strokeWidth={favorited ? 3 : 2}
            onClick={handleToggleFavorite}
          />
        </View>

        {/* 问题文本 */}
        <Text className="block text-lg font-semibold text-gray-900 mb-4 leading-relaxed">
          {event.question}
        </Text>

        {/* 概率展示 */}
        <View className="bg-gray-50 rounded-2xl p-4 mb-4">
          <View className="flex items-center justify-between mb-2">
            <Text
              className="block text-base font-semibold"
              style={{ color: getProbabilityColor(event.probability) }}
            >
              {getProbabilityLabel(event.probability)}
            </Text>
            <Text
              className="block text-3xl font-bold"
              style={{ color: getProbabilityColor(event.probability) }}
            >
              {event.probability.toFixed(1)}%
            </Text>
          </View>
          <Progress
            value={event.probability}
            className="h-3"
            style={{
              '--progress-background': getProbabilityColor(event.probability)
            } as any}
          />
        </View>

        {/* 价格信息 */}
        <View className="flex items-center gap-4">
          <View>
            <Text className="block text-xs text-gray-500 mb-1">当前价格</Text>
            <Text className="block text-lg font-bold text-gray-900">
              ${event.price.toFixed(3)}
            </Text>
          </View>
          <View>
            <Text className="block text-xs text-gray-500 mb-1">24h 波动</Text>
            <Text
              className={`block text-lg font-bold ${
                event.change24h >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {event.change24h >= 0 ? '+' : ''}{event.change24h.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* 7 日走势图 */}
      <Card className="m-4">
        <CardHeader>
          <CardTitle className="text-base">📈 7日走势</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <View className="space-y-3">
            {event.history7Days?.map((item, index) => {
              const isToday = index === (event.history7Days?.length || 0) - 1
              const date = new Date(item.date)
              const dateStr = `${date.getMonth() + 1}/${date.getDate()}`

              return (
                <View key={item.date} className="flex items-center gap-3">
                  <Text className={`block text-xs w-12 ${isToday ? 'font-bold text-blue-600' : 'text-gray-500'}`}>
                    {dateStr}{isToday ? ' (今)' : ''}
                  </Text>
                  <View className="flex-1">
                    <Progress
                      value={item.probability}
                      className="h-2"
                      style={{
                        '--progress-background': getProbabilityColor(item.probability)
                      } as any}
                    />
                  </View>
                  <Text
                    className={`block text-xs w-12 text-right ${isToday ? 'font-bold' : 'text-gray-600'}`}
                    style={{ color: getProbabilityColor(item.probability) }}
                  >
                    {item.probability.toFixed(1)}%
                  </Text>
                </View>
              )
            })}
          </View>
        </CardContent>
      </Card>

      {/* 市场数据 */}
      <Card className="mx-4 mb-4">
        <CardHeader>
          <CardTitle className="text-base">市场数据</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <View className="flex items-center justify-between">
            <Text className="block text-sm text-gray-600">24h 成交量</Text>
            <Text className="block text-sm font-semibold text-gray-900">
              {formatNumber(event.volume24h)}
            </Text>
          </View>
          <View className="flex items-center justify-between">
            <Text className="block text-sm text-gray-600">流动性</Text>
            <Text className="block text-sm font-semibold text-gray-900">
              {formatNumber(event.liquidity)}
            </Text>
          </View>
        </CardContent>
      </Card>

      {/* 免责声明 */}
      <View className="px-4 pb-8">
        <View className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <Text className="block text-xs text-yellow-800 leading-relaxed">
            ⚠️ 免责声明：本产品仅供信息参考，不构成投资建议。预测市场存在风险，请谨慎决策。
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}

export default DetailPage
