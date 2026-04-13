import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { lastValueFrom } from 'rxjs'

export interface MarketEvent {
  id: string
  question: string
  probability: number
  price: number
  volume24h: number
  liquidity: number
  category: string
  change24h: number
}

export interface FilteredMarketEvent extends MarketEvent {
  isSensitive: boolean
  filterReason?: string
}

@Injectable()
export class MarketService {
  private readonly geckoApiUrl = 'https://api.geckoterminal.com/api/v2'

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  /**
   * 获取 Poly Market 数据
   * 真实 API 对接 GeckoTerminal
   */
  async getMarkets(): Promise<MarketEvent[]> {
    try {
      // 尝试从 GeckoTerminal 获取预测市场数据
      const response = await lastValueFrom(
        this.httpService.get(`${this.geckoApiUrl}/networks/poly_markets/pools`, {
          headers: {
            'Accept': 'application/json',
          },
        })
      )

      if (response.data?.data && Array.isArray(response.data.data)) {
        return this.transformGeckoData(response.data.data)
      }

      // 如果 API 请求失败，返回模拟数据
      console.warn('GeckoTerminal API 请求失败，使用模拟数据')
      return this.getMockData()
    } catch (error) {
      console.error('GeckoTerminal API 错误:', error.message)
      // 返回模拟数据作为降级方案
      return this.getMockData()
    }
  }

  /**
   * 转换 GeckoTerminal 数据为标准格式
   */
  private transformGeckoData(geckoData: any[]): MarketEvent[] {
    return geckoData.map(pool => {
      // 从 attributes 中提取数据
      const attributes = pool.attributes || {}
      const baseToken = attributes.base_token || {}
      const quoteToken = attributes.quote_token || {}

      // 计算概率（从价格推断）
      const price = parseFloat(attributes.price_usd || '0')
      const probability = Math.min(Math.max(price * 100, 0), 100)

      // 根据交易对判断分类
      let category = '其他'
      const tokenSymbol = baseToken.symbol?.toLowerCase() || ''

      if (tokenSymbol.includes('btc') || tokenSymbol.includes('eth') || tokenSymbol.includes('crypto')) {
        category = '金融'
      } else if (tokenSymbol.includes('trump') || tokenSymbol.includes('biden') || tokenSymbol.includes('election')) {
        category = '政治' // 会被过滤掉
      } else if (tokenSymbol.includes('sport') || tokenSymbol.includes('team')) {
        category = '体育'
      } else if (tokenSymbol.includes('ai') || tokenSymbol.includes('tech')) {
        category = '科技'
      }

      return {
        id: pool.id || String(Math.random()),
        question: `${baseToken.name || baseToken.symbol || 'Token'} 的预测市场`,
        probability: parseFloat(probability.toFixed(1)),
        price: parseFloat(price.toFixed(3)),
        volume24h: parseFloat(attributes.volume_usd?.h24 || '0'),
        liquidity: parseFloat(attributes.reserve_in_usd || '0'),
        category,
        change24h: parseFloat(attributes.price_change_percentage?.h24 || '0'),
      }
    })
  }

