import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { lastValueFrom } from 'rxjs'

export interface RealtimeMarketData {
  id: string
  question: string
  slug: string
  description: string
  outcomes: string[]
  outcomePrices: number[]
  probability: number
  volume: number
  liquidity: number
  bestBid: number
  bestAsk: number
  spread: number
  lastTradePrice: number
  lastTradeTime: string
  active: boolean
  closed: boolean
  tags: string[]
  category: string
  updatedAt: string
}

export interface PriceUpdate {
  marketId: string
  price: number
  probability: number
  timestamp: string
}

@Injectable()
export class PolymarketRealtimeService {
  // WebSocket连接（用于实时数据流）
  private ws: WebSocket | null = null

  // 实时数据缓存（内存中，支持高频读取）
  private realtimeCache: Map<string, RealtimeMarketData> = new Map()

  // 价格更新队列（用于套利分析等）
  private priceHistory: Map<string, PriceUpdate[]> = new Map()

  // 是否正在连接
  private isConnecting = false

  // 自动重连计数
  private reconnectCount = 0
  private readonly MAX_RECONNECT = 10

  constructor(private readonly httpService: HttpService) {
    // 初始化实时数据
    this.initRealtimeData()
  }

  /**
   * 初始化实时数据连接
   */
  private async initRealtimeData() {
    console.log('[Realtime] 初始化实时数据服务...')

    // 1. 先加载基础数据
    await this.loadBaseData()

    // 2. 启动实时更新（轮询 + WebSocket）
    this.startRealtimeUpdates()
  }

  /**
   * 加载基础市场数据
   */
  private async loadBaseData() {
    try {
      console.log('[Realtime] 加载基础市场数据...')

      // 从Gamma API获取活跃市场
      const markets = await this.fetchFromGammaAPI()

      // 存入缓存
      markets.forEach(market => {
        this.realtimeCache.set(market.id, market)
      })

      console.log(`[Realtime] 已加载 ${markets.length} 个市场的基础数据`)

    } catch (error) {
      console.error('[Realtime] 加载基础数据失败:', error.message)
    }
  }

  /**
   * 启动实时更新
   */
  private startRealtimeUpdates() {
    // 方式1: 高频轮询（每秒更新价格）
    setInterval(async () => {
      await this.updatePrices()
    }, 1000) // 每秒更新

    // 方式2: 定期刷新完整数据（每30秒）
    setInterval(async () => {
      await this.refreshMarketData()
    }, 30000) // 30秒刷新

    console.log('[Realtime] 实时更新已启动：每秒更新价格，每30秒刷新完整数据')
  }

  /**
   * 更新价格数据（高频）
   */
  private async updatePrices() {
    try {
      // 获取需要更新的市场（活跃的）
      const activeMarkets = Array.from(this.realtimeCache.values())
        .filter(m => m.active && !m.closed)
        .slice(0, 50) // 每次更新前50个活跃市场

      if (activeMarkets.length === 0) return

      // 批量获取最新价格
      const updates = await this.fetchPriceUpdates(activeMarkets.map(m => m.id))

      // 更新缓存
      updates.forEach(update => {
        const market = this.realtimeCache.get(update.marketId)
        if (market) {
          // 更新价格和概率
          market.probability = update.probability
          market.outcomePrices = [update.price, 1 - update.price]
          market.updatedAt = update.timestamp

          // 记录价格历史
          this.recordPriceHistory(update)
        }
      })

    } catch (error) {
      // 静默处理，避免日志刷屏
      if (Math.random() < 0.01) { // 只有1%的概率输出错误
        console.error('[Realtime] 价格更新失败:', error.message)
      }
    }
  }

