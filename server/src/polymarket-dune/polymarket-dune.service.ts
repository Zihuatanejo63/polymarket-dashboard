import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { lastValueFrom } from 'rxjs'

export interface PolymarketEvent {
  id: string
  question: string
  description: string
  outcomes: string[]
  outcomePrices: number[]
  probability: number
  volume: number
  liquidity: number
  endDate: string
  startDate?: string
  slug: string
  tags: string[]
  image?: string
}

@Injectable()
export class PolymarketDuneService {
  // Dune Analytics API
  private readonly DUNE_API = 'https://api.dune.com/api/v1'
  // 使用公开查询ID：Polymarket市场数据
  private readonly POLYMARKET_QUERY_ID = '3567471'

  constructor(private readonly httpService: HttpService) {}

  /**
   * 从Dune Analytics获取Polymarket数据
   */
  async getActiveMarkets(): Promise<PolymarketEvent[]> {
    try {
      console.log('[Dune] 尝试获取Polymarket市场数据...')

      // 执行查询
      const response = await lastValueFrom(
        this.httpService.post(
          `${this.DUNE_API}/query/${this.POLYMARKET_QUERY_ID}/execute`,
          {},
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 30000 // Dune查询可能需要较长时间
          }
        )
      )

      console.log('[Dune] 查询已提交，获取执行ID...')

      if (response.data?.execution_id) {
        const executionId = response.data.execution_id

        // 轮询查询结果
        const results = await this.pollQueryResults(executionId)

        if (results && results.length > 0) {
          console.log(`[Dune] 成功获取 ${results.length} 个市场`)
          return this.transformDuneResults(results)
        }
      }

      console.warn('[Dune] 没有获取到市场数据')
      return []

    } catch (error: any) {
      console.error('[Dune] 获取市场失败:', error.message)
      return []
    }
  }

  /**
   * 轮询查询结果
   */
  private async pollQueryResults(executionId: string, maxAttempts = 30): Promise<any[] | null> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        console.log(`[Dune] 轮询查询结果 (${attempt + 1}/${maxAttempts})...`)

        const response = await lastValueFrom(
          this.httpService.get(
            `${this.DUNE_API}/execution/${executionId}/results`,
            {
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          )
        )

        if (response.data?.result) {
          const results = response.data.result
          console.log(`[Dune] 查询完成，获取到 ${results.length} 条记录`)
          return results
        }

        // 如果查询还在运行，等待后重试
        if (response.data?.execution_status === 'QUERY_EXECUTION_RUNNING' ||
            response.data?.execution_status === 'QUERY_EXECUTION_QUEUED') {
          console.log(`[Dune] 查询状态: ${response.data.execution_status}，等待3秒后重试...`)
          await this.sleep(3000)
          continue
        }

        // 如果查询失败
        if (response.data?.execution_status === 'QUERY_EXECUTION_FAILED' ||
            response.data?.execution_status === 'QUERY_EXECUTION_CANCELLED') {
          console.error(`[Dune] 查询失败: ${response.data.execution_status}`)
          return null
        }

      } catch (error: any) {
        console.error(`[Dune] 轮询失败 (${attempt + 1}/${maxAttempts}):`, error.message)
        if (attempt < maxAttempts - 1) {
          await this.sleep(3000)
        }
      }
    }

    console.error('[Dune] 轮询超时')
    return null
  }

  /**
   * 转换Dune结果为标准格式
   */
  private transformDuneResults(results: any[]): PolymarketEvent[] {
    return results.map(row => {
      // Dune的查询结果可能包含不同的字段名
      const question = row.question || row.title || '未命名事件'
      const yesPrice = row.yes_price || row.price || 0.5

      // 提取标签
      const tags = row.tags ? (Array.isArray(row.tags) ? row.tags : [row.tags]) : []

      // 格式化时间
      const endDate = row.end_time || row.expiration_time || ''
      const startDate = row.start_time || row.creation_time || undefined

      // 计算概率
      const probability = row.probability || (yesPrice * 100)

      // 提取类别
      const category = row.category || this.categorizeEvent(question)

      return {
        id: row.market_id || row.id || `dune_${Math.random().toString(36).substr(2, 9)}`,
        question,
        description: row.description || '',
        outcomes: ['NO', 'YES'],
        outcomePrices: [yesPrice, 1 - yesPrice],
        probability: parseFloat(probability.toFixed(2)),
        volume: parseFloat(row.volume || '0'),
        liquidity: parseFloat(row.liquidity || '0'),
        endDate,
        startDate,
        slug: row.slug || '',
        tags,
        image: row.image_url || row.image || undefined
      }
    })
  }

  /**
   * 根据问题内容分类
   */
  private categorizeEvent(question: string): string {
    const lowerQuestion = question.toLowerCase()

    if (lowerQuestion.includes('election') || lowerQuestion.includes('politics') || lowerQuestion.includes('vote')) {
      return '政治'
    }
    if (lowerQuestion.includes('crypto') || lowerQuestion.includes('bitcoin') || lowerQuestion.includes('ethereum')) {
      return '加密货币'
    }
    if (lowerQuestion.includes('sports') || lowerQuestion.includes('world cup') || lowerQuestion.includes('olympics')) {
      return '体育'
    }
    if (lowerQuestion.includes('weather') || lowerQuestion.includes('temperature')) {
      return '天气'
    }
    if (lowerQuestion.includes('stock') || lowerQuestion.includes('market') || lowerQuestion.includes('finance')) {
      return '金融'
    }

    return '其他'
  }

  /**
   * 等待指定毫秒
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
