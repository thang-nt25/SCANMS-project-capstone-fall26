import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { Workbook, type Cell, type Row } from 'exceljs';
import { PassThrough } from 'stream';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { ImportOrdersDto } from './dto/import-orders.dto';
import {
  ManualOrdersService,
  type OrderManagerIdentity,
} from './manual-orders.service';

export const MAX_EXCEL_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const REQUIRED_HEADERS = [
  'order_code',
  'customer_name',
  'customer_phone',
  'shipping_address',
  'sku',
  'quantity',
] as const;

const HEADER_ALIASES: Record<string, string> = {
  order_code: 'order_code',
  ma_don: 'order_code',
  ma_don_hang: 'order_code',
  customer_name: 'customer_name',
  ten_khach_hang: 'customer_name',
  customer_phone: 'customer_phone',
  so_dien_thoai: 'customer_phone',
  sdt: 'customer_phone',
  shipping_address: 'shipping_address',
  dia_chi: 'shipping_address',
  dia_chi_giao_hang: 'shipping_address',
  status: 'status',
  trang_thai: 'status',
  sku: 'sku',
  ma_sku: 'sku',
  quantity: 'quantity',
  so_luong: 'quantity',
  unit_price: 'unit_price',
  don_gia: 'unit_price',
  discount_amount: 'discount_amount',
  tien_giam_gia: 'discount_amount',
};

interface ParsedExcelRow {
  rowNumber: number;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  status?: OrderStatus;
  sku: string;
  quantity: number;
  unitPrice?: number;
  discountAmount?: number;
}

export interface ExcelImportError {
  row: number;
  orderCode?: string;
  field?: string;
  message: string;
}

@Injectable()
export class ExcelOrderImportService {
  private readonly logger = new Logger(ExcelOrderImportService.name);

  constructor(private readonly manualOrdersService: ManualOrdersService) {}

