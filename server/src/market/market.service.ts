import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { lastValueFrom } from 'rxjs'
import { PolymarketService } from '../polymarket/polymarket.service'
import { PolymarketGoldskyService } from '../polymarket-goldsky/polymarket-goldsky.service'
import { PolymarketDuneService } from '../polymarket-dune/polymarket-dune.service'

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
  private cachedEvents: MarketEvent[] | null = null
  private cacheExpiry: Date | null = null
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private polymarketService: PolymarketService,
    private goldskyService: PolymarketGoldskyService,
    private duneService: PolymarketDuneService,
  ) {}

  /**
   * 获取 Poly Market 数据
   * 优先顺序：Dune -> Goldsky -> Poly Market 官方 API -> 模拟数据
   */
  async getMarkets(): Promise<MarketEvent[]> {
    // 检查缓存
    if (this.cachedEvents && this.cacheExpiry && new Date() < this.cacheExpiry) {
      console.log('使用缓存数据')
      return this.cachedEvents
    }

    try {
      // 优先尝试从 Dune Analytics 获取真实数据
      console.log('[MarketService] 尝试从 Dune Analytics 获取真实数据...')
      const duneEvents = await this.duneService.getActiveMarkets()
      console.log(`[MarketService] 从 Dune Analytics 获取了 ${duneEvents.length} 个事件`)

      if (duneEvents.length > 0) {
        // 转换数据格式
        const transformedEvents = this.transformDuneToMarket(duneEvents)

        // 更新缓存
        this.cachedEvents = transformedEvents
        this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION)

        console.log(`[MarketService] 成功使用 Dune Analytics 真实数据，共 ${transformedEvents.length} 个事件`)
        return transformedEvents
      }
    } catch (error) {
      console.error('[MarketService] 从 Dune Analytics 获取数据失败:', error.message)
    }

    try {
      // Dune 失败，尝试从 Goldsky 获取真实数据
      console.log('[MarketService] 尝试从 Goldsky 获取真实数据...')
      const goldskyEvents = await this.goldskyService.getActiveMarkets()
      console.log(`[MarketService] 从 Goldsky 获取了 ${goldskyEvents.length} 个事件`)

      if (goldskyEvents.length > 0) {
        // 转换数据格式
        const transformedEvents = this.transformGoldskyToMarket(goldskyEvents)

        // 更新缓存
        this.cachedEvents = transformedEvents
        this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION)

        console.log(`[MarketService] 成功使用 Goldsky 真实数据，共 ${transformedEvents.length} 个事件`)
        return transformedEvents
      }
    } catch (error) {
      console.error('[MarketService] 从 Goldsky 获取数据失败:', error.message)
    }

    try {
      // Goldsky 失败，尝试从 Poly Market 官方 API 获取真实数据
      console.log('[MarketService] 尝试从 Poly Market 官方 API 获取数据...')
      const polymarketData = await this.polymarketService.fetchPolymarketData()
      console.log(`从 Poly Market 获取了 ${polymarketData.length} 个真实事件`)

      // 转换数据格式
      const transformedEvents = this.transformPolymarketToMarket(polymarketData)

      // 更新缓存
      this.cachedEvents = transformedEvents
      this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION)

      return transformedEvents
    } catch (error) {
      console.error('[MarketService] 获取 Poly Market 真实数据失败:', error.message)
      console.log('[MarketService] 使用模拟数据作为降级方案')

      // 返回缓存的模拟数据（如果存在）
      if (this.cachedEvents) {
        return this.cachedEvents
      }

      // 如果没有缓存，生成模拟数据
      const mockData = this.getMockData()
      this.cachedEvents = mockData
      this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION)

      return mockData
    }
  }

  /**
   * 转换 Dune 数据为标准格式
   */
  private transformDuneToMarket(duneEvents: any[]): MarketEvent[] {
    return duneEvents.map(event => {
      // 从 Dune 数据中提取信息
      const question = event.question || '未命名事件'
      const yesPrice = event.outcomePrices?.[0] || 0.5

      // 根据 question 内容自动分类
      const category = this.categorizeEvent(question)

      // 概率已经在 duneEvents 中计算过了
      const probability = event.probability || Math.round(yesPrice * 100)

      // 计算24小时变化（这里默认为0，因为Dune可能不提供这个数据）
      const change24h = 0

      return {
        id: event.id || `dune_${Math.random().toString(36).substr(2, 9)}`,
        question,
        probability,
        price: yesPrice,
        volume24h: event.volume || 0,
        liquidity: event.liquidity || 0,
        category,
        change24h
      }
    })
  }

  /**
   * 转换 Goldsky 数据为标准格式
   */
  private transformGoldskyToMarket(goldskyEvents: any[]): MarketEvent[] {
    return goldskyEvents.map(event => {
      // 从 Goldsky 数据中提取信息
      const question = event.question || '未命名事件'
      const yesPrice = event.outcomePrices?.[0] || 0.5

      // 根据 question 内容自动分类
      const category = this.categorizeEvent(question)

      // 概率已经在 goldskyEvents 中计算过了
      const probability = event.probability || Math.round(yesPrice * 100)

      // 计算24小时变化（这里默认为0，因为Goldsky可能不提供这个数据）
      const change24h = 0

      return {
        id: event.id || `goldsky_${Math.random().toString(36).substr(2, 9)}`,
        question,
        probability,
        price: yesPrice,
        volume24h: event.volume || 0,
        liquidity: event.liquidity || 0,
        category,
        change24h
      }
    })
  }

  /**
   * 转换 Poly Market 数据为标准格式
   */
  private transformPolymarketToMarket(polymarketEvents: any[]): MarketEvent[] {
    return polymarketEvents.map(event => {
      // 从 Poly Market 数据中提取信息
      const question = event.question || event.title || '未命名事件'
      const outcomePrices = event.outcomePrices || {}
      const yesPrice = outcomePrices.Yes || outcomePrices.yes || 0.5

      // 根据 question 内容自动分类
      const category = this.categorizeEvent(question)

      // 计算概率（价格 * 100）
      const probability = Math.round(yesPrice * 100)

      return {
        id: event.id || `poly_${Math.random().toString(36).substr(2, 9)}`,
        question,
        probability,
        price: yesPrice,
        volume24h: event.volume || 0,
        liquidity: event.liquidity || 0,
        category,
        change24h: 0 // Poly Market API 可能不提供24h变化，默认为0
      }
    })
  }

  /**
   * 根据 question 内容自动分类
   */
  private categorizeEvent(question: string): string {
    const lowerQuestion = question.toLowerCase()

    // 金融关键词
    if (lowerQuestion.includes('利率') || lowerQuestion.includes('降息') || lowerQuestion.includes('加息') ||
        lowerQuestion.includes('美元') || lowerQuestion.includes('汇率') || lowerQuestion.includes('股市') ||
        lowerQuestion.includes('股票') || lowerQuestion.includes('黄金') || lowerQuestion.includes('石油') ||
        lowerQuestion.includes('比特币') || lowerQuestion.includes('btc') || lowerQuestion.includes('eth') ||
        lowerQuestion.includes('通胀') || lowerQuestion.includes('经济') || lowerQuestion.includes('gdp')) {
      return '金融'
    }

    // 体育关键词
    if (lowerQuestion.includes('奥运') || lowerQuestion.includes('世界杯') || lowerQuestion.includes('足球') ||
        lowerQuestion.includes('篮球') || lowerQuestion.includes('nba') || lowerQuestion.includes('网球') ||
        lowerQuestion.includes('冠军') || lowerQuestion.includes('金牌') || lowerQuestion.includes('球队')) {
      return '体育'
    }

    // 科技关键词
    if (lowerQuestion.includes('ai') || lowerQuestion.includes('人工智能') || lowerQuestion.includes('gpt') ||
        lowerQuestion.includes('chatgpt') || lowerQuestion.includes('机器人') || lowerQuestion.includes('自动驾驶') ||
        lowerQuestion.includes('量子') || lowerQuestion.includes('苹果') || lowerQuestion.includes('iphone') ||
        lowerQuestion.includes('特斯拉') || lowerQuestion.includes('tesla') || lowerQuestion.includes('spacex') ||
        lowerQuestion.includes('元宇宙') || lowerQuestion.includes('nft') || lowerQuestion.includes('区块链')) {
      return '科技'
    }

    // 默认为其他
    return '其他'
  }

  /**
   * 转换 GeckoTerminal 数据为标准格式（保留用于向后兼容）
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
    const mockEvents = [
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
      {
        id: '23',
        question: '以太坊将在 2025 年突破 5000 美元吗？',
        probability: 55.8,
        price: 0.558,
        volume24h: 3200000,
        liquidity: 8900000,
        category: '金融',
        change24h: 7.5
      },
      {
        id: '24',
        question: '狗狗币将在 2025 年重新达到 1 美元吗？',
        probability: 18.2,
        price: 0.182,
        volume24h: 890000,
        liquidity: 2100000,
        category: '金融',
        change24h: -5.8
      },
      {
        id: '25',
        question: '美国 10 年期国债收益率将在 2025 年突破 5% 吗？',
        probability: 42.7,
        price: 0.427,
        volume24h: 560000,
        liquidity: 1780000,
        category: '金融',
        change24h: 3.2
      },
      {
        id: '26',
        question: '美国住房价格将在 2025 年下跌 10% 吗？',
        probability: 31.5,
        price: 0.315,
        volume24h: 450000,
        liquidity: 1340000,
        category: '金融',
        change24h: -4.1
      },
      {
        id: '27',
        question: '全球 M2 货币供应量将在 2025 年下降吗？',
        probability: 22.3,
        price: 0.223,
        volume24h: 280000,
        liquidity: 890000,
        category: '金融',
        change24h: 1.8
      },
      {
        id: '28',
        question: '石油价格将在 2025 年突破 100 美元吗？',
        probability: 48.6,
        price: 0.486,
        volume24h: 1800000,
        liquidity: 5600000,
        category: '金融',
        change24h: 8.9
      },
      {
        id: '29',
        question: '日元兑美元汇率将在 2025 年突破 150 吗？',
        probability: 38.4,
        price: 0.384,
        volume24h: 670000,
        liquidity: 2100000,
        category: '金融',
        change24h: -2.6
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
      {
        id: '30',
        question: 'C罗将在 2025 年退役吗？',
        probability: 45.8,
        price: 0.458,
        volume24h: 980000,
        liquidity: 3200000,
        category: '体育',
        change24h: 12.3
      },
      {
        id: '31',
        question: '2025 年欧洲杯冠军会是法国队吗？',
        probability: 28.5,
        price: 0.285,
        volume24h: 650000,
        liquidity: 2100000,
        category: '体育',
        change24h: -3.8
      },
      {
        id: '32',
        question: 'F1 2025 赛季总冠军会是维斯塔潘吗？',
        probability: 52.3,
        price: 0.523,
        volume24h: 780000,
        liquidity: 2450000,
        category: '体育',
        change24h: 5.6
      },
      {
        id: '33',
        question: '中国女排将在 2025 年奥运会夺金吗？',
        probability: 38.6,
        price: 0.386,
        volume24h: 560000,
        liquidity: 1780000,
        category: '体育',
        change24h: 4.2
      },
      {
        id: '34',
        question: '2025 年中超联赛冠军会是上海海港吗？',
        probability: 35.2,
        price: 0.352,
        volume24h: 320000,
        liquidity: 980000,
        category: '体育',
        change24h: -1.5
      },
      {
        id: '35',
        question: '纳达尔将在 2025 年复出并赢下大满贯吗？',
        probability: 18.7,
        price: 0.187,
        volume24h: 450000,
        liquidity: 1340000,
        category: '体育',
        change24h: -8.2
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
      {
        id: '36',
        question: '苹果 Vision Pro 将在 2025 年推出更便宜的版本吗？',
        probability: 58.4,
        price: 0.584,
        volume24h: 890000,
        liquidity: 2670000,
        category: '科技',
        change24h: 9.3
      },
      {
        id: '37',
        question: '谷歌将在 2025 年发布完全自动驾驶出租车服务吗？',
        probability: 42.6,
        price: 0.426,
        volume24h: 670000,
        liquidity: 1980000,
        category: '科技',
        change24h: 5.8
      },
      {
        id: '38',
        question: 'Meta 将在 2025 年推出消费级 AR 眼镜吗？',
        probability: 32.1,
        price: 0.321,
        volume24h: 560000,
        liquidity: 1750000,
        category: '科技',
        change24h: 3.5
      },
      {
        id: '39',
        question: '亚马逊将在 2025 年推出家用机器人吗？',
        probability: 28.7,
        price: 0.287,
        volume24h: 450000,
        liquidity: 1340000,
        category: '科技',
        change24h: 2.1
      },
      {
        id: '40',
        question: '字节跳动将在 2025 年上市吗？',
        probability: 45.2,
        price: 0.452,
        volume24h: 1200000,
        liquidity: 4500000,
        category: '科技',
        change24h: 11.2
      },
      {
        id: '41',
        question: '英伟达将在 2025 年推出新一代 Blackwell+ 显卡吗？',
        probability: 62.3,
        price: 0.623,
        volume24h: 2100000,
        liquidity: 6800000,
        category: '科技',
        change24h: 7.8
      },
      {
        id: '42',
        question: '5G 网络将在 2025 年被 6G 取代吗？',
        probability: 15.8,
        price: 0.158,
        volume24h: 320000,
        liquidity: 890000,
        category: '科技',
        change24h: -3.2
      },
      {
        id: '43',
        question: '微软将在 2025 年发布 Windows 12 吗？',
        probability: 72.5,
        price: 0.725,
        volume24h: 1450000,
        liquidity: 4200000,
        category: '科技',
        change24h: 4.6
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
      },
      {
        id: '44',
        question: 'ChatGPT 将在 2025 年实现真正的人工通用智能吗？',
        probability: 15.2,
        price: 0.152,
        volume24h: 890000,
        liquidity: 2100000,
        category: '其他',
        change24h: -5.3
      },
      {
        id: '45',
        question: '2025 年会爆发新的全球流行病吗？',
        probability: 12.5,
        price: 0.125,
        volume24h: 670000,
        liquidity: 1980000,
        category: '其他',
        change24h: -8.7
      },
      {
        id: '46',
        question: '电动汽车将在 2025 年超过燃油车销量吗？',
        probability: 52.3,
        price: 0.523,
        volume24h: 1780000,
        liquidity: 5600000,
        category: '其他',
        change24h: 8.2
      },
      {
        id: '47',
        question: '可再生能源将在 2025 年超过化石能源占比吗？',
        probability: 38.6,
        price: 0.386,
        volume24h: 890000,
        liquidity: 2670000,
        category: '其他',
        change24h: 6.5
      },
      {
        id: '48',
        question: '2025 年会出现新的物种大灭绝事件吗？',
        probability: 5.8,
        price: 0.058,
        volume24h: 450000,
        liquidity: 1340000,
        category: '其他',
        change24h: -2.1
      },
      {
        id: '49',
        question: '人类将在 2025 年发现外星文明吗？',
        probability: 3.2,
        price: 0.032,
        volume24h: 780000,
        liquidity: 2100000,
        category: '其他',
        change24h: 1.5
      },
      {
        id: '50',
        question: '2025 年会出现通用脑机接口设备吗？',
        probability: 18.7,
        price: 0.187,
        volume24h: 560000,
        liquidity: 1750000,
        category: '其他',
        change24h: 4.8
      }
    ]

    return mockEvents
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
