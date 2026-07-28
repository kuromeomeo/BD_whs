
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService} from '../../core/services/data.service';
import { Chemical } from '../../core/models/chemical.model';
import { GoodsReceipt } from '../../core/models/goods-receipt.model';
import { GoodsIssue } from '../../core/models/goods-issue.model';

declare var XLSX: any;

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div>
         <h2 class="text-3xl font-bold text-gray-800 tracking-tight">Báo cáo & Thống kê</h2>
         <p class="text-gray-500 mt-1">Tra cứu lịch sử giao dịch và xuất báo cáo chi tiết.</p>
      </div>

      <!-- Report Tabs -->
      <div class="flex flex-col gap-4">
          <div class="flex gap-1 bg-gray-100 p-1.5 rounded-xl w-fit overflow-x-auto max-w-full">
              <button (click)="activeTab.set('receipt')" 
                      class="px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap"
                      [class]="activeTab() === 'receipt' ? 'bg-white text-[#63C3C7] shadow-sm' : 'text-gray-500 hover:text-gray-700'">
                  Báo cáo Nhập kho
              </button>
              <button (click)="activeTab.set('issue')" 
                      class="px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap"
                      [class]="activeTab() === 'issue' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
                  Báo cáo Xuất kho
              </button>
              <button (click)="activeTab.set('inventory')" 
                      class="px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap"
                      [class]="activeTab() === 'inventory' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
                  Tổng hợp Tồn kho
              </button>
              <button (click)="activeTab.set('inventory-lot')" 
                      class="px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap"
                      [class]="activeTab() === 'inventory-lot' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
                  Tồn kho theo Lot
              </button>
              @for (w of warehousesWithUsage(); track w.id) {
                 <button (click)="activeTab.set('usage_' + w.id)" 
                      class="px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap"
                      [class]="activeTab() === 'usage_' + w.id ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
                  BN - {{ w.name }}
                 </button>
              }
          </div>

          <!-- Main Filter Bar -->
          <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
            
            <!-- Date Filters (Always visible now) -->
            <div class="flex-1 min-w-[200px]">
              <label class="text-xs font-bold text-gray-500">
                  Từ ngày
              </label>
              <input type="date" [ngModel]="filterStartDate()" (ngModelChange)="filterStartDate.set($event)" 
                      class="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#63C3C7]/30 focus:border-[#63C3C7] outline-none transition-all bg-gray-50 focus:bg-white">
            </div>
            <div class="flex-1 min-w-[200px]">
              <label class="text-xs font-bold text-gray-500">
                  Đến ngày
              </label>
              <input type="date" [ngModel]="filterEndDate()" (ngModelChange)="filterEndDate.set($event)" 
                      class="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#63C3C7]/30 focus:border-[#63C3C7] outline-none transition-all bg-gray-50 focus:bg-white">
            </div>

            @if (!activeTab().startsWith('usage_')) {
            <div class="flex-1 min-w-[200px]">
              <label class="text-xs font-bold text-gray-500">Kho hàng</label>
              <select [ngModel]="filterWarehouseId()" (ngModelChange)="onWarehouseFilterChange($event)" 
                      class="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#63C3C7]/30 focus:border-[#63C3C7] outline-none appearance-none bg-gray-50 focus:bg-white">
                <option value="">Tất cả kho</option>
                @for (w of warehouses(); track w.id) {
                  <option [value]="w.id">{{ w.name }}</option>
                }
              </select>
            </div>
            }
            <div class="flex-1 min-w-[250px]">
              <label class="text-xs font-bold text-gray-500">Tên hóa chất / vật tư</label>
              <select [ngModel]="filterChemicalId()" (ngModelChange)="filterChemicalId.set($event)" 
                      class="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#63C3C7]/30 focus:border-[#63C3C7] outline-none appearance-none bg-gray-50 focus:bg-white">
                <option value="">Tất cả hóa chất</option>
                @for (c of filteredDropdownChemicals(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
            </div>
            <div class="flex items-end gap-2 pt-5">
              <button (click)="resetFilters()" 
                      class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors">
                Xóa lọc
              </button>
              <button (click)="exportToExcel()" 
                      class="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all shadow-md shadow-green-600/20">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                Xuất Excel
              </button>
            </div>
          </div>

          <div class="bg-white rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
             
             <!-- RECEIPT TABLE -->
             @if(activeTab() === 'receipt') {
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Ngày nhập</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Kho</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Số Lot</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Hóa chất</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Số lượng</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            @for (item of filteredReceipts(); track item.id) {
                                <tr class="hover:bg-blue-50/30 transition-colors">
                                    <td class="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">{{ formatDate(item.receiptDate) }}</td>
                                    <td class="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">{{ getWarehouseName(item.warehouseId) }}</td>
                                    <td class="px-6 py-4 font-mono text-sm">{{ item.lotNumber }}</td>
                                    <td class="px-6 py-4">
                                        <div class="font-bold text-gray-800">{{ getChemical(item.chemicalId)?.name }}</div>
                                        <div class="text-[10px] text-gray-400 mt-1">Tạo bởi {{ item.createdBy || 'Quản trị viên' }} • {{ item.createdDate ? formatDateTime(item.createdDate) : formatDate(item.receiptDate) }}</div>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="font-bold text-[#63C3C7] text-lg">
                                            +{{ item.quantity }} <span class="text-sm font-normal text-gray-500">{{ getUnitName(getChemical(item.chemicalId)?.unitId) }}</span>
                                        </div>
                                        @let detail = getQuantityDetail(item);
                                        @if (detail) {
                                            <div class="inline-block mt-1 px-2 py-0.5 bg-gray-50 rounded border border-gray-100 text-xs text-gray-600 font-medium whitespace-nowrap">
                                                {{ detail }}
                                            </div>
                                        }
                                    </td>
                                </tr>
                            }
                            @if (filteredReceipts().length === 0) {
                                <tr><td colspan="5" class="px-4 py-12 text-center text-gray-400">Không có dữ liệu phù hợp</td></tr>
                            }
                        </tbody>
                    </table>
                </div>
             }

             <!-- ISSUE TABLE -->
             @if(activeTab() === 'issue') {
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Ngày xuất</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Kho</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Số Lot</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Hóa chất</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Số lượng</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            @for (item of filteredIssues(); track item.id) {
                                <tr class="hover:bg-red-50/30 transition-colors">
                                    <td class="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">{{ formatDate(item.issueDate) }}</td>
                                    <td class="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">{{ getWarehouseName(item.warehouseId) }}</td>
                                    <td class="px-6 py-4 font-mono text-sm">{{ item.lotNumber }}</td>
                                    <td class="px-6 py-4">
                                        <div class="font-bold text-gray-800">{{ getChemical(item.chemicalId)?.name }}</div>
                                        <div class="text-[10px] text-gray-400 mt-1">Tạo bởi {{ item.createdBy || 'Quản trị viên' }} • {{ item.createdDate ? formatDateTime(item.createdDate) : formatDate(item.issueDate) }}</div>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="font-bold text-red-500 text-lg">
                                            -{{ item.quantity }} <span class="text-sm font-normal text-gray-500">{{ getIssueUnitName(item) }}</span>
                                        </div>
                                        @let detail = getIssueQuantityDetail(item);
                                        @if (detail) {
                                            <div class="inline-block mt-1 px-2 py-0.5 bg-gray-50 rounded border border-gray-100 text-xs text-gray-600 font-medium whitespace-nowrap">
                                                {{ detail }}
                                            </div>
                                        }
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-500 italic hidden md:table-cell">
                                        {{ item.notes || '---' }}
                                    </td>
                                </tr>
                            }
                            @if (filteredIssues().length === 0) {
                                <tr><td colspan="6" class="px-4 py-12 text-center text-gray-400">Không có dữ liệu phù hợp</td></tr>
                            }
                        </tbody>
                    </table>
                </div>
             }

             <!-- INVENTORY TABLE (AGGREGATE) -->
             @if(activeTab() === 'inventory') {
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Kho</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Tên Hóa chất</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Tồn kho hiện tại</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center hidden md:table-cell">ĐVT Chính</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            @for (item of filteredInventory(); track item.id) {
                                <tr class="hover:bg-blue-50/30 transition-colors">
                                    <td class="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">{{ getWarehouseName(item.warehouseId) }}</td>
                                    <td class="px-6 py-4">
                                        <div class="font-bold text-gray-800">{{ item.name }}</div>
                                        <div class="text-xs text-gray-400 mt-0.5">{{ getManufacturerName(item.manufacturerId) }}</div>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="font-bold text-blue-600 text-lg">{{ item.currentStock }}</div>
                                        @let detail = getStockDetail(item);
                                        @if (detail) {
                                            <div class="inline-block mt-1 px-2 py-0.5 bg-gray-50 rounded border border-gray-100 text-xs text-gray-600 font-medium whitespace-nowrap">
                                                {{ detail }}
                                            </div>
                                        }
                                    </td>
                                    <td class="px-6 py-4 text-center text-sm text-gray-600 hidden md:table-cell">{{ getUnitName(item.unitId) }}</td>
                                </tr>
                            }
                            @if (filteredInventory().length === 0) {
                                <tr><td colspan="5" class="px-4 py-12 text-center text-gray-400">Không có dữ liệu tồn kho phù hợp</td></tr>
                            }
                        </tbody>
                    </table>
                </div>
             }
             
             <!-- INVENTORY BY LOT TABLE -->
             @if(activeTab() === 'inventory-lot') {
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Kho</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Hóa chất</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Số Lot / Batch</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Hạn sử dụng</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Số lượng</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center hidden md:table-cell">QC Status</th>
                                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center hidden md:table-cell">Trạng thái (HSD)</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            @for (item of filteredInventoryByLots(); track item.key) {
                                <tr class="hover:bg-orange-50/30 transition-colors">
                                    <td class="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">{{ item.warehouseName }}</td>
                                    <td class="px-6 py-4">
                                        <div class="font-bold text-gray-800">{{ item.chemicalName }}</div>
                                        <div class="text-xs text-gray-400 mt-0.5">{{ item.packaging }}</div>
                                    </td>
                                    <td class="px-6 py-4 font-mono text-sm font-semibold">{{ item.lotNumber }}</td>
                                    <td class="px-6 py-4 text-sm hidden md:table-cell">
                                        {{ formatDate(item.expiryDate) }}
                                        @if (item.daysRemaining !== null) {
                                            <div class="text-[10px] mt-0.5" [class]="getExpiryColor(item.daysRemaining)">
                                                {{ getExpiryText(item.daysRemaining) }}
                                            </div>
                                        }
                                    </td>
                                    <!-- Cột Số Lượng Chi Tiết -->
                                    <td class="px-6 py-4 text-right">
                                        <div class="font-bold text-[#63C3C7] text-lg">
                                            {{ formatNumber(item.quantity) }} <span class="text-sm font-normal text-gray-500">{{ item.unitName }}</span>
                                        </div>
                                        
                                        <div class="text-[10px] text-gray-400 mt-1 flex flex-col items-end">
                                            <span>Nhập: {{ formatNumber(item.totalReceived) }}</span>
                                            @if(item.totalIssued > 0) {
                                                <span class="text-red-400">Đã xuất: -{{ formatNumber(item.totalIssued) }}</span>
                                            }
                                        </div>

                                        @let lotDetail = getStockDetail(item.chemicalRef, item.quantity);
                                        @if (lotDetail) {
                                             <div class="inline-block mt-1 px-2 py-0.5 bg-gray-50 rounded border border-gray-100 text-xs text-gray-600 font-medium whitespace-nowrap">
                                                {{ lotDetail }}
                                             </div>
                                        }
                                    </td>
                                    
                                    <!-- QC STATUS COLUMN (NEW) -->
                                    <td class="px-6 py-4 text-center hidden md:table-cell">
                                        @if (item.requiresQC && item.chemicalRef?.requiresLotAndExpiry !== false) {
                                            @if (item.qcStatus === 'pending') {
                                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
                                                    Chờ duyệt
                                                </span>
                                            } @else if (item.qcStatus === 'failed') {
                                                <div class="flex flex-col items-center">
                                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
                                                        Không đạt
                                                    </span>
                                                    @if(item.qcBy) {
                                                        <span class="text-[10px] text-gray-400 mt-1" title="{{formatDateTime(item.qcDate)}}">{{ item.qcBy }}</span>
                                                        <span class="text-[9px] text-gray-300">{{ formatDate(item.qcDate) }}</span>
                                                    }
                                                </div>
                                            } @else {
                                                <div class="flex flex-col items-center">
                                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-50 text-green-600 border border-green-100">
                                                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                                        Đạt
                                                    </span>
                                                    @if(item.qcBy) {
                                                        <span class="text-[10px] text-gray-400 mt-1" title="{{formatDateTime(item.qcDate)}}">{{ item.qcBy }}</span>
                                                        <span class="text-[9px] text-gray-300">{{ formatDate(item.qcDate) }}</span>
                                                    }
                                                </div>
                                            }
                                        } @else {
                                            <span class="text-gray-300 select-none">---</span>
                                        }
                                    </td>

                                    <td class="px-6 py-4 text-center hidden md:table-cell">
                                       @if (item.daysRemaining !== null && item.daysRemaining <= dataService.criticalThresholdDays()) {
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                                Hết hạn / Khẩn
                                            </span>
                                        } @else if (item.daysRemaining !== null && item.daysRemaining <= dataService.warningThresholdDays()) {
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                                                Sắp hết
                                            </span>
                                        } @else {
                                             <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                                Sử dụng tốt
                                            </span>
                                        }
                                    </td>
                                </tr>
                            }
                            @if (filteredInventoryByLots().length === 0) {
                                <tr><td colspan="7" class="px-4 py-12 text-center text-gray-400">Không có dữ liệu Lot phù hợp</td></tr>
                            }
                        </tbody>
                    </table>
                </div>
             }

             <!-- USAGE DETAILS TABLE -->
             @if(activeTab().startsWith('usage_')) {
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th class="px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Ngày xuất</th>
                                @for (col of getUsageColumns(activeTab().replace('usage_', '')); track col.key) {
                                  <th class="px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{{ col.label }}</th>
                                }
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            @for (item of filteredUsageDetails(); track item.usageId) {
                                <tr class="hover:bg-purple-50/30 transition-colors">
                                    <td class="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{{ formatDate(item.issueDate) }}</td>
                                    @for (col of getUsageColumns(activeTab().replace('usage_', '')); track col.key) {
                                      <td class="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">{{ item.details[col.key] || '---' }}</td>
                                    }
                                </tr>
                            }
                            @if (filteredUsageDetails().length === 0) {
                                <tr><td [attr.colspan]="1 + getUsageColumns(activeTab().replace('usage_', '')).length" class="px-4 py-12 text-center text-gray-400">Không có dữ liệu phù hợp</td></tr>
                            }
                        </tbody>
                    </table>
                </div>
             }
          </div>
      </div>

      <!-- Error Modal -->
      @if (errorModalOpen()) {
        <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md transform transition-all scale-100 border border-gray-100 p-8">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-full bg-orange-50 flex-shrink-0 flex items-center justify-center text-orange-500">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div class="flex-1">
                <h3 class="text-xl font-bold text-gray-800">Không có dữ liệu</h3>
                <p class="text-gray-500 mt-2">Không có dữ liệu để xuất Excel cho khoảng thời gian này.</p>
              </div>
            </div>
            <div class="flex justify-end mt-8">
              <button (click)="errorModalOpen.set(false)" class="px-6 py-2.5 rounded-xl bg-[#63C3C7] text-white font-bold hover:bg-[#55a8ac] shadow-lg shadow-[#63C3C7]/20 transition-all">Đã hiểu</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ReportComponent {
  dataService = inject(DataService);
  
  activeTab = signal<string>('receipt');
  
  warehouses = this.dataService.warehouses;
  chemicals = this.dataService.chemicals;
  units = this.dataService.units;
  manufacturers = this.dataService.manufacturers;

  // Filters
  filterStartDate = signal('');
  filterEndDate = signal('');
  filterChemicalId = signal('');
  filterWarehouseId = signal('');
  
  filteredDropdownChemicals = computed(() => {
    let whId = this.filterWarehouseId();
    const tab = this.activeTab();
    if (tab.startsWith('usage_')) {
        whId = tab.replace('usage_', '');
    }
    if (!whId) return this.chemicals();
    return this.chemicals().filter(c => c.warehouseId === whId);
  });

  onWarehouseFilterChange(whId: string) {
      this.filterWarehouseId.set(whId);
      this.filterChemicalId.set(''); // Reset hóa chất khi đổi kho
  }

  errorModalOpen = signal(false);

  // 1. Filtered Receipts
  filteredReceipts = computed(() => {
    const startDate = this.filterStartDate();
    const endDate = this.filterEndDate();
    const chemicalId = this.filterChemicalId();
    const warehouseId = this.filterWarehouseId();
    
    return this.dataService.goodsReceipts()
      .filter(r => {
        const chemicalMatch = !chemicalId || r.chemicalId === chemicalId;
        const warehouseMatch = !warehouseId || r.warehouseId === warehouseId;
        const dateStr = new Date(r.receiptDate).toISOString().split('T')[0];
        const startDateMatch = !startDate || dateStr >= startDate;
        const endDateMatch = !endDate || dateStr <= endDate;
        return chemicalMatch && warehouseMatch && startDateMatch && endDateMatch;
      })
      .sort((a, b) => new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime());
  });

  // 2. Filtered Issues
  filteredIssues = computed(() => {
    const startDate = this.filterStartDate();
    const endDate = this.filterEndDate();
    const chemicalId = this.filterChemicalId();
    const warehouseId = this.filterWarehouseId();
    
    return this.dataService.goodsIssues()
      .filter(i => {
        const chemicalMatch = !chemicalId || i.chemicalId === chemicalId;
        const warehouseMatch = !warehouseId || i.warehouseId === warehouseId;
        const dateStr = new Date(i.issueDate).toISOString().split('T')[0];
        const startDateMatch = !startDate || dateStr >= startDate;
        const endDateMatch = !endDate || dateStr <= endDate;
        return chemicalMatch && warehouseMatch && startDateMatch && endDateMatch;
      })
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  });

  // 3. Filtered Inventory (Aggregate)
  filteredInventory = computed(() => {
    const startDate = this.filterStartDate();
    const endDate = this.filterEndDate();
    const chemicalId = this.filterChemicalId();
    const warehouseId = this.filterWarehouseId();

    return this.dataService.chemicals().filter(c => {
        const chemicalMatch = !chemicalId || c.id === chemicalId;
        const warehouseMatch = !warehouseId || c.warehouseId === warehouseId;
        
        // Filter by Created Date if provided
        const dateStr = c.createdDate ? new Date(c.createdDate).toISOString().split('T')[0] : '';
        const startDateMatch = !startDate || (dateStr && dateStr >= startDate);
        const endDateMatch = !endDate || (dateStr && dateStr <= endDate);

        return chemicalMatch && warehouseMatch && startDateMatch && endDateMatch;
    });
  });

  // 4. Inventory By Lots (Calculated)
  inventoryByLots = computed(() => {
    const allReceipts = this.dataService.goodsReceipts();
    const allIssues = this.dataService.goodsIssues();
    const allChemicals = this.dataService.chemicals();
    
    // Group by ChemicalId + LotNumber
    const grouped = new Map<string, any>();

    // Process Receipts (Add Stock)
    allReceipts.forEach(r => {
        const key = `${r.chemicalId}_${r.lotNumber}`;
        if (!grouped.has(key)) {
            const chem = allChemicals.find(c => c.id === r.chemicalId);
            if (chem) {
                grouped.set(key, {
                    key: key,
                    chemicalId: r.chemicalId,
                    lotNumber: r.lotNumber,
                    expiryDate: r.expiryDate,
                    quantity: 0,
                    totalReceived: 0,
                    totalIssued: 0,
                    // QC Data
                    qcStatus: r.qcStatus || 'passed',
                    qcBy: r.qcBy,
                    qcDate: r.qcDate,
                    // Ref
                    chemicalRef: chem, 
                    warehouseId: r.warehouseId,
                    receiptDate: r.receiptDate
                });
            }
        }
        const group = grouped.get(key);
        if (group) {
            group.quantity += r.quantity;
            group.totalReceived += r.quantity;
             // Sync QC status if pending receipt exists in group (pessimistic)
            if (r.qcStatus === 'pending') group.qcStatus = 'pending';
             // Sync latest QC info if available and passed
            if (r.qcStatus === 'passed' && r.qcBy) {
                group.qcBy = r.qcBy;
                group.qcDate = r.qcDate;
            }
        }
    });

    // Process Issues (Subtract Stock)
    allIssues.forEach(i => {
        const key = `${i.chemicalId}_${i.lotNumber}`;
        const group = grouped.get(key);
        if (group) {
            // Deduct based on unit used in issue (Convert to primary unit if needed)
            let qtyToDeduct = i.quantity;
            if (i.isSubUnit && group.chemicalRef.itemsPerUnit > 1) {
                qtyToDeduct = i.quantity / group.chemicalRef.itemsPerUnit;
            }
            group.quantity -= qtyToDeduct;
            group.totalIssued += qtyToDeduct;
        }
    });

    // Transform to array
    return Array.from(grouped.values())
        .filter(item => item.quantity > 0.0001) // Filter out zero/negative stock
        .map(item => {
            const daysRemaining = this.calculateDaysRemaining(item.expiryDate);
            const requiresQC = this.dataService.isWarehouseQC(item.warehouseId);
            return {
                ...item,
                requiresQC,
                warehouseName: this.getWarehouseName(item.warehouseId),
                chemicalName: item.chemicalRef.name,
                unitName: this.getUnitName(item.chemicalRef.unitId),
                packaging: this.formatPackaging(item.chemicalRef),
                daysRemaining: daysRemaining
            };
        })
        .sort((a, b) => a.daysRemaining - b.daysRemaining);
  });


  warehousesWithUsage = computed(() => {
    return this.dataService.warehouses().filter(w => w.enableUsageDetails);
  });

  getUsageColumns(warehouseId: string) {
      return this.dataService.getWarehouseConfig(warehouseId)?.usageColumns || [];
  }

  filteredUsageDetails = computed(() => {
      const tab = this.activeTab();
      if (!tab.startsWith('usage_')) return [];
      
      const warehouseId = tab.replace('usage_', '');
      const startDate = this.filterStartDate();
      const endDate = this.filterEndDate();
      const chemicalId = this.filterChemicalId();
      
      const results: any[] = [];
      // Grab all issues for this warehouse that have usage details
      const issues = this.dataService.goodsIssues().filter(i => 
          i.warehouseId === warehouseId && i.usageDetails && i.usageDetails.length > 0
      );
      
      for (const issue of issues) {
          const chemMatch = !chemicalId || issue.chemicalId === chemicalId;
          const dateStr = new Date(issue.issueDate).toISOString().split('T')[0];
          const startMatch = !startDate || dateStr >= startDate;
          const endMatch = !endDate || dateStr <= endDate;
          
          if (chemMatch && startMatch && endMatch) {
              const chemName = this.getChemical(issue.chemicalId)?.name || '---';
              const rows = issue.usageDetails!;
              
              for (let i = 0; i < rows.length; i++) {
                  results.push({
                      usageId: `${issue.id}_${i}`,
                      issueId: issue.id,
                      issueDate: issue.issueDate,
                      chemicalName: chemName,
                      lotNumber: issue.lotNumber,
                      details: rows[i]
                  });
              }
          }
      }
      
      return results.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  });

  // Filtered Inventory By Lots
  filteredInventoryByLots = computed(() => {
    const startDate = this.filterStartDate();
    const endDate = this.filterEndDate();
    const chemicalId = this.filterChemicalId();
    const warehouseId = this.filterWarehouseId();

    return this.inventoryByLots().filter(item => {
        const chemicalMatch = !chemicalId || item.chemicalId === chemicalId;
        const warehouseMatch = !warehouseId || item.warehouseId === warehouseId;
        
        // Filter by Receipt Date (Ngày nhập của Lot)
        const dateStr = item.receiptDate ? new Date(item.receiptDate).toISOString().split('T')[0] : '';
        const startDateMatch = !startDate || (dateStr && dateStr >= startDate);
        const endDateMatch = !endDate || (dateStr && dateStr <= endDate);

        return chemicalMatch && warehouseMatch && startDateMatch && endDateMatch;
    });
  });

  resetFilters() {
      this.filterStartDate.set('');
      this.filterEndDate.set('');
      this.filterChemicalId.set('');
      this.filterWarehouseId.set('');
  }

  // Helpers
  getChemical(id: string) { return this.chemicals().find(c => c.id === id); }
  getWarehouseName(id: string) { return this.warehouses().find(w => w.id === id)?.name || '---'; }
  getUnitName(id: string | undefined) { return this.units().find(u => u.id === id)?.name || '---'; }
  getManufacturerName(id: string) { return this.manufacturers().find(m => m.id === id)?.name || '---'; }
  
  getIssueUnitName(issue: GoodsIssue) {
      const c = this.getChemical(issue.chemicalId);
      if (!c) return '---';
      return issue.isSubUnit ? c.subItemName : this.getUnitName(c.unitId);
  }

  getQuantityDetail(item: GoodsReceipt): string {
    const chem = this.getChemical(item.chemicalId);
    if (!chem) return '';
    
    const parts = [];

    // Tính tổng số lượng đơn vị con
    if (chem.itemsPerUnit > 1) {
      const totalSub = item.quantity * chem.itemsPerUnit;
      parts.push(`${totalSub.toLocaleString('vi-VN')} ${chem.subItemName}`);
    }
    
    // Tính tổng thể tích
    if (chem.volumePerSubItem > 0 && chem.volumeUnit && chem.volumeUnit !== 'N/A') {
       const totalVol = item.quantity * chem.itemsPerUnit * chem.volumePerSubItem;
       parts.push(`${totalVol.toLocaleString('vi-VN')} ${chem.volumeUnit}`);
    }

    return parts.join(' • ');
  }

  getIssueQuantityDetail(item: GoodsIssue): string {
    const chem = this.getChemical(item.chemicalId);
    if (!chem) return '';
    const parts = [];

    if (!item.isSubUnit) {
        // Case: Xuất Đơn vị chính (VD: 1 Thùng) -> Hiển thị chi tiết (10 Lọ • 100ml)
        if (chem.itemsPerUnit > 1) {
            const totalSub = item.quantity * chem.itemsPerUnit;
            parts.push(`${totalSub.toLocaleString('vi-VN')} ${chem.subItemName}`);
        }
        if (chem.volumePerSubItem > 0 && chem.volumeUnit && chem.volumeUnit !== 'N/A') {
            const totalVol = item.quantity * chem.itemsPerUnit * chem.volumePerSubItem;
            parts.push(`${totalVol.toLocaleString('vi-VN')} ${chem.volumeUnit}`);
        }
    } else {
        // Case: Xuất Đơn vị lẻ (VD: 3 Lọ) -> Chỉ hiển thị Thể tích (VD: 30ml)
        // Không hiển thị lại số lượng lọ vì đã có ở cột chính
        if (chem.volumePerSubItem > 0 && chem.volumeUnit && chem.volumeUnit !== 'N/A') {
            const totalVol = item.quantity * chem.volumePerSubItem;
            parts.push(`${totalVol.toLocaleString('vi-VN')} ${chem.volumeUnit}`);
        }
    }
    return parts.join(' • ');
  }

  getStockDetail(c: Chemical, quantity?: number): string {
    const qty = quantity !== undefined ? quantity : c.currentStock;
    const parts = [];

    if (c.itemsPerUnit > 1) {
      const totalSub = qty * c.itemsPerUnit;
      parts.push(`${totalSub.toLocaleString('vi-VN')} ${c.subItemName}`);
    }

    if (c.volumePerSubItem > 0 && c.volumeUnit && c.volumeUnit !== 'N/A') {
       const totalVol = qty * c.itemsPerUnit * c.volumePerSubItem;
       parts.push(`${totalVol.toLocaleString('vi-VN')} ${c.volumeUnit}`);
    }

    if (parts.length === 0) return '';
    return parts.join(' • ');
  }

  formatDate(d: string) { return d ? new Date(d).toLocaleDateString('vi-VN') : '---'; }
  formatDateTime(d: string) {
    if (!d) return '';
    return new Date(d).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).replace(',', '');
  }
  
  formatNumber(n: number) { return Math.round(n * 100) / 100; }

  calculateDaysRemaining(expiryDateStr: string): number | null {
      if (!expiryDateStr) return null;
      const today = new Date();
      const expiry = new Date(expiryDateStr);
      const diffTime = expiry.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  }

  getExpiryColor(days: number): string {
      const warningThreshold = this.dataService.warningThresholdDays();
      const criticalThreshold = this.dataService.criticalThresholdDays();
      if (days <= criticalThreshold) return 'text-red-600 font-bold';
      if (days <= warningThreshold) return 'text-orange-600 font-bold';
      return 'text-green-600';
  }

  getExpiryText(days: number): string {
      if (days < 0) return `(Quá hạn ${Math.abs(days)} ngày)`;
      if (days === 0) return '(Hết hạn hôm nay)';
      return `(Còn ${days} ngày)`;
  }
  
  formatPackaging(item: Chemical) {
    if (item.itemsPerUnit > 1 && item.subItemName) {
      return `${item.itemsPerUnit} ${item.subItemName} × ${item.volumePerSubItem}${item.volumeUnit}`;
    }
    return `${item.volumePerSubItem}${item.volumeUnit} / ${this.getUnitName(item.unitId)}`;
  }

  exportToExcel() {
    const todayStr = new Date().toISOString().slice(0,10);
    let data: any[] = [];
    let fileName = '';
    let sheetName = '';

    if (this.activeTab() === 'receipt') {
        data = this.filteredReceipts().map(item => {
            const chem = this.getChemical(item.chemicalId);
            return {
                'Ngày nhập': this.formatDate(item.receiptDate),
                'Vật tư / Hóa chất': chem?.name || '---',
                'Kho': this.getWarehouseName(item.warehouseId),
                'Số Lot': item.lotNumber,
                'Số lượng': item.quantity,
                'Đơn vị': this.getUnitName(chem?.unitId),
                'Chi tiết quy đổi': this.getQuantityDetail(item),
                'Ngày hết hạn': this.formatDate(item.expiryDate),
                'Người tạo': item.createdBy
            };
        });
        fileName = `Bao_cao_Nhap_${todayStr}.xlsx`;
        sheetName = 'Bao_cao_Nhap';
    } 
    else if (this.activeTab() === 'issue') {
        data = this.filteredIssues().map(item => {
            const chem = this.getChemical(item.chemicalId);
            return {
                'Ngày xuất': this.formatDate(item.issueDate),
                'Kho': this.getWarehouseName(item.warehouseId),
                'Hóa chất': chem?.name,
                'Lô': item.lotNumber,
                'Số lượng': item.quantity,
                'ĐVT': this.getIssueUnitName(item),
                'Chi tiết quy đổi': this.getIssueQuantityDetail(item),
                'Ghi chú': item.notes,
                'Người tạo': item.createdBy
            };
        });
        fileName = `Bao_cao_Xuat_${todayStr}.xlsx`;
        sheetName = 'Bao_cao_Xuat';
    }
    else if (this.activeTab() === 'inventory') {
        data = this.filteredInventory().map(item => {
            return {
                'Mã Hóa chất': item.id,
                'Tên Hóa chất': item.name,
                'Kho': this.getWarehouseName(item.warehouseId),
                'Hãng sản xuất': this.getManufacturerName(item.manufacturerId),
                'Tồn kho hiện tại': item.currentStock,
                'ĐVT Chính': this.getUnitName(item.unitId),
                'Quy đổi chi tiết': this.getStockDetail(item)
            };
        });
        fileName = `Bao_cao_Ton_Kho_Tong_${todayStr}.xlsx`;
        sheetName = 'Bao_cao_Ton_Tong';
    }
    else if (this.activeTab().startsWith('usage_')) {
        const warehouseId = this.activeTab().replace('usage_', '');
        const whName = this.getWarehouseName(warehouseId);
        const cols = this.getUsageColumns(warehouseId);
        
        data = this.filteredUsageDetails().map(item => {
            const row: any = {
                'Phiếu xuất': item.issueId,
                'Ngày xuất': this.formatDate(item.issueDate),
                'Hóa chất': item.chemicalName,
                'Số Lô': item.lotNumber
            };
            for (const c of cols) {
                row[c.label] = item.details[c.key] || '';
            }
            return row;
        });
        
        fileName = `Bao_cao_BN_${whName}_${todayStr}.xlsx`.replace(/\s+/g, '_');
        sheetName = `BN_${whName.substring(0, 25)}`;
    }
    else if (this.activeTab() === 'inventory-lot') {
         data = this.filteredInventoryByLots().map(item => {
            let qcStatus = '---';
            if (item.requiresQC && item.chemicalRef?.requiresLotAndExpiry !== false) {
                if (item.qcStatus === 'pending') qcStatus = 'Chờ duyệt';
                else if (item.qcStatus === 'failed') qcStatus = 'Không đạt';
                else qcStatus = 'Đạt';
            }
            
            return {
                'Kho': item.warehouseName,
                'Tên Hóa chất': item.chemicalName,
                'Số Lot / Batch': item.lotNumber,
                'Hạn sử dụng': this.formatDate(item.expiryDate),
                'Số ngày còn lại': item.daysRemaining,
                'Tồn kho': item.quantity,
                'ĐVT': item.unitName,
                'Nhập': item.totalReceived,
                'Xuất': item.totalIssued,
                'Quy cách': item.packaging,
                'Trạng thái QC': qcStatus,
                'Người duyệt QC': item.qcBy || '',
                'Ngày duyệt QC': this.formatDateTime(item.qcDate),
                'Chi tiết quy đổi': this.getStockDetail(item.chemicalRef, item.quantity)
            };
        });
        fileName = `Bao_cao_Ton_Kho_Lot_${todayStr}.xlsx`;
        sheetName = 'Bao_cao_Ton_Lot';
    }

    if (data.length === 0) {
        this.errorModalOpen.set(true);
        return;
    }
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
  }
}
