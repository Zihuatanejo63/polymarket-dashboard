import { Controller, Post, Body, Get, Delete } from '@nestjs/common'
import { NotificationService } from './notification.service'

interface ScheduledReport {
  userId?: string
  schedule: string
  enabled: boolean
  createTime: string
}

interface Alert {
  eventId: string
  threshold: number
  currentValue: number
  message: string
  timestamp: string
}

interface NotificationSummary {
  totalAlerts: number
  alerts: Alert[]
}

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * 设置定时报告
   * POST /api/notification/schedule
   */
  @Post('schedule')
  async setSchedule(@Body() body: { schedule: string; userId?: string }) {
    try {
      const { schedule, userId } = body

      const result = await this.notificationService.setSchedule(schedule, userId)

      return {
        code: 200,
        msg: 'success',
        data: result
      }
    } catch (error) {
      return {
        code: 500,
        msg: error.message || '设置失败',
        data: null
      }
    }
  }

  /**
   * 获取定时报告设置
   * GET /api/notification/schedule
   */
  @Get('schedule')
  async getSchedule(@Body() body: { userId?: string }) {
    try {
      const { userId } = body

      const result = await this.notificationService.getSchedule(userId)

      return {
        code: 200,
        msg: 'success',
        data: result
      }
    } catch (error) {
      return {
        code: 500,
        msg: error.message || '获取失败',
        data: null
      }
    }
  }

  /**
   * 取消定时报告
   * DELETE /api/notification/schedule
   */
  @Delete('schedule')
  async cancelSchedule(@Body() body: { userId?: string }) {
    try {
      const { userId } = body

      const result = await this.notificationService.cancelSchedule(userId)

      return {
        code: 200,
        msg: 'success',
        data: { deleted: result }
      }
    } catch (error) {
      return {
        code: 500,
        msg: error.message || '取消失败',
        data: null
      }
    }
  }

  /**
   * 获取提醒通知
   * GET /api/notification/alerts
   */
  @Get('alerts')
  async getAlerts(): Promise<{ code: number; msg: string; data: NotificationSummary }> {
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
