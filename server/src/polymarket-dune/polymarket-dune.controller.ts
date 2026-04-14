import { Controller, Get } from '@nestjs/common'
import { PolymarketDuneService } from './polymarket-dune.service'

@Controller('polymarket-dune')
export class PolymarketDuneController {
  constructor(private readonly duneService: PolymarketDuneService) {}

  /**
   * 获取所有活跃的市场
   * GET /api/polymarket-dune/markets
   */
  @Get('markets')
  async getActiveMarkets() {
    try {
      const markets = await this.duneService.getActiveMarkets()

      return {
        code: 200,
        msg: 'success',
        data: {
          markets,
          total: markets.length
        }
      }
    } catch (error: any) {
      console.error('[Dune Controller] 获取市场失败:', error.message)
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
