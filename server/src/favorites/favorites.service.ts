import { Injectable } from '@nestjs/common'
import { MarketService } from '../market/market.service'
import { MarketEvent } from '../market/market.service'

// 内存存储（生产环境应该使用数据库）
const favoritesStore = new Map<string, Set<string>>()

@Injectable()
export class FavoritesService {
  constructor(private readonly marketService: MarketService) {}

  /**
   * 获取用户的收藏列表
   */
  async getUserFavorites(userId: string): Promise<MarketEvent[]> {
    const userFavorites = favoritesStore.get(userId) || new Set()
    const eventIds = Array.from(userFavorites)

    if (eventIds.length === 0) {
      return []
    }

    // 获取所有事件
    const events = await this.marketService.getMarkets()
    const { safeEvents } = this.marketService.filterMarkets(events)

    // 筛选出已收藏的事件
    return safeEvents.filter(event => eventIds.includes(event.id))
  }

  /**
   * 添加收藏
   */
  async addFavorite(userId: string, eventId: string) {
    if (!favoritesStore.has(userId)) {
      favoritesStore.set(userId, new Set())
    }

    const userFavorites = favoritesStore.get(userId)!
    userFavorites.add(eventId)

    // 返回收藏的事件信息
    const events = await this.marketService.getMarkets()
    const { safeEvents } = this.marketService.filterMarkets(events)

    const event = safeEvents.find(e => e.id === eventId)

    return {
      userId,
      eventId,
      event,
      addedAt: new Date().toISOString()
    }
  }

  /**
   * 取消收藏
   */
  async removeFavorite(userId: string, eventId: string) {
    const userFavorites = favoritesStore.get(userId)

    if (userFavorites) {
      userFavorites.delete(eventId)
    }
  }

  /**
   * 检查是否已收藏
   */
  async isFavorited(userId: string, eventId: string): Promise<boolean> {
    const userFavorites = favoritesStore.get(userId)
    return userFavorites ? userFavorites.has(eventId) : false
  }

  /**
   * 获取收藏数量
   */
  async getFavoritesCount(userId: string): Promise<number> {
    const userFavorites = favoritesStore.get(userId)
    return userFavorites ? userFavorites.size : 0
  }
}