  async importOrders(
    manager: OrderManagerIdentity,
    dto: ImportOrdersDto,
    file?: Express.Multer.File,
  ) {
    this.validateFile(file);
    const workbook = await this.loadWorkbook(file.buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('File Excel không có worksheet');
    }

    const headerMap = this.readHeaders(worksheet.getRow(1));
    const missingHeaders = REQUIRED_HEADERS.filter(
      (header) => !headerMap.has(header),
    );
    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `File Excel thiếu cột bắt buộc: ${missingHeaders.join(', ')}`,
      );
    }

    const errors: ExcelImportError[] = [];
    const parsedRows: ParsedExcelRow[] = [];
    const invalidOrderCodes = new Set<string>();
    let totalRows = 0;

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      if (this.isEmptyRow(row)) {
        continue;
      }
      totalRows += 1;

      const parsedRow = this.parseRow(row, rowNumber, headerMap, errors);
      if (parsedRow) {
        parsedRows.push(parsedRow);
      } else {
        const orderCode = this.getCellText(row, headerMap.get('order_code'));
        if (orderCode) {
          invalidOrderCodes.add(orderCode);
        }
      }
    }

    if (totalRows === 0) {
      throw new BadRequestException('File Excel không có dòng dữ liệu');
    }

    const groupedOrders = this.groupRowsByOrder(
      parsedRows,
      invalidOrderCodes,
      errors,
    );
    const store = await this.manualOrdersService.resolveManagedStore(
      manager,
      dto.storeId,
    );
    const importedOrders: Array<{
      orderCode: string;
      orderId: string;
      itemCount: number;
    }> = [];
    let skippedOrders = invalidOrderCodes.size;

    for (const [orderCode, rows] of groupedOrders) {
      if (invalidOrderCodes.has(orderCode)) {
        continue;
      }

      const firstRow = rows[0];
      const manualOrder: CreateManualOrderDto = {
        externalOrderSn: orderCode,
        customerName: firstRow.customerName,
        customerPhone: firstRow.customerPhone,
        shippingAddress: firstRow.shippingAddress,
        status: firstRow.status,
        discountAmount: firstRow.discountAmount,
        items: rows.map((row) => ({
          sku: row.sku,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
        })),
      };

      try {
        const result = await this.manualOrdersService.createManualOrderForStore(
          store.id,
          manualOrder,
        );
        importedOrders.push({
          orderCode,
          orderId: result.order.id,
          itemCount: rows.length,
        });
      } catch (error: unknown) {
        skippedOrders += 1;
        const reason = this.getErrorMessage(error);
        for (const row of rows) {
          errors.push({
            row: row.rowNumber,
            orderCode,
            message:
              error instanceof ConflictException
                ? `Đơn bị trùng: ${reason}`
                : reason,
          });
        }
      }
    }

    this.logger.log(
      `Excel import finished: storeId=${store.id}, rows=${totalRows}, imported=${importedOrders.length}, skipped=${skippedOrders}`,
    );

    return {
      message: 'Đã xử lý file Excel',
      summary: {
        totalRows,
        totalOrders: new Set([...groupedOrders.keys(), ...invalidOrderCodes])
          .size,
        importedOrders: importedOrders.length,
        skippedOrders,
        errorRows: new Set(errors.map((error) => error.row)).size,
      },
      importedOrders,
      errors: errors.sort((left, right) => left.row - right.row),
    };
  }

  private validateFile(
    file?: Express.Multer.File,
  ): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException('Vui lòng tải lên file Excel');
    }
    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('Chỉ hỗ trợ file Excel định dạng .xlsx');
    }
    if (!file.buffer?.length) {
      throw new BadRequestException('File Excel rỗng');
    }
    if (file.size > MAX_EXCEL_FILE_SIZE_BYTES) {
      throw new BadRequestException('File Excel không được vượt quá 5 MB');
    }
  }

  private async loadWorkbook(buffer: Buffer): Promise<Workbook> {
    const workbook = new Workbook();
    try {
      const inputStream = new PassThrough();
      inputStream.end(buffer);
      await workbook.xlsx.read(inputStream);
      return workbook;
    } catch {
      throw new BadRequestException('File Excel bị hỏng hoặc sai định dạng');
    }
  }

  private readHeaders(row: Row): Map<string, number> {
    const headers = new Map<string, number>();
    row.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
      const normalizedHeader = this.normalizeHeader(cell.text);
      const canonicalHeader = HEADER_ALIASES[normalizedHeader];
      if (canonicalHeader && !headers.has(canonicalHeader)) {
        headers.set(canonicalHeader, columnNumber);
      }
    });
    return headers;
  }

  private parseRow(
    row: Row,
    rowNumber: number,
    headers: Map<string, number>,
    errors: ExcelImportError[],
  ): ParsedExcelRow | undefined {
    const getText = (field: string) =>
      this.getCellText(row, headers.get(field));
    const orderCode = getText('order_code');
    const rowErrors: ExcelImportError[] = [];
    const requireText = (field: string, label: string, maxLength: number) => {
      const value = getText(field);
      if (!value) {
        rowErrors.push({
          row: rowNumber,
          orderCode: orderCode || undefined,
          field,
          message: `${label} không được để trống`,
        });
      } else if (value.length > maxLength) {
        rowErrors.push({
          row: rowNumber,
          orderCode: orderCode || undefined,
          field,
          message: `${label} không được vượt quá ${maxLength} ký tự`,
        });
      }
      return value;
    };

    requireText('order_code', 'Mã đơn hàng', 100);
    const customerName = requireText('customer_name', 'Tên khách hàng', 150);
    const customerPhone = requireText('customer_phone', 'Số điện thoại', 20);
    const shippingAddress = requireText(
      'shipping_address',
      'Địa chỉ giao hàng',
      1000,
    );
    const sku = requireText('sku', 'SKU', 100);
    const quantity = this.parseNumberCell(
      row,
      headers.get('quantity'),
      rowNumber,
      orderCode,
      'quantity',
      'Số lượng',
      rowErrors,
      true,
    );
    const unitPrice = this.parseNumberCell(
      row,
      headers.get('unit_price'),
      rowNumber,
      orderCode,
      'unit_price',
      'Đơn giá',
      rowErrors,
      false,
    );
    const discountAmount = this.parseNumberCell(
      row,
      headers.get('discount_amount'),
      rowNumber,
      orderCode,
      'discount_amount',
      'Tiền giảm giá',
      rowErrors,
      false,
    );
    const status = this.parseStatus(
      getText('status'),
      rowNumber,
      orderCode,
      rowErrors,
    );

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return undefined;
    }

    return {
      rowNumber,
      orderCode,
      customerName,
      customerPhone,
      shippingAddress,
      status,
      sku,
      quantity: quantity!,
      unitPrice,
      discountAmount,
    };
  }

  private groupRowsByOrder(
    rows: ParsedExcelRow[],
    invalidOrderCodes: Set<string>,
    errors: ExcelImportError[],
  ): Map<string, ParsedExcelRow[]> {
    const groups = new Map<string, ParsedExcelRow[]>();
    for (const row of rows) {
      const group = groups.get(row.orderCode) ?? [];
      const firstRow = group[0];
      if (firstRow && !this.hasConsistentOrderData(firstRow, row)) {
        invalidOrderCodes.add(row.orderCode);
        errors.push({
          row: row.rowNumber,
          orderCode: row.orderCode,
          message:
            'Thông tin khách hàng, trạng thái hoặc giảm giá không nhất quán trong cùng mã đơn',
        });
      }
      group.push(row);
      groups.set(row.orderCode, group);
    }

    for (const orderCode of invalidOrderCodes) {
      const group = groups.get(orderCode);
      if (!group) {
        continue;
      }
      const rowsWithErrors = new Set(
        errors
          .filter((error) => error.orderCode === orderCode)
          .map((error) => error.row),
      );
      for (const row of group) {
        if (!rowsWithErrors.has(row.rowNumber)) {
          errors.push({
            row: row.rowNumber,
            orderCode,
            message: 'Bỏ qua vì một dòng khác của cùng đơn hàng không hợp lệ',
          });
        }
      }
    }
    return groups;
  }

  private hasConsistentOrderData(
    firstRow: ParsedExcelRow,
    currentRow: ParsedExcelRow,
  ): boolean {
    return (
      firstRow.customerName === currentRow.customerName &&
      firstRow.customerPhone === currentRow.customerPhone &&
      firstRow.shippingAddress === currentRow.shippingAddress &&
      (firstRow.status ?? OrderStatus.PENDING) ===
        (currentRow.status ?? OrderStatus.PENDING) &&
      (firstRow.discountAmount ?? 0) === (currentRow.discountAmount ?? 0)
    );
  }

  private parseNumberCell(
    row: Row,
    columnNumber: number | undefined,
    rowNumber: number,
    orderCode: string,
    field: string,
    label: string,
    errors: ExcelImportError[],
    required: boolean,
  ): number | undefined {
    if (!columnNumber) {
      return undefined;
    }
    const text = this.getCellText(row, columnNumber);
    if (!text) {
      if (required) {
        errors.push({
          row: rowNumber,
          orderCode: orderCode || undefined,
          field,
          message: `${label} không được để trống`,
        });
      }
      return undefined;
    }

    const numberValue = Number(text.replaceAll(',', '').replaceAll(' ', ''));
    const invalidInteger =
      field === 'quantity' && !Number.isInteger(numberValue);
    if (!Number.isFinite(numberValue) || numberValue < 0 || invalidInteger) {
      errors.push({
        row: rowNumber,
        orderCode: orderCode || undefined,
        field,
        message:
          field === 'quantity'
            ? 'Số lượng phải là số nguyên lớn hơn 0'
            : `${label} phải là số không âm`,
      });
      return undefined;
    }
    if (field === 'quantity' && numberValue === 0) {
      errors.push({
        row: rowNumber,
        orderCode: orderCode || undefined,
        field,
        message: 'Số lượng phải là số nguyên lớn hơn 0',
      });
      return undefined;
    }
    return numberValue;
  }

  private parseStatus(
    value: string,
    rowNumber: number,
    orderCode: string,
    errors: ExcelImportError[],
  ): OrderStatus | undefined {
    if (!value) {
      return undefined;
    }
    const status = value.trim().toUpperCase();
    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
      errors.push({
        row: rowNumber,
        orderCode: orderCode || undefined,
        field: 'status',
        message: `Trạng thái không hợp lệ: ${value}`,
      });
      return undefined;
    }
    return status as OrderStatus;
  }

  private getCellText(row: Row, columnNumber?: number): string {
    if (!columnNumber) {
      return '';
    }
    return this.getExcelCellText(row.getCell(columnNumber));
  }

  private getExcelCellText(cell: Cell): string {
    return cell.text.trim();
  }

  private isEmptyRow(row: Row): boolean {
    let hasValue = false;
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.text.trim()) {
        hasValue = true;
      }
    });
    return !hasValue;
  }

  private normalizeHeader(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replaceAll('đ', 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof BadRequestException) {
      const response = error.getResponse();
      if (typeof response === 'object' && response && 'message' in response) {
        const message = (response as { message: string | string[] }).message;
        return Array.isArray(message) ? message.join('; ') : message;
      }
    }
    return error instanceof Error ? error.message : 'Không thể import đơn hàng';
  }
}
