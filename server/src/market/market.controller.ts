import { Controller, Get, Query, Param } from '@nestjs/common'
import { MarketService, MarketEvent } from './market.service'

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  /**
   * 获取市场事件列表（支持分页）
   * GET /api/market/events?category=all&page=1&pageSize=20
   */
  @Get('events')
  async getEvents(
    @Query('category') category?: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20'
  ) {
    const pageNum = parseInt(page, 10) || 1
    const pageSizeNum = parseInt(pageSize, 10) || 20

    // 1. 获取原始数据
    const events = await this.marketService.getMarkets()

    // 2. 敏感词过滤
    const { safeEvents } = this.marketService.filterMarkets(events)

    // 3. 分类筛选
    const filteredEvents = this.marketService.filterByCategory(safeEvents, category)

    // 4. 分页
    const paginatedResult = this.marketService.getPaginatedEvents(
      filteredEvents,
      pageNum,
      pageSizeNum
    )

    return {
      code: 200,
      msg: 'success',
      data: paginatedResult.data,
      pagination: {
        total: paginatedResult.total,
        page: paginatedResult.page,
        pageSize: paginatedResult.pageSize,
        totalPages: paginatedResult.totalPages
      }
    }
  }

  /**
   * 获取单个事件详情（含 7 日历史数据）
   * GET /api/market/events/:id
   */
  @Get('events/:id')
  async getEventDetail(@Param('id') id: string) {
    try {
      const eventDetail = await this.marketService.getEventDetail(id)

      return {
        code: 200,
        msg: 'success',
        data: eventDetail
      }
    } catch (error) {
      return {
        code: 404,
        msg: error.message || '事件不存在',
        data: null
      }
    }
  }
}