  /**
   * 获取模拟数据（用于测试）
   */
  private getMockData(): MarketEvent[] {
    return [
      // 金融类
      {
        id: '1',
        question: '美联储将在 2025 年 6 月降息吗？',
        probability: 71.4,
        price: 0.714,
        volume24h: 2100000,
        liquidity: 8500000,
        category: '金融',
        change24h: 12.3
      },
      {
        id: '2',
        question: '比特币将在 2025 年突破 10 万美元吗？',
        probability: 65.2,
        price: 0.652,
        volume24h: 5400000,
        liquidity: 12000000,
        category: '金融',
        change24h: -3.5
      },
      {
        id: '5',
        question: '黄金价格将在 2025 年突破 3000 美元吗？',
        probability: 42.3,
        price: 0.423,
        volume24h: 450000,
        liquidity: 1560000,
        category: '金融',
        change24h: -1.2
      },
      {
        id: '6',
        question: 'Tesla 股价将在 2025 年翻倍吗？',
        probability: 38.5,
        price: 0.385,
        volume24h: 280000,
        liquidity: 920000,
        category: '金融',
        change24h: 2.8
      },
      {
        id: '9',
        question: '标普 500 指数将在 2025 年突破 6000 点吗？',
        probability: 58.7,
        price: 0.587,
        volume24h: 890000,
        liquidity: 3200000,
        category: '金融',
        change24h: 4.5
      },
      {
        id: '10',
        question: '美国失业率将在 2025 年低于 4% 吗？',
        probability: 45.2,
        price: 0.452,
        volume24h: 620000,
        liquidity: 1850000,
        category: '金融',
        change24h: -2.1
      },
      {
        id: '11',
        question: '中国股市将在 2025 年突破 4000 点吗？',
        probability: 35.8,
        price: 0.358,
        volume24h: 1250000,
        liquidity: 4500000,
        category: '金融',
        change24h: 6.7
      },
      {
        id: '12',
        question: '美元兑人民币汇率将在 2025 年突破 8.0 吗？',
        probability: 28.4,
        price: 0.284,
        volume24h: 340000,
        liquidity: 980000,
        category: '金融',
        change24h: 1.3
      },

      // 体育类
      {
        id: '3',
        question: '2025 年奥运会中国代表团金牌数会超过 40 枚吗？',
        probability: 58.7,
        price: 0.587,
        volume24h: 320000,
        liquidity: 890000,
        category: '体育',
        change24h: 5.2
      },
      {
        id: '8',
        question: '中国男足将晋级 2026 世界杯吗？',
        probability: 15.2,
        price: 0.152,
        volume24h: 520000,
        liquidity: 1200000,
        category: '体育',
        change24h: -2.3
      },
      {
        id: '13',
        question: '梅西将在 2025 年世界杯再次夺冠吗？',
        probability: 32.5,
        price: 0.325,
        volume24h: 780000,
        liquidity: 2450000,
        category: '体育',
        change24h: 8.9
      },
      {
        id: '14',
        question: '2025 年温网男单冠军会是德约科维奇吗？',
        probability: 28.7,
        price: 0.287,
        volume24h: 450000,
        liquidity: 1560000,
        category: '体育',
        change24h: -4.5
      },
      {
        id: '15',
        question: 'NBA 2025 赛季总冠军会是勇士队吗？',
        probability: 25.4,
        price: 0.254,
        volume24h: 890000,
        liquidity: 3200000,
        category: '体育',
        change24h: 3.2
      },

      // 科技类
      {
        id: '4',
        question: 'OpenAI 将在 2025 年发布 GPT-5 吗？',
        probability: 45.6,
        price: 0.456,
        volume24h: 780000,
        liquidity: 2100000,
        category: '科技',
        change24h: 8.7
      },
      {
        id: '7',
        question: 'iPhone 17 会搭载屏下摄像头吗？',
        probability: 25.4,
        price: 0.254,
        volume24h: 180000,
        liquidity: 650000,
        category: '科技',
        change24h: 4.1
      },
      {
        id: '16',
        question: '特斯拉全自动驾驶将在 2025 年获得中国批准吗？',
        probability: 48.3,
        price: 0.483,
        volume24h: 650000,
        liquidity: 1800000,
        category: '科技',
        change24h: 12.5
      },
      {
        id: '17',
        question: '苹果将在 2025 年推出折叠屏 iPhone 吗？',
        probability: 22.8,
        price: 0.228,
        volume24h: 420000,
        liquidity: 1340000,
        category: '科技',
        change24h: -1.8
      },
      {
        id: '18',
        question: '量子计算机将在 2025 年实现商业化突破吗？',
        probability: 18.5,
        price: 0.185,
        volume24h: 280000,
        liquidity: 890000,
        category: '科技',
        change24h: 6.3
      },
      {
        id: '19',
        question: 'SpaceX 星舰将在 2025 年成功载人登月吗？',
        probability: 35.7,
        price: 0.357,
        volume24h: 980000,
        liquidity: 3200000,
        category: '科技',
        change24h: 7.2
      },

      // 其他
      {
        id: '20',
        question: '2025 年全球平均气温将再创新高吗？',
        probability: 78.3,
        price: 0.783,
        volume24h: 420000,
        liquidity: 1250000,
        category: '其他',
        change24h: 5.8
      },
      {
        id: '21',
        question: '全球人口将在 2025 年突破 80 亿吗？',
        probability: 82.5,
        price: 0.825,
        volume24h: 180000,
        liquidity: 560000,
        category: '其他',
        change24h: 2.1
      },
      {
        id: '22',
        question: '好莱坞将在 2025 年推出新的票房冠军吗？',
        probability: 42.7,
        price: 0.427,
        volume24h: 350000,
        liquidity: 980000,
        category: '其他',
        change24h: -3.6
      }
    ]
  }

