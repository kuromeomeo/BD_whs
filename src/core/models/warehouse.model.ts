import { MasterData } from './master-data.model';


export interface UsageColumnDef {
  key: string; //Example: Col1, Col2
  label: string; //Example BK, ...
}

export interface WarehouseData extends MasterData {
  enableUsageDetails?: boolean;
  usageColumns?: UsageColumnDef[];
}