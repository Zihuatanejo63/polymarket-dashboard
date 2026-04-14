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
export class PolymarketGoldskyService {
  // 尝试多个数据源
  private readonly DATA_SOURCES = [
    {
      name: 'The Graph Official',
      url: 'https://gateway.thegraph.com/api/subgraphs/id/5XqPmWe6gjyrJtFn9cLyHR7jyF2sDPSEZthCzSdP2pE4'
    },
    {
      name: 'The Graph Backup',
      url: 'https://api.thegraph.com/subgraphs/name/poly-market-maker/polymarket-prod'
    },
    {
      name: 'Goldsky',
      url: 'https://api.goldsky.com/api/public/project_clq49qj000v1l801t3w39s6e2/subgraphs/prediction-market-v2/gn'
    }
  ]

  constructor(private readonly httpService: HttpService) {}

  /**
   * 从多个数据源获取所有活跃的市场
   */
  async getActiveMarkets(): Promise<PolymarketEvent[]> {
    // 尝试所有数据源，直到成功为止
    for (const dataSource of this.DATA_SOURCES) {
      try {
        console.log(`[${dataSource.name}] 尝试获取活跃市场...`)

        // 尝试多个不同的查询
        const queries = [
          // 查询1：使用where子句（标准查询）
          `
            query GetActiveMarkets {
              markets(
                where: { active: true, closed: false }
                orderBy: volume
                orderDirection: desc
                first: 100
              ) {
                id
                question
                description
                outcomes
                outcomePrices
                creationTime
                expirationTime
                volume
                liquidity
                slug
                tags
              }
            }
          `,
          // 查询2：不使用where子句，获取所有市场然后过滤
          `
            query GetAllMarkets {
              markets(
                orderBy: volume
                orderDirection: desc
                first: 100
              ) {
                id
                question
                description
                outcomes
                outcomePrices
                creationTime
                expirationTime
                volume
                liquidity
                active
                closed
                slug
                tags
              }
            }
          `
        ]

        for (const query of queries) {
          try {
            const response = await lastValueFrom(
              this.httpService.post(dataSource.url, { query }, {
                headers: {
                  'Content-Type': 'application/json'
                },
                timeout: 15000
              })
            )

            console.log(`[${dataSource.name}] 原始响应状态: ${response.status}`)
            console.log(`[${dataSource.name}] 响应数据类型:`, typeof response.data)
            console.log(`[${dataSource.name}] 响应数据键:`, Object.keys(response.data || {}))

            // 尝试不同的数据结构
            let markets = response.data?.data?.markets

            // 如果没有markets字段，尝试其他可能的字段名
            if (!markets) {
              if (response.data?.markets) {
                markets = response.data.markets
              } else if (Array.isArray(response.data?.data)) {
                markets = response.data.data
              } else if (Array.isArray(response.data)) {
                markets = response.data
              }
            }

            // 如果找到市场数据
            if (markets && Array.isArray(markets) && markets.length > 0) {
              // 过滤活跃且未关闭的市场
              const activeMarkets = markets.filter(m => {
                // 如果有active和closed字段，使用它们
                if (m.active !== undefined && m.closed !== undefined) {
                  return m.active === true && m.closed === false
                }
                // 否则，检查是否有outcomePrices（有价格表示活跃）
                return m.outcomePrices && m.outcomePrices.length > 0
              })

              console.log(`[${dataSource.name}] 成功获取 ${markets.length} 个市场，其中活跃市场 ${activeMarkets.length} 个`)

              if (activeMarkets.length > 0) {
                return this.transformMarkets(activeMarkets)
              }
            }

            console.warn(`[${dataSource.name}] 响应中没有找到活跃市场数据`)

          } catch (innerError: any) {
            console.error(`[${dataSource.name}] 查询失败:`, innerError.message)
            // 继续尝试下一个查询
          }
        }

      } catch (error: any) {
        console.error(`[${dataSource.name}] 获取市场失败:`, error.message)

        // 如果是网络错误，继续尝试下一个数据源
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          console.log(`[${dataSource.name}] 网络超时，尝试下一个数据源...`)
          continue
        }

        // 如果是404或400错误，继续尝试下一个数据源
        if (error.response?.status === 404 || error.response?.status === 400) {
          console.log(`[${dataSource.name}] 端点不可用，尝试下一个数据源...`)
          continue
        }
      }
    }

    console.error('[Goldsky Service] 所有数据源都失败了')
    return []
  }

  /**
   * 转换市场数据格式
   */
  private transformMarkets(markets: any[]): PolymarketEvent[] {
    return markets.map(market => {
      // 从outcomePrices中获取当前价格（第一个价格是"YES"的价格）
      const yesPrice = market.outcomePrices?.[0] || 0
      const probability = yesPrice * 100

      // 提取标签
      const tags = market.tags || []

      // 格式化时间
      const endDate = market.expirationTime
        ? new Date(parseInt(market.expirationTime) * 1000).toISOString()
        : ''

      const startDate = market.creationTime
        ? new Date(parseInt(market.creationTime) * 1000).toISOString()
        : undefined

      return {
        id: market.id,
        question: market.question,
        description: market.description || '',
        outcomes: market.outcomes || ['NO', 'YES'],
        outcomePrices: market.outcomePrices || [0, 1],
        probability: parseFloat(probability.toFixed(2)),
        volume: parseFloat(market.volume || '0'),
        liquidity: parseFloat(market.liquidity || '0'),
        endDate,
        startDate,
        slug: market.slug || '',
        tags: Array.isArray(tags) ? tags : []
      }
    })
  }

  /**
   * 根据ID获取单个市场详情
   */
  async getMarketById(marketId: string): Promise<PolymarketEvent | null> {
    for (const dataSource of this.DATA_SOURCES) {
      try {
        const query = `
          query GetMarketById($id: String!) {
            market(id: $id) {
              id
              question
              description
              outcomes
              outcomePrices
              creationTime
              expirationTime
              volume
              liquidity
              slug
              tags
            }
          }
        `

        const response = await lastValueFrom(
          this.httpService.post(dataSource.url, {
            query,
            variables: { id: marketId }
          }, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000
          })
        )

        if (response.data?.data?.market) {
          const markets = this.transformMarkets([response.data.data.market])
          return markets[0] || null
        }

      } catch (error: any) {
        console.error(`[${dataSource.name}] 获取市场详情失败:`, error.message)
        // 继续尝试下一个数据源
      }
    }

    return null
  }

  /**
   * 根据标签获取市场
   */
  async getMarketsByTag(tag: string): Promise<PolymarketEvent[]> {
    for (const dataSource of this.DATA_SOURCES) {
      try {
        const query = `
          query GetMarketsByTag($tag: String!) {
            markets(
              where: {
                active: true,
                closed: false,
                tags_contains_nocase: $tag
              }
              orderBy: volume
              orderDirection: desc
              first: 50
            ) {
              id
              question
              description
              outcomes
              outcomePrices
              creationTime
              expirationTime
              volume
              liquidity
              slug
              tags
            }
          }
        `

        const response = await lastValueFrom(
          this.httpService.post(dataSource.url, {
            query,
            variables: { tag }
          }, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000
          })
        )

        if (response.data?.data?.markets) {
          return this.transformMarkets(response.data.data.markets)
        }

      } catch (error: any) {
        console.error(`[${dataSource.name}] 按标签获取市场失败:`, error.message)
        // 继续尝试下一个数据源
      }
    }

    return []
  }
}
