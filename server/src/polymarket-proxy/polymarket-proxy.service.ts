import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { lastValueFrom } from 'rxjs'
import { PolymarketService } from '../polymarket/polymarket.service'

export interface MarketData {
  id: string
  question: string
  slug: string
  description: string
  outcomes: string[]
  outcomePrices: number[]
  probability: number
  volume: number
  liquidity: number
  active: boolean
  closed: boolean
  tags: string[]
  image?: string
  createdAt: string
  expiresAt: string
  updatedAt: string
}

@Injectable()
export class PolymarketProxyService {
  // 缓存数据
  private cachedMarkets: MarketData[] = []
  private lastUpdateTime: Date | null = null
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

  // 是否在更新中
  private isUpdating = false

  constructor(
    private readonly httpService: HttpService,
    private readonly polymarketService: PolymarketService
  ) {
    // 启动时立即更新数据
    this.updateCache()

    // 设置定时更新（每5分钟）
    setInterval(() => {
      this.updateCache()
    }, this.CACHE_DURATION)
  }

  /**
   * 获取所有市场数据（从缓存，支持无限查询）
   */
  async getAllMarkets(): Promise<MarketData[]> {
    // 如果缓存为空且不在更新中，立即更新
    if (this.cachedMarkets.length === 0 && !this.isUpdating) {
      await this.updateCache()
    }

    return this.cachedMarkets
  }

  /**
   * 获取单个市场详情（从缓存）
   */
  async getMarketById(id: string): Promise<MarketData | null> {
    const market = this.cachedMarkets.find(m => m.id === id)
    return market || null
  }

  /**
   * 根据标签获取市场（从缓存）
   */
  async getMarketsByTag(tag: string): Promise<MarketData[]> {
    return this.cachedMarkets.filter(m =>
      m.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
    )
  }

  /**
   * 根据类别获取市场（从缓存）
   */
  async getMarketsByCategory(category: string): Promise<MarketData[]> {
    if (category === 'all') {
      return this.cachedMarkets
    }

    return this.cachedMarkets.filter(m => {
      const question = m.question.toLowerCase()
      switch (category) {
        case 'politics':
          return question.includes('election') ||
                 question.includes('trump') ||
                 question.includes('biden') ||
                 question.includes('politics')
        case 'crypto':
          return question.includes('bitcoin') ||
                 question.includes('ethereum') ||
                 question.includes('crypto')
        case 'sports':
          return question.includes('sports') ||
                 question.includes('nba') ||
                 question.includes('football')
        case 'finance':
          return question.includes('stock') ||
                 question.includes('market') ||
                 question.includes('finance')
        default:
          return true
      }
    })
  }

