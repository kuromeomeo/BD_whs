import { Injectable, signal, computed } from '@angular/core';
import { Chemical } from '../../core/models/chemical.model';
import { GoodsReceipt } from '../models/goods-receipt.model';
import { GoodsIssue } from '../models/goods-issue.model';
import { MasterData } from '../models/master-data.model';
import { WarehouseData, UsageColumnDef } from '../models/warehouse.model'
import { IdHelper } from '../helpers/id.helper';
import { StorageHelper } from '../helpers/storage.helper';
import { ExcelHelper } from '../helpers/excel.helper';

declare const google: any;
declare const XLSX: any;
const isGasEnvironment = typeof google !== 'undefined' && google.script && google.script.run;

@Injectable({
  providedIn: 'root'
})
export class DataService {
  isGasEnvironment = isGasEnvironment;

  // Global App Config
  appName = signal<string>('CHEM WARE');

  // Cấu hình cảnh báo hạn sử dụng
  warningThresholdDays = signal<number>(60);
  criticalThresholdDays = signal<number>(0);


  // Danh sách ID các kho yêu cầu kiểm soát QC
  qcControlledWarehouseIds = signal<string[]>([]);

  warehouses = signal<WarehouseData[]>([]);
  units = signal<MasterData[]>([]);
  subUnits = signal<MasterData[]>([]);
  volumeUnits = signal<MasterData[]>([]);
  manufacturers = signal<MasterData[]>([]);
  chemicals = signal<Chemical[]>([]);
  goodsReceipts = signal<GoodsReceipt[]>([]);
  goodsIssues = signal<GoodsIssue[]>([]);
  

  private syncConfig() {
      const configObj = [{
          appName: this.appName(),
          warningThresholdDays: this.warningThresholdDays(),
          criticalThresholdDays: this.criticalThresholdDays(),
          qcControlledWarehouseIds: JSON.stringify(this.qcControlledWarehouseIds())
      }];
      // Luôn lưu vào localStorage để dùng làm bản sao dự phòng
      localStorage.setItem('chem_config', JSON.stringify(configObj));
      if (isGasEnvironment) {
          google.script.run.saveTable('Config', JSON.stringify(configObj));
      }
  }

  // ===================== HELPER =====================
  private sortAlphabetically<T extends { name: string }>(arr: T[]): T[] {
    return arr.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }


