import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, GoodsReceipt, Chemical } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';

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
declare var Html5Qrcode: any;
declare const google: any;

@Component({
  selector: 'app-goods-receipt',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h2 class="text-3xl font-bold text-gray-800 tracking-tight">Quản lý Nhập kho</h2>
           <p class="text-gray-500 mt-1">Ghi nhận và theo dõi các đợt nhập hóa chất, vật tư.</p>
        </div>
        
        <button (click)="openAddModal()" class="inline-flex items-center px-6 py-3 bg-[#63C3C7] hover:bg-[#55a8ac] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#63C3C7]/30 hover:shadow-[#63C3C7]/50 hover:-translate-y-0.5 active:translate-y-0">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Tạo Phiếu nhập
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
                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Ngày nhập</th>
                <th class="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Vật tư / Hóa chất</th>
                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Kho</th>
                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Số Lot</th>
                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Số lượng</th>
                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Ngày hết hạn</th>
                <th class="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (item of paginatedReceipts(); track item.id) {
                <tr class="hover:bg-blue-50/30 transition-colors group">
                  <td class="px-6 py-5 text-sm text-gray-500 hidden md:table-cell">{{ formatDate(item.receiptDate) }}</td>
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
                    <div class="font-bold text-[#63C3C7] text-lg">
                       {{ item.quantity }} <span class="text-sm font-normal text-gray-500">{{ getUnitName(getChemical(item.chemicalId)?.unitId) }}</span>
                    </div>
                    @let detail = getQuantityDetail(item);
                    @if (detail) {
                      <div class="inline-block mt-1 px-2 py-0.5 bg-gray-50 rounded border border-gray-100 text-xs text-gray-600 font-medium whitespace-nowrap">
                         {{ detail }}
                      </div>
                    }
                  </td>
                  <td class="px-6 py-5 text-sm text-gray-500 hidden md:table-cell">{{ formatDate(item.expiryDate) }}</td>
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
                        <button (click)="requestDeleteItem(item.id)" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Xóa bỏ">
                           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
              @if (paginatedReceipts().length === 0) {
                <tr>
                  <td colspan="7" class="px-6 py-12 text-center text-gray-400">
                    <div class="flex flex-col items-center">
                      <svg class="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <span class="font-medium">Chưa có giao dịch nhập kho nào</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (allReceiptsSorted().length > itemsPerPage) {
          <div class="flex items-center justify-between px-8 py-5 bg-gray-50/50 border-t border-gray-100">
            <div>
              <p class="text-sm text-gray-500">
                Hiển thị <span class="font-bold text-gray-800">{{ startItemIndex }}</span> - <span class="font-bold text-gray-800">{{ endItemIndex }}</span> / <span class="font-bold text-gray-800">{{ allReceiptsSorted().length }}</span> kết quả
              </p>
            </div>
            <div>
              <nav class="isolate inline-flex -space-x-px rounded-xl shadow-sm" aria-label="Pagination">
                <button (click)="prevPage()" [disabled]="currentPage() === 1" class="relative inline-flex items-center rounded-l-xl px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <span class="sr-only">Previous</span>
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" /></svg>
                </button>
                <div class="relative inline-flex items-center px-4 py-2 text-sm font-bold text-[#63C3C7] ring-1 ring-inset ring-gray-200 focus:outline-offset-0 bg-white">
                  {{ currentPage() }} / {{ totalPages() }}
                </div>
                <button (click)="nextPage()" [disabled]="currentPage() === totalPages()" class="relative inline-flex items-center rounded-r-xl px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <span class="sr-only">Next</span>
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" /></svg>
                </button>
              </nav>
            </div>
          </div>
        }
      </div>
    </div>
    
    <!-- Rest of Modal Templates remain the same (isModalOpen, modalState, DetailsModal) -->
    <!-- ... -->
    
    @if (isModalOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-3xl transform transition-all scale-100 flex flex-col max-h-[90vh] overflow-hidden">
          <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-[#63C3C7] to-[#4FA8AC] text-white">
            <div class="flex items-center gap-3">
               <div class="bg-white/20 p-2 rounded-lg"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg></div>
               <h3 class="text-xl font-bold">{{ isEditing() ? 'Cập nhật Phiếu nhập' : 'Tạo Phiếu Nhập kho mới' }}</h3>
            </div>
            <button (click)="closeModal()" class="text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-1">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div class="p-8 overflow-y-auto space-y-6">
             <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
               
               <!-- Receipt Date -->
               <div>
                 <label class="block text-sm font-bold text-gray-700 mb-2">Ngày nhập <span class="text-red-500">*</span></label>
                 <input type="date" [ngModel]="formData().receiptDate" (ngModelChange)="updateFormData('receiptDate', $event)" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none bg-gray-50 focus:bg-white transition-all">
               </div>

               <!-- Warehouse -->
               <div>
                 <label class="block text-sm font-bold text-gray-700 mb-2">Danh mục kho <span class="text-red-500">*</span></label>
                 <select [ngModel]="formData().warehouseId" (ngModelChange)="onWarehouseChange($event)" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none appearance-none bg-gray-50 focus:bg-white transition-all">
                   <option value="" disabled>Chọn kho lưu trữ</option>
                   @for (w of warehouses(); track w.id) {
                     <option [value]="w.id">{{ w.name }}</option>
                   }
                 </select>
               </div>
               
               <!-- Chemical -->
               <div class="md:col-span-2">
                 <label class="block text-sm font-bold text-gray-700 mb-2">Tên vật tư <span class="text-red-500">*</span></label>
                 <select [ngModel]="formData().chemicalId" (ngModelChange)="updateFormData('chemicalId', $event)" [disabled]="!formData().warehouseId" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none appearance-none bg-gray-50 focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                   <option value="" disabled>Chọn vật tư/hóa chất</option>
                   @for (c of availableChemicals(); track c.id) {
                     <option [value]="c.id">{{ c.name }}</option>
                   }
                 </select>
                 @if (!formData().warehouseId) {
                   <p class="text-xs text-orange-500 mt-1.5">Vui lòng chọn kho trước khi chọn vật tư.</p>
                 }
               </div>

               <!-- Lot Number -->
               <div>
                 <label class="block text-sm font-bold text-gray-700 mb-2">Số Lot @if (formChemical()?.requiresLotAndExpiry !== false) { <span class="text-red-500">*</span> }</label>
                 <input type="text" [ngModel]="formData().lotNumber" (ngModelChange)="updateFormData('lotNumber', $event)" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none bg-gray-50 focus:bg-white transition-all" placeholder="VD: LOT20240521">
               </div>

               <!-- Quantity -->
               <div>
                 <label class="block text-sm font-bold text-gray-700 mb-2">Số lượng <span class="text-red-500">*</span></label>
                 <input type="number" [ngModel]="formData().quantity" (ngModelChange)="updateFormData('quantity', $event)" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none bg-gray-50 focus:bg-white transition-all" placeholder="0">
                 @if (formChemical()) {
                    <p class="text-xs text-gray-500 mt-1.5">
                      Quy cách: {{ formatPackaging(formChemical()!) }}. 
                      @if (formChemical()!.itemsPerUnit > 1 && formData().quantity > 0) {
                        <span class="font-bold text-blue-600">Tổng: {{ formData().quantity * formChemical()!.itemsPerUnit }} {{ formChemical()!.subItemName }}</span>
                      }
                    </p>
                 }
               </div>

               <!-- Expiry Date -->
               <div>
                 <label class="block text-sm font-bold text-gray-700 mb-2">Ngày hết hạn @if (formChemical()?.requiresLotAndExpiry !== false) { <span class="text-red-500">*</span> }</label>
                 <input type="date" [ngModel]="formData().expiryDate" (ngModelChange)="updateFormData('expiryDate', $event)" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none bg-gray-50 focus:bg-white transition-all">
               </div>

               <!-- Notes -->
               <div class="md:col-span-2">
                 <label class="block text-sm font-bold text-gray-700 mb-2">Ghi chú</label>
                 <textarea [ngModel]="formData().notes" (ngModelChange)="updateFormData('notes', $event)" rows="2" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none bg-gray-50 focus:bg-white transition-all" placeholder="Thêm ghi chú nếu cần..."></textarea>
               </div>
             </div>
          </div>

          <div class="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-3xl">
             <button (click)="closeModal()" class="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-white hover:border-gray-300 transition-all">Hủy bỏ</button>
             <button (click)="saveItem()" class="px-6 py-3 rounded-xl bg-[#63C3C7] text-white font-bold hover:bg-[#55a8ac] shadow-lg shadow-[#63C3C7]/20 hover:shadow-[#63C3C7]/40 hover:-translate-y-0.5 transition-all">{{ isEditing() ? 'Lưu thay đổi' : 'Lưu Phiếu nhập' }}</button>
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
    @if (isDetailsModalOpen() && selectedReceipt()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-3xl transform transition-all scale-100 flex flex-col max-h-[90vh] overflow-hidden">
          <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div class="flex items-center gap-3">
               <div class="bg-[#63C3C7]/10 p-2 rounded-lg text-[#63C3C7]"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
               <h3 class="text-xl font-bold text-gray-800">Chi tiết Phiếu nhập</h3>
            </div>
            <button (click)="closeDetailsModal()" class="text-gray-400 hover:text-gray-600 transition-colors bg-gray-200 hover:bg-gray-300 rounded-full p-1">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div class="p-8 overflow-y-auto space-y-8">
            <!-- Chemical Details Section -->
            @if (selectedChemical(); as chemical) {
              <div>
                <h4 class="text-base font-bold text-[#63C3C7] uppercase tracking-wider mb-4">Thông tin Hóa chất</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 text-sm">
                    <div class="md:col-span-3 flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Tên Hóa chất</span>
                        <span class="font-semibold text-gray-800 text-lg mt-1">{{ chemical.name }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Kho lưu trữ</span>
                        <span class="font-semibold text-gray-800 text-base mt-1">{{ getWarehouseName(chemical.warehouseId) }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Hãng sản xuất</span>
                        <span class="font-semibold text-gray-800 text-base mt-1">{{ getManufacturerName(chemical.manufacturerId) }}</span>
                    </div>
                     <div class="md:col-span-3 flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Quy cách đóng gói</span>
                        <span class="font-semibold text-gray-800 text-base mt-1">{{ formatPackaging(chemical) }} / {{getUnitName(chemical.unitId)}}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Tồn kho hiện tại</span>
                        <span class="font-bold text-blue-600 text-base mt-1">{{ chemical.currentStock }} {{ getUnitName(chemical.unitId) }}</span>
                    </div>
                </div>
              </div>
            }
            
            <!-- Divider -->
            <div class="border-t border-gray-200 border-dashed"></div>

            <!-- Receipt Details Section -->
            <div>
                <h4 class="text-base font-bold text-[#63C3C7] uppercase tracking-wider mb-4">Thông tin Giao dịch Nhập kho</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 text-sm">
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Ngày nhập</span>
                        <span class="font-semibold text-gray-800 text-base mt-1">{{ formatDate(selectedReceipt()!.receiptDate) }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Số lượng nhập</span>
                        <span class="font-bold text-green-600 text-base mt-1">
                          + {{ selectedReceipt()!.quantity }} {{ getUnitName(selectedChemical()!.unitId) }}
                          @if(selectedChemical()!.itemsPerUnit > 1) {
                            <span class="text-sm font-normal text-gray-500">({{ selectedReceipt()!.quantity * selectedChemical()!.itemsPerUnit }} {{ selectedChemical()!.subItemName }})</span>
                          }
                        </span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Số Lot</span>
                        <span class="font-mono text-gray-800 text-base mt-1">{{ selectedReceipt()!.lotNumber || '---' }}</span>
                    </div>
                     <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Ngày hết hạn</span>
                        <span class="font-semibold text-gray-800 text-base mt-1">{{ formatDate(selectedReceipt()!.expiryDate) }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Người tạo phiếu</span>
                        <span class="font-semibold text-gray-800 text-base mt-1">{{ selectedReceipt()!.createdBy }}</span>
                    </div>
                     <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Thời gian tạo</span>
                        <span class="font-semibold text-gray-800 text-base mt-1">{{ formatDateTime(selectedReceipt()!.createdDate) }}</span>
                    </div>

                     <div class="md:col-span-3 flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Ghi chú</span>
                        <p class="text-gray-700 mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 min-h-[60px]">
                            {{ selectedReceipt()!.notes || 'Không có ghi chú.' }}
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
                        <span class="font-semibold text-gray-800 text-base mt-1">{{ selectedReceipt()!.createdBy || '---' }}</span>
                        <span class="text-xs text-gray-400 mt-0.5">{{ formatDateTime(selectedReceipt()!.createdDate) }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-400 uppercase">Sửa lần cuối</span>
                        @if (selectedReceipt()!.lastModifiedBy) {
                            <span class="font-semibold text-orange-600 text-base mt-1">{{ selectedReceipt()!.lastModifiedBy }}</span>
                            <span class="text-xs text-gray-400 mt-0.5">{{ formatDateTime(selectedReceipt()!.lastModifiedDate!) }}</span>
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
  `
})
export class GoodsReceiptComponent {
  dataService = inject(DataService);
  authService = inject(AuthService);

  receipts = this.dataService.goodsReceipts;
  warehouses = this.dataService.warehouses;
  chemicals = this.dataService.chemicals;
  manufacturers = this.dataService.manufacturers;
  
  currentPage = signal(1);
  itemsPerPage = 10;
  
  isModalOpen = false;
  isEditing = signal(false);
  isDetailsModalOpen = signal(false);
  selectedReceipt = signal<GoodsReceipt | null>(null);
  
  filterWarehouseId = signal('');
  filterDate = signal(today);

  formData = signal<any>(this.resetFormData());
  

  selectedChemical = computed(() => {
    const receipt = this.selectedReceipt();
    if (!receipt) return null;
    return this.getChemical(receipt.chemicalId);
  });

  formChemical = computed(() => {
    const chemicalId = this.formData().chemicalId;
    if (!chemicalId) return null;
    return this.getChemical(chemicalId);
  });

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
    return this.authService.hasPermission('canEditReceipt');
  }

  get canDelete() {
    return this.authService.hasPermission('canDeleteReceipt');
  }

  availableChemicals = computed(() => {
    const whId = this.formData().warehouseId;
    if (!whId) return [];
    return this.chemicals().filter(c => c.warehouseId === whId);
  });

  allReceiptsSorted = computed(() => {
    let list = this.receipts();
    
    if (this.filterWarehouseId()) {
      list = list.filter(r => r.warehouseId === this.filterWarehouseId());
    }
    if (this.filterDate()) {
      list = list.filter(r => {
        if (!r.receiptDate) return false;
        const dObj = new Date(r.receiptDate);
        const localYMD = dObj.getFullYear() + '-' + String(dObj.getMonth() + 1).padStart(2, '0') + '-' + String(dObj.getDate()).padStart(2, '0');
        // Handle case where receiptDate might just be YYYY-MM-DD
        const storedYMD = r.receiptDate.length === 10 ? r.receiptDate : localYMD;
        return storedYMD === this.filterDate();
      });
    }
    
    return list.sort((a, b) => new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime());
  });
  
  paginatedReceipts = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.allReceiptsSorted().slice(start, start + this.itemsPerPage);
  });

  totalPages = computed(() => {
    const total = Math.ceil(this.allReceiptsSorted().length / this.itemsPerPage);
    return total === 0 ? 1 : total;
  });

  resetFilters() {
    this.filterWarehouseId.set('');
    this.filterDate.set(getLocalToday());
    this.currentPage.set(1);
  }

  get startItemIndex() {
    if (this.allReceiptsSorted().length === 0) return 0;
    return (this.currentPage() - 1) * this.itemsPerPage + 1;
  }

  get endItemIndex() {
    return Math.min(this.currentPage() * this.itemsPerPage, this.allReceiptsSorted().length);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  getWarehouseName(id: string) {
    return this.warehouses().find(w => w.id === id)?.name || '---';
  }
  getChemical(id: string): Chemical | null {
    return this.chemicals().find(c => c.id === id) || null;
  }
  getManufacturerName(id: string) {
    return this.manufacturers().find(m => m.id === id)?.name || '---';
  }
  getUnitName(unitId: string | undefined) {
    return this.dataService.getUnitName(unitId);
  }

  // Helper: Tính toán chi tiết số lượng, dùng chung logic trong DataService
  getQuantityDetail(item: GoodsReceipt): string {
    const chem = this.getChemical(item.chemicalId);
    if (!chem) return '';
    return this.dataService.getStockDetail(chem, item.quantity);
  }

  formatDate(d: string) {
    if (!d) return '---';
    return new Date(d).toLocaleDateString('vi-VN');
  }

  formatPackaging(item: Chemical) {
    return this.dataService.formatPackaging(item);
  }

  formatDateTime(d: string) {
    if (!d) return '---';
    return new Date(d).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '');
  }
  
  resetFormData() {
    return {
      id: '',
      receiptDate: getLocalToday(),
      warehouseId: '',
      chemicalId: '',
      entryType: 'manual' as const,
      qrCode: '',
      lotNumber: '',
      quantity: 1,
      expiryDate: '',
      notes: '',
    };
  }

  openAddModal() {
    this.isEditing.set(false);
    this.formData.set(this.resetFormData());
    this.isModalOpen = true;
  }

  editItem(item: GoodsReceipt) {
    this.isEditing.set(true);
    const formattedItem = {
      ...item,
      receiptDate: getLocalDateString(item.receiptDate),
      expiryDate: getLocalDateString(item.expiryDate)
    };
    this.formData.set(formattedItem);
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  viewItemDetails(item: GoodsReceipt) {
    this.selectedReceipt.set(item);
    this.isDetailsModalOpen.set(true);
  }

  closeDetailsModal() {
    this.isDetailsModalOpen.set(false);
    this.selectedReceipt.set(null);
  }
  
  updateFormData(field: string, value: any) {
    this.formData.update(d => ({ ...d, [field]: value }));
  }

  onWarehouseChange(warehouseId: string) {
    this.formData.update(current => ({
      ...current,
      warehouseId: warehouseId,
      chemicalId: '' // Reset chemical selection
    }));
  }
  

  saveItem() {
    const currentData = this.formData();
    const currentChemical = this.formChemical();
    
    // Check validation chung
    const requiresLotAndExpiry = currentChemical ? currentChemical.requiresLotAndExpiry !== false : true;

    if (
      !currentData.receiptDate || 
      !currentData.warehouseId || 
      !currentData.chemicalId || 
      currentData.quantity <= 0 ||
      (requiresLotAndExpiry && (!currentData.lotNumber || !currentData.expiryDate))
    ) {
      this.showErrorAlert('Lỗi nhập liệu', 'Vui lòng điền đủ thông tin bắt buộc và số lượng phải lớn hơn 0.');
      return;
    }



    if (this.isEditing()) {
      this.dataService.updateGoodsReceipt({
        ...currentData,
        lastModifiedBy: this.authService.currentUser()?.name || 'Unknown',
        lastModifiedDate: new Date().toISOString()
      });
    } else {
      this.dataService.addGoodsReceipt({
        ...currentData,
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
          title: 'Hủy Phiếu Nhập',
          message: 'Bạn có chắc chắn muốn hủy phiếu nhập này? Hàng hóa sẽ bị trừ khỏi tồn kho.',
          itemToDeleteId: id
      });
  }

  confirmDeleteItem() {
      const id = this.modalState().itemToDeleteId;
      if (id) {
          this.dataService.deleteGoodsReceipt(id);
      }
      this.closeConfirmationModal();
  }

  closeConfirmationModal() {
      this.modalState.set({ isOpen: false, type: 'confirm', title: '', message: '', itemToDeleteId: null });
  }

  showErrorAlert(title: string, message: string) {
      this.modalState.set({ isOpen: true, type: 'error', title: title, message: message, itemToDeleteId: null });
  }
}
