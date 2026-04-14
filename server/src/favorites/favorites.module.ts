import { Module } from '@nestjs/common'
import { FavoritesService } from './favorites.service'
import { FavoritesController } from './favorites.controller'
import { OssSyncModule } from '../oss-sync/oss-sync.module'

@Module({
  imports: [OssSyncModule],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
