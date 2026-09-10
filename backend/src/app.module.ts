import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './core/database/prisma.module';
import { CloudinaryModule } from './core/cloudinary/cloudinary.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommissionRulesModule } from './modules/commission-rules/commission-rules.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    CloudinaryModule,
    UsersModule,
    AuthModule,
    CommissionRulesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
