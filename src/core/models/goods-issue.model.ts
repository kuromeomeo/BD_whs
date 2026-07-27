export interface GoodsIssue {
  id: string;

  issueDate: string;

  warehouseId: string;

  chemicalId: string;

  lotNumber: string;

  quantity: number;

  /**
   * true  = xuất theo đơn vị con (Lọ, Chai...)
   * false = xuất theo đơn vị chính (Hộp, Thùng...)
   */
  isSubUnit: boolean;

  notes?: string;

  createdDate: string;

  createdBy: string;

  usageDetails?: Record<string, string>[];


  lastModifiedBy?: string;

  lastModifiedDate?: string;
}