  /**
   * 搜索市场（从缓存）
   */
  async searchMarkets(query: string): Promise<MarketData[]> {
    const lowerQuery = query.toLowerCase()
    return this.cachedMarkets.filter(m =>
      m.question.toLowerCase().includes(lowerQuery) ||
      m.description.toLowerCase().includes(lowerQuery) ||
      m.tags.some(t => t.toLowerCase().includes(lowerQuery))
    )
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus() {
    return {
      total: this.cachedMarkets.length,
      lastUpdate: this.lastUpdateTime,
      isUpdating: this.isUpdating,
      nextUpdate: this.lastUpdateTime
        ? new Date(this.lastUpdateTime.getTime() + this.CACHE_DURATION)
        : null
    }
  }

  /**
   * 强制刷新缓存
   */
  async forceRefresh(): Promise<boolean> {
    return await this.updateCache()
  }

  /**
   * 更新缓存数据
   */
  private async updateCache(): Promise<boolean> {
    if (this.isUpdating) {
      console.log('[PolymarketProxy] 更新正在进行中，跳过')
      return false
    }

    this.isUpdating = true
    console.log('[PolymarketProxy] 开始更新缓存数据...')

    try {
      // 尝试多种方式获取数据
      let markets: MarketData[] = []

      // 方式1: 使用PolymarketService获取数据
      try {
        console.log('[PolymarketProxy] 尝试从PolymarketService获取数据...')
        const data = await this.polymarketService.fetchPolymarketData()
        if (data && data.length > 0) {
          markets = this.transformData(data)
          console.log(`[PolymarketProxy] 从PolymarketService获取了 ${markets.length} 个市场`)
        }
      } catch (error) {
        console.error('[PolymarketProxy] PolymarketService获取失败:', error.message)
      }

      // 方式2: 直接调用Gamma API
      if (markets.length === 0) {
        try {
          console.log('[PolymarketProxy] 尝试直接调用Gamma API...')
          markets = await this.fetchFromGammaAPI()
          console.log(`[PolymarketProxy] 从Gamma API获取了 ${markets.length} 个市场`)
        } catch (error) {
          console.error('[PolymarketProxy] Gamma API获取失败:', error.message)
        }
      }

      // 更新缓存
      if (markets.length > 0) {
        this.cachedMarkets = markets
        this.lastUpdateTime = new Date()
        console.log(`[PolymarketProxy] 缓存更新成功，共 ${markets.length} 个市场`)
        return true
      } else {
        console.warn('[PolymarketProxy] 没有获取到任何数据')
        return false
      }

    } catch (error) {
      console.error('[PolymarketProxy] 更新缓存失败:', error.message)
      return false
    } finally {
      this.isUpdating = false
    }
  }

  /**
   * 直接从Gamma API获取数据
   */
  private async fetchFromGammaAPI(): Promise<MarketData[]> {
    // Gamma API端点
    const endpoints = [
      'https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100',
      'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100'
    ]

    for (const endpoint of endpoints) {
      try {
        console.log(`[PolymarketProxy] 尝试端点: ${endpoint}`)

        const response = await lastValueFrom(
          this.httpService.get(endpoint, {
            timeout: 15000,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0'
            }
          })
        )

        if (response.data) {
          let data = response.data

          // 处理不同的响应格式
          if (Array.isArray(data)) {
            return this.transformData(data)
          } else if (data.events && Array.isArray(data.events)) {
            return this.transformData(data.events)
          } else if (data.markets && Array.isArray(data.markets)) {
            return this.transformData(data.markets)
          }
        }
      } catch (error) {
        console.error(`[PolymarketProxy] 端点 ${endpoint} 失败:`, error.message)
        continue
      }
    }

    return []
  }

  /**
   * 转换数据格式
   */
  private transformData(rawData: any[]): MarketData[] {
    return rawData.map(item => {
      // 提取价格并计算概率
      let probability = 50
      if (item.outcomePrices && item.outcomePrices.length > 0) {
        probability = Math.round(parseFloat(item.outcomePrices[0]) * 100)
      } else if (item.bestBid && item.bestAsk) {
        const midPrice = (parseFloat(item.bestBid) + parseFloat(item.bestAsk)) / 2
        probability = Math.round(midPrice * 100)
      }

      return {
        id: item.id || item.marketId || `market_${Math.random().toString(36).substr(2, 9)}`,
        question: item.question || item.title || '未命名市场',
        slug: item.slug || '',
        description: item.description || '',
        outcomes: item.outcomes || ['NO', 'YES'],
        outcomePrices: item.outcomePrices || [0.5, 0.5],
        probability,
        volume: parseFloat(item.volume || '0'),
        liquidity: parseFloat(item.liquidity || '0'),
        active: item.active !== false,
        closed: item.closed === true,
        tags: Array.isArray(item.tags) ? item.tags : [],
        image: item.image || item.icon,
        createdAt: item.creationTime || item.createdAt || new Date().toISOString(),
        expiresAt: item.expirationTime || item.expiresAt || '',
        updatedAt: new Date().toISOString()
      }
    })
  }
}
