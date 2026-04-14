import { Controller, Get, Query } from '@nestjs/common'
import { PolymarketRealtimeService } from './polymarket-realtime.service'

@Controller('polymarket-realtime')
export class PolymarketRealtimeController {
  constructor(private readonly realtimeService: PolymarketRealtimeService) {}

  /**
   * 获取所有实时市场数据
   * GET /api/polymarket-realtime/markets
   * 
   * ✅ 支持无限查询
   * ✅ 实时数据（每秒更新）
   */
  @Get('markets')
  getAllMarkets(@Query('category') category?: string) {
    try {
      const markets = category
        ? this.realtimeService.getMarketsByCategory(category)
        : this.realtimeService.getAllMarkets()

      return {
        code: 200,
        msg: 'success',
        data: {
          markets,
          total: markets.length,
          source: 'realtime',
          realtime: true,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error: any) {
      return {
        code: 500,
        msg: error.message,
        data: { markets: [], total: 0 }
      }
    }
  }

  /**
   * 获取单个市场实时数据
   * GET /api/polymarket-realtime/market?id=xxx
   */
  @Get('market')
  getMarketById(@Query('id') id: string) {
    try {
      if (!id) {
        return {
          code: 400,
          msg: '缺少市场ID',
          data: null
        }
      }

      const market = this.realtimeService.getMarketById(id)

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
      return {
        code: 500,
        msg: error.message,
        data: null
      }
    }
  }

  /**
   * 搜索市场
   * GET /api/polymarket-realtime/search?q=xxx
   */
  @Get('search')
  searchMarkets(@Query('q') query: string) {
    try {
      if (!query) {
        return {
          code: 400,
          msg: '缺少搜索关键词',
          data: { markets: [], total: 0 }
        }
      }

      const markets = this.realtimeService.searchMarkets(query)

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
      return {
        code: 500,
        msg: error.message,
        data: { markets: [], total: 0 }
      }
    }
  }

  /**
   * 获取热门市场
   * GET /api/polymarket-realtime/hot?limit=10
   */
  @Get('hot')
  getHotMarkets(@Query('limit') limit?: string) {
    try {
      const count = parseInt(limit || '10')
      const markets = this.realtimeService.getHotMarkets(count)

      return {
        code: 200,
        msg: 'success',
        data: {
          markets,
          total: markets.length
        }
      }
    } catch (error: any) {
      return {
        code: 500,
        msg: error.message,
        data: { markets: [], total: 0 }
      }
    }
  }

  /**
   * 获取套利机会
   * GET /api/polymarket-realtime/arbitrage
   * 
   * 返回价差较大的市场（套利机会）
   */
  @Get('arbitrage')
  getArbitrageOpportunities() {
    try {
      const opportunities = this.realtimeService.getArbitrageOpportunities()

      return {
        code: 200,
        msg: 'success',
        data: {
          opportunities,
          total: opportunities.length,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error: any) {
      return {
        code: 500,
        msg: error.message,
        data: { opportunities: [], total: 0 }
      }
    }
  }

  /**
   * 获取最新价格变动
   * GET /api/polymarket-realtime/price-changes?limit=10
   */
  @Get('price-changes')
  getPriceChanges(@Query('limit') limit?: string) {
    try {
      const count = parseInt(limit || '10')
      const changes = this.realtimeService.getRecentPriceChanges(count)

      return {
        code: 200,
        msg: 'success',
        data: {
          changes,
          total: changes.length,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error: any) {
      return {
        code: 500,
        msg: error.message,
        data: { changes: [], total: 0 }
      }
    }
  }

  /**
   * 获取价格历史
   * GET /api/polymarket-realtime/price-history?id=xxx
   */
  @Get('price-history')
  getPriceHistory(@Query('id') marketId: string) {
    try {
      if (!marketId) {
        return {
          code: 400,
          msg: '缺少市场ID',
          data: []
        }
      }

      const history = this.realtimeService.getPriceHistory(marketId)

      return {
        code: 200,
        msg: 'success',
        data: {
          history,
          total: history.length,
          marketId
        }
      }
    } catch (error: any) {
      return {
        code: 500,
        msg: error.message,
        data: []
      }
    }
  }

  /**
   * 获取服务状态
   * GET /api/polymarket-realtime/status
   */
  @Get('status')
  getStatus() {
    return {
      code: 200,
      msg: 'success',
      data: this.realtimeService.getStatus()
    }
  }
}
