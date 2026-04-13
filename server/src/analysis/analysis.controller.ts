import { Controller, Post, Param, Body, Get } from '@nestjs/common'
import { AnalysisService } from './analysis.service'

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  /**
   * 批量分析事件（必须放在 :eventId 路由之前）
   * POST /api/analysis/batch
   */
  @Post('batch')
  async batchAnalyzeEvents(@Body() body: { eventIds: string[] }) {
    try {
      const { eventIds } = body

      if (!eventIds || eventIds.length === 0) {
        return {
          code: 400,
          msg: '事件ID不能为空',
          data: null
        }
      }

      const result = await this.analysisService.batchAnalyzeEvents(eventIds)

      return {
        code: 200,
        msg: 'success',
        data: result
      }
    } catch (error) {
      return {
        code: 500,
        msg: error.message || '批量分析失败',
        data: null
      }
    }
  }

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

  /**
   * 获取所有分析结果
   * GET /api/analysis/all
   */
  @Get('all')
  async getAllAnalysisResults() {
    try {
      const result = await this.analysisService.getAllAnalysisResults()

      return {
        code: 200,
        msg: 'success',
        data: result
      }
    } catch (error) {
      return {
        code: 500,
        msg: error.message || '获取分析结果失败',
        data: null
      }
    }
  }
}
