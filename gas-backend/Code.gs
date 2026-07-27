// Code.gs - Google Apps Script Backend cho Ứng dụng Quản lý Kho Hóa Chất
const SHEET_NAME_MAP = {
  "Users": "Nhân Viên",
  "Warehouses": "Danh Sách Kho",
  "Units": "Đơn Vị Tính",
  "SubUnits": "Đơn Vị Con",
  "VolumeUnits": "Đơn Vị Thể Tích",
  "Manufacturers": "Hãng Sản Xuất",
  "Chemicals": "Hóa Chất",
  "GoodsReceipts": "Phiếu Nhập",
  "GoodsIssues": "Phiếu Xuất",
  "Config": "Cấu Hinh",
  "Equipments": "Danh Sách Thiết Bị",
  "EquipmentQCs": "QC Thiết Bị"
};
const HEADER_MAP = {
  // Common
  "id": "Mã hệ thống",
  "name": "Tên",
  "createdDate": "Ngày tạo",
  "createdBy": "Người tạo",
  "lastModifiedBy": "Người sửa",
  "lastModifiedDate": "Thời gian sửa",
  "notes": "Ghi chú",
  // Personnel
  "code": "Mã NV (Đăng nhập)",
  "password": "Mật khẩu",
  "role": "Vai trò",
  "permissions": "Quyền hạn",
  // Chemical
  "warehouseId": "Mã Kho",
  "manufacturerId": "Mã Hãng SX",
  "unitId": "Mã ĐVT chính",
  "itemsPerUnit": "Quy cách đóng gói",
  "subItemName": "Tên ĐVT con",
  "volumePerSubItem": "Thể tích/ĐVT con",
  "volumeUnit": "ĐV Thể tích",
  "openingStock": "Tồn đầu kỳ",
  "currentStock": "Tồn kho hiện tại",
  "requiresLotAndExpiry": "Bắt buộc Lot/HSD",
  // Receipts/Issues
  "receiptDate": "Ngày nhập",
  "issueDate": "Ngày xuất",
  "chemicalId": "Mã Hóa Chất",
  "entryType": "Kiểu nhập",
  "qrCode": "Mã QR",
  "lotNumber": "Số Lô (Lot)",
  "quantity": "Số lượng",
  "expiryDate": "Hạn sử dụng",
  "isSubUnit": "Xuất theo ĐVT con",
  // QC
  "qcStatus": "Trạng thái QC",
  "qcDate": "Ngày duyệt QC",
  "qcBy": "Người duyệt QC",
  // Config
  "appName": "Tên ứng dụng",
  "warningThresholdDays": "Cảnh báo HSD (Ngày)",
  "criticalThresholdDays": "Báo đỏ HSD (Ngày)",
  "lowStockThreshold": "Ngưỡng cảnh báo tồn kho",
  "qcControlledWarehouseIds": "DS Kho Kiểm soát QC",
  // Warehouse Config
  "enableUsageDetails": "Bật bảng chi tiết BN",
  "usageColumns": "Cấu hình cột BN",
  // Usage Details on Issues
  "usageDetails": "Chi tiết sử dụng (BN)",
  // Equipment
  "equipmentId": "Mã Thiết Bị"
};
function getVietnameseHeader(englishHeader) {
  return HEADER_MAP[englishHeader] || englishHeader;
}
function getEnglishHeader(vietnameseHeader) {
  for (var key in HEADER_MAP) {
    if (HEADER_MAP[key] === vietnameseHeader) {
      return key;
    }
  }
  return vietnameseHeader;
}
/**
 * Trả về giao diện web HTML (file index.html)
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Quản lý Kho Hóa chất')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
const SHEET_HEADERS_MAP = {
  "Users": ["id", "name", "code", "password", "role", "permissions", "createdDate", "createdBy"],
  "Warehouses": ["id", "name", "enableUsageDetails", "usageColumns"],
  "Units": ["id", "name"],
  "SubUnits": ["id", "name"],
  "VolumeUnits": ["id", "name"],
  "Manufacturers": ["id", "name"],
  "Chemicals": ["id", "warehouseId", "name", "manufacturerId", "unitId", "itemsPerUnit", "subItemName", "volumePerSubItem", "volumeUnit", "openingStock", "currentStock", "requiresLotAndExpiry", "createdDate", "createdBy"],
  "GoodsReceipts": ["id", "receiptDate", "warehouseId", "chemicalId", "entryType", "qrCode", "lotNumber", "quantity", "expiryDate", "notes", "createdDate", "createdBy", "qcStatus", "qcDate", "qcBy", "lotRejectionReason", "lastModifiedBy", "lastModifiedDate"],
  "GoodsIssues": ["id", "issueDate", "warehouseId", "equipmentId", "chemicalId", "lotNumber", "quantity", "isSubUnit", "notes", "createdDate", "createdBy", "usageDetails", "lastModifiedBy", "lastModifiedDate"],
  "Config": ["appName", "warningThresholdDays", "criticalThresholdDays", "qcControlledWarehouseIds"],
  "Equipments": ["id", "name", "warehouseId"],
  "EquipmentQCs": ["id", "chemicalId", "lotNumber", "equipmentId", "qcStatus", "qcDate", "qcBy", "notes"]
};
function getOrCreateSheet(sheetKey) {
  var sheetName = SHEET_NAME_MAP[sheetKey] || sheetKey;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var enHeaders = SHEET_HEADERS_MAP[sheetKey] || [];
    var vnHeaders = [];
    for (var i = 0; i < enHeaders.length; i++) {
      vnHeaders.push(getVietnameseHeader(enHeaders[i]));
    }
    if (vnHeaders.length > 0) {
      sheet.getRange(1, 1, 1, vnHeaders.length).setValues([vnHeaders]);
    }
  }
  return sheet;
}
/**
 * Lấy toàn bộ dữ liệu từ một Sheet cụ thể
 * @param {string} sheetKey - Tên key của Sheet bằng tiếng Anh (VD: Users, Chemicals)
 * @returns {string} - Chuỗi JSON chứa mảng các object
 */