  /**
   * 敏感词过滤
   * 返回过滤后的事件列表和被过滤的事件
   */
  filterMarkets(events: MarketEvent[]): {
    safeEvents: FilteredMarketEvent[]
    filteredEvents: FilteredMarketEvent[]
  } {
    const safeEvents: FilteredMarketEvent[] = []
    const filteredEvents: FilteredMarketEvent[] = []

    for (const event of events) {
      const filterResult = this.checkSensitive(event)
      const filteredEvent = {
        ...event,
        isSensitive: filterResult.isSensitive,
        filterReason: filterResult.reason
      }

      if (filterResult.isSensitive) {
        filteredEvents.push(filteredEvent)
      } else {
        safeEvents.push(filteredEvent)
      }
    }

    return { safeEvents, filteredEvents }
  }

  /**
   * 检查是否包含敏感内容
   */
  private checkSensitive(event: MarketEvent): {
    isSensitive: boolean
    reason?: string
  } {
    const sensitiveKeywords = [
      // 政治敏感词
      '政治', '选举', '投票', '政府', '党派', '领导人',
      '地缘', '冲突', '战争', '恐怖', '暴力',
      // 不适合公开的内容
      '赌博', '博彩', '毒品', '色情'
    ]

    const question = event.question.toLowerCase()
    const category = event.category.toLowerCase()

    // 检查分类是否敏感
    if (category === '政治' || category === '地缘' || category === '娱乐') {
      return { isSensitive: true, reason: '敏感分类' }
    }

    // 检查问题文本是否包含敏感词
    for (const keyword of sensitiveKeywords) {
      if (question.includes(keyword)) {
        return { isSensitive: true, reason: `包含敏感词: ${keyword}` }
      }
    }

    return { isSensitive: false }
  }

  /**
   * 根据分类筛选事件并排序
   */
  filterByCategory(
    events: MarketEvent[],
    category?: string,
    sort?: string
  ): MarketEvent[] {
    let filtered = events

    // 分类筛选
    if (category && category !== '全部' && category !== 'all') {
      if (category === '热榜') {
        // 返回成交量最高的事件
        filtered = events
          .sort((a, b) => b.volume24h - a.volume24h)
          .slice(0, 10)
      } else {
        filtered = events.filter(e => e.category === category)
      }
    }

    // 排序
    if (sort) {
      switch (sort) {
        case 'probability_desc':
          // 概率从高到低
          filtered = [...filtered].sort((a, b) => b.probability - a.probability)
          break
        case 'probability_asc':
          // 概率从低到高
          filtered = [...filtered].sort((a, b) => a.probability - b.probability)
          break
        case 'volume_desc':
          // 成交量从高到低（热榜）
          filtered = [...filtered].sort((a, b) => b.volume24h - a.volume24h)
          break
        case 'change_desc':
          // 波动从高到低
          filtered = [...filtered].sort((a, b) => b.change24h - a.change24h)
          break
        default:
          // 默认按概率降序
          filtered = [...filtered].sort((a, b) => b.probability - a.probability)
      }
    }

    return filtered
  }

  /**
   * 分页获取事件
   */
  getPaginatedEvents(
    events: MarketEvent[],
    page: number = 1,
    pageSize: number = 20
  ): {
    data: MarketEvent[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  } {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedData = events.slice(start, end)

    return {
      data: paginatedData,
      total: events.length,
      page,
      pageSize,
      totalPages: Math.ceil(events.length / pageSize)
    }
  }

  /**
   * 获取事件详情（带历史数据）
   */
  async getEventDetail(id: string): Promise<MarketEvent & { history7Days?: Array<{ date: string; probability: number }> }> {
    const events = await this.getMarkets()
    const { safeEvents } = this.filterMarkets(events)

    const event = safeEvents.find(e => e.id === id)

    if (!event) {
      throw new Error('事件不存在')
    }

    // 生成模拟的 7 天历史数据
    const history7Days = this.generateMockHistory(event.probability, event.change24h)

    return {
      ...event,
      history7Days
    }
  }

  /**
   * 生成模拟的 7 天历史数据
   */
  private generateMockHistory(currentProbability: number, change24h: number): Array<{ date: string; probability: number }> {
    const history: Array<{ date: string; probability: number }> = []
    const today = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)

      // 根据当前概率和变化率模拟历史数据
      let probability = currentProbability - (change24h * (i / 7))
      // 添加一些随机波动
      probability += (Math.random() - 0.5) * 5
      // 确保在 0-100 范围内
      probability = Math.min(Math.max(probability, 0), 100)

      history.push({
        date: date.toISOString().split('T')[0],
        probability: parseFloat(probability.toFixed(1))
      })
    }

    return history
  }
}
