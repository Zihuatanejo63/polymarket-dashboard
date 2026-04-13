import { Controller, Get } from '@nestjs/common'
import { NotificationService } from './notification.service'

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * 获取提醒通知
   * GET /api/notification/alerts
   */
  @Get('alerts')
  async getAlerts() {
    // TODO: 从 JWT 或 session 中获取用户 ID
    const userId = 'default_user'

    const summary = await this.notificationService.getNotificationSummary(userId)

    return {
      code: 200,
      msg: 'success',
      data: summary
    }
  }
}