function loadTable(sheetKey) {
  var sheet = getOrCreateSheet(sheetKey);
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  if (values.length <= 1) return JSON.stringify([]);
  var vnHeaders = values[0];
  var result = [];
  var numKeys = ['itemsPerUnit', 'volumePerSubItem', 'openingStock', 'currentStock', 'quantity', 'warningThresholdDays', 'criticalThresholdDays', 'lowStockThreshold'];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < vnHeaders.length; j++) {
      var vnHeader = vnHeaders[j];
      var enHeader = getEnglishHeader(vnHeader);
      var val = row[j];
      
      // Sửa lỗi Google Sheets tự động ép kiểu chuỗi số thành kiểu số (vd: mật khẩu "123")
      if (typeof val === 'number' && numKeys.indexOf(enHeader) === -1) {
        val = String(val);
      }
      
      // Nếu là chuỗi JSON (như permission object) thì parse lại
      try {
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          obj[enHeader] = JSON.parse(val);
        } else {
          obj[enHeader] = val;
        }
      } catch (e) {
        obj[enHeader] = val;
      }
    }
    result.push(obj);
  }
  
  return JSON.stringify(result);
}
/**
 * Lưu toàn bộ dữ liệu vào một Sheet (Ghi đè)
 * @param {string} sheetKey - Tên key của Sheet bằng tiếng Anh
 * @param {string} dataString - Chuỗi JSON chứa mảng các object cần lưu
 */
