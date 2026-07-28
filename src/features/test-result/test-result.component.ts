import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService} from '../../core/services/data.service';
import { AuthService} from '../../core/services/auth.service';
import { Chemical } from '../../core/models/chemical.model';
import { GoodsIssue } from '../../core/models/goods-issue.model';
import {
    WarehouseData,
    UsageColumnDef
} from '../../core/models/warehouse.model';

const getLocalToday = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
const getLocalDateString = (dateString: string) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString.split('T')[0].substring(0, 10);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
const today = getLocalToday();
declare var XLSX: any;

@Component({
  selector: 'app-goods-issue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h2 class="text-3xl font-bold text-gray-800 tracking-tight">Quản lý Xuất kho</h2>
           <p class="text-gray-500 mt-1">Ghi nhận xuất kho hóa chất, vật tư cho các bộ phận.</p>
        </div>
        
        <button (click)="openAddModal()" class="inline-flex items-center px-6 py-3 bg-[#63C3C7] hover:bg-[#55a8ac] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#63C3C7]/30 hover:shadow-[#63C3C7]/50 hover:-translate-y-0.5 active:translate-y-0">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4m16 0l-4-4m4 4l-4 4"></path></svg>
          Tạo Phiếu xuất
        </button>
      </div>

      <!-- FILTER BAR -->
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end mb-6">
        <div class="flex-1 min-w-[200px]">
          <label class="text-xs font-bold text-gray-500">Chọn ngày</label>
          <input type="date" [ngModel]="filterDate()" (ngModelChange)="filterDate.set($event); currentPage.set(1)" 
                 class="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#63C3C7]/30 focus:border-[#63C3C7] outline-none transition-all bg-gray-50 focus:bg-white">
        </div>
        <div class="flex-1 min-w-[250px]">
          <label class="text-xs font-bold text-gray-500">Kho lưu trữ</label>
          <select [ngModel]="filterWarehouseId()" (ngModelChange)="filterWarehouseId.set($event); currentPage.set(1)" 
                  class="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#63C3C7]/30 focus:border-[#63C3C7] outline-none appearance-none bg-gray-50 focus:bg-white cursor-pointer">
            <option value="">Tất cả kho</option>
            @for (w of warehouses(); track w.id) {
              <option [value]="w.id">{{ w.name }}</option>
            }
          </select>
        </div>
        <div class="w-full md:w-auto">
           <button (click)="resetFilters()" 
                   class="px-6 py-2 mt-1 w-full text-sm rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-colors">
             Xóa lọc
           </button>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Ngày xuất</th>
                <th class="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Vật tư / Hóa chất</th>
                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Kho</th>
                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Số Lot (Nguồn)</th>
                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Số lượng</th>
                <th class="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (item of paginatedIssues(); track item.id) {
                <tr class="hover:bg-red-50/30 transition-colors group">
                  <td class="px-6 py-5 text-sm text-gray-500 hidden md:table-cell">{{ formatDate(item.issueDate) }}</td>
                  <td class="px-8 py-5">
                    <div class="font-bold text-gray-800 text-base">{{ getChemical(item.chemicalId)?.name || '---' }}</div>
                    <div class="text-xs text-gray-400 mt-0.5 hidden md:block">Tạo bởi {{ item.createdBy }} • {{ formatDateTime(item.createdDate) }}</div>
                  </td>
                  <td class="px-6 py-5 hidden md:table-cell">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                      {{ getWarehouseName(item.warehouseId) }}
                    </span>
                  </td>
                  <td class="px-6 py-5 font-mono text-sm text-gray-600">{{ item.lotNumber }}</td>
                  <td class="px-6 py-5 text-right">
                    <div class="font-bold text-red-500 text-lg">
                       -{{ item.quantity }} <span class="text-sm font-normal text-gray-500">{{ getIssueUnitName(item) }}</span>
                    </div>
                    @let chem = getChemical(item.chemicalId);
                    @if (chem) {
                      @let detail = dataService.getStockDetail(chem, chem.currentStock);
                      <div class="inline-block mt-1 px-2 py-0.5 bg-gray-50 rounded border border-gray-100 text-xs text-gray-600 font-medium whitespace-nowrap">
                         Còn tồn: {{ detail || (formatStock(chem.currentStock) + ' ' + getUnitName(chem.unitId)) }}
                      </div>
                    }
                  </td>
                  <td class="px-8 py-5 text-center">
                    <div class="flex items-center justify-center gap-2">
                       <button (click)="viewItemDetails(item)" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all" title="Xem chi tiết">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                      </button>
                       @if (canEdit) {
                        <button (click)="editItem(item)" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Chỉnh sửa">
                           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                       }
                       @if (canDelete) {
                        <button (click)="requestDeleteItem(item.id)" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Hủy phiếu xuất">
                           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
              @if (paginatedIssues().length === 0) {
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center text-gray-400">
                    <div class="flex flex-col items-center">
                      <svg class="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4m16 0l-4-4m4 4l-4 4"></path></svg>
                      <span class="font-medium">Chưa có giao dịch xuất kho nào</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    @if (isModalOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-3xl transform transition-all scale-100 flex flex-col max-h-[90vh] overflow-hidden">
          <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-[#63C3C7] to-[#4FA8AC] text-white">
            <div class="flex items-center gap-3">
               <div class="bg-white/20 p-2 rounded-lg"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4m16 0l-4-4m4 4l-4 4"></path></svg></div>
               <h3 class="text-xl font-bold">{{ isEditing() ? 'Cập nhật Phiếu Xuất' : 'Tạo Phiếu Xuất Kho' }}</h3>
            </div>
            <button (click)="closeModal()" class="text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-1">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div class="p-8 overflow-y-auto space-y-6">
             <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
               
               <!-- Issue Date -->
               <div>
                 <label class="block text-sm font-bold text-gray-700 mb-2">Ngày xuất <span class="text-red-500">*</span></label>
                 <input type="date" [ngModel]="formData().issueDate" (ngModelChange)="updateFormData('issueDate', $event)" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none bg-gray-50 focus:bg-white transition-all">
               </div>

               <!-- Warehouse -->
               <div>
                 <label class="block text-sm font-bold text-gray-700 mb-2">Từ kho <span class="text-red-500">*</span></label>
                 <select [ngModel]="formData().warehouseId" (ngModelChange)="onWarehouseChange($event)" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none appearance-none bg-gray-50 focus:bg-white transition-all">
                   <option value="" disabled>Chọn kho xuất</option>
                   @for (w of warehouses(); track w.id) {
                     <option [value]="w.id">{{ w.name }}</option>
                   }
                 </select>
                 @if(isCurrentWarehouseQC() && (formChemical()?.requiresLotAndExpiry !== false)) {
                    <div class="mt-1 flex items-center text-xs text-purple-600 font-bold">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                        Kho kiểm soát LOT (Chỉ xuất được lô "Đạt")
                    </div>
                 }
               </div>
               
               <!-- Chemical -->
               <div class="md:col-span-2">
                 <label class="block text-sm font-bold text-gray-700 mb-2">Tên vật tư <span class="text-red-500">*</span></label>
                 <select [ngModel]="formData().chemicalId" (ngModelChange)="onChemicalChange($event)" [disabled]="!formData().warehouseId" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none appearance-none bg-gray-50 focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                   <option value="" disabled>Chọn vật tư/hóa chất</option>
                   @for (c of availableChemicals(); track c.id) {
                     <option [value]="c.id">{{ c.name }}</option>
                   }
                 </select>
               </div>
               
               <!-- Unit Selection (Flexible Unit) -->
               @if(formChemical() && formChemical()!.itemsPerUnit > 1) {
                   <div class="md:col-span-2">
                       <label class="block text-sm font-bold text-gray-700 mb-2">Đơn vị xuất <span class="text-red-500">*</span></label>
                       <div class="flex gap-3">
                           <button (click)="setIssueUnit(false)" class="flex-1 py-3 px-4 rounded-xl border transition-all flex items-center justify-center gap-2"
                                   [class]="!formData().isSubUnit ? 'bg-[#63C3C7]/10 border-[#63C3C7] text-[#63C3C7] font-bold ring-1 ring-[#63C3C7]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'">
                               <div [class]="!formData().isSubUnit ? 'w-4 h-4 rounded-full border-4 border-[#63C3C7]' : 'w-4 h-4 rounded-full border border-gray-300'"></div>
                               <span>{{ getUnitName(formChemical()?.unitId) }} (Chính)</span>
                           </button>
                           
                           <button (click)="setIssueUnit(true)" class="flex-1 py-3 px-4 rounded-xl border transition-all flex items-center justify-center gap-2"
                                   [class]="formData().isSubUnit ? 'bg-[#63C3C7]/10 border-[#63C3C7] text-[#63C3C7] font-bold ring-1 ring-[#63C3C7]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'">
                               <div [class]="formData().isSubUnit ? 'w-4 h-4 rounded-full border-4 border-[#63C3C7]' : 'w-4 h-4 rounded-full border border-gray-300'"></div>
                               <span>{{ formChemical()?.subItemName }} (Lẻ)</span>
                           </button>
                       </div>
                   </div>
               }

               <!-- Lot Number Selection (Available Lots) -->
               <div class="md:col-span-2">
                 <label class="block text-sm font-bold text-gray-700 mb-2">Chọn Lô xuất (Lot) @if (formChemical()?.requiresLotAndExpiry !== false) { <span class="text-red-500">*</span> }</label>
                 <select [ngModel]="formData().lotNumber" (ngModelChange)="updateFormData('lotNumber', $event)" [disabled]="!formData().chemicalId" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none appearance-none bg-gray-50 focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                   <option value="" disabled>Chọn lô hàng có sẵn</option>
                   @for (lot of availableLots(); track lot.lotNumber) {
                     <option [value]="lot.lotNumber" [disabled]="lot.isDisabled">
                       {{ lot.lotNumber || '(Không có số Lot)' }} 
                       @if(lot.isDisabled) { (Chưa QC - Tạm khóa) } @else { - Còn: {{ formatStock(lot.remaining) }} {{ getCurrentUnitName() }} } 
                       @if(lot.expiryDate) { (HSD: {{ formatDate(lot.expiryDate) }}) }
                     </option>
                   }
                 </select>
                 @if(formData().chemicalId && availableLots().length === 0) {
                     <p class="text-xs text-red-500 mt-1">Hóa chất này hiện đã hết hàng trong kho này.</p>
                 }
               </div>

               <!-- Quantity -->
               <div>
                 <label class="block text-sm font-bold text-gray-700 mb-2">Số lượng xuất <span class="text-red-500">*</span></label>
                 <input type="number" [ngModel]="formData().quantity" (ngModelChange)="updateFormData('quantity', $event)" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none bg-gray-50 focus:bg-white transition-all" placeholder="0">
                 @if (maxQuantity()) {
                    <p class="text-xs text-gray-500 mt-1">Tối đa có thể xuất: <span class="font-bold text-blue-600">{{ formatStock(maxQuantity()) }} {{ getCurrentUnitName() }}</span></p>
                 }
               </div>

               <!-- Notes -->
               <div class="md:col-span-2">
                 <label class="block text-sm font-bold text-gray-700 mb-2">Ghi chú</label>
                 <textarea [ngModel]="formData().notes" (ngModelChange)="updateFormData('notes', $event)" rows="2" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none bg-gray-50 focus:bg-white transition-all" placeholder="Lý do xuất kho..."></textarea>
               </div>
             </div>

              <!-- Dynamic Usage Details Table (Patient/Sample Grid) -->
              @if (currentWarehouseConfig()?.enableUsageDetails && currentWarehouseConfig()!.usageColumns!.length > 0) {
                <div class="mt-2 border-t border-gray-100 pt-4">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                      <h4 class="font-bold text-gray-800">Bảng chi tiết sử dụng</h4>
                      <span class="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">{{ usageRows().length }} dòng</span>
                    </div>
                    <button (click)="addUsageRow()" type="button" class="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 font-medium transition-all">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                      Thêm dòng
                    </button>
                  </div>
                  
                  <div class="overflow-x-auto rounded-xl border border-gray-200">
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="bg-gray-50 text-gray-600">
                          <th class="px-3 py-2 text-left font-bold text-xs w-10">#</th>
                          @for (col of currentWarehouseConfig()!.usageColumns!; track col.key) {
                            <th class="px-3 py-2 text-left font-bold text-xs">{{ col.label }}</th>
                          }
                          <th class="px-2 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (row of usageRows(); track $index; let i = $index) {
                          <tr class="border-t border-gray-100 hover:bg-blue-50/30">
                            <td class="px-3 py-1.5 text-gray-400 font-mono text-xs">{{ i + 1 }}</td>
                            @for (col of currentWarehouseConfig()!.usageColumns!; track col.key) {
                              <td class="px-1 py-1">
                                <input type="text" [value]="row[col.key] || ''" (input)="updateUsageCell(i, col.key, $any($event.target).value)" 
                                       class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 outline-none bg-white" 
                                       [placeholder]="col.label">
                              </td>
                            }
                            <td class="px-2 py-1.5 text-center">
                              <button (click)="removeUsageRow(i)" type="button" class="text-red-400 hover:text-red-600 p-0.5">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                              </button>
                            </td>
                          </tr>
                        }
                        @if (usageRows().length === 0) {
                          <tr>
                            <td [attr.colspan]="(currentWarehouseConfig()!.usageColumns!.length || 0) + 2" class="text-center py-6 text-gray-400 text-sm italic">
                              Chưa có dữ liệu. Bấm "Thêm dòng" để bắt đầu nhập.
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              }
          </div>

          <div class="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-3xl">
             <button (click)="closeModal()" class="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-white hover:border-gray-300 transition-all">Hủy bỏ</button>
             <button (click)="saveItem()" class="px-6 py-3 rounded-xl bg-[#63C3C7] text-white font-bold hover:bg-[#55a8ac] shadow-lg shadow-[#63C3C7]/20 hover:shadow-[#63C3C7]/40 hover:-translate-y-0.5 transition-all">{{ isEditing() ? 'Lưu thay đổi' : 'Xuất kho' }}</button>
          </div>
        </div>
      </div>
    }

    <!-- Generic Confirmation/Alert Modal -->
    @if (modalState().isOpen) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md transform transition-all scale-100 border border-gray-100 p-8">
          <div class="flex items-start gap-4">
            @if (modalState().type === 'confirm') {
              <div class="w-12 h-12 rounded-full bg-red-50 flex-shrink-0 flex items-center justify-center text-red-500">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
            } @else if (modalState().type === 'error') {
               <div class="w-12 h-12 rounded-full bg-orange-50 flex-shrink-0 flex items-center justify-center text-orange-500">
                 <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               </div>
            } @else {
               <div class="w-12 h-12 rounded-full bg-green-50 flex-shrink-0 flex items-center justify-center text-green-500">
                 <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
               </div>
            }
            <div class="flex-1">
              <h3 class="text-xl font-bold text-gray-800">{{ modalState().title }}</h3>
              <p class="text-gray-500 mt-2">{{ modalState().message }}</p>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-8">
            @if (modalState().type === 'confirm') {
              <button (click)="closeConfirmationModal()" class="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all">Hủy bỏ</button>
              <button (click)="confirmDeleteItem()" class="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 hover:-translate-y-0.5 transition-all">Xác nhận Hủy</button>
            } @else {
               <button (click)="closeConfirmationModal()" class="px-6 py-2.5 rounded-xl bg-[#63C3C7] text-white font-bold hover:bg-[#55a8ac] shadow-lg shadow-[#63C3C7]/20 transition-all">Đã hiểu</button>
            }
          </div>
        </div>
      </div>
    }

    <!-- Details Modal -->
    @if (isDetailsModalOpen() && selectedIssue()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-3xl transform transition-all scale-100 flex flex-col max-h-[90vh] overflow-hidden">
          <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div class="flex items-center gap-3">
               <div class="bg-[#63C3C7]/10 p-2 rounded-lg text-[#63C3C7]"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg></div>
               <h3 class="text-xl font-bold text-gray-800">Chi tiết Phiếu Xuất</h3>
            </div>
            <button (click)="closeDetailsModal()" class="text-gray-400 hover:text-gray-600 transition-colors bg-gray-200 hover:bg-gray-300 rounded-full p-1">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div class="p-8 overflow-y-auto space-y-8">
            <!-- Chemical Details -->
            @if (selectedChemical(); as chemical) {
              <div>
                <h4 class="text-base font-bold text-[#63C3C7] uppercase tracking-wider mb-4">Thông tin Hóa chất</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 text-sm">
                    <div class="md:col-span-3 flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Tên Hóa chất</span>
                        <span class="font-semibold text-gray-800 text-lg mt-1">{{ chemical.name }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Kho</span>
                        <span class="font-semibold text-gray-800 text-base mt-1">{{ getWarehouseName(chemical.warehouseId) }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Hãng sản xuất</span>
                        <span class="font-semibold text-gray-800 text-base mt-1">{{ getManufacturerName(chemical.manufacturerId) }}</span>
                    </div>
                     <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Quy cách</span>
                        <span class="font-semibold text-gray-800 text-base mt-1">{{ formatPackaging(chemical) }}</span>
                    </div>
                </div>
              </div>
            }
            
            <div class="border-t border-gray-200 border-dashed"></div>

            <!-- Issue Details -->
            <div>
                <h4 class="text-base font-bold text-[#63C3C7] uppercase tracking-wider mb-4">Thông tin Xuất kho</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 text-sm">
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Ngày xuất</span>
                        <span class="font-semibold text-gray-800 text-base mt-1">{{ formatDate(selectedIssue()!.issueDate) }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Số lượng xuất</span>
                        <span class="font-bold text-red-600 text-base mt-1">
                          - {{ selectedIssue()!.quantity }} {{ getIssueUnitName(selectedIssue()!) }}
                        </span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Số Lot (Nguồn)</span>
                        <span class="font-mono text-gray-800 text-base mt-1">{{ selectedIssue()!.lotNumber }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Người tạo phiếu</span>
                        <span class="font-semibold text-gray-800 text-base mt-1">{{ selectedIssue()!.createdBy }}</span>
                    </div>
                     <div class="md:col-span-2 flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Thời gian tạo</span>
                        <span class="font-semibold text-gray-800 text-base mt-1">{{ formatDateTime(selectedIssue()!.createdDate) }}</span>
                    </div>
                     <div class="md:col-span-3 flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Ghi chú</span>
                        <p class="text-gray-700 mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 min-h-[60px]">
                            {{ selectedIssue()!.notes || 'Không có ghi chú.' }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Audit Trail Section -->
            <div class="border-t border-gray-200 border-dashed"></div>
            <div>
                <h4 class="text-base font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Lịch sử chỉnh sửa
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Người tạo phiếu</span>
                        <span class="font-semibold text-gray-800 text-base mt-1">{{ selectedIssue()!.createdBy || '---' }}</span>
                        <span class="text-xs text-gray-400 mt-0.5">{{ formatDateTime(selectedIssue()!.createdDate) }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Sửa lần cuối</span>
                        @if (selectedIssue()!.lastModifiedBy) {
                            <span class="font-semibold text-orange-600 text-base mt-1">{{ selectedIssue()!.lastModifiedBy }}</span>
                            <span class="text-xs text-gray-400 mt-0.5">{{ formatDateTime(selectedIssue()!.lastModifiedDate!) }}</span>
                        } @else {
                            <span class="text-sm text-gray-300 italic mt-1">Chưa có chỉnh sửa</span>
                        }
                    </div>
                </div>
            </div>
          </div>
           <div class="p-4 border-t border-gray-100 flex justify-end bg-gray-50 rounded-b-3xl">
             <button (click)="closeDetailsModal()" class="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-white hover:border-gray-300 transition-all">Đóng</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class GoodsIssueComponent {
  dataService = inject(DataService);
  authService = inject(AuthService);

  issues = this.dataService.goodsIssues;
  warehouses = this.dataService.warehouses;
  chemicals = this.dataService.chemicals;
  manufacturers = this.dataService.manufacturers;
  
  currentPage = signal(1);
  itemsPerPage = 10;
  isModalOpen = false;
  isEditing = signal(false);
  
  // Details Modal
  isDetailsModalOpen = signal(false);
  selectedIssue = signal<GoodsIssue | null>(null);

  filterWarehouseId = signal('');
  filterDate = signal(today);

  formData = signal<any>(this.resetFormData());

  modalState = signal<{
    isOpen: boolean;
    type: 'confirm' | 'error' | 'success';
    title: string;
    message: string;
    itemToDeleteId: string | null;
  }>({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    itemToDeleteId: null
  });

  get canEdit() {
    return this.authService.hasPermission('canEditIssue');
  }

  get canDelete() {
    return this.authService.hasPermission('canDeleteIssue');
  }

  selectedChemical = computed(() => {
    const issue = this.selectedIssue();
    if (!issue) return null;
    return this.getChemical(issue.chemicalId);
  });

  allIssuesSorted = computed(() => {
    let list = this.issues();
    
    if (this.filterWarehouseId()) {
      list = list.filter(r => r.warehouseId === this.filterWarehouseId());
    }
    if (this.filterDate()) {
      list = list.filter(r => {
        if (!r.issueDate) return false;
        const dObj = new Date(r.issueDate);
        const localYMD = dObj.getFullYear() + '-' + String(dObj.getMonth() + 1).padStart(2, '0') + '-' + String(dObj.getDate()).padStart(2, '0');
        const storedYMD = r.issueDate.length === 10 ? r.issueDate : localYMD;
        return storedYMD === this.filterDate();
      });
    }
    
    return list.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  });

  paginatedIssues = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.allIssuesSorted().slice(start, start + this.itemsPerPage);
  });

  resetFilters() {
    this.filterWarehouseId.set('');
    this.filterDate.set(getLocalToday());
    this.currentPage.set(1);
  }

  // Computed for Dropdowns
  availableChemicals = computed(() => {
    const whId = this.formData().warehouseId;
    if (!whId) return [];
    return this.chemicals().filter(c => c.warehouseId === whId);
  });

  isCurrentWarehouseQC = computed(() => {
      const whId = this.formData().warehouseId;
      if (!whId) return false;
      return this.dataService.isWarehouseQC(whId);
  });

  // Logic to calculate available lots for selected chemical
  // IMPORTANT: Everything here is calculated in Primary Units first, then converted if needed
  availableLots = computed(() => {
      const chemId = this.formData().chemicalId;
      const whId = this.formData().warehouseId;
      const isSub = this.formData().isSubUnit;
      const chemical = this.formChemical();
      if (!chemId || !chemical) return [];

      const isQCRequired = this.dataService.isWarehouseQC(whId);

      // Get all receipts for this chemical
      const receipts = this.dataService.goodsReceipts().filter(r => r.chemicalId === chemId && r.warehouseId === whId);
      
      // Get all issues for this chemical
      const issues = this.dataService.goodsIssues().filter(i => i.chemicalId === chemId && i.warehouseId === whId);

      // Group by Lot Number (Using Primary Unit for math)
      const lotMap = new Map<string, { expiryDate: string, totalReceived: number, totalIssued: number, lotStatus: 'pending' | 'passed' | 'failed' | null }>();

      receipts.forEach(r => {
          if (!lotMap.has(r.lotNumber)) {
              lotMap.set(r.lotNumber, { expiryDate: r.expiryDate, totalReceived: 0, totalIssued: 0, lotStatus: null });
          }
          const lotData = lotMap.get(r.lotNumber)!;
          lotData.totalReceived += r.quantity;
          
          // Track worst status: failed > pending > passed
          const s = r.qcStatus || 'passed';
          if (s === 'failed') lotData.lotStatus = 'failed';
          else if (s === 'pending' && lotData.lotStatus !== 'failed') lotData.lotStatus = 'pending';
          else if (!lotData.lotStatus) lotData.lotStatus = 'passed';
      });

      issues.forEach(i => {
          if (lotMap.has(i.lotNumber)) {
              // Normalize issued quantity to primary unit
              let qtyInPrimary = i.quantity;
              if (i.isSubUnit && chemical.itemsPerUnit > 1) {
                  qtyInPrimary = i.quantity / chemical.itemsPerUnit;
              }
              lotMap.get(i.lotNumber)!.totalIssued += qtyInPrimary;
          }
      });

      // Transform to array and filter out empty lots
      const result = [];
      for (const [lotNumber, data] of lotMap.entries()) {
          let remaining = data.totalReceived - data.totalIssued;
          
          if (isSub && chemical.itemsPerUnit > 1) {
              remaining = remaining * chemical.itemsPerUnit;
          }

          if (remaining > 0.0001) {
              // Disabled nếu kho có kiểm soát LOT và lot chưa được duyệt (đạt) hoặc bị từ chối
              const isDisabled = isQCRequired && (chemical.requiresLotAndExpiry !== false) && (data.lotStatus === 'pending' || data.lotStatus === 'failed');

              result.push({
                  lotNumber,
                  expiryDate: data.expiryDate,
                  remaining,
                  isDisabled,
                  lotStatus: data.lotStatus
              });
          }
      }
      
      return result.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  });

  formChemical = computed(() => {
      return this.chemicals().find(c => c.id === this.formData().chemicalId);
  });

  maxQuantity = computed(() => {
      // Find the currently selected lot from availableLots (calculated based on history)
      const lot = this.availableLots().find(l => l.lotNumber === this.formData().lotNumber);
      
      let max = lot ? lot.remaining : 0;

      // Special Case: If Editing, we need to "add back" the quantity of the current transaction 
      // because `availableLots` has already subtracted it (since it's in the history).
      if (this.isEditing()) {
          const currentEditingId = this.formData().id;
          const originalIssue = this.issues().find(i => i.id === currentEditingId);
          
          // If we are still editing the same lot and same chemical
          if (originalIssue && 
              originalIssue.lotNumber === this.formData().lotNumber && 
              originalIssue.chemicalId === this.formData().chemicalId) {
                
                // Add back original quantity (normalized to current unit selection)
                // If original was SubUnit(10) and we are currently selecting SubUnit -> +10
                // If original was MainUnit(1) and we are currently selecting SubUnit (pack=10) -> +10
                
                const chem = this.formChemical();
                if (chem) {
                    let originalQtyNormalized = originalIssue.quantity;
                    
                    // Normalize original to Base Unit first
                    if (originalIssue.isSubUnit && chem.itemsPerUnit > 1) {
                        originalQtyNormalized = originalIssue.quantity / chem.itemsPerUnit;
                    }

                    // Convert to Target Unit (Current Selection)
                    if (this.formData().isSubUnit && chem.itemsPerUnit > 1) {
                        originalQtyNormalized = originalQtyNormalized * chem.itemsPerUnit;
                    }

                    max += originalQtyNormalized;
                }
          }
      }

      return max;
  });

  updateFormData(field: string, value: any) {
    this.formData.update(d => ({ ...d, [field]: value }));
  }

  setIssueUnit(isSub: boolean) {
      this.formData.update(d => ({ ...d, isSubUnit: isSub, lotNumber: '' })); // Reset lot when unit changes to recalculate max
  }

  getCurrentUnitName() {
      const c = this.formChemical();
      if (!c) return '';
      return this.formData().isSubUnit ? c.subItemName : this.getUnitName(c.unitId);
  }
  
  formatStock(val: number) {
      // Format number to avoid long decimals like 19.9999999
      return Math.round(val * 100) / 100;
  }

  // Events
  onWarehouseChange(val: string) {
      this.formData.update(d => ({
        ...d,
        warehouseId: val,
        chemicalId: '',
        lotNumber: '',
        isSubUnit: false
      }));
  }

  onChemicalChange(val: string) {
      this.formData.update(d => ({
        ...d,
        chemicalId: val,
        lotNumber: '',
        isSubUnit: false
      }));

      // Auto-select lot if only one exists (especially for Materials)
      setTimeout(() => {
          const lots = this.availableLots();
          if (lots.length === 1 && !lots[0].isDisabled) {
              this.updateFormData('lotNumber', lots[0].lotNumber);
          }
      }, 0);
  }

  resetFormData() {
      return {
          id: '',
          issueDate: getLocalToday(),
          warehouseId: '',
          chemicalId: '',
          lotNumber: '',
          quantity: 1,
          isSubUnit: false,
          notes: ''
      };
  }

  openAddModal() {
      this.isEditing.set(false);
      this.formData.set(this.resetFormData());
      this.usageRows.set([]);
      this.isModalOpen = true;
  }

  editItem(item: GoodsIssue) {
      this.isEditing.set(true);
      const formattedItem = {
          ...item,
          issueDate: getLocalDateString(item.issueDate)
      };
      this.formData.set(formattedItem);
      this.usageRows.set(formattedItem.usageDetails || []);
      this.isModalOpen = true;
  }

  closeModal() {
      this.isModalOpen = false;
  }

  viewItemDetails(item: GoodsIssue) {
      this.selectedIssue.set(item);
      this.isDetailsModalOpen.set(true);
  }

  closeDetailsModal() {
      this.isDetailsModalOpen.set(false);
      this.selectedIssue.set(null);
  }

  saveItem() {
      const form = this.formData();
      const chemical = this.formChemical();
      const requiresLotAndExpiry = chemical?.requiresLotAndExpiry !== false;

      if (!form.issueDate || !form.warehouseId || !form.chemicalId) {
          this.showErrorAlert('Lỗi nhập liệu', 'Vui lòng nhập đầy đủ thông tin bắt buộc.');
          return;
      }

      if (requiresLotAndExpiry && !form.lotNumber) {
          this.showErrorAlert('Lỗi nhập liệu', 'Vui lòng chọn Lô xuất.');
          return;
      }

      // Check if selected lot is valid
      const selectedLot = this.availableLots().find(l => l.lotNumber === form.lotNumber);
      if (!selectedLot) {
          this.showErrorAlert('Lỗi nhập liệu', 'Vui lòng chọn Lô xuất hợp lệ từ danh sách.');
          return;
      }

      if (form.quantity <= 0) {
          this.showErrorAlert('Lỗi số lượng', 'Số lượng xuất phải lớn hơn 0.');
          return;
      }

      const max = this.maxQuantity();
      // Allow a tiny margin for floating point errors
      if (form.quantity > max + 0.0001) {
          this.showErrorAlert('Vượt quá tồn kho', `Số lượng xuất không được vượt quá tồn kho của lô (${this.formatStock(max)} ${this.getCurrentUnitName()}).`);
          return;
      }

      if (this.isEditing()) {
          this.dataService.updateGoodsIssue({
              ...form,
              lastModifiedBy: this.authService.currentUser()?.name || 'Unknown',
              lastModifiedDate: new Date().toISOString()
          });
      } else {
          const usageDetails = this.usageRows().length > 0 ? this.usageRows() : undefined;
          this.dataService.addGoodsIssue({
              ...form,
              usageDetails,
              createdDate: new Date().toISOString(),
              createdBy: this.authService.currentUser()?.name || 'Unknown'
          });
      }
      
      this.closeModal();
  }

  requestDeleteItem(id: string) {
      this.modalState.set({
          isOpen: true,
          type: 'confirm',
          title: 'Hủy Phiếu Xuất',
          message: 'Bạn có chắc chắn muốn hủy phiếu xuất này? Số lượng sẽ được hoàn trả về kho.',
          itemToDeleteId: id
      });
  }

  confirmDeleteItem() {
      const id = this.modalState().itemToDeleteId;
      if (id) {
          this.dataService.deleteGoodsIssue(id);
      }
      this.closeConfirmationModal();
  }
  
  closeConfirmationModal() {
      this.modalState.set({ isOpen: false, type: 'confirm', title: '', message: '', itemToDeleteId: null });
  }

  showErrorAlert(title: string, message: string) {
      this.modalState.set({
          isOpen: true,
          type: 'error',
          title: title,
          message: message,
          itemToDeleteId: null
      });
  }

  // Helpers
  getChemical(id: string) { return this.chemicals().find(c => c.id === id); }
  getWarehouseName(id: string) { return this.warehouses().find(w => w.id === id)?.name || '---'; }
  getUnitName(id: string | undefined) { return this.dataService.getUnitName(id); }
  getManufacturerName(id: string) { return this.manufacturers().find(m => m.id === id)?.name || '---'; }
  
  getIssueUnitName(issue: GoodsIssue) {
      const c = this.getChemical(issue.chemicalId);
      if (!c) return '---';
      return issue.isSubUnit ? c.subItemName : this.getUnitName(c.unitId);
  }

  formatDate(d: string) { return d ? new Date(d).toLocaleDateString('vi-VN') : '---'; }
  formatDateTime(d: string) {
    if (!d) return '---';
    return new Date(d).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).replace(',', '');
  }
  
  formatPackaging(item: Chemical) {
    return this.dataService.formatPackaging(item);
  }

  // ======= Usage Details (Dynamic Patient/Sample Grid) =======
  currentWarehouseConfig = computed(() => {
      const whId = this.formData().warehouseId;
      if (!whId) return null;
      return this.dataService.getWarehouseConfig(whId) || null;
  });

  usageRows = signal<Record<string, string>[]>([]);

  addUsageRow() {
      this.usageRows.update(rows => [...rows, {}]);
  }

  removeUsageRow(index: number) {
      this.usageRows.update(rows => rows.filter((_, i) => i !== index));
  }

  updateUsageCell(rowIndex: number, colKey: string, value: string) {
      this.usageRows.update(rows => {
          const newRows = [...rows];
          newRows[rowIndex] = { ...newRows[rowIndex], [colKey]: value };
          return newRows;
      });
  }
}