  // Khởi tạo toàn bộ dữ liệu từ Sheet (được gọi từ AppComponent)
  initAppData(data: any) {
    if (data.warehouses) {
        const mappedWarehouses = data.warehouses.map((w: any) => {
            let usageColumns = w.usageColumns;
            if (typeof usageColumns === 'string') {
                try { usageColumns = JSON.parse(usageColumns); } catch(e) { usageColumns = []; }
            }
            return {
                ...w,
                enableUsageDetails: (w.enableUsageDetails === true || String(w.enableUsageDetails).toLowerCase() === 'true'),
                usageColumns: Array.isArray(usageColumns) ? usageColumns : []
            };
        });
        this.warehouses.set(this.sortAlphabetically(mappedWarehouses));
    }
    if (data.units) this.units.set(this.sortAlphabetically(data.units));
    if (data.subUnits) this.subUnits.set(this.sortAlphabetically(data.subUnits));
    if (data.volumeUnits) this.volumeUnits.set(this.sortAlphabetically(data.volumeUnits));
    if (data.manufacturers) this.manufacturers.set(this.sortAlphabetically(data.manufacturers));
    if (data.chemicals) {
        const mappedChemicals = data.chemicals.map((c: any) => ({
            ...c,
            requiresLotAndExpiry: (c.requiresLotAndExpiry === false || String(c.requiresLotAndExpiry).toLowerCase() === 'false') ? false : true
        }));
        this.chemicals.set(this.sortAlphabetically(mappedChemicals));
    }
    if (data.goodsReceipts) {
       const mappedReceipts = data.goodsReceipts.map((r: any) => ({
           ...r,
           quantity: isNaN(Number(r.quantity)) ? 1 : Number(r.quantity)
       }));
       this.goodsReceipts.set(mappedReceipts);
    }
    
    if (data.goodsIssues) {
       const mappedIssues = data.goodsIssues.map((i: any) => {
           let usageDetails = i.usageDetails;
           if (typeof usageDetails === 'string') {
               try { usageDetails = JSON.parse(usageDetails); } catch(e) { usageDetails = undefined; }
           }
           return {
               ...i,
               quantity: isNaN(Number(i.quantity)) ? 1 : Number(i.quantity),
               usageDetails: Array.isArray(usageDetails) ? usageDetails : undefined
           };
       });
       this.goodsIssues.set(mappedIssues);
    }
    
    if (data.config && data.config.length > 0) {
       const cfg = data.config[0];
       if (cfg.appName) this.appName.set(cfg.appName);
       if (cfg.warningThresholdDays !== undefined) this.warningThresholdDays.set(Number(cfg.warningThresholdDays));
       if (cfg.criticalThresholdDays !== undefined) this.criticalThresholdDays.set(Number(cfg.criticalThresholdDays));
       if (cfg.qcControlledWarehouseIds) {
           try {
               // Hỗ trợ cả dạng string JSON lẫn array thực sự
               const parsed = typeof cfg.qcControlledWarehouseIds === 'string'
                   ? JSON.parse(cfg.qcControlledWarehouseIds)
                   : cfg.qcControlledWarehouseIds;
               if (Array.isArray(parsed)) {
                   this.qcControlledWarehouseIds.set(parsed);
               }
           } catch(e) {}
       }
    }
  }

  async loadMockExcel(): Promise<any> {
    try {
      const workbook = await ExcelHelper.loadWorkbook(
        '/database/mock_data.xlsx'
      );

      return ExcelHelper.parseWorkbook(workbook);

    } catch (error) {
      console.warn(error);
      return null;
    }
  }