function saveTable(sheetKey, dataString) {
  var data = JSON.parse(dataString);
  var sheet = getOrCreateSheet(sheetKey);
  
  sheet.clear(); // Xóa dữ liệu cũ
  sheet.showColumns(1, sheet.getMaxColumns()); // Bỏ ẩn mọi cột trước khi ghi lại, tránh lỗi mất cột khi đổi vị trí
  if (!data || data.length === 0) return true;
  // Gom tất cả key từ MỌI phần tử (không chỉ phần tử đầu tiên)
  var keySet = {};
  for (var k = 0; k < data.length; k++) {
    var keys = Object.keys(data[k]);
    for (var kk = 0; kk < keys.length; kk++) {
      keySet[keys[kk]] = true;
    }
  }
  var enHeaders = Object.keys(keySet);
  var vnHeaders = [];
  for (var h = 0; h < enHeaders.length; h++) {
    vnHeaders.push(getVietnameseHeader(enHeaders[h]));
  }
  
  var rows = [vnHeaders];
  for (var i = 0; i < data.length; i++) {
    var row = [];
    for (var j = 0; j < enHeaders.length; j++) {
      var val = data[i][enHeaders[j]];
      // Chuyển object/array phức tạp thành chuỗi JSON để lưu vào ô Excel
      if (typeof val === 'object' && val !== null) {
        row.push(JSON.stringify(val));
      } else {
        row.push(val);
      }
    }
    rows.push(row);
  }
  // Ghi mảng 2 chiều vào Google Sheet để tối ưu hiệu suất
  sheet.getRange(1, 1, rows.length, vnHeaders.length).setValues(rows);
  
  // Tự động ẩn cột chứa dữ liệu JSON để giao diện sheet gọn gàng
  var usageDetailsColIndex = vnHeaders.indexOf("Chi tiết sử dụng (BN)");
  if (usageDetailsColIndex >= 0) {
    sheet.hideColumns(usageDetailsColIndex + 1);
  }
  
  return true;
}
/**
 * (Tùy chọn) Hàm lấy toàn bộ bộ nhớ ứng dụng trong 1 lần gọi để load nhanh
 */
function getInitialAppData() {
  return {
    users: JSON.parse(loadTable('Users')),
    warehouses: JSON.parse(loadTable('Warehouses')),
    units: JSON.parse(loadTable('Units')),
    subUnits: JSON.parse(loadTable('SubUnits')),
    volumeUnits: JSON.parse(loadTable('VolumeUnits')),
    manufacturers: JSON.parse(loadTable('Manufacturers')),
    chemicals: JSON.parse(loadTable('Chemicals')),
    goodsReceipts: JSON.parse(loadTable('GoodsReceipts')),
    goodsIssues: JSON.parse(loadTable('GoodsIssues')),
    config: JSON.parse(loadTable('Config')),
    equipments: JSON.parse(loadTable('Equipments')),
    equipmentQCs: JSON.parse(loadTable('EquipmentQCs'))
  };
}
/**
 * Lưu dữ liệu chi tiết sử dụng (bệnh nhân) vào Sheet riêng theo tên kho.
 * @param {string} warehouseName - Tên kho (sẽ tạo sheet "BN - {warehouseName}")
 * @param {string} dataString - JSON chứa { columns: [{key,label}], rows: [{issueId, issueDate, chemicalName, lotNumber, ...dynamic cols}] }
 */
function saveUsageDetailsSheet(warehouseName, dataString) {
  var data = JSON.parse(dataString);
  var sheetName = 'BN - ' + warehouseName;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  sheet.clear();
  if (!data.rows || data.rows.length === 0) return true;
  
  // Build headers: fixed columns + dynamic columns
  var fixedHeaders = ['Phiếu Xuất', 'Ngày xuất', 'Tên Hóa chất', 'Số Lô'];
  var dynamicHeaders = [];
  if (data.columns && data.columns.length > 0) {
    for (var c = 0; c < data.columns.length; c++) {
      dynamicHeaders.push(data.columns[c].label);
    }
  }
  var allHeaders = fixedHeaders.concat(dynamicHeaders);
  
  var rows = [allHeaders];
  for (var i = 0; i < data.rows.length; i++) {
    var row = data.rows[i];
    var rowData = [row.issueId || '', row.issueDate || '', row.chemicalName || '', row.lotNumber || ''];
    if (data.columns) {
      for (var j = 0; j < data.columns.length; j++) {
        rowData.push(row[data.columns[j].key] || '');
      }
    }
    rows.push(rowData);
  }
  
  sheet.getRange(1, 1, rows.length, allHeaders.length).setValues(rows);
  return true;
}
