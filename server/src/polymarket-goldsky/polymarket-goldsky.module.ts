import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { PolymarketGoldskyService } from './polymarket-goldsky.service'
import { PolymarketGoldskyController } from './polymarket-goldsky.controller'

@Module({
  imports: [HttpModule],
  controllers: [PolymarketGoldskyController],
  providers: [PolymarketGoldskyService],
  exports: [PolymarketGoldskyService]
})
export class PolymarketGoldskyModule {}
