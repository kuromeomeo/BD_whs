
import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService} from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { Chemical } from '../../core/models/chemical.model';
import { GoodsReceipt } from '../../core/models/goods-receipt.model';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h2 class="text-3xl font-bold text-gray-800 tracking-tight">Tồn kho</h2>
           <p class="text-gray-500 mt-1">Theo dõi số lượng hóa chất / vật tư và chi tiết theo Lot.</p>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <!-- Warehouse Filter -->
            <div class="relative min-w-[200px]">
                <select [ngModel]="selectedWarehouseId()" (ngModelChange)="selectedWarehouseId.set($event)" 
                        class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#63C3C7]/30 focus:border-[#63C3C7] outline-none bg-white text-gray-700 font-bold cursor-pointer appearance-none shadow-sm">
                    <option value="">Tất cả kho</option>
                    @for (w of warehouses(); track w.id) {
                        <option [value]="w.id">{{ w.name }}</option>
                    }
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>

            <!-- Tabs -->
            <div class="bg-gray-100 p-1.5 rounded-xl flex whitespace-nowrap overflow-x-auto">
              <button (click)="activeTab.set('total')"
                      class="flex-1 px-6 py-2 text-sm font-bold rounded-lg transition-all"
                      [class]="activeTab() === 'total' ? 'bg-white text-[#63C3C7] shadow-sm' : 'text-gray-500 hover:text-gray-800'">
                Tồn kho tổng
              </button>
              <button (click)="activeTab.set('lot')"
                      class="flex-1 px-6 py-2 text-sm font-bold rounded-lg transition-all"
                      [class]="activeTab() === 'lot' ? 'bg-white text-[#63C3C7] shadow-sm' : 'text-gray-500 hover:text-gray-800'">
                Tồn kho theo Lot
              </button>
            </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="bg-white rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col min-h-[400px]">
        
        <!-- VIEW: TOTAL STOCK -->
        @if (activeTab() === 'total') {
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead class="bg-gray-50/50 border-b border-gray-100">
                <tr>
                   <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Tên Hóa chất</th>
                   <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Hạn sử dụng (Gần nhất)</th>
                   <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Kho</th>
                   <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Số lượng tồn</th>
                   <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center hidden md:table-cell">ĐVT Chính</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (c of filteredChemicals(); track c.id) {
                  <tr class="hover:bg-blue-50/30 transition-colors cursor-pointer" (click)="toggleLotDetails(c.id)" [class.bg-blue-50]="expandedLot() === c.id">
                    <td class="px-6 py-5">
                        <div class="font-bold text-gray-800">{{ c.name }}</div>
                        <div class="text-xs text-gray-400 mt-0.5">SX: {{ getManufacturerName(c.manufacturerId) }}</div>
                    </td>
                    
                    <!-- NEW COLUMN: NEAREST EXPIRY -->
                    <td class="px-6 py-5 text-sm hidden md:table-cell">
                        @if (c.requiresLotAndExpiry !== false) {
                            @let nearest = getNearestExpiryInfo(c);
                            @if (nearest) {
                                 {{ formatDate(nearest.expiryDate) }}
                                 @if (nearest.daysRemaining !== null) {
                                     <div class="text-[10px] mt-0.5" [class]="getExpiryColor(nearest.daysRemaining)">
                                         {{ getExpiryText(nearest.daysRemaining) }}
                                     </div>
                                 }
                            } @else {
                                 <span class="text-gray-300 text-xs italic">Chưa có thông tin</span>
                            }
                        } @else {
                             <span class="text-xs font-medium text-gray-400">Không quản lý HSD</span>
                        }
                    </td>

                    <td class="px-6 py-5 text-sm text-gray-600 hidden md:table-cell">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            {{ getWarehouseName(c.warehouseId) }}
                        </span>
                    </td>
                    <td class="px-6 py-5 text-right">
                       <!-- Low Stock Warning Logic -->
                       <div class="font-bold text-lg" [class.text-orange-500]="c.lowStockThreshold !== undefined && c.currentStock <= c.lowStockThreshold" [class.text-[#63C3C7]]="c.lowStockThreshold === undefined || c.currentStock > c.lowStockThreshold">
                          {{ formatStock(c.currentStock) }} <span class="text-sm font-normal text-gray-500">{{ getUnitName(c.unitId) }}</span>
                       </div>
                       @if (c.lowStockThreshold !== undefined && c.currentStock <= c.lowStockThreshold) {
                           <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-600 border border-orange-200 mt-1">
                                Tồn kho thấp (Dưới {{ c.lowStockThreshold }})
                           </span>
                       }

                       @let detail = getStockDetail(c, c.currentStock);
                       @if (detail) {
                         <div class="inline-block mt-1 px-2 py-0.5 bg-gray-50 rounded border border-gray-100 text-xs text-gray-600 font-medium whitespace-nowrap">
                             {{ detail }}
                         </div>
                       }
                    </td>
                    <td class="px-6 py-5 text-sm text-gray-600 text-center hidden md:table-cell">{{ getUnitName(c.unitId) }}</td>
                  </tr>
                  
                  <!-- SUB-TABLE: Lots for this chemical when expanded -->
                   @if (expandedLot() === c.id) {
                       <tr>
                           <td colspan="5" class="p-0 border-b border-gray-100 bg-gray-50/40">
                               <div class="px-6 md:px-12 py-6 max-h-[400px] overflow-y-auto custom-scrollbar shadow-inner">
                                   <h4 class="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                       <svg class="w-4 h-4 text-[#63C3C7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                       Chi tiết Lot của: <span class="text-[#63C3C7]">{{ c.name }}</span>
                                   </h4>
                                   <table class="w-full text-left bg-white rounded-xl shadow-sm overflow-hidden box-border border-collapse mt-2">
                                       <thead class="bg-gray-100/80 text-xs text-gray-500 uppercase tracking-wider">
                                           <tr>
                                               <th class="px-4 py-3 border-b border-gray-100 font-semibold rounded-tl-xl whitespace-nowrap">Số Lot</th>
                                               <th class="px-4 py-3 border-b border-gray-100 font-semibold whitespace-nowrap">Hạn sử dụng</th>
                                               <th class="px-4 py-3 border-b border-gray-100 font-semibold whitespace-nowrap">Nhập</th>
                                               <th class="px-4 py-3 border-b border-gray-100 font-semibold whitespace-nowrap">Đã xuất</th>
                                               <th class="px-4 py-3 border-b border-gray-100 font-semibold rounded-tr-xl whitespace-nowrap text-right">Tồn</th>
                                           </tr>
                                       </thead>
                                       <tbody class="divide-y divide-gray-50">
                                           @let chemLots = inventoryByLots().filter(l => l.chemicalId === c.id);
                                           @for(lot of chemLots; track lot.key) {
                                               <tr class="hover:bg-gray-50/50 transition-colors">
                                                   <td class="px-4 py-3 text-sm font-mono font-bold text-gray-700 whitespace-nowrap">{{ lot.lotNumber || '---' }}</td>
                                                   <td class="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{{ formatDate(lot.expiryDate) }}</td>
                                                   <td class="px-4 py-3 text-sm text-green-600 font-medium whitespace-nowrap">+{{ formatStock(lot.totalReceived) }}</td>
                                                   <td class="px-4 py-3 text-sm text-red-500 font-medium whitespace-nowrap">-{{ formatStock(lot.totalIssued) }}</td>
                                                   <td class="px-4 py-3 text-sm font-bold text-[#63C3C7] whitespace-nowrap text-right">{{ formatStock(lot.quantity) }} {{ lot.unitName }}</td>
                                               </tr>
                                           }
                                           @if(chemLots.length === 0) {
                                               <tr><td colspan="5" class="px-4 py-6 text-center text-gray-400 text-sm">Chưa có dữ liệu Lot cho hóa chất này.</td></tr>
                                           }
                                       </tbody>
                                   </table>
                               </div>
                           </td>
                       </tr>
                   }
                }
                @if (filteredChemicals().length === 0) {
                    <tr><td colspan="5" class="px-6 py-12 text-center text-gray-400">Không tìm thấy dữ liệu phù hợp với bộ lọc</td></tr>
                }
              </tbody>
            </table>
          </div>
        } 
        
        <!-- VIEW: STOCK BY LOT -->
        @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead class="bg-gray-50/50 border-b border-gray-100">
                <tr>
                   <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Số Lot / Batch</th>
                   <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Hóa chất</th>
                   <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Hạn sử dụng</th>
                   <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell text-center">T.Thái LOT</th>
                   <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Tồn Lot</th>
                   <th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center hidden md:table-cell">TRẠNG THÁI (HSD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (item of filteredInventoryByLots(); track item.key) {
                  <tr class="hover:bg-blue-50/30 transition-colors cursor-pointer" (click)="toggleLotDetails(item.key)" [class.bg-blue-50]="expandedLot() === item.key">
                    <td class="px-6 py-5">
                        <div class="font-mono text-sm font-bold text-gray-700">
                          {{ (item.chemicalRef.requiresLotAndExpiry !== false) ? (item.lotNumber || '---') : 'Không quản lý' }}
                        </div>
                        <div class="text-xs text-gray-400 mt-1">Kho: {{ item.warehouseName }}</div>
                    </td>
                    <td class="px-6 py-5">
                        <div class="font-bold text-gray-800">{{ item.chemicalName }}</div>
                        <div class="text-xs text-gray-500 mt-0.5">{{ item.packaging }}</div>
                    </td>
                    <td class="px-6 py-5 text-sm hidden md:table-cell">
                        @if (item.chemicalRef.requiresLotAndExpiry !== false) {
                          {{ formatDate(item.expiryDate) }}
                          @if (item.daysRemaining !== null) {
                              <div class="text-[10px] mt-0.5" [class]="getExpiryColor(item.daysRemaining)">
                                  {{ getExpiryText(item.daysRemaining) }}
                              </div>
                          }
                        } @else {
                           <span class="text-xs font-medium text-gray-400">Chưa xác định</span>
                        }
                    </td>
                    
                    <!-- LOT STATUS COLUMN -->
                    <td class="px-6 py-5 text-center align-middle hidden md:table-cell">
                        @if (item.requiresQC && item.chemicalRef.requiresLotAndExpiry !== false) {
                            @if (item.qcStatus === 'pending') {
                                <div class="flex flex-col items-center gap-1.5">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
                                    Chờ duyệt
                                    </span>
                                    @if(canApproveLot) {
                                    <button (click)="openStatusModal(item, 'approve')" class="text-[10px] bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded shadow-sm transition-all font-bold hover:shadow-md hover:-translate-y-0.5 active:translate-y-0">
                                        Duyệt ngay
                                    </button>
                                    }
                                </div>
                            } @else if (item.qcStatus === 'failed') {
                                <div class="flex flex-col items-center gap-1.5 group/qc">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
                                        Không đạt
                                    </span>
                                    @if(canApproveLot) {
                                        <button (click)="openStatusModal(item, 'revert')" class="opacity-0 group-hover/qc:opacity-100 transition-opacity text-[10px] text-gray-400 hover:text-red-600 flex items-center gap-1">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                            Gỡ trạng thái
                                        </button>
                                    }
                                </div>
                            } @else {
                                <div class="flex flex-col items-center gap-1.5 group/qc">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-50 text-green-600 border border-green-100 cursor-default">
                                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                        Đạt
                                    </span>
                                    @if(canApproveLot) {
                                        <button (click)="openStatusModal(item, 'revert')" class="opacity-0 group-hover/qc:opacity-100 transition-opacity text-[10px] text-gray-400 hover:text-blue-600 flex items-center gap-1">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                            Gỡ trạng thái
                                        </button>
                                    }
                                </div>
                            }
                        } @else {
                             <span class="text-gray-300 select-none">---</span>
                        }
                    </td>

                    <td class="px-6 py-5 text-right">
                       <div class="font-bold text-[#63C3C7] text-lg">
                           {{ formatStock(item.quantity) }} <span class="text-sm font-normal text-gray-500">{{ item.unitName }}</span>
                       </div>
                       
                       <div class="text-[10px] text-gray-400 mt-1 flex flex-col items-end">
                           <span>Nhập: {{ formatStock(item.totalReceived) }}</span>
                           @if(item.totalIssued > 0) {
                              <span class="text-red-400">Đã xuất: -{{ formatStock(item.totalIssued) }}</span>
                           }
                       </div>
                       
                       @let lotDetail = getStockDetail(item.chemicalRef, item.quantity);
                       @if (lotDetail) {
                         <div class="inline-block mt-1 px-2 py-0.5 bg-gray-50 rounded border border-gray-100 text-xs text-gray-600 font-medium whitespace-nowrap">
                             {{ lotDetail }}
                         </div>
                       }
                    </td>
                    <td class="px-6 py-5 text-center hidden md:table-cell">
                        @if (item.daysRemaining !== null && item.daysRemaining <= dataService.criticalThresholdDays()) {
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                Hết hạn
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
                  <!-- EXPANDABLE TX SUB-TABLE -->
                   @if (expandedLot() === item.key) {
                       <tr>
                           <td colspan="6" class="p-0 bg-gray-50/60 border-b border-gray-100">
                               <div class="px-4 md:px-10 py-5">
                                   @let txns = getLotTransactions(item.chemicalId, item.lotNumber);
                                   @let receipts = txns.filter(t => t.type === 'receipt');
                                   @let issues = txns.filter(t => t.type === 'issue');
                                   <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

                                       <!-- NHAP KHO -->
                                       <div>
                                           <h5 class="flex items-center gap-2 text-xs font-bold text-green-700 uppercase tracking-wider mb-2">
                                               <span class="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                                               Nhập kho ({{ receipts.length }} phiếu)
                                           </h5>
                                           <table class="w-full text-left rounded-xl overflow-hidden text-sm border border-green-100">
                                               <thead class="bg-green-50 text-green-800 text-xs">
                                                   <tr>
                                                       <th class="px-3 py-2 font-semibold whitespace-nowrap">Ngày nhập</th>
                                                       <th class="px-3 py-2 font-semibold whitespace-nowrap">Thời gian</th>
                                                       <th class="px-3 py-2 font-semibold whitespace-nowrap text-right">Số lượng</th>
                                                       <th class="px-3 py-2 font-semibold whitespace-nowrap">Người tạo</th>
                                                   </tr>
                                               </thead>
                                               <tbody class="bg-white divide-y divide-green-50">
                                                   @for(r of receipts; track r.id) {
                                                       <tr class="hover:bg-green-50/40 transition-colors">
                                                           <td class="px-3 py-2 text-gray-600 whitespace-nowrap">{{ formatDate(r.date) }}</td>
                                                           <td class="px-3 py-2 text-gray-400 whitespace-nowrap text-[11px]">{{ formatDateTime(r.date) }}</td>
                                                           <td class="px-3 py-2 font-bold text-green-600 text-right whitespace-nowrap">+{{ formatStock(r.quantity) }} {{ r.unitName }}</td>
                                                           <td class="px-3 py-2 text-gray-500 whitespace-nowrap">{{ r.createdBy || '---' }}</td>
                                                       </tr>
                                                   }
                                                   @if(receipts.length === 0) {
                                                       <tr><td colspan="4" class="px-3 py-4 text-center text-gray-300 text-xs">Chưa có dữ liệu nhập</td></tr>
                                                   }
                                               </tbody>
                                               @if(receipts.length > 0) {
                                               <tfoot class="bg-green-50 text-xs">
                                                   <tr>
                                                       <td colspan="2" class="px-3 py-2 font-bold text-green-700">Tổng nhập</td>
                                                       <td class="px-3 py-2 font-bold text-green-700 text-right">+{{ formatStock(item.totalReceived) }} {{ item.unitName }}</td>
                                                       <td></td>
                                                   </tr>
                                               </tfoot>
                                               }
                                           </table>
                                       </div>

                                       <!-- XUAT KHO -->
                                       <div>
                                           <h5 class="flex items-center gap-2 text-xs font-bold text-red-600 uppercase tracking-wider mb-2">
                                               <span class="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                                               Xuất kho ({{ issues.length }} phiếu)
                                           </h5>
                                           <table class="w-full text-left rounded-xl overflow-hidden text-sm border border-red-100">
                                               <thead class="bg-red-50 text-red-800 text-xs">
                                                   <tr>
                                                       <th class="px-3 py-2 font-semibold whitespace-nowrap">Ngày xuất</th>
                                                       <th class="px-3 py-2 font-semibold whitespace-nowrap">Thời gian</th>
                                                       <th class="px-3 py-2 font-semibold whitespace-nowrap text-right">Số lượng</th>
                                                       <th class="px-3 py-2 font-semibold whitespace-nowrap">Người tạo</th>
                                                   </tr>
                                               </thead>
                                               <tbody class="bg-white divide-y divide-red-50">
                                                   @for(iss of issues; track iss.id) {
                                                       <tr class="hover:bg-red-50/40 transition-colors">
                                                           <td class="px-3 py-2 text-gray-600 whitespace-nowrap">{{ formatDate(iss.date) }}</td>
                                                           <td class="px-3 py-2 text-gray-400 whitespace-nowrap text-[11px]">{{ formatDateTime(iss.date) }}</td>
                                                           <td class="px-3 py-2 font-bold text-red-500 text-right whitespace-nowrap">
                                                               -{{ formatStock(iss.quantity) }} {{ iss.unitName }}
                                                               @if(iss.isSubUnit) {
                                                                   <span class="ml-1 text-[10px] font-normal bg-orange-100 text-orange-600 border border-orange-200 rounded px-1 py-0.5">(Lẻ)</span>
                                                               }
                                                           </td>
                                                           <td class="px-3 py-2 text-gray-500 whitespace-nowrap">{{ iss.createdBy || '---' }}</td>
                                                       </tr>
                                                   }
                                                   @if(issues.length === 0) {
                                                       <tr><td colspan="4" class="px-3 py-4 text-center text-gray-300 text-xs">Chưa có dữ liệu xuất</td></tr>
                                                   }
                                               </tbody>
                                               @if(issues.length > 0) {
                                               <tfoot class="bg-red-50 text-xs">
                                                   <tr>
                                                       <td colspan="2" class="px-3 py-2 font-bold text-red-600">Tổng xuất</td>
                                                       <td class="px-3 py-2 font-bold text-red-600 text-right">-{{ formatStock(item.totalIssued) }} {{ item.unitName }}</td>
                                                       <td></td>
                                                   </tr>
                                               </tfoot>
                                               }
                                           </table>
                                       </div>

                                   </div>
                               </div>
                           </td>
                       </tr>
                   }
                }
                @if (filteredInventoryByLots().length === 0) {
                    <tr>
                        <td colspan="6" class="px-6 py-12 text-center text-gray-400">
                            <div class="flex flex-col items-center">
                                <svg class="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                                <span class="font-medium">Không tìm thấy dữ liệu phù hợp với bộ lọc</span>
                            </div>
                        </td>
                    </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    <!-- QC Status Change Modal -->
    @if (qcModal().isOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md transform transition-all scale-100 border border-gray-100 p-8">
          <div class="flex items-start gap-4 mb-6">
            <div class="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center" 
                 [class]="qcModal().action === 'approve' ? 'bg-purple-50 text-purple-500' : 'bg-orange-50 text-orange-500'">
               @if(qcModal().action === 'approve') {
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               } @else {
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
               }
            </div>
            <div class="flex-1">
              <h3 class="text-xl font-bold text-gray-800">
                  {{ qcModal().action === 'approve' ? 'Duyệt LOT hàng vào' : 'Gỡ trạng thái LOT' }}
              </h3>
              <div class="text-gray-500 mt-2 text-sm">
                Lô hàng: <span class="font-bold text-gray-700">{{ qcModal().item?.lotNumber }}</span> <br>
                Hóa chất: <span class="font-bold text-gray-700">{{ qcModal().item?.chemicalName }}</span>
              </div>
            </div>
          </div>

          @if(qcModal().action === 'approve') {
            <div class="space-y-4">
               <div>
                  <label class="block text-sm font-bold text-gray-700 mb-2">Kết quả kiểm tra <span class="text-red-500">*</span></label>
                  <div class="flex gap-3">
                    <button (click)="lotApprovalResult = 'passed'" class="flex-1 py-2.5 px-4 rounded-xl border-2 font-bold text-sm transition-all"
                            [class]="lotApprovalResult === 'passed' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-green-300'">
                      ✅ Đạt (PASS)
                    </button>
                    <button (click)="lotApprovalResult = 'failed'" class="flex-1 py-2.5 px-4 rounded-xl border-2 font-bold text-sm transition-all"
                            [class]="lotApprovalResult === 'failed' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-red-300'">
                      ❌ Không đạt (FAIL)
                    </button>
                  </div>
                </div>
                @if (lotApprovalResult === 'failed') {
                  <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">Lý do không đạt <span class="text-red-500">*</span></label>
                    <textarea [(ngModel)]="lotRejectionReason" rows="3"
                      class="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none text-sm resize-none"
                      placeholder="Mô tả lý do: VD: Kết quả ngoại quan không đạt, hạn sử dụng không phù hợp..."></textarea>
                  </div>
                }
            </div>
          } @else {
             <div class="text-sm text-gray-600 mb-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
                Lô hàng hiện tại đang ở trạng thái <span class="font-bold font-mono">{{ qcModal().item?.qcStatus === 'passed' ? 'Đạt' : 'Không đạt' }}</span>.<br><br>
                Bạn có chắc chắn muốn gỡ trạng thái và chuyển về <span class="font-bold text-purple-600">Chờ duyệt</span> (Tạm khóa lô xuất kho)?
             </div>
          }

          <div class="flex justify-end gap-3 mt-8">
            <button (click)="closeStatusModal()" class="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all">Hủy bỏ</button>
            <button (click)="confirmStatusChange()" 
                    [disabled]="qcModal().action === 'approve' && (!lotApprovalResult || (lotApprovalResult === 'failed' && !lotRejectionReason.trim()))"
                    class="px-6 py-2.5 rounded-xl text-white font-bold shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    [class]="qcModal().action === 'approve' ? (lotApprovalResult === 'failed' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-green-500 hover:bg-green-600 shadow-green-500/20') : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'">
                {{ qcModal().action === 'approve' ? 'Xác nhận' : 'Gỡ trạng thái' }}
            </button>
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
export class InventoryComponent {
  dataService = inject(DataService);
  authService = inject(AuthService);
  
  activeTab = signal<'total' | 'lot'>('total');
  selectedWarehouseId = signal<string>(''); // Filter state

  chemicals = this.dataService.chemicals;
  warehouses = this.dataService.warehouses;
  units = this.dataService.units;
  manufacturers = this.dataService.manufacturers;
  
  receipts = this.dataService.goodsReceipts;
  issues = this.dataService.goodsIssues;

  // QC Modal State
  qcModal = signal<{
    isOpen: boolean;
    item: any | null;
    action: 'approve' | 'revert';
  }>({
    isOpen: false,
    item: null,
    action: 'approve'
  });

  lotApprovalResult: 'passed' | 'failed' | '' = '';
  lotRejectionReason = '';

  get canApproveLot() {
     return this.authService.hasPermission('canApproveLot');
  }

  // Lọc danh sách hóa chất theo Kho
  filteredChemicals = computed(() => {
    const whId = this.selectedWarehouseId();
    let list = this.chemicals();
    if (whId) list = list.filter(c => c.warehouseId === whId);
    
    // Sắp xếp: Cảnh báo tồn kho lên đầu, ưu tiên cao
    return [...list].sort((a, b) => {
        const warnA = (a.lowStockThreshold !== undefined && a.currentStock <= a.lowStockThreshold) ? 1 : 0;
        const warnB = (b.lowStockThreshold !== undefined && b.currentStock <= b.lowStockThreshold) ? 1 : 0;
        
        if (warnA !== warnB) return warnB - warnA; // 1 (cảnh báo) đứng trước 0
        
        return a.name.localeCompare(b.name);
    });
  });

  // Tính toán dữ liệu tồn kho theo Lot từ lịch sử nhập kho và xuất kho
  inventoryByLots = computed(() => {
    const allReceipts = this.receipts();
    const allIssues = this.issues();
    const allChemicals = this.chemicals();
    
    // 1. Group by ChemicalId + LotNumber
    const grouped = new Map<string, any>();

    // Process Receipts (Inflow)
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
                    qcStatus: r.qcStatus || 'passed', 
                    // Reference Data
                    chemicalRef: chem, 
                    chemicalName: chem.name,
                    warehouseId: r.warehouseId,
                    unitId: chem.unitId,
                    manufacturerId: chem.manufacturerId
                });
            }
        }

        const group = grouped.get(key);
        if (group) {
            group.quantity += r.quantity;
            group.totalReceived += r.quantity;
            // If any receipt for this lot is pending, mark lot as pending (safety)
            if (r.qcStatus === 'pending') group.qcStatus = 'pending';
        }
    });

    // Process Issues (Outflow)
    allIssues.forEach(i => {
        const key = `${i.chemicalId}_${i.lotNumber}`;
        const group = grouped.get(key);
        if (group) {
            // Deduct based on unit used in issue
            let qtyToDeduct = i.quantity;
            if (i.isSubUnit && group.chemicalRef.itemsPerUnit > 1) {
                qtyToDeduct = i.quantity / group.chemicalRef.itemsPerUnit;
            }
            group.quantity -= qtyToDeduct;
            group.totalIssued += qtyToDeduct;
        }
    });

    // 2. Convert Map to Array, Filter > 0, and enrich for display
    return Array.from(grouped.values())
        .filter(item => item.quantity > 0.0001) // Only show lots with positive stock (tolerant float)
        .map(item => {
            const daysRemaining = this.calculateDaysRemaining(item.expiryDate);
            // Check if this specific warehouse requires QC
            const requiresQC = this.dataService.isWarehouseQC(item.warehouseId);
            
            return {
                ...item,
                requiresQC: requiresQC,
                warehouseName: this.getWarehouseName(item.warehouseId),
                unitName: this.getUnitName(item.unitId),
                packaging: this.formatPackaging(item.chemicalRef),
                daysRemaining: daysRemaining
            };
        })
        .sort((a, b) => {
            // 1. Cảnh báo hạn sử dụng lên đầu (days <= warning)
            const warningA = (a.daysRemaining !== null && a.daysRemaining <= this.dataService.warningThresholdDays()) ? 1 : 0;
            const warningB = (b.daysRemaining !== null && b.daysRemaining <= this.dataService.warningThresholdDays()) ? 1 : 0;
            
            if (warningA !== warningB) {
                return warningB - warningA; // 1 goes first
            }
            
            // 2. Sắp xếp theo ngày còn lại (ít nhất lên trước)
            const daysA = a.daysRemaining !== null ? a.daysRemaining : 9999;
            const daysB = b.daysRemaining !== null ? b.daysRemaining : 9999;
            if (daysA !== daysB) return daysA - daysB;
            
            // 3. Tên A-Z
            return a.chemicalName.localeCompare(b.chemicalName);
        });
  });

  // Lọc danh sách Lot theo Kho
  filteredInventoryByLots = computed(() => {
      const whId = this.selectedWarehouseId();
      const lots = this.inventoryByLots();
      if (!whId) return lots;
      return lots.filter(item => item.warehouseId === whId);
  });

  // Action Methods
  openStatusModal(item: any, action: 'approve' | 'revert') {
    this.lotApprovalResult = '';
    this.lotRejectionReason = '';
    this.qcModal.set({ isOpen: true, item: item, action: action });
  }

  closeStatusModal() {
    this.qcModal.set({ isOpen: false, item: null, action: 'approve' });
  }

  confirmStatusChange() {
    const { item, action } = this.qcModal();
    if (item) {
       const user = this.authService.currentUser()?.name || 'Admin';
       if (action === 'approve') {
           if (this.lotApprovalResult === 'passed') {
              this.dataService.approveLot(item.lotNumber, item.chemicalId, user);
           } else if (this.lotApprovalResult === 'failed' && this.lotRejectionReason.trim()) {
              this.dataService.rejectLot(item.lotNumber, item.chemicalId, user, this.lotRejectionReason.trim());
           }
       } else {
           this.dataService.resetLotToPending(item.lotNumber, item.chemicalId);
       }
    }
    this.closeStatusModal();
  }

  // Finds the lot expiring soonest for a specific chemical
  getNearestExpiryInfo(c: Chemical) {
    const lots = this.inventoryByLots().filter(l => l.chemicalId === c.id);
    if (lots.length === 0) return null;
    // inventoryByLots is already sorted by expiry asc in the computed function, so we take the first one
    return lots[0]; 
  }

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
      if (days < 0) return `(Đã quá hạn ${Math.abs(days)} ngày)`;
      if (days === 0) return '(Hết hạn hôm nay)';
      return `(Còn ${days} ngày)`;
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
  
  formatStock(val: number) {
      return Math.round(val * 100) / 100;
  }

  expandedLot = signal<string | null>(null);

  toggleLotDetails(key: string) {
      if (this.expandedLot() === key) this.expandedLot.set(null);
      else this.expandedLot.set(key);
  }

  getLotTransactions(chemicalId: string, lotNumber: string) {
      const chem = this.dataService.chemicals().find(c => c.id === chemicalId);
      const primaryUnit = chem ? this.getUnitName(chem.unitId) : '';
      const subUnit = chem ? chem.subItemName : '';
      
      const receipts = this.dataService.goodsReceipts()
          .filter(r => r.chemicalId === chemicalId && r.lotNumber === lotNumber)
          .map(r => ({ 
              type: 'receipt', id: r.id, date: r.receiptDate, 
              quantity: r.quantity, 
              unitName: primaryUnit,
              isSubUnit: false,
              createdBy: r.createdBy 
          }));
          
      const issues = this.dataService.goodsIssues()
          .filter(i => i.chemicalId === chemicalId && i.lotNumber === lotNumber)
          .map(i => ({
              type: 'issue', id: i.id, date: i.issueDate,
              quantity: i.quantity,
              unitName: i.isSubUnit ? subUnit : primaryUnit,
              isSubUnit: i.isSubUnit,
              createdBy: i.createdBy
          }));
          
          
      return [...receipts, ...issues].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  formatDateTime(d: string) {
      if (!d) return '---';
      return new Date(d).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }).replace(',', '');
  }

  formatDate(d: string) {
    if (!d) return '---';
    return new Date(d).toLocaleDateString('vi-VN');
  }

  formatPackaging(item: Chemical) {
    return this.dataService.formatPackaging(item);
  }

  getStockDetail(c: Chemical, quantity: number): string {
    return this.dataService.getStockDetail(c, quantity);
  }
}
