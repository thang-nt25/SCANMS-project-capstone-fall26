import { Module } from '@nestjs/common';
import { CommissionRulesController } from './commission-rules.controller';
import { CollaboratorCommissionRulesController } from './collaborator-commission-rules.controller';
import { CommissionRulesService } from './commission-rules.service';
import { PrismaModule } from '../../core/database/prisma.module';
import { StoreOwnerGuard } from './guards/store-owner.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';
import { StoreCollaboratorsController } from './store-collaborators.controller';
import { StoreCollaboratorsService } from './store-collaborators.service';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [PrismaModule, AuthModule, WalletsModule],
  controllers: [
    CommissionRulesController,
    CollaboratorCommissionRulesController,
    StoreCollaboratorsController,
  ],
  providers: [
    CommissionRulesService,
    StoreCollaboratorsService,
    StoreOwnerGuard,
    JwtAuthGuard,
  ],
  exports: [CommissionRulesService],
})
export class CommissionRulesModule {}
