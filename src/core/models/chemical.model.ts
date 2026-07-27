export interface Chemical {
  id: string;
  warehouseId: string;
  name: string;
  manufacturerId: string;
  unitId: string;
  itemsPerUnit: number;
  subItemName: string;
  volumePerSubItem: number;
  volumeUnit: string;
  openingStock: number;
  currentStock: number;
  lowStockThreshold?: number;
  requiresLotAndExpiry?: boolean;
  createdDate: string;
  createdBy: string;
}