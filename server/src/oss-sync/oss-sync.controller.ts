import { Controller, Get, Post, Query, Param } from '@nestjs/common'
import { OssSyncService } from './oss-sync.service'

@Controller('polymarket-oss')
export class OssSyncController {
  constructor(private readonly ossSyncService: OssSyncService) {}

  /**
   * 获取所有市场（从OSS）
   */
  @Get('markets')
  getAllMarkets() {
    const markets = this.ossSyncService.getMarkets()
    return {
      code: 200,
      data: markets,
      total: markets.length,
      source: 'oss-cache'
    }
  }

  /**
   * 按类别获取市场
   */
  @Get('markets/category/:category')
  getMarketsByCategory(@Param('category') category: string) {
    const markets = this.ossSyncService.getMarketsByCategory(category)
    return {
      code: 200,
      data: markets,
      category,
      total: markets.length
    }
  }

  /**
   * 获取热门市场
   */
  @Get('markets/hot')
  getHotMarkets(@Query('limit') limit: string) {
    const markets = this.ossSyncService.getHotMarkets(parseInt(limit) || 10)
    return {
      code: 200,
      data: markets,
      total: markets.length
    }
  }

  /**
   * 搜索市场
   */
  @Get('markets/search')
  searchMarkets(@Query('q') query: string) {
    if (!query) {
      return {
        code: 400,
        message: '请提供搜索关键词'
      }
    }

    const markets = this.ossSyncService.searchMarkets(query)
    return {
      code: 200,
      data: markets,
      query,
      total: markets.length
    }
  }

  /**
   * 获取单个市场详情
   */
  @Get('markets/:id')
  getMarketById(@Param('id') id: string) {
    const market = this.ossSyncService.getMarketById(id)
    if (!market) {
      return {
        code: 404,
        message: '市场不存在'
      }
    }

    return {
      code: 200,
      data: market
    }
  }

  /**
   * 获取同步状态
   */
  @Get('status')
  getStatus() {
    return {
      code: 200,
      data: this.ossSyncService.getStatus()
    }
  }

  /**
   * 强制刷新数据
   */
  @Post('refresh')
  async forceRefresh() {
    const success = await this.ossSyncService.forceRefresh()
    return {
      code: success ? 200 : 500,
      message: success ? '刷新成功' : '刷新失败',
      status: this.ossSyncService.getStatus()
    }
  }
}
