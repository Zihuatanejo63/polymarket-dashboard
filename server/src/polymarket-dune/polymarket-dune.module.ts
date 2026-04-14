import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import { PolymarketDuneService } from './polymarket-dune.service'
import { PolymarketDuneController } from './polymarket-dune.controller'

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [PolymarketDuneController],
  providers: [PolymarketDuneService],
  exports: [PolymarketDuneService]
})
export class PolymarketDuneModule {}
