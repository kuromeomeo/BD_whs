import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Chemical } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-chemical-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h2 class="text-3xl font-bold text-gray-800 tracking-tight">Danh sách Hóa chất</h2>
           <p class="text-gray-500 mt-1">Quản lý và theo dõi toàn bộ hóa chất, vật tư trong kho.</p>
        </div>
        
        @if (isAdmin || authService.hasPermission('canAddChemical')) {
          <button (click)="openAddModal()" class="inline-flex items-center px-6 py-3 bg-[#63C3C7] hover:bg-[#55a8ac] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#63C3C7]/30 hover:shadow-[#63C3C7]/50 hover:-translate-y-0.5 active:translate-y-0">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            Thêm mới
          </button>
        }
      </div>

      <!-- Filters -->
      <div class="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-center max-w-md">
         <div class="relative flex-1">
            <svg class="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
            <select [ngModel]="selectedWarehouseId()" (ngModelChange)="onFilterWarehouse($event)" 
                   class="w-full pl-12 pr-10 py-3 rounded-xl border-none focus:ring-0 text-gray-700 bg-transparent outline-none cursor-pointer appearance-none font-medium">
               <option value="">-- Lọc theo tất cả các kho --</option>
               @for (w of warehouses(); track w.id) {
                   <option [value]="w.id">{{ w.name }}</option>
               }
            </select>
            <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
         </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th class="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Thông tin Hóa chất</th>
                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Kho lưu trữ</th>
                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Đặc tính</th>
                <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Tồn đầu</th>
                <th class="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (item of paginatedChemicals(); track item.id) {
                <tr class="hover:bg-blue-50/30 transition-colors group">
                  <td class="px-8 py-5">
                    <div class="flex items-center gap-4">
                      <div>
                        <div class="font-bold text-gray-800 text-base">{{ item.name }}</div>
                        <div class="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          {{ formatDate(item.createdDate) }} • {{ item.createdBy }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-5 hidden md:table-cell">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                      {{ getWarehouseName(item.warehouseId) }}
                    </span>
                  </td>
                  <td class="px-6 py-5 hidden md:table-cell">
                    <div class="text-sm text-gray-600"><span class="text-gray-400 text-xs uppercase mr-1">SX:</span> {{ getManufacturerName(item.manufacturerId) }}</div>
                    <div class="text-sm text-gray-600 mt-1"><span class="text-gray-400 text-xs uppercase mr-1">Quy cách:</span> {{ formatPackaging(item) }}</div>
                  </td>
                  <td class="px-6 py-5 text-right">
                    <div class="font-bold text-[#63C3C7] text-lg">{{ item.openingStock }}</div>
                    <div class="text-xs text-gray-400 lowercase mb-1">{{ getUnitName(item.unitId) }}</div>
                    
                    <!-- Chi tiết quy đổi Tồn đầu -->
                    @let detail = getStockDetail(item);
                    @if (detail) {
                      <div class="inline-block px-2 py-0.5 bg-gray-50 rounded border border-gray-100 text-xs text-gray-600 font-medium whitespace-nowrap">
                         {{ detail }}
                      </div>
                    }
                  </td>
                  <td class="px-8 py-5 text-center">
                    <div class="flex items-center justify-center gap-2">
                      @if (isAdmin) {
                        <button (click)="editItem(item)" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Chỉnh sửa">
                           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button (click)="openDeleteModal(item)" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Xóa bỏ">
                           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      } @else {
                        <span class="px-2 py-1 bg-gray-50 text-gray-400 text-xs rounded border border-gray-100">Read-only</span>
                      }
                    </div>
                  </td>
                </tr>
              }
              @if (paginatedChemicals().length === 0) {
                <tr>
                  <td colspan="7" class="px-6 py-12 text-center text-gray-400">
                    <div class="flex flex-col items-center">
                      <svg class="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <span class="font-medium">Không tìm thấy dữ liệu phù hợp</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (filteredChemicals().length > 0) {
          <div class="flex items-center justify-between px-8 py-5 bg-gray-50/50 border-t border-gray-100">
            <div class="flex flex-1 justify-between sm:hidden">
              <button (click)="prevPage()" [disabled]="currentPage() === 1" class="relative inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Trước</button>
              <button (click)="nextPage()" [disabled]="currentPage() === totalPages()" class="relative ml-3 inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Sau</button>
            </div>
            <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p class="text-sm text-gray-500">
                  Hiển thị <span class="font-bold text-gray-800">{{ startItemIndex }}</span> - <span class="font-bold text-gray-800">{{ endItemIndex }}</span> / <span class="font-bold text-gray-800">{{ filteredChemicals().length }}</span> kết quả
                </p>
              </div>
              <div>
                <nav class="isolate inline-flex -space-x-px rounded-xl shadow-sm" aria-label="Pagination">
                  <button (click)="prevPage()" [disabled]="currentPage() === 1" class="relative inline-flex items-center rounded-l-xl px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <span class="sr-only">Previous</span>
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" /></svg>
                  </button>
                  <div class="relative inline-flex items-center px-4 py-2 text-sm font-bold text-[#63C3C7] ring-1 ring-inset ring-gray-200 focus:outline-offset-0 bg-white">
                    {{ currentPage() }}
                  </div>
                  <button (click)="nextPage()" [disabled]="currentPage() === totalPages()" class="relative inline-flex items-center rounded-r-xl px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <span class="sr-only">Next</span>
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" /></svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Modal Form -->
    @if (isModalOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-3xl transform transition-all scale-100 flex flex-col max-h-[90vh] overflow-hidden">
          <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-[#63C3C7] to-[#4FA8AC] text-white">
            <div class="flex items-center gap-3">
               <div class="bg-white/20 p-2 rounded-lg"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></div>
               <h3 class="text-xl font-bold">{{ isEditing ? 'Cập nhật Hóa chất' : 'Thêm mới Hóa chất' }}</h3>
            </div>
            <button (click)="closeModal()" class="text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-1">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div class="p-8 overflow-y-auto space-y-6">
             <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
               <!-- Name -->
               <div class="md:col-span-2">
                 <label class="block text-sm font-bold text-gray-700 mb-2">Tên hóa chất / Vật tư <span class="text-red-500">*</span></label>
                 <input type="text" [(ngModel)]="formData.name" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none bg-gray-50 focus:bg-white transition-all" placeholder="Nhập tên hóa chất...">
               </div>

               <!-- Warehouse -->
               <div>
                 <label class="block text-sm font-bold text-gray-700 mb-2">Kho lưu trữ <span class="text-red-500">*</span></label>
                 <select [(ngModel)]="formData.warehouseId" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none appearance-none bg-gray-50 focus:bg-white transition-all">
                   <option value="" disabled>Chọn kho</option>
                   @for (w of warehouses(); track w.id) { <option [value]="w.id">{{ w.name }}</option> }
                 </select>
               </div>

                <!-- Manufacturer -->
               <div>
                 <label class="block text-sm font-bold text-gray-700 mb-2">Hãng sản xuất</label>
                 <select [(ngModel)]="formData.manufacturerId" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none appearance-none bg-gray-50 focus:bg-white transition-all">
                    <option value="" disabled>Chọn hãng</option>
                    @for (m of manufacturers(); track m.id) { <option [value]="m.id">{{ m.name }}</option> }
                 </select>
               </div>

               <!-- Low Stock Threshold -->
               <div>
                 <label class="block text-sm font-bold text-gray-700 mb-2">Ngưỡng cảnh báo tồn kho</label>
                 <div class="relative">
                     <input type="number" [(ngModel)]="formData.lowStockThreshold" class="w-full pl-4 pr-16 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none bg-gray-50 focus:bg-white transition-all" min="0" placeholder="0">
                     <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400 text-sm">
                         đơn vị
                     </div>
                 </div>
               </div>

               <!-- Classification / Requires Lot & Expiry -->
               <div class="md:col-span-2 mt-2">
                 <label class="flex items-center gap-3 p-3 bg-gray-50/70 border border-gray-200/50 rounded-xl cursor-pointer hover:bg-gray-100/70 transition-all">
                   <div class="relative flex items-center justify-center">
                     <input type="checkbox" [(ngModel)]="formData.requiresLotAndExpiry" class="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded cursor-pointer checked:bg-[#63C3C7] checked:border-[#63C3C7] transition-all">
                     <svg class="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                   </div>
                   <div>
                     <span class="text-sm font-bold text-gray-700">Yêu cầu quản lý theo Số Lot & Hạn sử dụng (Là Hóa chất)</span>
                     <p class="text-xs text-gray-500 mt-0.5">Bỏ chọn nếu đây chỉ là vật tư tiêu hao thông thường không cần theo dõi Hạn sử dụng lúc nhập kho.</p>
                   </div>
                 </label>
               </div>
             </div>

             <div class="space-y-4 p-4 bg-gray-50/70 rounded-xl border border-gray-200/50">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                   <h4 class="text-sm font-bold text-gray-600">Thông tin quy cách đóng gói</h4>
                   <div class="flex items-center gap-4 text-sm bg-white px-3 py-1.5 rounded-lg border border-gray-200/60 shadow-sm">
                      <label class="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                         <input type="radio" name="packType" [(ngModel)]="formData.packagingType" value="basic" class="w-4 h-4 text-[#63C3C7] focus:ring-[#63C3C7] border-gray-300">
                         <span class="text-gray-600 font-medium">Cơ bản</span>
                      </label>
                      <label class="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                         <input type="radio" name="packType" [(ngModel)]="formData.packagingType" value="subunit" class="w-4 h-4 text-[#63C3C7] focus:ring-[#63C3C7] border-gray-300">
                         <span class="text-gray-600 font-medium">Đơn vị con</span>
                      </label>
                      <label class="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                         <input type="radio" name="packType" [(ngModel)]="formData.packagingType" value="volume" class="w-4 h-4 text-[#63C3C7] focus:ring-[#63C3C7] border-gray-300">
                         <span class="text-gray-600 font-medium">Có thể tích</span>
                      </label>
                   </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-4 items-start">
                    <!-- Unit -->
                    <div [class.lg:col-span-5]="formData.packagingType === 'basic'" [class.lg:col-span-1]="formData.packagingType !== 'basic'">
                      <label class="block text-xs font-bold text-gray-500 mb-1">Quy cách đóng gói <span class="text-red-500">*</span></label>
                      <select [(ngModel)]="formData.unitId" class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#63C3C7]/20 focus:border-[#63C3C7] outline-none text-sm bg-white">
                          <option value="" disabled>Chọn ĐVT</option>
                          @for (u of units(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                      </select>
                    </div>

                    @if (formData.packagingType === 'subunit' || formData.packagingType === 'volume') {
                      <!-- Items Per Unit -->
                      <div [class.lg:col-span-2]="formData.packagingType === 'subunit'" [class.lg:col-span-1]="formData.packagingType === 'volume'">
                        <label class="block text-xs font-bold text-gray-500 mb-1">Số lượng con</label>
                        <input type="number" [(ngModel)]="formData.itemsPerUnit" class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#63C3C7]/20 focus:border-[#63C3C7] outline-none text-sm bg-white" placeholder="VD: 10">
                      </div>
                      <!-- Sub Item Name (Select) -->
                      <div [class.lg:col-span-2]="formData.packagingType === 'subunit'" [class.lg:col-span-1]="formData.packagingType === 'volume'">
                        <label class="block text-xs font-bold text-gray-500 mb-1">Đơn vị con</label>
                        <select [(ngModel)]="formData.subItemName" class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#63C3C7]/20 focus:border-[#63C3C7] outline-none text-sm bg-white">
                           <option value="" disabled>Chọn ĐV Con</option>
                           @for (su of subUnits(); track su.id) { <option [value]="su.name">{{ su.name }}</option> }
                        </select>
                      </div>
                    }

                    @if (formData.packagingType === 'volume') {
                      <!-- Volume Per Sub Item -->
                      <div>
                        <label class="block text-xs font-bold text-gray-500 mb-1">Thể tích</label>
                        <input type="number" [(ngModel)]="formData.volumePerSubItem" class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#63C3C7]/20 focus:border-[#63C3C7] outline-none text-sm bg-white" placeholder="VD: 4">
                      </div>
                      <!-- Volume Unit (Select) -->
                      <div>
                        <label class="block text-xs font-bold text-gray-500 mb-1">Đơn vị thể tích</label>
                        <select [(ngModel)]="formData.volumeUnit" class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#63C3C7]/20 focus:border-[#63C3C7] outline-none text-sm bg-white">
                           <option value="" disabled>Chọn ĐV TT</option>
                           @for (vu of volumeUnits(); track vu.id) { <option [value]="vu.name">{{ vu.name }}</option> }
                        </select>
                      </div>
                    }
                </div>
             </div>
             
             <!-- Opening Stock Section with Lot Info -->
             <div class="grid grid-cols-1 md:grid-cols-3 gap-6 bg-blue-50/30 p-4 rounded-xl border border-blue-100/50">
                <!-- Opening Stock (Enabled for Edit) -->
               <div>
                 <label class="block text-sm font-bold text-gray-700 mb-2">Tồn đầu</label>
                 <input type="number" [(ngModel)]="formData.openingStock" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none bg-white focus:bg-white transition-all" placeholder="0">
               </div>

               <!-- Lot Number (Always visible for editing) -->
               <div>
                 <label class="block text-sm font-bold text-gray-700 mb-2">Số Lot / Batch</label>
                 <input type="text" [(ngModel)]="formData.lotNumber" [disabled]="!formData.openingStock || formData.openingStock <= 0" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none bg-white focus:bg-white transition-all disabled:opacity-50 disabled:bg-gray-100" placeholder="Số lô...">
               </div>
               
               <!-- Expiry Date (Always visible for editing) -->
               <div>
                 <label class="block text-sm font-bold text-gray-700 mb-2">Hạn sử dụng</label>
                 <input type="date" [(ngModel)]="formData.expiryDate" [disabled]="!formData.openingStock || formData.openingStock <= 0" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none bg-white focus:bg-white transition-all disabled:opacity-50 disabled:bg-gray-100">
               </div>

               @if(isEditing) { 
                   <div class="md:col-span-3">
                        <p class="text-xs text-blue-500 mt-1.5 flex items-center">
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Lưu ý: Thay đổi Tồn đầu, Số Lot hoặc Hạn sử dụng sẽ cập nhật dữ liệu kho hiện tại.
                        </p> 
                   </div>
               } @else {
                    <div class="md:col-span-3">
                        <p class="text-xs text-gray-500 mt-1 flex items-center">
                            * Nhập số Lot và Hạn sử dụng cho tồn đầu sẽ tự động tạo phiếu nhập kho để có thể xuất hàng ngay.
                        </p> 
                    </div>
               }
             </div>
             
             <!-- Readonly Info -->
             @if (isEditing) {
               <div class="bg-blue-50/50 p-4 rounded-xl text-sm text-gray-600 flex justify-between border border-blue-100">
                 <span><span class="font-semibold">Ngày tạo:</span> {{ formatDate(formData.createdDate) }}</span>
                 <span><span class="font-semibold">Người tạo:</span> {{ formData.createdBy }}</span>
               </div>
             }
          </div>

          <div class="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-3xl">
             <button (click)="closeModal()" class="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-white hover:border-gray-300 transition-all">Hủy bỏ</button>
             <button (click)="saveItem()" class="px-6 py-3 rounded-xl bg-[#63C3C7] text-white font-bold hover:bg-[#55a8ac] shadow-lg shadow-[#63C3C7]/20 hover:shadow-[#63C3C7]/40 hover:-translate-y-0.5 transition-all">Lưu dữ liệu</button>
          </div>
        </div>
      </div>
    }

    <!-- Delete Confirmation Modal -->
    @if (deleteModalOpen()) {
       <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md transform transition-all scale-100 border border-gray-100 p-8">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-full bg-red-50 flex-shrink-0 flex items-center justify-center text-red-500">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <div class="flex-1">
              <h3 class="text-xl font-bold text-gray-800">Xác nhận Xóa</h3>
              <p class="text-gray-500 mt-2">Bạn có chắc chắn muốn xóa hóa chất <span class="font-bold text-gray-800">{{ itemToDelete()?.name }}</span>? Hành động này không thể hoàn tác và có thể ảnh hưởng đến lịch sử kho.</p>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-8">
            <button (click)="closeDeleteModal()" class="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all">Hủy bỏ</button>
            <button (click)="confirmDelete()" class="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 hover:-translate-y-0.5 transition-all">Xác nhận Xóa</button>
          </div>
        </div>
      </div>
    }
    
    <!-- Error/Warning Modal -->
    @if (errorModalOpen()) {
       <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md transform transition-all scale-100 border border-gray-100 p-8">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-full bg-orange-50 flex-shrink-0 flex items-center justify-center text-orange-500">
               <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div class="flex-1">
              <h3 class="text-xl font-bold text-gray-800">Không thể xóa!</h3>
              <p class="text-gray-500 mt-2">{{ errorMessage() }}</p>
            </div>
          </div>
          <div class="flex justify-end mt-8">
            <button (click)="closeErrorModal()" class="px-6 py-2.5 rounded-xl bg-[#63C3C7] text-white font-bold hover:bg-[#55a8ac] shadow-lg shadow-[#63C3C7]/20 transition-all">Đã hiểu</button>
          </div>
        </div>
      </div>
    }
  `
})
export class ChemicalListComponent {
  dataService = inject(DataService);
  authService = inject(AuthService);

  warehouses = this.dataService.warehouses;
  units = this.dataService.units;
  manufacturers = this.dataService.manufacturers;
  subUnits = this.dataService.subUnits;
  volumeUnits = this.dataService.volumeUnits;
  
  selectedWarehouseId = signal('');
  currentPage = signal(1);
  itemsPerPage = 10;
  
  isModalOpen = false;
  isEditing = false;
  
  // Delete Modal State
  deleteModalOpen = signal(false);
  itemToDelete = signal<{id: string, name: string} | null>(null);

  // Error Modal State
  errorModalOpen = signal(false);
  errorMessage = signal('');

  // Form Data
  formData: any = this.resetFormData();

  get isAdmin() {
    return this.authService.currentUser()?.role === 'admin';
  }

  resetFormData() {
    return {
      id: '',
      warehouseId: '',
      name: '',
      manufacturerId: '',
      unitId: '',
      packagingType: 'basic',
      itemsPerUnit: 1,
      subItemName: this.subUnits()[0]?.name || '', // Default to first available option
      volumePerSubItem: 1,
      volumeUnit: this.volumeUnits()[0]?.name || '', // Default to first available option
      openingStock: 0,
      currentStock: 0,
      lowStockThreshold: 10, // Default to 10
      requiresLotAndExpiry: true, // Default: Hóa chất
      lotNumber: '', // Added for initialization
      expiryDate: '', // Added for initialization
      createdDate: '',
      createdBy: ''
    };
  }

  filteredChemicals = computed(() => {
    const whId = this.selectedWarehouseId();
    if (!whId) return this.dataService.chemicals();
    return this.dataService.chemicals().filter(c => c.warehouseId === whId);
  });

  paginatedChemicals = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredChemicals().slice(start, start + this.itemsPerPage);
  });

  totalPages = computed(() => {
    const total = Math.ceil(this.filteredChemicals().length / this.itemsPerPage);
    return total === 0 ? 1 : total;
  });

  get startItemIndex() {
    if (this.filteredChemicals().length === 0) return 0;
    return (this.currentPage() - 1) * this.itemsPerPage + 1;
  }

  get endItemIndex() {
    return Math.min(this.currentPage() * this.itemsPerPage, this.filteredChemicals().length);
  }

  onFilterWarehouse(id: string) {
    this.selectedWarehouseId.set(id);
    this.currentPage.set(1);
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
  getUnitName(id: string) {
    return this.units().find(u => u.id === id)?.name || '---';
  }
  getManufacturerName(id: string) {
    return this.manufacturers().find(m => m.id === id)?.name || '---';
  }

  // Helper tính toán chi tiết Tồn đầu (theo đơn vị con, thể tích)
  getStockDetail(c: Chemical): string {
    const parts = [];

    // Tính tổng số lượng đơn vị con dựa trên Tồn đầu (openingStock)
    if (c.itemsPerUnit > 1) {
      const totalSub = c.openingStock * c.itemsPerUnit;
      parts.push(`${totalSub.toLocaleString('vi-VN')} ${c.subItemName}`);
    }

    // Tính tổng thể tích thực dựa trên Tồn đầu
    if (c.volumePerSubItem > 0 && c.volumeUnit && c.volumeUnit !== 'N/A') {
       const totalVol = c.openingStock * c.itemsPerUnit * c.volumePerSubItem;
       parts.push(`${totalVol.toLocaleString('vi-VN')} ${c.volumeUnit}`);
    }

    return parts.join(' • ');
  }

  formatDate(d: string) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('vi-VN');
  }

  formatPackaging(item: Chemical) {
    if (item.itemsPerUnit > 1 && item.subItemName) {
      return `${item.itemsPerUnit} ${item.subItemName} × ${item.volumePerSubItem}${item.volumeUnit}`;
    }
    return `${item.volumePerSubItem}${item.volumeUnit} / ${this.getUnitName(item.unitId)}`;
  }

  openAddModal() {
    this.isEditing = false;
    this.formData = {
      ...this.resetFormData(),
      warehouseId: this.warehouses()[0]?.id || '',
      manufacturerId: this.manufacturers()[0]?.id || '',
      unitId: this.units()[0]?.id || '',
      packagingType: 'basic',
      subItemName: this.subUnits()[0]?.name || '',
      volumeUnit: this.volumeUnits()[0]?.name || ''
    };
    this.isModalOpen = true;
  }

  editItem(item: Chemical) {
    this.isEditing = true;
    this.formData = { ...item };
    
    // Determine packagingType based on existing data
    if (this.formData.volumePerSubItem > 0 && this.formData.volumeUnit && this.formData.volumeUnit !== 'N/A') {
      this.formData.packagingType = 'volume';
    } else if (this.formData.itemsPerUnit > 1 && this.formData.subItemName) {
      this.formData.packagingType = 'subunit';
    } else {
      this.formData.packagingType = 'basic';
    }

    if (this.formData.requiresLotAndExpiry === undefined) {
      this.formData.requiresLotAndExpiry = true; // Backward compatibility for old records
    }
    
    // Tìm phiếu nhập Tồn đầu để điền dữ liệu Lot/Expiry
    const openingReceipt = this.dataService.goodsReceipts().find(r => 
        r.chemicalId === item.id && r.notes === 'Nhập tự động từ Tồn đầu kỳ'
    );
    
    if (openingReceipt) {
        this.formData.lotNumber = openingReceipt.lotNumber;
        this.formData.expiryDate = openingReceipt.expiryDate ? openingReceipt.expiryDate.split('T')[0] : '';
    } else {
         this.formData.lotNumber = '';
         this.formData.expiryDate = '';
    }
    
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  showErrorAlert(msg: string) {
      this.errorMessage.set(msg);
      this.errorModalOpen.set(true);
  }

  saveItem() {
    if (!this.formData.name || !this.formData.warehouseId || !this.formData.unitId) {
      this.showErrorAlert('Vui lòng điền đủ thông tin bắt buộc (Tên, Kho, Quy cách)');
      return;
    }

    // Process dependent fields based on packagingType to ensure clean data
    if (this.formData.packagingType === 'basic') {
       this.formData.itemsPerUnit = 1;
       this.formData.subItemName = '';
       this.formData.volumePerSubItem = 0;
       this.formData.volumeUnit = '';
    } else if (this.formData.packagingType === 'subunit') {
       this.formData.volumePerSubItem = 0;
       this.formData.volumeUnit = '';
    }

    if (this.isEditing) {
      // Logic xử lý khi sửa Tồn đầu: Cập nhật phiếu nhập kho và Tồn kho hiện tại
      
      // 1. Cập nhật phiếu nhập Tồn đầu (nếu có)
      const openingReceipt = this.dataService.goodsReceipts().find(r => 
        r.chemicalId === this.formData.id && r.notes === 'Nhập tự động từ Tồn đầu kỳ'
      );
      
      if (openingReceipt) {
           // Cập nhật phiếu nhập (Service sẽ tự động tính lại tồn kho dựa trên sự thay đổi số lượng)
           this.dataService.updateGoodsReceipt({
               ...openingReceipt,
               quantity: this.formData.openingStock,
               lotNumber: this.formData.lotNumber,
               expiryDate: this.formData.expiryDate
           });
           
           // Đồng bộ currentStock từ service về formData để tránh ghi đè sai khi gọi updateChemical
           const updatedChem = this.dataService.chemicals().find(c => c.id === this.formData.id);
           if (updatedChem) {
               this.formData.currentStock = updatedChem.currentStock;
           }
      } else {
           // Fallback logic cũ nếu không tìm thấy phiếu nhập (dữ liệu cũ)
           const originalItem = this.dataService.chemicals().find(c => c.id === this.formData.id);
           if (originalItem) {
              const diff = this.formData.openingStock - originalItem.openingStock;
              this.formData.currentStock = originalItem.currentStock + diff;
              if (this.formData.currentStock < 0) this.formData.currentStock = 0;
           }
      }
      
      // 2. Cập nhật thông tin cơ bản
      this.dataService.updateChemical(this.formData.id, this.formData);
    } else {
      // Thêm mới
      this.dataService.addChemical({
        ...this.formData,
        createdDate: new Date().toISOString(),
        createdBy: this.authService.currentUser()?.name || 'Unknown'
      }, {
        number: this.formData.lotNumber,
        expiry: this.formData.expiryDate
      });
    }
    this.closeModal();
  }

  openDeleteModal(item: Chemical) {
     this.itemToDelete.set({id: item.id, name: item.name});
     this.deleteModalOpen.set(true);
  }

  confirmDelete() {
     const item = this.itemToDelete();
     if (item) {
        try {
          this.dataService.deleteChemical(item.id);
          this.closeDeleteModal();
        } catch (e: any) {
          // Xử lý lỗi từ Service (Vd: Ràng buộc khóa ngoại)
          this.closeDeleteModal();
          this.errorMessage.set(e.message);
          this.errorModalOpen.set(true);
        }
     }
  }

  closeDeleteModal() {
     this.deleteModalOpen.set(false);
     this.itemToDelete.set(null);
  }

  closeErrorModal() {
      this.errorModalOpen.set(false);
      this.errorMessage.set('');
  }
}