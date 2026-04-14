import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import { AnalysisService } from './analysis.service'
import { AnalysisController } from './analysis.controller'
import { OssSyncModule } from '../oss-sync/oss-sync.module'

@Module({
  imports: [HttpModule, ConfigModule, OssSyncModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
