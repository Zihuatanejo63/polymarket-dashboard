import { Controller, Post, Param } from '@nestjs/common'
import { AnalysisService } from './analysis.service'

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  /**
   * 分析事件的概率意义
   * POST /api/analysis/:eventId
   */
  @Post(':eventId')
  async analyzeEvent(@Param('eventId') eventId: string) {
    try {
      const result = await this.analysisService.analyzeEvent(eventId)

      return {
        code: 200,
        msg: 'success',
        data: result
      }
    } catch (error) {
      return {
        code: 500,
        msg: error.message || '分析失败',
        data: null
      }
    }
  }
}
