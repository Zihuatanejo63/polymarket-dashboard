import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { lastValueFrom } from 'rxjs'

export interface PolymarketData {
  markets: any[]
  total: number
  fetchedAt: string
  source: string
}

@Injectable()
export class OssSyncService {
  private cachedData: PolymarketData | null = null
  private lastFetchTime: Date | null = null
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

  // 腾讯云COS配置
  private cosConfig = {
    region: '',
    bucket: ''
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    // 从环境变量读取COS配置
    this.cosConfig = {
      region: this.configService.get<string>('COS_REGION') || 'ap-singapore',
      bucket: this.configService.get<string>('COS_BUCKET') || ''
    }

    // 启动时立即加载数据
    this.loadDataFromCOS()

    // 设置定时刷新（每5分钟）
    setInterval(() => {
      this.loadDataFromCOS()
    }, this.CACHE_DURATION)
  }

  /**
   * 从腾讯云COS加载数据
   */
  private async loadDataFromCOS(): Promise<void> {
    try {
      console.log('[COS Sync] 从腾讯云COS加载数据...')

      // 构建COS公共访问URL
      // 腾讯云COS标准访问域名格式: https://{bucket}.cos.{region}.myqcloud.com
      const cosUrl = `https://${this.cosConfig.bucket}.cos.${this.cosConfig.region}.myqcloud.com/polymarket-data.json`

      console.log('[COS Sync] COS URL:', cosUrl)

      // 从COS获取数据（公共读取）
      const response = await lastValueFrom(
        this.httpService.get(cosUrl, {
          timeout: 30000,
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
      )

      if (response.data && response.data.markets) {
        this.cachedData = response.data
        this.lastFetchTime = new Date()
        console.log(`[COS Sync] 成功加载 ${response.data.total} 个市场数据`)
        console.log('[COS Sync] 数据时间:', response.data.fetchedAt)
      } else {
        console.warn('[COS Sync] COS数据格式不正确')
      }
    } catch (error: any) {
      console.error('[COS Sync] 从COS加载数据失败:', error.message)
      // 如果有缓存，继续使用缓存
      if (this.cachedData) {
        console.log('[COS Sync] 使用缓存数据')
      }
    }
  }

  /**
   * 获取市场数据（从缓存）
   */
  getMarkets(): any[] {
    return this.cachedData?.markets || []
  }

  /**
   * 获取单个市场
   */
  getMarketById(id: string): any | null {
    return this.cachedData?.markets.find(m => m.id === id) || null
  }

  /**
   * 按类别获取市场
   */
  getMarketsByCategory(category: string): any[] {
    if (category === 'all') {
      return this.getMarkets()
    }

    return this.getMarkets().filter(m => {
      const question = (m.question || '').toLowerCase()
      switch (category) {
        case 'politics':
          return question.includes('election') ||
                 question.includes('trump') ||
                 question.includes('biden')
        case 'crypto':
          return question.includes('bitcoin') ||
                 question.includes('ethereum') ||
                 question.includes('crypto')
        case 'sports':
          return question.includes('sports') ||
                 question.includes('nba') ||
                 question.includes('olympics')
        case 'finance':
          return question.includes('stock') ||
                 question.includes('market')
        default:
          return true
      }
    })
  }

  /**
   * 搜索市场
   */
  searchMarkets(query: string): any[] {
    const lowerQuery = query.toLowerCase()
    return this.getMarkets().filter(m =>
      (m.question || '').toLowerCase().includes(lowerQuery) ||
      (m.description || '').toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * 获取热门市场（按交易量）
   */
  getHotMarkets(limit: number = 10): any[] {
    return this.getMarkets()
      .sort((a, b) => (b.volume || 0) - (a.volume || 0))
      .slice(0, limit)
  }

  /**
   * 获取状态信息
   */
  getStatus() {
    return {
      total: this.cachedData?.total || 0,
      lastFetch: this.lastFetchTime,
      dataTime: this.cachedData?.fetchedAt,
      source: this.cachedData?.source || 'unknown',
      cacheValid: this.cachedData !== null,
      nextRefresh: this.lastFetchTime
        ? new Date(this.lastFetchTime.getTime() + this.CACHE_DURATION)
        : null
    }
  }

  /**
   * 强制刷新数据
   */
  async forceRefresh(): Promise<boolean> {
    await this.loadDataFromCOS()
    return this.cachedData !== null
  }
}
