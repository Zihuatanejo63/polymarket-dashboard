import { Controller, Get, Query } from '@nestjs/common'
import { MarketService, MarketEvent } from './market.service'

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  /**
   * 获取市场事件列表
   * GET /api/market/events?category=all
   */
  @Get('events')
  async getEvents(@Query('category') category?: string) {
    // 1. 获取原始数据
    const events = await this.marketService.getMarkets()

    // 2. 敏感词过滤
    const { safeEvents } = this.marketService.filterMarkets(events)

    // 3. 分类筛选
    const filteredEvents = this.marketService.filterByCategory(safeEvents, category)

    return {
      code: 200,
      msg: 'success',
      data: filteredEvents
    }
  }

  /**
   * 获取单个事件详情
   * GET /api/market/events/:id
   */
  @Get('events/:id')
  async getEventDetail(@Query('id') id: string) {
    const events = await this.marketService.getMarkets()
    const { safeEvents } = this.marketService.filterMarkets(events)

    const event = safeEvents.find(e => e.id === id)

    if (!event) {
      return {
        code: 404,
        msg: '事件不存在',
        data: null
      }
    }

    return {
      code: 200,
      msg: 'success',
      data: event
    }
  }
}
