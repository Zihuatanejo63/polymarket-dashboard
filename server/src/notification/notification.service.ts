import { Injectable } from '@nestjs/common'
import { MarketService } from '../market/market.service'
import { FavoritesService } from '../favorites/favorites.service'

@Injectable()
export class NotificationService {
  private static readonly ALERT_THRESHOLD = 5 // 波动阈值：5%

  constructor(
    private readonly marketService: MarketService,
    private readonly favoritesService: FavoritesService,
  ) {}

  /**
   * 检查收藏事件是否有显著波动
   * 返回需要提醒的事件列表
   */
  async checkFavoriteAlerts(userId: string = 'default_user'): Promise<Array<{
    eventId: string
    question: string
    oldProbability: number
    newProbability: number
    changePercentage: number
  }>> {
    const alerts: Array<{
      eventId: string
      question: string
      oldProbability: number
      newProbability: number
      changePercentage: number
    }> = []

    // 获取用户的收藏列表
    const favorites = await this.favoritesService.getUserFavorites(userId)

    // 获取最新市场数据
    const markets = await this.marketService.getMarkets()
    const { safeEvents } = this.marketService.filterMarkets(markets)

    // 对比每个收藏事件
    for (const favorite of favorites) {
      const latestEvent = safeEvents.find(e => e.id === favorite.id)

      if (latestEvent) {
        const changePercentage = Math.abs(latestEvent.probability - favorite.probability)

        // 如果波动超过阈值，添加到提醒列表
        if (changePercentage >= NotificationService.ALERT_THRESHOLD) {
          alerts.push({
            eventId: latestEvent.id,
            question: latestEvent.question,
            oldProbability: favorite.probability,
            newProbability: latestEvent.probability,
            changePercentage
          })
        }
      }
    }

    return alerts
  }

  /**
   * 获取提醒通知摘要
   */
  async getNotificationSummary(userId: string = 'default_user') {
    const alerts = await this.checkFavoriteAlerts(userId)

    return {
      hasAlerts: alerts.length > 0,
      count: alerts.length,
      alerts,
      timestamp: new Date().toISOString()
    }
  }
}
