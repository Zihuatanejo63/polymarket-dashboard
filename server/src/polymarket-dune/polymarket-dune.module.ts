import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { PolymarketDuneService } from './polymarket-dune.service'
import { PolymarketDuneController } from './polymarket-dune.controller'

@Module({
  imports: [HttpModule],
  controllers: [PolymarketDuneController],
  providers: [PolymarketDuneService],
  exports: [PolymarketDuneService]
})
export class PolymarketDuneModule {}
