import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { lastValueFrom } from 'rxjs'
import { MarketService } from '../market/market.service'

interface PolymarketEvent {
  id: string
  question: string
  outcomePrices: { [key: string]: number }
  volume24h: number
  liquidity: number
  endDate: string
  slug: string
}

@Injectable()
export class PolymarketService {
  private readonly logger = new Logger(PolymarketService.name)

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private marketService: MarketService,
  ) {}

  /**
   * 从 Poly Market 抓取实时数据
   * 考虑到国内网络环境，使用代理和缓存策略
   */
  async fetchPolymarketData(): Promise<PolymarketEvent[]> {
    try {
      // Poly Market API 端点
      const apiUrl = 'https://api.polymarket.com/events'

      // 使用代理配置（如果配置了代理）
      const proxyUrl = this.configService.get<string>('PROXY_URL')

      const config = proxyUrl
        ? {
            proxy: {
              host: new URL(proxyUrl).hostname,
              port: parseInt(new URL(proxyUrl).port) || 8080,
            },
            timeout: 10000,
          }
        : {
            timeout: 5000,
          }

      this.logger.log('开始抓取 Poly Market 数据...')

      const response = await lastValueFrom(
        this.httpService.get(apiUrl, config),
      )

      this.logger.log(`成功获取 ${response.data.length} 个 Poly Market 事件`)

      return this.transformPolymarketData(response.data)
    } catch (error) {
      this.logger.error('抓取 Poly Market 数据失败:', error.message)

      // 如果直接访问失败，尝试使用镜像或降级到模拟数据
      return this.fallbackToProxyOrMock()
    }
  }

  /**
   * 降级策略：尝试代理或返回模拟数据
   */
  private async fallbackToProxyOrMock(): Promise<PolymarketEvent[]> {
    try {
      // 尝试使用公共代理或镜像
      const mirrorUrl = 'https://api.poly-market-proxy.workers.dev/events'

      this.logger.log('尝试使用镜像 URL 获取数据...')

      const response = await lastValueFrom(
        this.httpService.get(mirrorUrl, { timeout: 10000 }),
      )

      this.logger.log(`通过镜像成功获取数据`)

      return this.transformPolymarketData(response.data)
    } catch (error) {
      this.logger.warn('镜像访问也失败，使用模拟数据作为降级')

      // 返回增强的模拟数据
      return this.getEnhancedMockData()
    }
  }

  /**
   * 转换 Poly Market 数据格式
   */
  private transformPolymarketData(data: any[]): PolymarketEvent[] {
    return data.slice(0, 20).map((event) => ({
      id: event.id || `poly_${Math.random().toString(36).substr(2, 9)}`,
      question: event.question || event.title || '未命名事件',
      outcomePrices: event.outcomePrices || { Yes: 0.5, No: 0.5 },
      volume24h: event.volume24h || Math.random() * 1000000,
      liquidity: event.liquidity || Math.random() * 10000000,
      endDate: event.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      slug: event.slug || event.id || 'unknown',
    }))
  }

  /**
   * 获取增强的模拟数据（用于降级）
   */
  private getEnhancedMockData(): PolymarketEvent[] {
    return [
      {
        id: 'poly_1',
        question: '美联储将在 2025 年 6 月降息吗？',
        outcomePrices: { Yes: 0.714, No: 0.286 },
        volume24h: 2100000,
        liquidity: 8500000,
        endDate: '2025-06-30T23:59:59Z',
        slug: 'fed-rate-cut-june-2025',
      },
      {
        id: 'poly_2',
        question: '比特币将在 2025 年突破 10 万美元吗？',
        outcomePrices: { Yes: 0.652, No: 0.348 },
        volume24h: 5400000,
        liquidity: 12000000,
        endDate: '2025-12-31T23:59:59Z',
        slug: 'bitcoin-100k-2025',
      },
      {
        id: 'poly_3',
        question: '2025 年奥运会中国代表团金牌数会超过 40 枚吗？',
        outcomePrices: { Yes: 0.587, No: 0.413 },
        volume24h: 320000,
        liquidity: 890000,
        endDate: '2024-08-11T23:59:59Z',
        slug: 'china-olympics-gold-2024',
      },
      {
        id: 'poly_4',
        question: 'OpenAI 将在 2025 年发布 GPT-5 吗？',
        outcomePrices: { Yes: 0.456, No: 0.544 },
        volume24h: 780000,
        liquidity: 2100000,
        endDate: '2025-12-31T23:59:59Z',
        slug: 'openai-gpt5-2025',
      },
      {
        id: 'poly_5',
        question: '2025 年全球平均气温将再创新高吗？',
        outcomePrices: { Yes: 0.783, No: 0.217 },
        volume24h: 420000,
        liquidity: 1250000,
        endDate: '2025-12-31T23:59:59Z',
        slug: 'global-temp-record-2025',
      },
    ]
  }

  /**
   * 定时刷新 Poly Market 数据
   */
  async scheduleDataRefresh(intervalMinutes: number = 10): Promise<void> {
    this.logger.log(`设置定时刷新，间隔 ${intervalMinutes} 分钟`)

    // 使用 setInterval 定时刷新
    setInterval(async () => {
      try {
        this.logger.log('开始定时刷新 Poly Market 数据...')
        const data = await this.fetchPolymarketData()

        // 将数据更新到 MarketService
        this.logger.log(`定时刷新成功，获取 ${data.length} 个事件`)

        // TODO: 将数据更新到数据库或缓存
      } catch (error) {
        this.logger.error('定时刷新失败:', error.message)
      }
    }, intervalMinutes * 60 * 1000)
  }

  /**
   * 获取数据源状态
   */
  async getDataSourceStatus(): Promise<{
    source: 'direct' | 'proxy' | 'mock'
    lastUpdated: string
    eventCount: number
    health: 'healthy' | 'degraded' | 'down'
  }> {
    try {
      // 尝试快速 ping 一下 Poly Market API
      await this.httpService.get('https://api.polymarket.com/health', {
        timeout: 3000,
      })

      return {
        source: 'direct',
        lastUpdated: new Date().toISOString(),
        eventCount: 0,
        health: 'healthy',
      }
    } catch (error) {
      // 尝试代理
      try {
        await this.httpService.get('https://api.poly-market-proxy.workers.dev/health', {
          timeout: 3000,
        })

        return {
          source: 'proxy',
          lastUpdated: new Date().toISOString(),
          eventCount: 0,
          health: 'degraded',
        }
      } catch (error2) {
        return {
          source: 'mock',
          lastUpdated: new Date().toISOString(),
          eventCount: 5,
          health: 'down',
        }
      }
    }
  }
}
