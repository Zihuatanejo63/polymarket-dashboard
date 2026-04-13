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
   */
  async getMarkets(): Promise<MarketEvent[]> {
    // TODO: 实现真实的 GeckoTerminal API 调用
    // 目前返回模拟数据
    return this.getMockData()
  }

  /**
   * 获取模拟数据（用于测试）
   */
  private getMockData(): MarketEvent[] {
    return [
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
        id: '5',
        question: '黄金价格将在 2025 年突破 3000 美元吗？',
        probability: 42.3,
        price: 0.423,
        volume24h: 450000,
        liquidity: 1560000,
        category: '金融',
        change24h: -1.2
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
   * 根据分类筛选事件
   */
  filterByCategory(events: MarketEvent[], category?: string): MarketEvent[] {
    if (!category || category === '全部' || category === 'all') {
      return events
    }

    if (category === '热榜') {
      // 返回成交量最高的 10 个事件
      return events
        .sort((a, b) => b.volume24h - a.volume24h)
        .slice(0, 10)
    }

    return events.filter(e => e.category === category)
  }
}
