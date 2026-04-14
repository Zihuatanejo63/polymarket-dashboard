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
      // 使用50个高质量模拟数据（基于真实预测市场）
      // 由于国内网络限制，无法直接访问Polymarket API
      // 因此我们提供50个精心设计的真实预测市场事件作为高质量模拟数据
      console.log('[PolymarketProxy] 生成50个高质量模拟数据（基于真实预测市场事件）...')
      let markets: MarketData[] = this.generateHighQualityMockData()
      console.log(`[PolymarketProxy] 成功生成 ${markets.length} 个高质量模拟数据`)

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
        console.warn('[PolymarketProxy] 没有获取到任何真实数据，使用高质量模拟数据')

        // 生成高质量模拟数据
        const mockData = this.generateHighQualityMockData()
        if (mockData.length > 0) {
          this.cachedMarkets = mockData
          this.lastUpdateTime = new Date()
          console.log(`[PolymarketProxy] 使用 ${mockData.length} 个高质量模拟数据`)
          return true
        }

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

  /**
   * 生成高质量模拟数据（当无法获取真实数据时使用）
   * 50个精心设计的预测市场事件：
   * - 10个政治类
   * - 10个加密货币类
   * - 10个科技类
   * - 10个金融类
   * - 10个体育类
   */
  private generateHighQualityMockData(): MarketData[] {
    const mockEvents = [
      // 政治类 (10个)
      {
        id: 'mock_politics_001',
        question: '特朗普会在2024年总统大选中获胜吗？',
        slug: 'trump-win-2024',
        description: '预测唐纳德·特朗普是否会在2024年美国总统大选中获胜',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.45, 0.55],
        probability: 55,
        volume: 12500000,
        liquidity: 2500000,
        active: true,
        closed: false,
        tags: ['politics', 'election', 'trump'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-11-05T00:00:00Z'
      },
      {
        id: 'mock_politics_002',
        question: '拜登会在2024年大选中赢得普选票吗？',
        slug: 'biden-popular-vote-2024',
        description: '预测乔·拜登是否会在2024年大选中赢得普选票',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.38, 0.62],
        probability: 62,
        volume: 8900000,
        liquidity: 1800000,
        active: true,
        closed: false,
        tags: ['politics', 'election', 'biden'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-11-05T00:00:00Z'
      },
      {
        id: 'mock_politics_003',
        question: '共和党会在2024年控制参议院吗？',
        slug: 'republicans-senate-2024',
        description: '预测共和党是否会在2024年选举后控制美国参议院',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.25, 0.75],
        probability: 75,
        volume: 5600000,
        liquidity: 1200000,
        active: true,
        closed: false,
        tags: ['politics', 'senate', 'republican'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-11-05T00:00:00Z'
      },
      {
        id: 'mock_politics_004',
        question: '民主党会在2024年控制众议院吗？',
        slug: 'democrats-house-2024',
        description: '预测民主党是否会在2024年选举后控制美国众议院',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.58, 0.42],
        probability: 42,
        volume: 4300000,
        liquidity: 900000,
        active: true,
        closed: false,
        tags: ['politics', 'house', 'democrat'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-11-05T00:00:00Z'
      },
      {
        id: 'mock_politics_005',
        question: '普京会在2024年继续担任俄罗斯总统吗？',
        slug: 'putin-president-2024',
        description: '预测弗拉基米尔·普京是否会在2024年继续担任俄罗斯总统',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.08, 0.92],
        probability: 92,
        volume: 3200000,
        liquidity: 650000,
        active: true,
        closed: false,
        tags: ['politics', 'putin', 'russia'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_politics_006',
        question: '以色列和哈马斯会在2024年底前达成停火协议吗？',
        slug: 'israel-hamas-ceasefire-2024',
        description: '预测以色列和哈马斯是否会在2024年底前达成停火协议',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.65, 0.35],
        probability: 35,
        volume: 2800000,
        liquidity: 580000,
        active: true,
        closed: false,
        tags: ['politics', 'israel', 'hamas', 'ceasefire'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_politics_007',
        question: '乌克兰会在2024年底前收复克里米亚吗？',
        slug: 'ukraine-crimea-2024',
        description: '预测乌克兰是否会在2024年底前收复克里米亚半岛',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.82, 0.18],
        probability: 18,
        volume: 2100000,
        liquidity: 450000,
        active: true,
        closed: false,
        tags: ['politics', 'ukraine', 'crimea'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_politics_008',
        question: '英国工党会在2024年大选中获胜吗？',
        slug: 'uk-labour-win-2024',
        description: '预测英国工党是否会在2024年大选中获胜',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.12, 0.88],
        probability: 88,
        volume: 1800000,
        liquidity: 380000,
        active: true,
        closed: false,
        tags: ['politics', 'uk', 'labour'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-07-04T00:00:00Z'
      },
      {
        id: 'mock_politics_009',
        question: '莫迪会在2024年印度大选中连任吗？',
        slug: 'modi-reelected-2024',
        description: '预测纳伦德拉·莫迪是否会在2024年印度大选中连任',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.28, 0.72],
        probability: 72,
        volume: 1500000,
        liquidity: 320000,
        active: true,
        closed: false,
        tags: ['politics', 'india', 'modi'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-05-31T00:00:00Z'
      },
      {
        id: 'mock_politics_010',
        question: '欧盟会在2024年底前对TikTok实施禁令吗？',
        slug: 'eu-tiktok-ban-2024',
        description: '预测欧盟是否会在2024年底前对TikTok实施禁令',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.72, 0.28],
        probability: 28,
        volume: 1200000,
        liquidity: 260000,
        active: true,
        closed: false,
        tags: ['politics', 'eu', 'tiktok', 'tech'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },

      // 加密货币类 (10个)
      {
        id: 'mock_crypto_001',
        question: '比特币会在2024年底前突破10万美元吗？',
        slug: 'bitcoin-100k-2024',
        description: '预测比特币价格是否会在2024年底前突破10万美元',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.42, 0.58],
        probability: 58,
        volume: 18500000,
        liquidity: 3800000,
        active: true,
        closed: false,
        tags: ['crypto', 'bitcoin', 'price'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_crypto_002',
        question: '以太坊会在2024年底前突破8000美元吗？',
        slug: 'ethereum-8000-2024',
        description: '预测以太坊价格是否会在2024年底前突破8000美元',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.55, 0.45],
        probability: 45,
        volume: 9800000,
        liquidity: 2100000,
        active: true,
        closed: false,
        tags: ['crypto', 'ethereum', 'price'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_crypto_003',
        question: '美国SEC会在2024年底前批准以太坊ETF吗？',
        slug: 'sec-eth-etf-2024',
        description: '预测美国证券交易委员会是否会在2024年底前批准以太坊ETF',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.25, 0.75],
        probability: 75,
        volume: 7600000,
        liquidity: 1600000,
        active: true,
        closed: false,
        tags: ['crypto', 'ethereum', 'etf', 'sec'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_crypto_004',
        question: 'Solana会在2024年底前进入市值前三吗？',
        slug: 'solana-top3-2024',
        description: '预测Solana是否会在2024年底前进入加密货币市值前三',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.68, 0.32],
        probability: 32,
        volume: 5400000,
        liquidity: 1200000,
        active: true,
        closed: false,
        tags: ['crypto', 'solana', 'marketcap'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_crypto_005',
        question: 'Coinbase会在2024年底前被收购吗？',
        slug: 'coinbase-acquired-2024',
        description: '预测Coinbase是否会在2024年底前被其他公司收购',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.82, 0.18],
        probability: 18,
        volume: 3200000,
        liquidity: 680000,
        active: true,
        closed: false,
        tags: ['crypto', 'coinbase', 'acquisition'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_crypto_006',
        question: '币安创始人CZ会在2024年底前出狱吗？',
        slug: 'cz-released-2024',
        description: '预测币安创始人赵长鹏是否会在2024年底前出狱',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.35, 0.65],
        probability: 65,
        volume: 2800000,
        liquidity: 580000,
        active: true,
        closed: false,
        tags: ['crypto', 'binance', 'cz'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_crypto_007',
        question: '稳定币总市值会在2024年底前突破2000亿美元吗？',
        slug: 'stablecoin-200b-2024',
        description: '预测稳定币总市值是否会在2024年底前突破2000亿美元',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.28, 0.72],
        probability: 72,
        volume: 2100000,
        liquidity: 450000,
        active: true,
        closed: false,
        tags: ['crypto', 'stablecoin', 'marketcap'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_crypto_008',
        question: '至少会有一个国家在2024年底前将比特币作为法定货币吗？',
        slug: 'bitcoin-legal-tender-2024',
        description: '预测是否会有新的国家在2024年底前将比特币作为法定货币',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.62, 0.38],
        probability: 38,
        volume: 1800000,
        liquidity: 380000,
        active: true,
        closed: false,
        tags: ['crypto', 'bitcoin', 'legal-tender'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_crypto_009',
        question: 'NFT市场交易量会在2024年底前回到2021年高点吗？',
        slug: 'nft-volume-2021-levels-2024',
        description: '预测NFT市场交易量是否会在2024年底前回到2021年的高点',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.78, 0.22],
        probability: 22,
        volume: 1400000,
        liquidity: 300000,
        active: true,
        closed: false,
        tags: ['crypto', 'nft', 'volume'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_crypto_010',
        question: 'Ripple会在2024年底前赢得对SEC的诉讼吗？',
        slug: 'ripple-sec-case-2024',
        description: '预测Ripple是否会在2024年底前赢得对美国SEC的诉讼',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.32, 0.68],
        probability: 68,
        volume: 1100000,
        liquidity: 240000,
        active: true,
        closed: false,
        tags: ['crypto', 'ripple', 'sec', 'lawsuit'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },

      // 科技类 (10个)
      {
        id: 'mock_tech_001',
        question: 'OpenAI会在2024年底前发布GPT-5吗？',
        slug: 'openai-gpt5-2024',
        description: '预测OpenAI是否会在2024年底前发布GPT-5模型',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.48, 0.52],
        probability: 52,
        volume: 8200000,
        liquidity: 1700000,
        active: true,
        closed: false,
        tags: ['tech', 'openai', 'gpt5', 'ai'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_tech_002',
        question: '苹果会在2024年底前推出AI iPhone吗？',
        slug: 'apple-ai-iphone-2024',
        description: '预测苹果是否会在2024年底前推出集成AI功能的iPhone',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.38, 0.62],
        probability: 62,
        volume: 6800000,
        liquidity: 1400000,
        active: true,
        closed: false,
        tags: ['tech', 'apple', 'iphone', 'ai'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_tech_003',
        question: '特斯拉会在2024年底前实现完全自动驾驶吗？',
        slug: 'tesla-fsd-2024',
        description: '预测特斯拉是否会在2024年底前实现完全自动驾驶（FSD）',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.72, 0.28],
        probability: 28,
        volume: 5600000,
        liquidity: 1200000,
        active: true,
        closed: false,
        tags: ['tech', 'tesla', 'fsd', 'autonomous'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_tech_004',
        question: 'SpaceX会在2024年底前完成星舰轨道飞行吗？',
        slug: 'spacex-starship-orbit-2024',
        description: '预测SpaceX是否会在2024年底前完成星舰的轨道飞行',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.25, 0.75],
        probability: 75,
        volume: 4200000,
        liquidity: 880000,
        active: true,
        closed: false,
        tags: ['tech', 'spacex', 'starship', 'space'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_tech_005',
        question: '谷歌会在2024年底前推出 Gemini Ultra 吗？',
        slug: 'google-gemini-ultra-2024',
        description: '预测谷歌是否会在2024年底前推出 Gemini Ultra 模型',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.18, 0.82],
        probability: 82,
        volume: 3100000,
        liquidity: 650000,
        active: true,
        closed: false,
        tags: ['tech', 'google', 'gemini', 'ai'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_tech_006',
        question: 'Meta会在2024年底前发布AR眼镜吗？',
        slug: 'meta-ar-glasses-2024',
        description: '预测Meta是否会在2024年底前发布消费级AR眼镜',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.58, 0.42],
        probability: 42,
        volume: 2400000,
        liquidity: 500000,
        active: true,
        closed: false,
        tags: ['tech', 'meta', 'ar', 'glasses'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_tech_007',
        question: '英伟达市值会在2024年底前超过苹果吗？',
        slug: 'nvidia-market-cap-apple-2024',
        description: '预测英伟达市值是否会在2024年底前超过苹果',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.65, 0.35],
        probability: 35,
        volume: 1800000,
        liquidity: 380000,
        active: true,
        closed: false,
        tags: ['tech', 'nvidia', 'apple', 'marketcap'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_tech_008',
        question: 'TikTok会在2024年底前在美国被禁吗？',
        slug: 'tiktok-ban-us-2024',
        description: '预测TikTok是否会在2024年底前在美国被禁止',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.42, 0.58],
        probability: 58,
        volume: 1500000,
        liquidity: 320000,
        active: true,
        closed: false,
        tags: ['tech', 'tiktok', 'ban', 'us'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_tech_009',
        question: '量子计算机会在2024年底前实现量子霸权吗？',
        slug: 'quantum-supremacy-2024',
        description: '预测量子计算机是否会在2024年底前实现量子霸权',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.72, 0.28],
        probability: 28,
        volume: 1200000,
        liquidity: 260000,
        active: true,
        closed: false,
        tags: ['tech', 'quantum', 'computing'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_tech_010',
        question: '脑机接口会在2024年底前获得FDA批准吗？',
        slug: 'brain-computer-interface-fda-2024',
        description: '预测脑机接口技术是否会在2024年底前获得FDA批准',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.82, 0.18],
        probability: 18,
        volume: 980000,
        liquidity: 210000,
        active: true,
        closed: false,
        tags: ['tech', 'bci', 'neuralink', 'fda'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },

      // 金融类 (10个)
      {
        id: 'mock_finance_001',
        question: '美联储会在2024年底前降息吗？',
        slug: 'fed-rate-cut-2024',
        description: '预测美联储是否会在2024年底前降息',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.32, 0.68],
        probability: 68,
        volume: 8500000,
        liquidity: 1800000,
        active: true,
        closed: false,
        tags: ['finance', 'fed', 'interest-rate'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_finance_002',
        question: '标普500指数会在2024年底前上涨超过10%吗？',
        slug: 'sp500-gain-10-percent-2024',
        description: '预测标普500指数是否会在2024年底前上涨超过10%',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.45, 0.55],
        probability: 55,
        volume: 6200000,
        liquidity: 1300000,
        active: true,
        closed: false,
        tags: ['finance', 'sp500', 'stock-market'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_finance_003',
        question: '黄金价格会在2024年底前突破2500美元吗？',
        slug: 'gold-2500-2024',
        description: '预测黄金价格是否会在2024年底前突破2500美元/盎司',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.38, 0.62],
        probability: 62,
        volume: 4800000,
        liquidity: 1000000,
        active: true,
        closed: false,
        tags: ['finance', 'gold', 'commodity'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_finance_004',
        question: '原油价格会在2024年底前突破100美元吗？',
        slug: 'oil-100-2024',
        description: '预测原油价格是否会在2024年底前突破100美元/桶',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.52, 0.48],
        probability: 48,
        volume: 3600000,
        liquidity: 760000,
        active: true,
        closed: false,
        tags: ['finance', 'oil', 'commodity'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_finance_005',
        question: '美元/人民币汇率会在2024年底前跌破7吗？',
        slug: 'usdcny-below-7-2024',
        description: '预测美元/人民币汇率是否会在2024年底前跌破7',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.65, 0.35],
        probability: 35,
        volume: 2800000,
        liquidity: 580000,
        active: true,
        closed: false,
        tags: ['finance', 'forex', 'usd', 'cny'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_finance_006',
        question: '日本央行会在2024年底前结束负利率政策吗？',
        slug: 'boj-negative-rate-2024',
        description: '预测日本央行是否会在2024年底前结束负利率政策',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.42, 0.58],
        probability: 58,
        volume: 2200000,
        liquidity: 460000,
        active: true,
        closed: false,
        tags: ['finance', 'boj', 'interest-rate', 'japan'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_finance_007',
        question: '特斯拉股价会在2024年底前突破300美元吗？',
        slug: 'tesla-stock-300-2024',
        description: '预测特斯拉股价是否会在2024年底前突破300美元',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.55, 0.45],
        probability: 45,
        volume: 1800000,
        liquidity: 380000,
        active: true,
        closed: false,
        tags: ['finance', 'tesla', 'stock'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_finance_008',
        question: '房地产市场会在2024年底前触底反弹吗？',
        slug: 'real-estate-bottom-2024',
        description: '预测美国房地产市场是否会在2024年底前触底反弹',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.48, 0.52],
        probability: 52,
        volume: 1500000,
        liquidity: 320000,
        active: true,
        closed: false,
        tags: ['finance', 'real-estate', 'housing'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_finance_009',
        question: '至少会有一家大型银行在2024年底前倒闭吗？',
        slug: 'bank-failure-2024',
        description: '预测是否会有至少一家大型银行在2024年底前倒闭',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.78, 0.22],
        probability: 22,
        volume: 1200000,
        liquidity: 260000,
        active: true,
        closed: false,
        tags: ['finance', 'bank', 'crisis'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },
      {
        id: 'mock_finance_010',
        question: '全球通胀率会在2024年底前降至3%以下吗？',
        slug: 'global-inflation-3-percent-2024',
        description: '预测全球通胀率是否会在2024年底前降至3%以下',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.35, 0.65],
        probability: 65,
        volume: 980000,
        liquidity: 210000,
        active: true,
        closed: false,
        tags: ['finance', 'inflation', 'economy'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T00:00:00Z'
      },

      // 体育类 (10个)
      {
        id: 'mock_sports_001',
        question: '美国会在2024年巴黎奥运会上获得最多金牌吗？',
        slug: 'usa-olympics-gold-2024',
        description: '预测美国是否会在2024年巴黎奥运会上获得最多的金牌',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.32, 0.68],
        probability: 68,
        volume: 3200000,
        liquidity: 680000,
        active: true,
        closed: false,
        tags: ['sports', 'olympics', 'usa'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-08-11T00:00:00Z'
      },
      {
        id: 'mock_sports_002',
        question: '梅西会在2024年赢得金球奖吗？',
        slug: 'messi-ballon-dor-2024',
        description: '预测梅西是否会在2024年赢得金球奖',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.55, 0.45],
        probability: 45,
        volume: 2800000,
        liquidity: 580000,
        active: true,
        closed: false,
        tags: ['sports', 'football', 'messi'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-10-28T00:00:00Z'
      },
      {
        id: 'mock_sports_003',
        question: '皇马会在2023-24赛季赢得欧冠冠军吗？',
        slug: 'real-madrid-champions-league-2024',
        description: '预测皇家马德里是否会在2023-24赛季赢得欧冠冠军',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.25, 0.75],
        probability: 75,
        volume: 2400000,
        liquidity: 500000,
        active: true,
        closed: false,
        tags: ['sports', 'football', 'real-madrid'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-06-01T00:00:00Z'
      },
      {
        id: 'mock_sports_004',
        question: 'NBA总决赛会在2024年打到抢七吗？',
        slug: 'nba-finals-game7-2024',
        description: '预测2024年NBA总决赛是否会打到第七场',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.38, 0.62],
        probability: 62,
        volume: 1800000,
        liquidity: 380000,
        active: true,
        closed: false,
        tags: ['sports', 'nba', 'basketball'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-06-15T00:00:00Z'
      },
      {
        id: 'mock_sports_005',
        question: 'F1 2024年车手总冠军会是维斯塔潘吗？',
        slug: 'verstappen-f1-champion-2024',
        description: '预测马克斯·维斯塔潘是否会赢得2024年F1车手总冠军',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.15, 0.85],
        probability: 85,
        volume: 1500000,
        liquidity: 320000,
        active: true,
        closed: false,
        tags: ['sports', 'f1', 'verstappen'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-08T00:00:00Z'
      },
      {
        id: 'mock_sports_006',
        question: '中国队会在2024年巴黎奥运会上获得至少40枚金牌吗？',
        slug: 'china-olympics-40-gold-2024',
        description: '预测中国队是否会在2024年巴黎奥运会上获得至少40枚金牌',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.48, 0.52],
        probability: 52,
        volume: 1200000,
        liquidity: 260000,
        active: true,
        closed: false,
        tags: ['sports', 'olympics', 'china'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-08-11T00:00:00Z'
      },
      {
        id: 'mock_sports_007',
        question: '德约科维奇会在2024年赢得法网冠军吗？',
        slug: 'djokovic-french-open-2024',
        description: '预测诺瓦克·德约科维奇是否会在2024年赢得法网冠军',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.68, 0.32],
        probability: 32,
        volume: 980000,
        liquidity: 210000,
        active: true,
        closed: false,
        tags: ['sports', 'tennis', 'djokovic'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-06-09T00:00:00Z'
      },
      {
        id: 'mock_sports_008',
        question: 'C罗会在2024年欧洲杯上进球超过5个吗？',
        slug: 'ronaldo-euro-2024-goals',
        description: '预测克里斯蒂亚诺·罗纳尔多是否会在2024年欧洲杯上进球超过5个',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.58, 0.42],
        probability: 42,
        volume: 850000,
        liquidity: 180000,
        active: true,
        closed: false,
        tags: ['sports', 'football', 'ronaldo'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-07-14T00:00:00Z'
      },
      {
        id: 'mock_sports_009',
        question: '印度会在2024年T20板球世界杯上夺冠吗？',
        slug: 'india-t20-world-cup-2024',
        description: '预测印度是否会在2024年T20板球世界杯上夺冠',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.45, 0.55],
        probability: 55,
        volume: 720000,
        liquidity: 150000,
        active: true,
        closed: false,
        tags: ['sports', 'cricket', 'india'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-06-29T00:00:00Z'
      },
      {
        id: 'mock_sports_010',
        question: '奥运会在2024年会被抵制吗？',
        slug: 'olympics-boycott-2024',
        description: '预测是否会有国家在2024年巴黎奥运会前宣布抵制',
        outcomes: ['NO', 'YES'],
        outcomePrices: [0.88, 0.12],
        probability: 12,
        volume: 650000,
        liquidity: 140000,
        active: true,
        closed: false,
        tags: ['sports', 'olympics', 'boycott'],
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-07-26T00:00:00Z'
      }
    ]

    // 将模拟数据转换为标准格式
    return mockEvents.map(event => ({
      ...event,
      updatedAt: new Date().toISOString()
    }))
  }
}
