declare const XLSX: any;

export class ExcelHelper {

  
  static readonly sheetNameMap: Record<string, string> = {

    "Nhân Viên": "users",
    "Danh Sách Kho": "warehouses",
    "Đơn Vị Tính": "units",
    "Đơn Vị Con": "subUnits",
    "Đơn Vị Thể Tích": "volumeUnits",
    "Hãng Sản Xuất": "manufacturers",
    "Hóa Chất": "chemicals",
    "Phiếu Nhập": "goodsReceipts",
    "Phiếu Xuất": "goodsIssues",
    "Cấu Hình": "config"

  };

  static readonly headerMap: Record<string, string> = {

    "Mã hệ thống": "id",
    "Tên": "name",
    "Ngày tạo": "createdDate",
    "Người tạo": "createdBy",
    "Người sửa": "lastModifiedBy",
    "Thời gian sửa": "lastModifiedDate",
    "Ghi chú": "notes",
    "Mã NV (Đăng nhập)": "code",
    "Mật khẩu": "password",
    "Vai trò": "role",
    "Quyền hạn": "permissions",
    "Mã Kho": "warehouseId",
    "Mã Hãng SX": "manufacturerId",
    "Mã ĐVT chính": "unitId",
    "Quy cách đóng gói": "itemsPerUnit",
    "Tên ĐVT con": "subItemName",
    "Thể tích/ĐVT con": "volumePerSubItem",
    "ĐV Thể tích": "volumeUnit",
    "Tồn đầu kỳ": "openingStock",
    "Tồn kho hiện tại": "currentStock",
    "Bắt buộc Lot/HSD": "requiresLotAndExpiry",
    "Ngày nhập": "receiptDate",
    "Ngày xuất": "issueDate",
    "Mã Hóa Chất": "chemicalId",
    "Kiểu nhập": "entryType",
    "Mã QR": "qrCode",
    "Số Lô (Lot)": "lotNumber",
    "Số lượng": "quantity",
    "Hạn sử dụng": "expiryDate",
    "Xuất theo ĐVT con": "isSubUnit",
    "Trạng thái QC": "qcStatus",
    "Ngày duyệt QC": "qcDate",
    "Người duyệt QC": "qcBy",
    "Lý do không đạt (nếu failed)": "lotRejectionReason",
    "Tên ứng dụng": "appName",
    "Cảnh báo HSD (Ngày)": "warningThresholdDays",
    "Báo đỏ HSD (Ngày)": "criticalThresholdDays",
    "Ngưỡng cảnh báo tồn kho": "lowStockThreshold",
    "DS Kho Kiểm soát QC": "qcControlledWarehouseIds",
    "Bật bảng chi tiết BN": "enableUsageDetails",
    "Cấu hình cột BN": "usageColumns",
    "Chi tiết sử dụng (BN)": "usageDetails"

  };

  static async loadWorkbook(path: string) {

    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Không tìm thấy ${path}`);
    }

    const buffer = await response.arrayBuffer();

    return XLSX.read(
      new Uint8Array(buffer),
      {
        type: 'array'
      }
    );
  }

  static parseWorkbook(workbook: any): any {

    const parsedData: any = {};

    for (const sheetName of workbook.SheetNames) {

      const sheetKey =
        this.sheetNameMap[sheetName] ??
        sheetName;

      const sheet =
        workbook.Sheets[sheetName];

      const rows =
        XLSX.utils.sheet_to_json(sheet, {
          defval: ''
        });

      parsedData[sheetKey] =
        rows.map((row: any) =>
          this.parseRow(row)
        );
    }

    return parsedData;
  }

  private static parseRow(row: any) {

    const mapped: any = {};

    for (const key of Object.keys(row)) {

      const property =
        this.headerMap[key] ?? key;

      let value = row[key];

      if (
        typeof value === 'string' &&
        (value.startsWith('{') ||
          value.startsWith('['))
      ) {
        try {
          value = JSON.parse(value);
        } catch {}
      }

      mapped[property] = value;
    }

    return mapped;
  }
}