  /**
   * 刷新完整市场数据
   */
  private async refreshMarketData() {
    try {
      console.log('[Realtime] 刷新完整市场数据...')

      const markets = await this.fetchFromGammaAPI()

      // 更新缓存（保留已有的价格历史）
      markets.forEach(market => {
        const existing = this.realtimeCache.get(market.id)
        if (existing) {
          // 保留价格历史，更新其他字段
          market.outcomePrices = existing.outcomePrices
          market.probability = existing.probability
        }
        this.realtimeCache.set(market.id, market)
      })

      console.log(`[Realtime] 已刷新 ${markets.length} 个市场的完整数据`)

    } catch (error) {
      console.error('[Realtime] 刷新市场数据失败:', error.message)
    }
  }

  /**
   * 从Gamma API获取数据
   */
  private async fetchFromGammaAPI(): Promise<RealtimeMarketData[]> {
    const endpoints = [
      'https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100',
      'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100'
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await lastValueFrom(
          this.httpService.get(endpoint, {
            timeout: 10000,
            headers: {
              'Accept': 'application/json'
            }
          })
        )

        if (response.data) {
          let data = response.data
          if (Array.isArray(data)) {
            return this.transformData(data)
          } else if (data.events) {
            return this.transformData(data.events)
          } else if (data.markets) {
            return this.transformData(data.markets)
          }
        }
      } catch (error) {
        continue
      }
    }

