import { BadRequestException, ConflictException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Workbook } from 'exceljs';
import { Readable } from 'stream';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { ExcelOrderImportService } from './excel-order-import.service';
import {
  ManualOrdersService,
  type OrderManagerIdentity,
} from './manual-orders.service';

describe('ExcelOrderImportService', () => {
  const manager: OrderManagerIdentity = {
    id: '94db0dc5-cfca-462b-bd84-e23a8d73c1d1',
    role: UserRole.SHOP_MANAGER,
  };
  const store = { id: 'f72a7329-7390-439b-908b-3921262d3df0' };

  async function createFile(rows: unknown[][]): Promise<Express.Multer.File> {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Orders');
    worksheet.addRows(rows);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return {
      fieldname: 'file',
      originalname: 'orders.xlsx',
      encoding: '7bit',
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.length,
      buffer,
      stream: new Readable(),
      destination: '',
      filename: '',
      path: '',
    };
  }

  function createService() {
    const createManualOrderForStore = jest.fn(
      (storeId: string, dto: CreateManualOrderDto) => {
        void storeId;
        void dto;
        return Promise.resolve({ order: { id: 'created-order-id' } });
      },
    );
    const manualOrdersService = {
      resolveManagedStore: jest.fn().mockResolvedValue(store),
      createManualOrderForStore,
    };
    return {
      manualOrdersService,
      service: new ExcelOrderImportService(
        manualOrdersService as unknown as ManualOrdersService,
      ),
    };
  }

  it('imports valid orders and returns row-level errors without partial orders', async () => {
    const { service, manualOrdersService } = createService();
    const file = await createFile([
      [
        'order_code',
        'customer_name',
        'customer_phone',
        'shipping_address',
        'status',
        'sku',
        'quantity',
        'unit_price',
        'discount_amount',
      ],
      [
        'ORDER-01',
        'Nguyễn Văn A',
        '0901234567',
        'TP.HCM',
        'PENDING',
        'SKU-01',
        2,
        100000,
        0,
      ],
      [
        'ORDER-01',
        'Nguyễn Văn A',
        '0901234567',
        'TP.HCM',
        'PENDING',
        'SKU-02',
        1,
        50000,
        0,
      ],
      [
        'ORDER-02',
        'Trần Văn B',
        '0912345678',
        'Hà Nội',
        'PENDING',
        'SKU-03',
        0,
        200000,
        0,
      ],
    ]);
    manualOrdersService.createManualOrderForStore.mockResolvedValue({
      order: { id: 'created-order-id' },
    });

    const result = await service.importOrders(manager, {}, file);

    expect(result.summary).toEqual({
      totalRows: 3,
      totalOrders: 2,
      importedOrders: 1,
      skippedOrders: 1,
      errorRows: 1,
    });
    expect(result.errors[0]).toMatchObject({ row: 4, orderCode: 'ORDER-02' });
    expect(manualOrdersService.createManualOrderForStore).toHaveBeenCalledTimes(
      1,
    );
    expect(
      manualOrdersService.createManualOrderForStore.mock.calls[0][1].items,
    ).toHaveLength(2);
  });

  it('reports duplicate orders as row-level errors', async () => {
    const { service, manualOrdersService } = createService();
    const file = await createFile([
      [
        'order_code',
        'customer_name',
        'customer_phone',
        'shipping_address',
        'sku',
        'quantity',
      ],
      ['ORDER-01', 'Nguyễn Văn A', '0901234567', 'TP.HCM', 'SKU-01', 1],
    ]);
    manualOrdersService.createManualOrderForStore.mockRejectedValue(
      new ConflictException('Mã đơn hàng ORDER-01 đã tồn tại'),
    );

    const result = await service.importOrders(manager, {}, file);

    expect(result.summary.importedOrders).toBe(0);
    expect(result.summary.skippedOrders).toBe(1);
    expect(result.errors[0]).toMatchObject({
      row: 2,
      orderCode: 'ORDER-01',
    });
    expect(result.errors[0].message).toContain('Đơn bị trùng');
  });

  it('rejects a workbook with missing required columns', async () => {
    const { service } = createService();
    const file = await createFile([['order_code'], ['ORDER-01']]);

    await expect(
      service.importOrders(manager, {}, file),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
