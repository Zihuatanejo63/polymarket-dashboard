import { Module } from '@nestjs/common'
import { ScheduleService } from './schedule.service'
import { ScheduleController } from './schedule.controller'
import { FavoritesModule } from '../favorites/favorites.module'
import { AnalysisModule } from '../analysis/analysis.module'

@Module({
  imports: [FavoritesModule, AnalysisModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService]
})
export class ScheduleModule {}
