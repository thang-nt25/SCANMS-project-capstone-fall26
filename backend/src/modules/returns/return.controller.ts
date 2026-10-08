import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Headers,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ReturnService } from './return.service';
import {
  bookPickupSchema,
  disputeSchema,
  inspectionSchema,
  instructionsSchema,
  resolveDisputeSchema,
  ReturnZodPipe,
  shipmentSchema,
  simulatePickupSchema,
  shopQueueSchema,
  warehouseSchema,
  type BookPickupInput,
  type DisputeInput,
  type InspectionInput,
  type InstructionsInput,
  type ResolveDisputeInput,
  type ShipmentInput,
  type WarehouseInput,
} from './return.schemas';

@ApiTags('Returns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('returns')
export class ReturnController {
  constructor(private readonly returns: ReturnService) {}

  @Get('shop')
  async shopQueue(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query(new ReturnZodPipe(shopQueueSchema))
    query: { status?: string; page: number },
  ) {
    return this.returns.listShop(userId, role, query.status, query.page);
  }

  @Get(':id')
  async getOne(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returns.getOne(userId, role, id);
  }

  @Patch(':id/instructions')
  async instructions(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ReturnZodPipe(instructionsSchema)) body: InstructionsInput,
  ) {
    return this.returns.setInstructions(userId, role, id, body);
  }

  @Patch(':id/warehouse')
  saveWarehouse(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ReturnZodPipe(warehouseSchema)) body: WarehouseInput,
  ) {
    return this.returns.saveWarehouse(userId, role, id, body);
  }

  @Post(':id/pickup')
  bookPickup(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ReturnZodPipe(bookPickupSchema)) body: BookPickupInput,
  ) {
    return this.returns.bookPickup(userId, role, id, body);
  }

  @Patch(':id/pickup/simulate')
  simulatePickup(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ReturnZodPipe(simulatePickupSchema))
    body: { status: 'picked' | 'delivered' },
  ) {
    return this.returns.simulatePickup(userId, role, id, body.status);
  }

  @Post(':id/pickup/sync')
  syncPickup(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returns.syncPickup(userId, role, id);
  }

  @Post(':id/return-shipment')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('receipt', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  async submitShipment(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ReturnZodPipe(shipmentSchema)) body: ShipmentInput,
    @UploadedFile() receipt?: Express.Multer.File,
  ) {
    return this.returns.submitShipment(userId, role, id, body, receipt);
  }

  @Patch(':id/return-shipment')
  async correctShipment(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ReturnZodPipe(shipmentSchema)) body: ShipmentInput,
  ) {
    return this.returns.correctShipment(userId, role, id, body);
  }

  @Patch(':id/receipt')
  async confirmReceipt(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returns.confirmReceipt(userId, role, id);
  }

  @Patch(':id/inspection/start')
  async startInspection(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returns.startInspection(userId, role, id);
  }

  @Patch(':id/inspection/result')
  async inspect(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ReturnZodPipe(inspectionSchema)) body: InspectionInput,
  ) {
    return this.returns.inspect(userId, role, id, body);
  }

  @Post(':id/exchange-shipment')
  async exchangeShipment(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ReturnZodPipe(shipmentSchema)) body: ShipmentInput,
  ) {
    return this.returns.submitExchangeShipment(userId, role, id, body);
  }

  @Post(':id/confirmation')
  async confirmCompletion(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returns.confirmCompletion(userId, role, id);
  }

  @Post(':id/disputes')
  async openDispute(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ReturnZodPipe(disputeSchema)) body: DisputeInput,
  ) {
    return this.returns.openDispute(userId, role, id, body);
  }
}

@ApiTags('GHN Staging return pickup webhook')
@Controller('returns/webhooks/ghn-staging')
export class ReturnGhnWebhookController {
  constructor(private readonly returns: ReturnService) {}

  @Post()
  receive(
    @Headers('x-scanms-ghn-secret') secret: string | undefined,
    @Body() body: { OrderCode?: string; Status?: string; ShopID?: number },
  ) {
    return this.returns.handleGhnWebhook(secret, body);
  }
}

@ApiTags('Admin return disputes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
@Controller('admin/return-disputes')
export class ReturnDisputeAdminController {
  constructor(private readonly returns: ReturnService) {}

  @Get('overdue-inspections')
  listStalled(@CurrentUser('role') role: UserRole) {
    return this.returns.listStalledInspections(role);
  }

  @Get()
  list(@CurrentUser('role') role: UserRole) {
    return this.returns.listDisputes(role);
  }

  @Patch(':id/resolve')
  resolve(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ReturnZodPipe(resolveDisputeSchema)) body: ResolveDisputeInput,
  ) {
    return this.returns.resolveDispute(userId, role, id, body);
  }
}