  // Khởi tạo dữ liệu giả cho Local Dev hoặc nạp từ file Excel / LocalStorage
  async initLocalDataFallback() {
    const isInitialized = localStorage.getItem('chem_initialized') === 'true';
    
    if (isInitialized) {
      try {
        const readLocal = (key: string) => {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : null;
        };
        
        const warehousesVal = readLocal('chem_warehouses') || [];
        const unitsVal = readLocal('chem_units') || [];
        const subUnitsVal = readLocal('chem_subunits') || [];
        const volumeUnitsVal = readLocal('chem_volumeunits') || [];
        const manufacturersVal = readLocal('chem_manufacturers') || [];
        const chemicalsVal = readLocal('chem_chemicals') || [];
        const receiptsVal = readLocal('chem_goodsreceipts') || [];
        const issuesVal = readLocal('chem_goodsissues') || [];
        
        this.warehouses.set(warehousesVal);
        this.units.set(unitsVal);
        this.subUnits.set(subUnitsVal);
        this.volumeUnits.set(volumeUnitsVal);
        this.manufacturers.set(manufacturersVal);
        this.chemicals.set(chemicalsVal);
        this.goodsReceipts.set(receiptsVal);
        this.goodsIssues.set(issuesVal);
        
        const configArr = readLocal('chem_config');
        if (configArr && configArr.length > 0) {
          const cfg = configArr[0];
          if (cfg.appName) this.appName.set(cfg.appName);
          if (cfg.warningThresholdDays !== undefined) this.warningThresholdDays.set(Number(cfg.warningThresholdDays));
          if (cfg.criticalThresholdDays !== undefined) this.criticalThresholdDays.set(Number(cfg.criticalThresholdDays));
          if (cfg.qcControlledWarehouseIds) {
            const parsed = typeof cfg.qcControlledWarehouseIds === 'string'
                ? JSON.parse(cfg.qcControlledWarehouseIds)
                : cfg.qcControlledWarehouseIds;
            if (Array.isArray(parsed)) {
                this.qcControlledWarehouseIds.set(parsed);
            }
          }
        }
        console.log('Đã nạp dữ liệu Local từ LocalStorage');
        return;
      } catch (e) {
        console.error('Lỗi khi đọc LocalStorage, chuyển hướng nạp lại:', e);
      }
    }
    
    // Nếu chưa khởi tạo hoặc bị lỗi, thử đọc từ file Excel mock_data.xlsx
    const excelData = await this.loadMockExcel();
    if (excelData) {
      this.initAppData(excelData);
      
      // Lưu lại vào LocalStorage
      localStorage.setItem('chem_warehouses', JSON.stringify(this.warehouses()));
      localStorage.setItem('chem_units', JSON.stringify(this.units()));
      localStorage.setItem('chem_subunits', JSON.stringify(this.subUnits()));
      localStorage.setItem('chem_volumeunits', JSON.stringify(this.volumeUnits()));
      localStorage.setItem('chem_manufacturers', JSON.stringify(this.manufacturers()));
      localStorage.setItem('chem_chemicals', JSON.stringify(this.chemicals()));
      localStorage.setItem('chem_goodsreceipts', JSON.stringify(this.goodsReceipts()));
      localStorage.setItem('chem_goodsissues', JSON.stringify(this.goodsIssues()));
      
      if (excelData.users) {
        localStorage.setItem('chem_users_backup', JSON.stringify(excelData.users));
      }
      
      this.syncConfig();
      localStorage.setItem('chem_initialized', 'true');
      console.log('Đã khởi tạo CSDL cục bộ từ tệp mock_data.xlsx thành công');
    } else {
      // Dữ liệu mẫu mặc định (nếu không có file Excel)
      this.warehouses.set([{ id: 'wh1', name: 'Kho Chính' }, { id: 'wh2', name: 'Kho Phụ' }]);
      this.units.set([{ id: 'u1', name: 'Lít' }, { id: 'u2', name: 'Kg' }, { id: 'u3', name: 'Hộp' }, { id: 'u4', name: 'Thùng' }]);
      this.subUnits.set([{ id: 'su1', name: 'Lọ' }, { id: 'su2', name: 'Can' }, { id: 'su3', name: 'Chai' }]);
      this.volumeUnits.set([{ id: 'vu1', name: 'ml' }, { id: 'vu2', name: 'L' }, { id: 'vu3', name: 'g' }]);
      this.manufacturers.set([{ id: 'm1', name: 'Cty Hóa chất Á Châu' }, { id: 'm2', name: 'Cty Minh Tâm' }]);
      this.chemicals.set([
        { id: 'c1', warehouseId: 'wh1', name: 'Axit Sulfuric (H2SO4)', manufacturerId: 'm1', unitId: 'u4', itemsPerUnit: 1, subItemName: 'Can', volumePerSubItem: 20, volumeUnit: 'L', openingStock: 100, currentStock: 150, requiresLotAndExpiry: true, createdDate: new Date().toISOString(), createdBy: 'Admin' }
      ]);
      this.goodsReceipts.set([{ id: 'gr1', receiptDate: new Date('2024-05-20').toISOString(), warehouseId: 'wh1', chemicalId: 'c1', entryType: 'manual', lotNumber: 'LOT20240520', quantity: 50, expiryDate: new Date('2026-05-20').toISOString(), notes: 'Hàng nhập đợt 1', createdDate: new Date().toISOString(), createdBy: 'Admin', qcStatus: 'passed' }]);
      
      // Lưu lại vào LocalStorage
      localStorage.setItem('chem_warehouses', JSON.stringify(this.warehouses()));
      localStorage.setItem('chem_units', JSON.stringify(this.units()));
      localStorage.setItem('chem_subunits', JSON.stringify(this.subUnits()));
      localStorage.setItem('chem_volumeunits', JSON.stringify(this.volumeUnits()));
      localStorage.setItem('chem_manufacturers', JSON.stringify(this.manufacturers()));
      localStorage.setItem('chem_chemicals', JSON.stringify(this.chemicals()));
      localStorage.setItem('chem_goodsreceipts', JSON.stringify(this.goodsReceipts()));
      localStorage.setItem('chem_goodsissues', JSON.stringify(this.goodsIssues()));
      
      const defaultUsers = [
        { 
          id: '1', code: 'ADMIN', name: 'Quản trị viên', password: '123', role: 'admin',
          permissions: { canApproveLot: true, canEditReceipt: true, canDeleteReceipt: true, canEditIssue: true, canDeleteIssue: true, canAddChemical: true }
        }
      ];
      localStorage.setItem('chem_users_backup', JSON.stringify(defaultUsers));
      
      this.syncConfig();
      localStorage.setItem('chem_initialized', 'true');
      console.log('Đã khởi tạo CSDL cục bộ bằng dữ liệu mẫu mặc định');
    }
  }

