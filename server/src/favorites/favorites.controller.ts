import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common'
import { FavoritesService } from './favorites.service'

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  /**
   * 获取用户的收藏列表
   * GET /api/favorites
   */
  @Get()
  async getFavorites() {
    // TODO: 从 JWT 或 session 中获取用户 ID
    // 目前使用默认用户 ID
    const userId = 'default_user'

    const favorites = await this.favoritesService.getUserFavorites(userId)

    return {
      code: 200,
      msg: 'success',
      data: favorites
    }
  }

  /**
   * 添加收藏
   * POST /api/favorites
   */
  @Post()
  async addFavorite(@Body() body: { eventId: string }) {
    // TODO: 从 JWT 或 session 中获取用户 ID
    const userId = 'default_user'

    if (!body.eventId) {
      return {
        code: 400,
        msg: '缺少 eventId',
        data: null
      }
    }

    const result = await this.favoritesService.addFavorite(userId, body.eventId)

    return {
      code: 200,
      msg: 'success',
      data: result
    }
  }

  /**
   * 取消收藏
   * DELETE /api/favorites/:eventId
   */
  @Delete(':eventId')
  async removeFavorite(@Param('eventId') eventId: string) {
    // TODO: 从 JWT 或 session 中获取用户 ID
    const userId = 'default_user'

    await this.favoritesService.removeFavorite(userId, eventId)

    return {
      code: 200,
      msg: 'success',
      data: null
    }
  }

  /**
   * 检查事件是否已收藏
   * GET /api/favorites/check/:eventId
   */
  @Get('check/:eventId')
  async checkFavorite(@Param('eventId') eventId: string) {
    // TODO: 从 JWT 或 session 中获取用户 ID
    const userId = 'default_user'

    const isFavorited = await this.favoritesService.isFavorited(userId, eventId)

    return {
      code: 200,
      msg: 'success',
      data: { isFavorited }
    }
  }
}
