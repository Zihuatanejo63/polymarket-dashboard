import { Controller, Get, Post } from '@nestjs/common'
import { PolymarketService } from './polymarket.service'

@Controller('polymarket')
export class PolymarketController {
  constructor(private readonly polymarketService: PolymarketService) {}

  /**
   * 手动触发数据刷新
   * POST /api/polymarket/refresh
   */
  @Post('refresh')
  async refreshData() {
    try {
      const data = await this.polymarketService.fetchPolymarketData()

      return {
        code: 200,
        msg: 'success',
        data: {
          eventCount: data.length,
          message: '数据刷新成功',
        },
      }
    } catch (error) {
      return {
        code: 500,
        msg: '数据刷新失败',
        data: {
          error: error.message,
        },
      }
    }
  }

  /**
   * 获取数据源状态
   * GET /api/polymarket/status
   */
  @Get('status')
  async getStatus() {
    const status = await this.polymarketService.getDataSourceStatus()

    return {
      code: 200,
      msg: 'success',
      data: status,
    }
  }
}
