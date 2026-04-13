import { Module } from '@nestjs/common'
import { NotificationService } from './notification.service'
import { NotificationController } from './notification.controller'
import { FavoritesModule } from '../favorites/favorites.module'
import { MarketModule } from '../market/market.module'

@Module({
  imports: [FavoritesModule, MarketModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
