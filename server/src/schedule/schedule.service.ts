import { Injectable, Inject } from '@nestjs/common'
import { FavoritesService } from '../favorites/favorites.service'
import { AnalysisService } from '../analysis/analysis.service'

export interface ScheduleSettings {
  enabled: boolean
  time: string // 格式: HH:MM
}

@Injectable()
export class ScheduleService {
  private settings: ScheduleSettings = {
    enabled: false,
    time: '09:00'
  }

  // 定时任务ID
  private scheduleJobId: NodeJS.Timeout | null = null

  constructor(
    @Inject(FavoritesService) private readonly favoritesService: FavoritesService,
    @Inject(AnalysisService) private readonly analysisService: AnalysisService
  ) {
    // 启动时恢复定时任务
    this.loadSettings()
  }

  private loadSettings() {
    try {
      const savedSettings = process.env.SCHEDULE_SETTINGS
      if (savedSettings) {
        this.settings = JSON.parse(savedSettings)
        if (this.settings.enabled) {
          this.startSchedule()
        }
      }
    } catch (error) {
      console.error('加载定时设置失败:', error)
    }
  }

  private saveSettings() {
    process.env.SCHEDULE_SETTINGS = JSON.stringify(this.settings)
  }

  getSettings(): ScheduleSettings {
    return this.settings
  }

  updateSettings(settings: Partial<ScheduleSettings>): ScheduleSettings {
    this.settings = {
      ...this.settings,
      ...settings
    }
    this.saveSettings()

    // 如果启用了定时任务，启动定时器
    if (this.settings.enabled) {
      this.startSchedule()
    } else {
      this.stopSchedule()
    }

    return this.settings
  }

  private startSchedule() {
    this.stopSchedule()

    // 计算下一次执行时间
    const now = new Date()
    const [hour, minute] = this.settings.time.split(':').map(Number)

    const nextExecution = new Date()
    nextExecution.setHours(hour, minute, 0, 0)

    // 如果今天的时间已经过了，设置为明天
    if (nextExecution <= now) {
      nextExecution.setDate(nextExecution.getDate() + 1)
    }

    const delay = nextExecution.getTime() - now.getTime()

    console.log(`定时报告已启动，将在 ${nextExecution.toLocaleString('zh-CN')} 执行`)

    // 设置定时任务
    this.scheduleJobId = setTimeout(() => {
      this.executeScheduledReport()
      // 执行后，设置下一次任务（每天一次）
      this.scheduleJobId = setInterval(() => {
        this.executeScheduledReport()
      }, 24 * 60 * 60 * 1000) // 24小时
    }, delay)
  }

  private stopSchedule() {
    if (this.scheduleJobId) {
      clearTimeout(this.scheduleJobId)
      clearInterval(this.scheduleJobId)
      this.scheduleJobId = null
      console.log('定时报告已停止')
    }
  }

  private async executeScheduledReport() {
    console.log(`开始执行定时报告 - ${new Date().toLocaleString('zh-CN')}`)

    try {
      // 获取所有收藏
      const favorites = await this.getFavorites()

      if (favorites.length === 0) {
        console.log('没有收藏事件，跳过报告')
        return
      }

      // 对所有收藏进行AI分析
      const eventIds = favorites.map(f => f.id)
      await this.batchAnalyze(eventIds)

      console.log(`定时报告完成，分析了 ${eventIds.length} 个事件`)
    } catch (error) {
      console.error('执行定时报告失败:', error)
    }
  }

  private async getFavorites(): Promise<any[]> {
    const userId = 'default_user'
    const result = await this.favoritesService.getUserFavorites(userId)
    return result
  }

  private async batchAnalyze(eventIds: string[]) {
    await this.analysisService.batchAnalyzeEvents(eventIds)
  }
}
