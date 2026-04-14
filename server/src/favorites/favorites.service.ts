import { Injectable } from '@nestjs/common'
import { OssSyncService } from '../oss-sync/oss-sync.service'

// 内存存储（生产环境应该使用数据库）
const favoritesStore = new Map<string, Set<string>>()

@Injectable()
export class FavoritesService {
  constructor(private readonly ossSyncService: OssSyncService) {}

  /**
   * 获取用户的收藏列表
   */
  async getUserFavorites(userId: string): Promise<any[]> {
    const userFavorites = favoritesStore.get(userId) || new Set()
    const eventIds = Array.from(userFavorites)

    if (eventIds.length === 0) {
      return []
    }

    // 从OSS获取所有市场数据
    const events = this.ossSyncService.getMarkets()

    // 筛选出已收藏的事件
    return events.filter((event: any) => eventIds.includes(event.id))
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

    // 从OSS获取事件信息
    const events = this.ossSyncService.getMarkets()
    const event = events.find((e: any) => e.id === eventId)

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
