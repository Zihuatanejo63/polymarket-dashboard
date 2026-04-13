import { View, Text, ScrollView, Canvas } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useState, useEffect } from 'react'
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

  useLoad(() => {
    const { id } = router.params
    if (id) {
      loadEventDetail(id)
      checkFavorited(id)
    }
  })

  const loadEventDetail = async (id: string) => {
    try {
      setLoading(true)
      const res = await Network.request({
        url: `/api/market/events/${id}`
      })

      console.log('Event Detail Response:', res.data)

      if (res.data?.code === 200) {
        setEvent(res.data.data)
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
      '科技': 'bg-blue-100 text-blue-700'
    }
    return colorMap[category] || 'bg-gray-100 text-gray-700'
  }

  // 绘制折线图
  const drawChart = (history7Days: Array<{ date: string; probability: number }>) => {
    if (!history7Days || history7Days.length === 0) return

    const canvasId = 'chartCanvas'
    const query = Taro.createSelectorQuery()
    query.select(`#${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = Taro.getSystemInfoSync().pixelRatio

        canvas.width = res[0].width * dpr
        canvas.height = res[0].height * dpr
        ctx.scale(dpr, dpr)

        const width = res[0].width
        const height = res[0].height
        const padding = 40

        // 清空画布
        ctx.clearRect(0, 0, width, height)

        // 找出最大最小值
        const probabilities = history7Days.map(h => h.probability)
        const max = Math.max(...probabilities, 100)
        const min = Math.min(...probabilities, 0)
        const range = max - min

        // 绘制坐标轴
        ctx.beginPath()
        ctx.strokeStyle = '#E5E7EB'
        ctx.lineWidth = 1
        // X轴
        ctx.moveTo(padding, height - padding)
        ctx.lineTo(width - padding, height - padding)
        // Y轴
        ctx.moveTo(padding, padding)
        ctx.lineTo(padding, height - padding)
        ctx.stroke()

        // 绘制折线
        ctx.beginPath()
        ctx.strokeStyle = '#3B82F6'
        ctx.lineWidth = 2

        const xStep = (width - 2 * padding) / (history7Days.length - 1)

        history7Days.forEach((item, index) => {
          const x = padding + index * xStep
          const y = height - padding - ((item.probability - min) / range) * (height - 2 * padding)

          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })

        ctx.stroke()

        // 绘制数据点
        history7Days.forEach((item, index) => {
          const x = padding + index * xStep
          const y = height - padding - ((item.probability - min) / range) * (height - 2 * padding)

          ctx.beginPath()
          ctx.fillStyle = '#3B82F6'
          ctx.arc(x, y, 4, 0, 2 * Math.PI)
          ctx.fill()
        })

        // 绘制日期标签
        ctx.fillStyle = '#6B7280'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        history7Days.forEach((item, index) => {
          const x = padding + index * xStep
          const date = new Date(item.date)
          const label = `${date.getMonth() + 1}/${date.getDate()}`
          ctx.fillText(label, x, height - padding + 15)
        })
      })
  }

  useEffect(() => {
    if (event?.history7Days) {
      // 延迟绘制，确保 Canvas 已经渲染
      setTimeout(() => {
        drawChart(event.history7Days!)
      }, 100)
    }
  }, [event])

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
      {event.history7Days && event.history7Days.length > 0 && (
        <Card className="m-4">
          <CardHeader>
            <CardTitle className="text-base">7 日走势</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="h-48">
              <Canvas id="chartCanvas" type="2d" className="w-full h-full"></Canvas>
            </View>
          </CardContent>
        </Card>
      )}

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
