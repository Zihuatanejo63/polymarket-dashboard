import { Controller, Get, Query } from '@nestjs/common'
import { PolymarketGoldskyService, PolymarketEvent } from './polymarket-goldsky.service'

@Controller('polymarket-goldsky')
export class PolymarketGoldskyController {
  constructor(private readonly goldskyService: PolymarketGoldskyService) {}

  /**
   * 获取所有活跃的市场
   * GET /api/polymarket-goldsky/markets
   */
  @Get('markets')
  async getActiveMarkets() {
    try {
      const markets = await this.goldskyService.getActiveMarkets()

      return {
        code: 200,
        msg: 'success',
        data: {
          markets,
          total: markets.length
        }
      }
    } catch (error: any) {
      console.error('[Goldsky Controller] 获取市场失败:', error.message)
      return {
        code: 500,
        msg: error.message || '获取市场失败',
        data: {
          markets: [],
          total: 0
        }
      }
    }
  }

  /**
   * 根据ID获取单个市场详情
   * GET /api/polymarket-goldsky/market/:id
   */
  @Get('market')
  async getMarketById(@Query('id') id: string) {
    try {
      if (!id) {
        return {
          code: 400,
          msg: '缺少市场ID',
          data: null
        }
      }

      const market = await this.goldskyService.getMarketById(id)

      if (!market) {
        return {
          code: 404,
          msg: '市场不存在',
          data: null
        }
      }

      return {
        code: 200,
        msg: 'success',
        data: market
      }
    } catch (error: any) {
      console.error('[Goldsky Controller] 获取市场详情失败:', error.message)
      return {
        code: 500,
        msg: error.message || '获取市场详情失败',
        data: null
      }
    }
  }

  /**
   * 根据标签获取市场
   * GET /api/polymarket-goldsky/markets/tag
   */
  @Get('markets/tag')
  async getMarketsByTag(@Query('tag') tag: string) {
    try {
      if (!tag) {
        return {
          code: 400,
          msg: '缺少标签',
          data: {
            markets: [],
            total: 0
          }
        }
      }

      const markets = await this.goldskyService.getMarketsByTag(tag)

      return {
        code: 200,
        msg: 'success',
        data: {
          markets,
          total: markets.length
        }
      }
    } catch (error: any) {
      console.error('[Goldsky Controller] 按标签获取市场失败:', error.message)
      return {
        code: 500,
        msg: error.message || '获取市场失败',
        data: {
          markets: [],
          total: 0
        }
      }
    }
  }
}