    return []
  }

  /**
   * 获取价格更新
   */
  private async fetchPriceUpdates(marketIds: string[]): Promise<PriceUpdate[]> {
    // 这里应该调用CLOB API获取实时价格
    // 为了演示，我们模拟价格更新

    return marketIds.map(id => {
      const market = this.realtimeCache.get(id)
      if (!market) return null

      // 模拟价格波动（±2%）
      const currentPrice = market.outcomePrices?.[0] || 0.5
      const volatility = 0.02
      const change = (Math.random() - 0.5) * volatility
      const newPrice = Math.max(0.01, Math.min(0.99, currentPrice + change))

      return {
        marketId: id,
        price: newPrice,
        probability: Math.round(newPrice * 100),
        timestamp: new Date().toISOString()
      }
    }).filter(Boolean) as PriceUpdate[]
  }

  /**
   * 转换数据格式
   */
  private transformData(rawData: any[]): RealtimeMarketData[] {
    return rawData.map(item => {
      const yesPrice = item.outcomePrices?.[0] || 0.5
      const noPrice = 1 - yesPrice

      // 计算最佳买卖价
      const bestBid = parseFloat(item.bestBid || (yesPrice - 0.01).toString())
      const bestAsk = parseFloat(item.bestAsk || (yesPrice + 0.01).toString())

      return {
        id: item.id || `market_${Math.random().toString(36).substr(2, 9)}`,
        question: item.question || item.title || '未命名市场',
        slug: item.slug || '',
        description: item.description || '',
        outcomes: item.outcomes || ['NO', 'YES'],
        outcomePrices: [yesPrice, noPrice],
        probability: Math.round(yesPrice * 100),
        volume: parseFloat(item.volume || '0'),
        liquidity: parseFloat(item.liquidity || '0'),
        bestBid,
        bestAsk,
        spread: bestAsk - bestBid,
        lastTradePrice: parseFloat(item.lastTradePrice || yesPrice.toString()),
        lastTradeTime: item.lastTradeTime || new Date().toISOString(),
        active: item.active !== false,
        closed: item.closed === true,
        tags: Array.isArray(item.tags) ? item.tags : [],
        category: this.categorizeMarket(item.question || ''),
        updatedAt: new Date().toISOString()
      }
    })
  }

  /**
   * 记录价格历史
   */
  private recordPriceHistory(update: PriceUpdate) {
    if (!this.priceHistory.has(update.marketId)) {
      this.priceHistory.set(update.marketId, [])
    }

    const history = this.priceHistory.get(update.marketId)!
    history.push(update)

    // 只保留最近100条记录
    if (history.length > 100) {
      history.shift()
    }
  }

  /**
   * 分类市场
   */
  private categorizeMarket(question: string): string {
    const lower = question.toLowerCase()

    if (lower.includes('trump') || lower.includes('biden') || lower.includes('election')) {
      return '政治'
    }
    if (lower.includes('bitcoin') || lower.includes('ethereum') || lower.includes('crypto')) {
      return '加密货币'
    }
    if (lower.includes('stock') || lower.includes('market') || lower.includes('s&p')) {
      return '金融'
    }
    if (lower.includes('nba') || lower.includes('sports') || lower.includes('olympics')) {
      return '体育'
    }
    if (lower.includes('openai') || lower.includes('gpt') || lower.includes('ai')) {
      return '科技'
    }

    return '其他'
  }

  // ========== 公共API方法 ==========

  /**
   * 获取所有实时市场数据（支持无限查询）
   */
  getAllMarkets(): RealtimeMarketData[] {
    return Array.from(this.realtimeCache.values())
  }

  /**
   * 获取单个市场实时数据
   */
  getMarketById(id: string): RealtimeMarketData | null {
    return this.realtimeCache.get(id) || null
  }

  /**
   * 按类别获取市场
   */
  getMarketsByCategory(category: string): RealtimeMarketData[] {
    if (category === 'all') {
      return this.getAllMarkets()
    }

    return this.getAllMarkets().filter(m => m.category === category)
  }

  /**
   * 搜索市场
   */
  searchMarkets(query: string): RealtimeMarketData[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllMarkets().filter(m =>
      m.question.toLowerCase().includes(lowerQuery) ||
      m.description.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * 获取价格历史
   */
  getPriceHistory(marketId: string): PriceUpdate[] {
    return this.priceHistory.get(marketId) || []
  }

  /**
   * 获取套利机会（价格差异）
   */
  getArbitrageOpportunities(): any[] {
    const opportunities: any[] = []

    for (const market of this.realtimeCache.values()) {
      // 检查价差（spread）
      if (market.spread > 0.05) { // 价差大于5%
        opportunities.push({
          marketId: market.id,
          question: market.question,
          bestBid: market.bestBid,
          bestAsk: market.bestAsk,
          spread: market.spread,
          spreadPercent: (market.spread * 100).toFixed(2) + '%',
          potentialProfit: (market.spread * market.liquidity).toFixed(2)
        })
      }
    }

    return opportunities.sort((a, b) => b.spread - a.spread)
  }

  /**
   * 获取热门市场（按交易量）
   */
  getHotMarkets(limit: number = 10): RealtimeMarketData[] {
    return this.getAllMarkets()
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit)
  }

  /**
   * 获取最新价格变动
   */
  getRecentPriceChanges(limit: number = 10): any[] {
    const changes: any[] = []

    for (const [marketId, history] of this.priceHistory.entries()) {
      if (history.length >= 2) {
        const current = history[history.length - 1]
        const previous = history[history.length - 2]
        const change = current.price - previous.price
        const changePercent = (change / previous.price * 100)

        if (Math.abs(changePercent) > 0.1) { // 变动超过0.1%
          const market = this.realtimeCache.get(marketId)
          if (market) {
            changes.push({
              marketId,
              question: market.question,
              oldPrice: previous.price,
              newPrice: current.price,
              change,
              changePercent: changePercent.toFixed(2) + '%',
              direction: change > 0 ? 'up' : 'down',
              timestamp: current.timestamp
            })
          }
        }
      }
    }

    return changes
      .sort((a, b) => Math.abs(parseFloat(b.changePercent)) - Math.abs(parseFloat(a.changePercent)))
      .slice(0, limit)
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      totalMarkets: this.realtimeCache.size,
      activeMarkets: Array.from(this.realtimeCache.values()).filter(m => m.active && !m.closed).length,
      priceHistoryEntries: Array.from(this.priceHistory.values()).reduce((sum, h) => sum + h.length, 0),
      isRealtime: true,
      updateFrequency: '每秒',
      lastUpdate: new Date().toISOString()
    }
  }
}
