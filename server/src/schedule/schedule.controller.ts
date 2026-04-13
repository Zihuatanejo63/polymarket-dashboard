import { Controller, Get, Post, Body } from '@nestjs/common'
import { ScheduleService, ScheduleSettings } from './schedule.service'

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  /**
   * 获取定时设置
   */
  @Get('settings')
  getSettings() {
    const settings = this.scheduleService.getSettings()
    return {
      code: 200,
      msg: 'success',
      data: settings
    }
  }

  /**
   * 更新定时设置
   */
  @Post('settings')
  updateSettings(@Body() body: Partial<ScheduleSettings>) {
    const settings = this.scheduleService.updateSettings(body)
    return {
      code: 200,
      msg: 'success',
      data: settings
    }
  }
}
