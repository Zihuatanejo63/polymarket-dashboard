import { Module } from '@nestjs/common'
import { FavoritesService } from './favorites.service'
import { FavoritesController } from './favorites.controller'
import { MarketModule } from '../market/market.module'

@Module({
  imports: [MarketModule],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
