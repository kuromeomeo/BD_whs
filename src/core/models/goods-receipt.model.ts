export interface GoodsReceipt {
  id: string;

  receiptDate: string;

  warehouseId: string;

  chemicalId: string;

  entryType: 'scan' | 'manual';

  qrCode?: string;

  lotNumber: string;

  quantity: number;

  expiryDate: string;

  notes?: string;

  createdDate: string;

  createdBy: string;

  qcStatus?: 'pending' | 'passed' | 'failed';

  qcDate?: string;

  qcBy?: string;

  lotRejectionReason?: string;

  lastModifiedBy?: string;

  lastModifiedDate?: string;
}