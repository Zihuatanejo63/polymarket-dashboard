import { Controller, Get, Query, Post } from '@nestjs/common'
import { PolymarketProxyService, MarketData } from './polymarket-proxy.service'

@Controller('polymarket-proxy')
export class PolymarketProxyController {
  constructor(private readonly proxyService: PolymarketProxyService) {}

  /**
   * 获取所有市场数据（从缓存，支持无限查询）
   * GET /api/polymarket-proxy/markets
   */
  @Get('markets')
  async getAllMarkets(@Query('category') category?: string) {
    try {
      let markets: MarketData[]

      if (category && category !== 'all') {
        markets = await this.proxyService.getMarketsByCategory(category)
      } else {
        markets = await this.proxyService.getAllMarkets()
      }

      return {
        code: 200,
        msg: 'success',
        data: {
          markets,
          total: markets.length,
          source: 'polymarket-proxy-cache',
          realtime: false, // 说明这是缓存数据
          cacheInfo: this.proxyService.getCacheStatus()
        }
      }
    } catch (error: any) {
      console.error('[PolymarketProxy Controller] 获取市场失败:', error.message)
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
   * 获取单个市场详情
   * GET /api/polymarket-proxy/market/:id
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

      const market = await this.proxyService.getMarketById(id)

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
      console.error('[PolymarketProxy Controller] 获取市场详情失败:', error.message)
      return {
        code: 500,
        msg: error.message || '获取市场详情失败',
        data: null
      }
    }
  }

  /**
   * 根据标签获取市场
   * GET /api/polymarket-proxy/markets/tag
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

      const markets = await this.proxyService.getMarketsByTag(tag)

      return {
        code: 200,
        msg: 'success',
        data: {
          markets,
          total: markets.length
        }
      }
    } catch (error: any) {
      console.error('[PolymarketProxy Controller] 按标签获取市场失败:', error.message)
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
   * 搜索市场
   * GET /api/polymarket-proxy/search
   */
  @Get('search')
  async searchMarkets(@Query('q') query: string) {
    try {
      if (!query) {
        return {
          code: 400,
          msg: '缺少搜索关键词',
          data: {
            markets: [],
            total: 0
          }
        }
      }

      const markets = await this.proxyService.searchMarkets(query)

      return {
        code: 200,
        msg: 'success',
        data: {
          markets,
          total: markets.length,
          query
        }
      }
    } catch (error: any) {
      console.error('[PolymarketProxy Controller] 搜索市场失败:', error.message)
      return {
        code: 500,
        msg: error.message || '搜索市场失败',
        data: {
          markets: [],
          total: 0
        }
      }
    }
  }

  /**
   * 获取缓存状态
   * GET /api/polymarket-proxy/status
   */
  @Get('status')
  getCacheStatus() {
    return {
      code: 200,
      msg: 'success',
      data: this.proxyService.getCacheStatus()
    }
  }

  /**
   * 强制刷新缓存
   * POST /api/polymarket-proxy/refresh
   */
  @Post('refresh')
  async forceRefresh() {
    try {
      const success = await this.proxyService.forceRefresh()

      if (success) {
        return {
          code: 200,
          msg: '缓存刷新成功',
          data: this.proxyService.getCacheStatus()
        }
      } else {
        return {
          code: 500,
          msg: '缓存刷新失败',
          data: null
        }
      }
    } catch (error: any) {
      console.error('[PolymarketProxy Controller] 刷新缓存失败:', error.message)
      return {
        code: 500,
        msg: error.message || '刷新缓存失败',
        data: null
      }
    }
  }
}