  // Khôi phục dữ liệu từ tệp Excel
  async restoreFromExcel() {
    localStorage.removeItem('chem_initialized');
    await this.initLocalDataFallback();
    window.location.reload();
  }

  // Reset sạch cơ sở dữ liệu local
  clearLocalDb() {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('chem_')) {
        localStorage.removeItem(key);
      }
    }
    window.location.reload();
  }

  // App Config Actions
  setAppName(name: string) {
    this.appName.set(name);
    this.syncConfig();
  }

  setWarningThreshold(days: number) {
    this.warningThresholdDays.set(days);
    this.syncConfig();
  }
  
  setCriticalThreshold(days: number) {
    this.criticalThresholdDays.set(days);
    this.syncConfig();
  }

  toggleWarehouseQC(warehouseId: string) {
    this.qcControlledWarehouseIds.update(ids => {
      if (ids.includes(warehouseId)) {
        return ids.filter(id => id !== warehouseId);
      } else {
        return [...ids, warehouseId];
      }
    });
    this.syncConfig();
  }

  isWarehouseQC(warehouseId: string) {
    return this.qcControlledWarehouseIds().includes(warehouseId);
  }

  // Duyệt LOT: Kết quả Đạt
  approveLot(lotNumber: string, chemicalId: string, user: string) {
    this.updateLotQCStatus(lotNumber, chemicalId, 'passed', user, '');
  }

  // Từ chối LOT: Kết quả Không Đạt
  rejectLot(lotNumber: string, chemicalId: string, user: string, reason: string) {
    this.updateLotQCStatus(lotNumber, chemicalId, 'failed', user, reason);
  }

  // Đặt lại về Pending
  resetLotToPending(lotNumber: string, chemicalId: string) {
    this.updateLotQCStatus(lotNumber, chemicalId, 'pending', '', '');
  }

  // Master Data CRUD
  addWarehouse(name: string) {
    const id = IdHelper.generateNextId('KHO', this.warehouses());
    this.warehouses.update(v => this.sortAlphabetically([...v, { id, name, enableUsageDetails: false, usageColumns: [] }]));
    StorageHelper.syncData('Warehouses', this.warehouses());
  }
  deleteWarehouse(id: string) {
    const isUsed = this.chemicals().some(c => c.warehouseId === id);
    if (isUsed) throw new Error('Không thể xóa kho đang được sử dụng. Vui lòng di chuyển hoặc xóa các hóa chất liên quan trước.');
    
    this.warehouses.update(v => v.filter(i => i.id !== id));
    this.qcControlledWarehouseIds.update(ids => ids.filter(qcId => qcId !== id));
    
    StorageHelper.syncData('Warehouses', this.warehouses());
    this.syncConfig();
  }
  updateWarehouse(id: string, name: string) {
    this.warehouses.update(v => this.sortAlphabetically(v.map(i => i.id === id ? { ...i, name } : i)));
    StorageHelper.syncData('Warehouses', this.warehouses());
  }

  // Cập nhật cấu hình bảng chi tiết BN cho kho
  updateWarehouseConfig(id: string, enableUsageDetails: boolean, usageColumns: UsageColumnDef[]) {
    this.warehouses.update(v => v.map(w => {
      // Gán giá trị mặc định cho kho cũ chưa có thuộc tính
      const base = {
        enableUsageDetails: w.enableUsageDetails ?? false,
        usageColumns: w.usageColumns ?? [],
        ...w
      };
      if (w.id === id) {
        return { ...base, enableUsageDetails, usageColumns };
      }
      return base;
    }));
    StorageHelper.syncData('Warehouses', this.warehouses());
  }

  // Lấy cấu hình kho
  getWarehouseConfig(id: string): WarehouseData | undefined {
    return this.warehouses().find(w => w.id === id);
  }

  addUnit(name: string) {
    const id = IdHelper.generateNextId('DVT', this.units());
    this.units.update(v => this.sortAlphabetically([...v, { id, name }]));
    StorageHelper.syncData('Units', this.units());
  }
  deleteUnit(id: string) {
    const isUsed = this.chemicals().some(c => c.unitId === id);
    if (isUsed) throw new Error('Không thể xóa đơn vị tính đang được sử dụng. Vui lòng cập nhật các hóa chất liên quan trước.');
    this.units.update(v => v.filter(i => i.id !== id));
    StorageHelper.syncData('Units', this.units());
  }
  updateUnit(id: string, name: string) {
    this.units.update(v => this.sortAlphabetically(v.map(i => i.id === id ? { ...i, name } : i)));
    StorageHelper.syncData('Units', this.units());
  }

  addManufacturer(name: string) {
    const id = IdHelper.generateNextId('NSX', this.manufacturers());
    this.manufacturers.update(v => this.sortAlphabetically([...v, { id, name }]));
    StorageHelper.syncData('Manufacturers', this.manufacturers());
  }
  deleteManufacturer(id: string) {
    const isUsed = this.chemicals().some(c => c.manufacturerId === id);
    if (isUsed) throw new Error('Không thể xóa hãng sản xuất đang được sử dụng. Vui lòng cập nhật các hóa chất liên quan trước.');
    this.manufacturers.update(v => v.filter(i => i.id !== id));
    StorageHelper.syncData('Manufacturers', this.manufacturers());
  }
  updateManufacturer(id: string, name: string) {
    this.manufacturers.update(v => this.sortAlphabetically(v.map(i => i.id === id ? { ...i, name } : i)));
    StorageHelper.syncData('Manufacturers', this.manufacturers());
  }

  addSubUnit(name: string) {
    const id = IdHelper.generateNextId('DVC', this.subUnits());
    this.subUnits.update(v => this.sortAlphabetically([...v, { id, name }]));
    StorageHelper.syncData('SubUnits', this.subUnits());
  }
  deleteSubUnit(id: string) {
    this.subUnits.update(v => v.filter(i => i.id !== id));
    StorageHelper.syncData('SubUnits', this.subUnits());
  }
  updateSubUnit(id: string, name: string) {
    this.subUnits.update(v => this.sortAlphabetically(v.map(i => i.id === id ? { ...i, name } : i)));
    StorageHelper.syncData('SubUnits', this.subUnits());
  }

  addVolumeUnit(name: string) {
    const id = IdHelper.generateNextId('DTT', this.volumeUnits());
    this.volumeUnits.update(v => this.sortAlphabetically([...v, { id, name }]));
    StorageHelper.syncData('VolumeUnits', this.volumeUnits());
  }
  deleteVolumeUnit(id: string) {
    this.volumeUnits.update(v => v.filter(i => i.id !== id));
    StorageHelper.syncData('VolumeUnits', this.volumeUnits());
  }
  updateVolumeUnit(id: string, name: string) {
    this.volumeUnits.update(v => this.sortAlphabetically(v.map(i => i.id === id ? { ...i, name } : i)));
    StorageHelper.syncData('VolumeUnits', this.volumeUnits());
  }

  getUnitName(unitId: string | undefined) {
    if (!unitId) return '---';
    return this.units().find(u => u.id === unitId)?.name || '---';
  }

  formatPackaging(item: Chemical) {
    if (item.itemsPerUnit > 1 && item.subItemName) {
      return `${item.itemsPerUnit} ${item.subItemName} × ${item.volumePerSubItem}${item.volumeUnit} / ${this.getUnitName(item.unitId)}`;
    }
    return `${item.volumePerSubItem}${item.volumeUnit} / ${this.getUnitName(item.unitId)}`;
  }

  getStockDetail(item: Chemical, quantity: number): string {
    const parts: string[] = [];
    if (item.itemsPerUnit > 1) {
      const totalSub = quantity * item.itemsPerUnit;
      parts.push(`${totalSub.toLocaleString('vi-VN')} ${item.subItemName}`);
    }
    if (item.volumePerSubItem > 0 && item.volumeUnit && item.volumeUnit !== 'N/A') {
      const totalVol = quantity * item.itemsPerUnit * item.volumePerSubItem;
      parts.push(`${totalVol.toLocaleString('vi-VN')} ${item.volumeUnit}`);
    }
    return parts.join(' • ');
  }

  // Chemical CRUD
  addChemical(c: Omit<Chemical, 'id' | 'currentStock'>, initialLot?: { number: string, expiry: string }) {
    const id = IdHelper.generateNextId('HC', this.chemicals());
    const startStock = (c.openingStock > 0 && initialLot?.number) ? 0 : c.openingStock;

    const newChem: Chemical = { ...c, id: id, currentStock: startStock };
    this.chemicals.update(v => this.sortAlphabetically([newChem, ...v]));
    StorageHelper.syncData('Chemicals', this.chemicals());

    if (c.openingStock > 0 && initialLot?.number) {
        this.addGoodsReceipt({
            receiptDate: new Date().toISOString(),
            warehouseId: c.warehouseId,
            chemicalId: id,
            entryType: 'manual',
            lotNumber: initialLot.number,
            quantity: c.openingStock,
            expiryDate: initialLot.expiry || '',
            notes: 'Nhập tự động từ Tồn đầu kỳ',
            createdDate: new Date().toISOString(),
            createdBy: c.createdBy
        });
    }
  }

  updateChemical(id: string, data: Partial<Chemical>) {
    this.chemicals.update(list => this.sortAlphabetically(list.map(c => c.id === id ? { ...c, ...data } : c)));
    StorageHelper.syncData('Chemicals', this.chemicals());
  }

  deleteChemical(id: string) {
    const hasReceipts = this.goodsReceipts().some(r => r.chemicalId === id);
    if (hasReceipts) throw new Error('Không thể xóa! Hóa chất này đã phát sinh giao dịch nhập kho.');
    const hasIssues = this.goodsIssues().some(i => i.chemicalId === id);
    if (hasIssues) throw new Error('Không thể xóa! Hóa chất này đã phát sinh giao dịch xuất kho.');
    
    this.chemicals.update(list => list.filter(c => c.id !== id));
    StorageHelper.syncData('Chemicals', this.chemicals());
  }

  // Goods Receipt CRUD
  addGoodsReceipt(receipt: Omit<GoodsReceipt, 'id'>) {
    const chemical = this.chemicals().find(c => c.id === receipt.chemicalId);
    const requiresQC = this.isWarehouseQC(receipt.warehouseId) && (chemical?.requiresLotAndExpiry !== false);
    
    const newReceipt: GoodsReceipt = { 
        ...receipt, 
        id: IdHelper.generateNextId('PN', this.goodsReceipts()),
        qrCode: receipt.qrCode || '',
        notes: receipt.notes || '',
        qcStatus: requiresQC ? 'pending' : 'passed',
        qcDate: '',
        qcBy: ''
    };
    
    this.goodsReceipts.update(receipts => [newReceipt, ...receipts]);
    StorageHelper.syncData('GoodsReceipts', this.goodsReceipts());

    this.chemicals.update(chems => chems.map(chem => {
      if (chem.id === receipt.chemicalId) return { ...chem, currentStock: chem.currentStock + receipt.quantity };
      return chem;
    }));
    StorageHelper.syncData('Chemicals', this.chemicals());
  }

  updateGoodsReceipt(updatedReceipt: GoodsReceipt) {
    const originalReceipt = this.goodsReceipts().find(r => r.id === updatedReceipt.id);
    if (!originalReceipt) return;

    this.chemicals.update(chems => {
        return chems.map(chem => {
            let newStock = chem.currentStock;
            if (chem.id === originalReceipt.chemicalId) newStock -= originalReceipt.quantity;
            if (chem.id === updatedReceipt.chemicalId) newStock += updatedReceipt.quantity;
            return { ...chem, currentStock: newStock < 0 ? 0 : newStock };
        });
    });
    StorageHelper.syncData('Chemicals', this.chemicals());

    this.goodsReceipts.update(receipts => receipts.map(r => (r.id === updatedReceipt.id ? updatedReceipt : r)));
    StorageHelper.syncData('GoodsReceipts', this.goodsReceipts());
  }

  deleteGoodsReceipt(id: string) {
    const receiptToDelete = this.goodsReceipts().find(r => r.id === id);
    if (!receiptToDelete) return;
    
    this.chemicals.update(chems => chems.map(chem => {
      if (chem.id === receiptToDelete.chemicalId) {
        const newStock = chem.currentStock - receiptToDelete.quantity;
        return { ...chem, currentStock: newStock < 0 ? 0 : newStock };
      }
      return chem;
    }));
    StorageHelper.syncData('Chemicals', this.chemicals());

    this.goodsReceipts.update(receipts => receipts.filter(r => r.id !== id));
    StorageHelper.syncData('GoodsReceipts', this.goodsReceipts());
  }

  approveQC(lotNumber: string, chemicalId: string, user: string) {
      this.approveLot(lotNumber, chemicalId, user);
  }

  updateLotQCStatus(lotNumber: string, chemicalId: string, status: 'pending' | 'passed' | 'failed', user: string, reason: string) {
      this.goodsReceipts.update(receipts => receipts.map(r => {
          if (r.chemicalId === chemicalId && r.lotNumber === lotNumber) {
              const update: Partial<GoodsReceipt> = { 
                qcStatus: status, 
                qcDate: status !== 'pending' ? new Date().toISOString() : undefined,
                qcBy: status !== 'pending' ? user : undefined,
                lotRejectionReason: status === 'failed' ? reason : undefined
              };
              return { ...r, ...update };
          }
          return r;
      }));
      StorageHelper.syncData('GoodsReceipts', this.goodsReceipts());
  }

  // Goods Issue CRUD
  addGoodsIssue(issue: Omit<GoodsIssue, 'id'>) {
    const newIssue: GoodsIssue = { 
        ...issue, 
        id: IdHelper.generateNextId('PX', this.goodsIssues()),
        notes: issue.notes || ''
    };
    this.goodsIssues.update(issues => [newIssue, ...issues]);
    StorageHelper.syncData('GoodsIssues', this.goodsIssues());

    this.chemicals.update(chems => chems.map(chem => {
      if (chem.id === issue.chemicalId) {
        let deduction = issue.quantity;
        if (issue.isSubUnit && chem.itemsPerUnit > 1) {
             deduction = issue.quantity / chem.itemsPerUnit;
        }
        const newStock = chem.currentStock - deduction;
        return { ...chem, currentStock: newStock < 0 ? 0 : newStock };
      }
      return chem;
    }));
    StorageHelper.syncData('Chemicals', this.chemicals());

    // Sync bảng BN lên Sheet riêng nếu kho có cấu hình
    if (issue.usageDetails && issue.usageDetails.length > 0) {
        this.syncUsageDetailsSheet(issue.warehouseId);
    }
  }

  // Rebuild toàn bộ Sheet BN cho 1 kho dựa trên tất cả phiếu xuất có usageDetails
  private syncUsageDetailsSheet(warehouseId: string) {
    const wh = this.getWarehouseConfig(warehouseId);
    if (!wh || !wh.enableUsageDetails || !wh.usageColumns) return;
    
    // Gom tất cả dòng BN từ các phiếu xuất của kho này
    const allRows: any[] = [];
    const issuesForWarehouse = this.goodsIssues().filter(i => i.warehouseId === warehouseId && i.usageDetails && i.usageDetails.length > 0);
    
    for (const issue of issuesForWarehouse) {
        const chem = this.chemicals().find(c => c.id === issue.chemicalId);
        for (const row of issue.usageDetails!) {
            allRows.push({
                issueId: issue.id,
                issueDate: issue.issueDate,
                chemicalName: chem?.name || '---',
                lotNumber: issue.lotNumber || '',
                ...row
            });
        }
    }
    
    const payload = {
        columns: wh.usageColumns,
        rows: allRows
    };
    
    if (isGasEnvironment) {
        google.script.run.saveUsageDetailsSheet(wh.name, JSON.stringify(payload));
    }
  }

  updateGoodsIssue(updatedIssue: GoodsIssue) {
    const originalIssue = this.goodsIssues().find(i => i.id === updatedIssue.id);
    if (!originalIssue) return;

    this.chemicals.update(chems => {
      return chems.map(chem => {
        let newStock = chem.currentStock;
        if (chem.id === originalIssue.chemicalId) {
           let refund = originalIssue.quantity;
           if (originalIssue.isSubUnit && chem.itemsPerUnit > 1) refund = originalIssue.quantity / chem.itemsPerUnit;
           newStock += refund;
        }
        if (chem.id === updatedIssue.chemicalId) {
           let deduction = updatedIssue.quantity;
           if (updatedIssue.isSubUnit && chem.itemsPerUnit > 1) deduction = updatedIssue.quantity / chem.itemsPerUnit;
           newStock -= deduction;
        }
        return { ...chem, currentStock: newStock < 0 ? 0 : newStock };
      });
    });
    StorageHelper.syncData('Chemicals', this.chemicals());

    this.goodsIssues.update(issues => issues.map(i => (i.id === updatedIssue.id ? updatedIssue : i)));
    StorageHelper.syncData('GoodsIssues', this.goodsIssues());
  }

  deleteGoodsIssue(id: string) {
    const issueToDelete = this.goodsIssues().find(i => i.id === id);
    if (!issueToDelete) return;

    this.chemicals.update(chems => chems.map(chem => {
      if (chem.id === issueToDelete.chemicalId) {
        let refund = issueToDelete.quantity;
        if (issueToDelete.isSubUnit && chem.itemsPerUnit > 1) refund = issueToDelete.quantity / chem.itemsPerUnit;
        return { ...chem, currentStock: chem.currentStock + refund };
      }
      return chem;
    }));
    StorageHelper.syncData('Chemicals', this.chemicals());

    this.goodsIssues.update(issues => issues.filter(i => i.id !== id));
    StorageHelper.syncData('GoodsIssues', this.goodsIssues());
  }
}
