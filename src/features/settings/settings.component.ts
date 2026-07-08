
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, MasterData, WarehouseData, UsageColumnDef } from '../../core/services/data.service';
import { AuthService, User, UserPermissions } from '../../core/services/auth.service';

type SettingTab = 'general' | 'personnel' | 'warehouse' | 'unit' | 'subUnit' | 'volumeUnit' | 'manufacturer';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
         <h2 class="text-3xl font-bold text-gray-800 tracking-tight">Cài đặt hệ thống</h2>
      </div>
      
      <!-- Tabs Container -->
      <div class="bg-gray-100 p-1.5 rounded-xl flex flex-wrap gap-1 overflow-x-auto">
        <button (click)="activeTab = 'general'" 
                class="px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap" 
                [class]="activeTab === 'general' ? 'bg-white text-[#63C3C7] shadow-sm' : 'text-gray-500 hover:text-gray-800'">
            Cấu hình chung
        </button>
        <button (click)="activeTab = 'personnel'" 
                class="px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap" 
                [class]="activeTab === 'personnel' ? 'bg-white text-[#63C3C7] shadow-sm' : 'text-gray-500 hover:text-gray-800'">
            Nhân sự & Phân quyền
        </button>
        <button (click)="activeTab = 'warehouse'" 
                class="px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap" 
                [class]="activeTab === 'warehouse' ? 'bg-white text-[#63C3C7] shadow-sm' : 'text-gray-500 hover:text-gray-800'">
            Kho
        </button>
        <button (click)="activeTab = 'unit'" 
                class="px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap" 
                [class]="activeTab === 'unit' ? 'bg-white text-[#63C3C7] shadow-sm' : 'text-gray-500 hover:text-gray-800'">
            Đơn vị tính
        </button>
        <button (click)="activeTab = 'subUnit'" 
                class="px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap" 
                [class]="activeTab === 'subUnit' ? 'bg-white text-[#63C3C7] shadow-sm' : 'text-gray-500 hover:text-gray-800'">
            Đơn vị con
        </button>
        <button (click)="activeTab = 'volumeUnit'" 
                class="px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap" 
                [class]="activeTab === 'volumeUnit' ? 'bg-white text-[#63C3C7] shadow-sm' : 'text-gray-500 hover:text-gray-800'">
            Đơn vị thể tích
        </button>
        <button (click)="activeTab = 'manufacturer'" 
                class="px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap" 
                [class]="activeTab === 'manufacturer' ? 'bg-white text-[#63C3C7] shadow-sm' : 'text-gray-500 hover:text-gray-800'">
            Hãng SX
        </button>
      </div>

      <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        
        <!-- GENERAL SETTINGS TAB -->
        @if (activeTab === 'general') {
            <div class="space-y-8 max-w-3xl">
                <!-- App Identity -->
                <div>
                   <h3 class="font-bold text-lg text-gray-800 mb-2">Thông tin Ứng dụng</h3>
                   <div class="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                      <label class="block text-sm font-bold text-gray-700 mb-2">Tên hiển thị (Brand Name)</label>
                      <input type="text" 
                             [ngModel]="dataService.appName()" 
                             (ngModelChange)="dataService.setAppName($event)"
                             class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/20 focus:border-[#63C3C7] outline-none font-bold text-gray-800 bg-white shadow-sm transition-all"
                             placeholder="VD: CHEM WARE">
                      <p class="text-xs text-gray-500 mt-2">Tên này sẽ hiển thị ở góc trên bên trái của menu và thanh tiêu đề trên thiết bị di động.</p>
                   </div>
                </div>

                <!-- Warnings -->
                <div>
                   <h3 class="font-bold text-lg text-gray-800 mb-2">Cấu hình Cảnh báo</h3>
                   <p class="text-sm text-gray-500 mb-4">Thiết lập các ngưỡng cảnh báo cho hệ thống tồn kho.</p>
                   
                   <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <!-- Critical Threshold (Red) -->
                      <div class="bg-red-50 p-6 rounded-xl border border-red-100">
                          <label class="block text-sm font-bold text-red-800 mb-2">Ngưỡng Hạn sử dụng Đỏ</label>
                          <div class="flex items-center gap-4">
                              <input type="number" 
                                     [ngModel]="dataService.criticalThresholdDays()" 
                                     (ngModelChange)="dataService.setCriticalThreshold($event)"
                                     class="w-full px-4 py-2 rounded-lg border border-red-200 focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none font-bold text-red-700 bg-white"
                                     placeholder="VD: 0">
                              <span class="text-sm text-red-600 font-medium whitespace-nowrap">ngày (Hết hạn)</span>
                          </div>
                      </div>

                      <!-- Warning Threshold (Yellow) -->
                      <div class="bg-yellow-50 p-6 rounded-xl border border-yellow-100">
                          <label class="block text-sm font-bold text-yellow-800 mb-2">Ngưỡng Hạn sử dụng Vàng</label>
                          <div class="flex items-center gap-4">
                              <input type="number" 
                                     [ngModel]="dataService.warningThresholdDays()" 
                                     (ngModelChange)="dataService.setWarningThreshold($event)"
                                     class="w-full px-4 py-2 rounded-lg border border-yellow-200 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none font-bold text-yellow-700 bg-white"
                                     min="1" placeholder="VD: 60">
                              <span class="text-sm text-yellow-600 font-medium whitespace-nowrap">ngày (Sắp hết)</span>
                          </div>
                      </div>
                   </div>
                </div>

                <!-- Local Environment Mock Database Settings -->
                @if (!dataService.isGasEnvironment) {
                <div>
                   <h3 class="font-bold text-lg text-gray-800 mb-2">Môi trường Cục bộ (Local Dev)</h3>
                   <p class="text-sm text-gray-500 mb-4">Các cấu hình dữ liệu dành riêng khi chạy ứng dụng trên máy tính cá nhân.</p>
                   
                   <div class="bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div>
                         <h4 class="font-bold text-gray-800">Dữ liệu từ tệp mock_data.xlsx</h4>
                         <p class="text-xs text-gray-500 mt-1">Hệ thống sẽ tải toàn bộ danh mục, hóa chất, phiếu nhập/xuất từ tệp Excel nằm trong thư mục gốc hoặc thư mục database của dự án.</p>
                      </div>
                      <div class="flex gap-2 w-full md:w-auto">
                         <button (click)="restoreFromExcel()" 
                                 [disabled]="isRestoring()"
                                 class="px-4 py-2.5 bg-[#63C3C7] hover:bg-[#55a8ac] text-white rounded-lg font-bold transition-all shadow-md disabled:opacity-50 text-sm whitespace-nowrap cursor-pointer">
                             {{ isRestoring() ? 'Đang nạp...' : 'Khôi phục từ Excel' }}
                         </button>
                         <button (click)="clearLocalDb()" 
                                 class="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold transition-all text-sm whitespace-nowrap cursor-pointer">
                             Reset CSDL Local
                         </button>
                      </div>
                   </div>
                </div>
                }
            </div>
        }

        <!-- PERSONNEL TAB -->
        @if (activeTab === 'personnel') {
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="font-bold text-lg text-gray-800">Quản lý nhân viên</h3>
              <button (click)="openAddUser()" class="text-sm px-3 py-1.5 bg-[#63C3C7] text-white rounded-lg hover:bg-[#55a8ac]">Thêm NV</button>
            </div>

            @if (userFormMode) {
              <div class="bg-gray-50 p-5 rounded-xl border border-gray-200 animate-fade-in space-y-4">
                <h4 class="font-bold text-gray-700">{{ isEditingUser ? 'Cập nhật thông tin' : 'Thêm nhân viên mới' }}</h4>
                <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <input type="text" [(ngModel)]="newUser.code" placeholder="Mã NV (Đăng nhập)" class="px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-[#63C3C7]/20" [disabled]="isEditingUser && newUser.code === 'admin'">
                  <input type="text" [(ngModel)]="newUser.name" placeholder="Tên nhân viên" class="px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-[#63C3C7]/20">
                  <input type="password" [(ngModel)]="newUser.password" [placeholder]="isEditingUser ? 'Mật khẩu mới (Bỏ trống nếu không đổi)' : 'Mật khẩu'" class="px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-[#63C3C7]/20">
                  <input type="password" [(ngModel)]="newUser.confirmPassword" [placeholder]="isEditingUser ? 'Xác nhận lại mật khẩu' : 'Xác nhận mật khẩu'" class="px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-[#63C3C7]/20">
                  <select [(ngModel)]="newUser.role" class="px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-[#63C3C7]/20" [disabled]="isEditingUser && newUser.code === 'admin'">
                    <option value="user">Nhân viên</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>

                @if(newUser.role === 'user') {
                  <div class="border-t border-gray-200 pt-3">
                    <h4 class="font-bold text-gray-700 mb-3 text-sm">Phân quyền chi tiết</h4>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <label class="flex items-center space-x-2 cursor-pointer bg-white p-2 rounded border border-gray-200 hover:border-[#63C3C7]">
                          <input type="checkbox" [(ngModel)]="newUser.permissions.canAddChemical" class="rounded text-[#63C3C7] focus:ring-[#63C3C7]">
                          <span class="text-sm font-medium text-gray-700">Thêm Hóa chất</span>
                        </label>
                        <label class="flex items-center space-x-2 cursor-pointer bg-white p-2 rounded border border-gray-200 hover:border-[#63C3C7]">
                          <input type="checkbox" [(ngModel)]="newUser.permissions.canApproveLot" class="rounded text-[#63C3C7] focus:ring-[#63C3C7]">
                          <span class="text-sm font-medium text-gray-700">Duyệt LOT</span>
                        </label>
                        <label class="flex items-center space-x-2 cursor-pointer bg-white p-2 rounded border border-gray-200 hover:border-[#63C3C7]">
                          <input type="checkbox" [(ngModel)]="newUser.permissions.canEditReceipt" class="rounded text-[#63C3C7] focus:ring-[#63C3C7]">
                          <span class="text-sm font-medium text-gray-700">Sửa Phiếu Nhập</span>
                        </label>
                        <label class="flex items-center space-x-2 cursor-pointer bg-white p-2 rounded border border-gray-200 hover:border-[#63C3C7]">
                          <input type="checkbox" [(ngModel)]="newUser.permissions.canDeleteReceipt" class="rounded text-[#63C3C7] focus:ring-[#63C3C7]">
                          <span class="text-sm font-medium text-gray-700">Xóa Phiếu Nhập</span>
                        </label>
                         <label class="flex items-center space-x-2 cursor-pointer bg-white p-2 rounded border border-gray-200 hover:border-[#63C3C7]">
                          <input type="checkbox" [(ngModel)]="newUser.permissions.canEditIssue" class="rounded text-[#63C3C7] focus:ring-[#63C3C7]">
                          <span class="text-sm font-medium text-gray-700">Sửa Phiếu Xuất</span>
                        </label>
                        <label class="flex items-center space-x-2 cursor-pointer bg-white p-2 rounded border border-gray-200 hover:border-[#63C3C7]">
                          <input type="checkbox" [(ngModel)]="newUser.permissions.canDeleteIssue" class="rounded text-[#63C3C7] focus:ring-[#63C3C7]">
                          <span class="text-sm font-medium text-gray-700">Xóa Phiếu Xuất</span>
                        </label>
                    </div>
                  </div>
                }

                <div class="flex justify-end gap-2 pt-2">
                   <button (click)="userFormMode = false" class="px-4 py-2 rounded-lg border text-gray-500 hover:bg-gray-50">Hủy</button>
                   <button (click)="saveUser()" class="px-4 py-2 bg-[#63C3C7] text-white rounded-lg hover:bg-[#55a8ac] font-bold">
                       {{ isEditingUser ? 'Cập nhật' : 'Lưu nhân viên' }}
                   </button>
                </div>
              </div>
            }

            <table class="w-full text-left">
              <thead><tr class="text-gray-500 border-b"><th class="py-2">Mã NV</th><th class="py-2">Tên</th><th class="py-2 hidden md:table-cell">Vai trò</th><th class="py-2 hidden md:table-cell">Quyền hạn (User)</th><th class="py-2 text-right">Thao tác</th></tr></thead>
              <tbody>
                @for (u of users(); track u.id) {
                  <tr class="border-b last:border-0 hover:bg-gray-50">
                    <td class="py-3 font-medium">{{ u.code }}</td>
                    <td class="py-3">{{ u.name }}</td>
                    <td class="py-3 hidden md:table-cell">
                      <span [class]="u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'" class="px-2 py-1 rounded text-xs uppercase font-bold">{{ u.role }}</span>
                    </td>
                    <td class="py-3 text-xs text-gray-500 hidden md:table-cell">
                        @if(u.role === 'admin') {
                            <span class="italic text-gray-400">Toàn quyền hệ thống</span>
                        } @else {
                            <div class="flex flex-wrap gap-1">
                                @if(u.permissions?.canAddChemical) { <span class="bg-indigo-50 text-indigo-600 px-1.5 rounded border border-indigo-100">Thêm HC</span> }
                                @if(u.permissions?.canApproveLot) { <span class="bg-blue-50 text-blue-600 px-1.5 rounded border border-blue-100">Duyệt LOT</span> }
                                @if(u.permissions?.canEditReceipt) { <span class="bg-green-50 text-green-600 px-1.5 rounded border border-green-100">Sửa Nhập</span> }
                                @if(u.permissions?.canDeleteReceipt) { <span class="bg-red-50 text-red-600 px-1.5 rounded border border-red-100">Xóa Nhập</span> }
                                @if(u.permissions?.canEditIssue) { <span class="bg-green-50 text-green-600 px-1.5 rounded border border-green-100">Sửa Xuất</span> }
                                @if(u.permissions?.canDeleteIssue) { <span class="bg-red-50 text-red-600 px-1.5 rounded border border-red-100">Xóa Xuất</span> }
                                @if(!u.permissions?.canAddChemical && !u.permissions?.canApproveLot && !u.permissions?.canEditReceipt && !u.permissions?.canDeleteReceipt && !u.permissions?.canEditIssue && !u.permissions?.canDeleteIssue) { <span>Xem</span> }
                            </div>
                        }
                    </td>
                    <td class="py-3 text-right">
                       <button (click)="openEditUser(u)" class="text-blue-500 hover:underline text-sm mr-3 font-medium">Sửa</button>
                       <button (click)="deleteUser(u)" 
                               [disabled]="authService.currentUser()?.id === u.id || u.code === 'admin'"
                               class="text-red-500 hover:underline text-sm disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed">
                          Xóa
                       </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        
        <!-- WAREHOUSE TAB (With QC Config + Usage Details Config) -->
        @if (activeTab === 'warehouse') {
           <div class="space-y-4">
              <div class="flex justify-between items-center">
                 <h3 class="font-bold text-lg text-gray-800">Danh sách Kho</h3>
                 <div class="flex gap-2">
                    <input type="text" [(ngModel)]="newItemName" (keyup.enter)="addMasterItem()" placeholder="Nhập tên kho..." class="px-3 py-1.5 border rounded-lg text-sm focus:ring-[#63C3C7] outline-none">
                    <button (click)="addMasterItem()" class="px-3 py-1.5 bg-[#63C3C7] text-white rounded-lg hover:bg-[#55a8ac] text-sm">Thêm</button>
                 </div>
              </div>
              <p class="text-sm text-gray-500 mb-2">Tích chọn "Kiểm soát LOT" nếu hàng nhập vào kho này cần được duyệt LOT trước khi xuất.</p>
              
              <ul class="divide-y divide-gray-100">
                @for (item of currentMasterList(); track item.id) {
                  <li class="py-3 px-2 rounded hover:bg-gray-50">
                    <div class="flex justify-between items-center">
                      <div class="flex items-center gap-4">
                        @if (editingMasterItemId === item.id) {
                            <input type="text" [(ngModel)]="editingMasterItemName" (keyup.enter)="saveEditMasterItem(item)" (keyup.escape)="cancelEditMasterItem()" class="px-2 py-1 border rounded text-sm focus:ring-[#63C3C7] outline-none" autofocus>
                        } @else {
                            <span class="font-medium text-gray-800">{{ item.name }}</span>
                        }
                        
                        <!-- QC Toggle -->
                        @if (editingMasterItemId !== item.id) {
                            <label class="inline-flex items-center cursor-pointer">
                                <input type="checkbox" [checked]="dataService.isWarehouseQC(item.id)" (change)="dataService.toggleWarehouseQC(item.id)" class="sr-only peer">
                                <div class="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#63C3C7]"></div>
                                <span class="ms-2 text-xs font-medium text-gray-600">Kiểm soát LOT</span>
                            </label>
                        }
                      </div>
                      <div class="flex items-center gap-2">
                        @if (editingMasterItemId === item.id) {
                            <button (click)="saveEditMasterItem(item)" class="text-green-500 hover:text-green-700 text-sm font-medium">Lưu</button>
                            <button (click)="cancelEditMasterItem()" class="text-gray-400 hover:text-gray-600 text-sm font-medium">Hủy</button>
                        } @else {
                            <button (click)="toggleUsageConfig(item.id)" class="text-xs px-2 py-1 rounded-lg border transition-all" 
                                    [class]="usageConfigExpandedId === item.id ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-gray-400 border-gray-200 hover:text-blue-500 hover:border-blue-200'" 
                                    title="Cấu hình bảng BN">
                                <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                                BN
                            </button>
                            <button (click)="startEditMasterItem(item)" class="text-blue-400 hover:text-blue-600" title="Sửa tên">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button (click)="deleteMasterItem(item)" class="text-red-400 hover:text-red-600" title="Xóa">
                              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        }
                      </div>
                    </div>

                    <!-- Usage Details Config Panel (Expandable) -->
                    @if (usageConfigExpandedId === item.id) {
                      <div class="mt-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100 animate-fade-in">
                        <div class="flex items-center justify-between mb-3">
                          <label class="inline-flex items-center cursor-pointer">
                            <input type="checkbox" [checked]="getWarehouseUsageEnabled(item.id)" (change)="toggleWarehouseUsage(item.id)" class="sr-only peer">
                            <div class="relative w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                            <span class="ms-2 text-sm font-bold text-gray-700">Kèm bảng chi tiết (BN / Mẫu) khi xuất kho</span>
                          </label>
                        </div>
                        
                        @if (getWarehouseUsageEnabled(item.id)) {
                          <div class="space-y-2">
                            <p class="text-xs text-gray-500">Quản lý các cột thông tin sẽ hiển thị trong bảng chi tiết:</p>
                            
                            <!-- Existing columns -->
                            @for (col of getWarehouseUsageColumns(item.id); track col.key) {
                              <div class="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200">
                                <svg class="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                                <span class="flex-1 text-sm font-medium text-gray-700">{{ col.label }}</span>
                                <button (click)="removeUsageColumn(item.id, col.key)" class="text-red-400 hover:text-red-600 p-0.5">
                                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                              </div>
                            }
                            
                            <!-- Add new column -->
                            <div class="flex gap-2 mt-2">
                              <input type="text" [(ngModel)]="newColumnLabel" (keyup.enter)="addUsageColumn(item.id)" placeholder="Tên cột mới (VD: Mã BN, Họ Tên...)" class="flex-1 px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-300">
                              <button (click)="addUsageColumn(item.id)" class="px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 font-medium whitespace-nowrap">+ Thêm cột</button>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </li>
                }
              </ul>
           </div>
        }

        <!-- OTHER MASTER DATA TABS -->
        @if (activeTab !== 'personnel' && activeTab !== 'general' && activeTab !== 'warehouse') {
           <div class="space-y-4">
              <div class="flex justify-between items-center">
                 <h3 class="font-bold text-lg text-gray-800">
                   @switch(activeTab) {
                     @case('unit') { Đơn vị tính }
                     @case('subUnit') { Danh sách Đơn vị con }
                     @case('volumeUnit') { Danh sách Đơn vị thể tích }
                     @case('manufacturer') { Hãng sản xuất }
                   }
                 </h3>
                 <div class="flex gap-2">
                    <input type="text" [(ngModel)]="newItemName" (keyup.enter)="addMasterItem()" placeholder="Nhập tên mới..." class="px-3 py-1.5 border rounded-lg text-sm focus:ring-[#63C3C7] outline-none">
                    <button (click)="addMasterItem()" class="px-3 py-1.5 bg-[#63C3C7] text-white rounded-lg hover:bg-[#55a8ac] text-sm">Thêm</button>
                 </div>
              </div>
              
              <ul class="divide-y divide-gray-100">
                @for (item of currentMasterList(); track item.id) {
                  <li class="py-3 flex justify-between items-center hover:bg-gray-50 px-2 rounded">
                    @if (editingMasterItemId === item.id) {
                        <input type="text" [(ngModel)]="editingMasterItemName" (keyup.enter)="saveEditMasterItem(item)" (keyup.escape)="cancelEditMasterItem()" class="px-2 py-1 border rounded text-sm focus:ring-[#63C3C7] outline-none" autofocus>
                    } @else {
                        <span>{{ item.name }}</span>
                    }
                    <div class="flex items-center gap-2">
                        @if (editingMasterItemId === item.id) {
                            <button (click)="saveEditMasterItem(item)" class="text-green-500 hover:text-green-700 text-sm font-medium">Lưu</button>
                            <button (click)="cancelEditMasterItem()" class="text-gray-400 hover:text-gray-600 text-sm font-medium">Hủy</button>
                        } @else {
                            <button (click)="startEditMasterItem(item)" class="text-blue-400 hover:text-blue-600" title="Sửa tên">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button (click)="deleteMasterItem(item)" class="text-red-400 hover:text-red-600" title="Xóa">
                              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        }
                    </div>
                  </li>
                }
              </ul>
           </div>
        }
      </div>
    </div>

    <!-- Generic Confirmation/Error Modal -->
    @if (modalState().isOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
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
              <button (click)="closeModal()" class="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all">Hủy bỏ</button>
              <button (click)="handleConfirmDelete()" class="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 hover:-translate-y-0.5 transition-all">Xác nhận Xóa</button>
            } @else {
               <button (click)="closeModal()" class="px-6 py-2.5 rounded-xl bg-[#63C3C7] text-white font-bold hover:bg-[#55a8ac] shadow-lg shadow-[#63C3C7]/20 transition-all">Đã hiểu</button>
            }
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
export class SettingsComponent {
  dataService = inject(DataService);
  authService = inject(AuthService);
  isRestoring = signal(false);
  
  activeTab: SettingTab = 'general';
  
  // Personnel Logic
  users = this.authService.getUsers();
  userFormMode = false;
  isEditingUser = false;
  editingUserId: string | null = null;
  
  // New User Form Data
  newUser: { 
    code: string;
    name: string;
    password: string;
    confirmPassword?: string;
    role: 'admin' | 'user';
    permissions: UserPermissions;
  } = { 
    code: '', 
    name: '', 
    password: '',
    confirmPassword: '', 
    role: 'user',
    permissions: {
        canApproveLot: false,
        canEditReceipt: false,
        canDeleteReceipt: false,
        canEditIssue: false,
        canDeleteIssue: false,
        canAddChemical: false
    }
  };

  // Master Data Logic
  newItemName = '';
  
  editingMasterItemId: string | null = null;
  editingMasterItemName: string = '';

  startEditMasterItem(item: MasterData) {
    this.editingMasterItemId = item.id;
    this.editingMasterItemName = item.name;
  }

  cancelEditMasterItem() {
    this.editingMasterItemId = null;
    this.editingMasterItemName = '';
  }

  saveEditMasterItem(item: MasterData) {
    if (!this.editingMasterItemName.trim()) return;
    const newName = this.editingMasterItemName.trim();
    
    switch (this.activeTab) {
      case 'warehouse': this.dataService.updateWarehouse(item.id, newName); break;
      case 'unit': this.dataService.updateUnit(item.id, newName); break;
      case 'subUnit': this.dataService.updateSubUnit(item.id, newName); break;
      case 'volumeUnit': this.dataService.updateVolumeUnit(item.id, newName); break;
      case 'manufacturer': this.dataService.updateManufacturer(item.id, newName); break;
    }
    
    this.editingMasterItemId = null;
    this.editingMasterItemName = '';
  }
  
  modalState = signal<{
    isOpen: boolean;
    type: 'confirm' | 'error' | 'success';
    title: string;
    message: string;
    deleteTarget: 'master' | 'user' | null;
    itemToDelete: { id: string; name: string; code?: string; } | null;
  }>({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    deleteTarget: null,
    itemToDelete: null
  });  resetUserForm() {
      this.newUser = { 
        code: '', 
        name: '', 
        password: '', 
        confirmPassword: '', 
        role: 'user',
        permissions: {
            canApproveLot: false,
            canEditReceipt: false,
            canDeleteReceipt: false,
            canEditIssue: false,
            canDeleteIssue: false,
            canAddChemical: false
        }
      };
      this.isEditingUser = false;
      this.editingUserId = null;
  }

  openAddUser() {
      this.resetUserForm();
      this.userFormMode = true;
  }

  openEditUser(user: User) {
      this.newUser = {
          code: user.code,
          name: user.name,
          password: '', // Để trống nếu không muốn đổi
          confirmPassword: '',
          role: user.role,
          permissions: user.permissions ? { ...user.permissions } : {
            canApproveLot: false,
            canEditReceipt: false,
            canDeleteReceipt: false,
            canEditIssue: false,
            canDeleteIssue: false,
            canAddChemical: false
          }
      };
      this.isEditingUser = true;
      this.editingUserId = user.id;
      this.userFormMode = true;
  }

  showErrorMsg(msg: string) {
      this.modalState.set({ isOpen: true, type: 'error', title: 'Lỗi', message: msg, deleteTarget: null, itemToDelete: null });
  }

  saveUser() {
    if (!this.newUser.code) { this.showErrorMsg('Vui lòng nhập Mã nhân viên'); return; }
    
    // Nếu tạo mới thì bắt buộc nhập pass
    if (!this.isEditingUser && !this.newUser.password) {
        this.showErrorMsg('Vui lòng nhập mật khẩu'); 
        return; 
    }

    if (this.newUser.password) {
        if (this.newUser.password !== this.newUser.confirmPassword) {
            this.showErrorMsg('Mật khẩu xác nhận không khớp');
            return;
        }
    }

    if (this.isEditingUser && this.editingUserId) {
        // Lấy thông tin cũ để giữ lại pass nếu người dùng để trống
        const originalUser = this.users().find(u => u.id === this.editingUserId);
        const passwordToSave = this.newUser.password ? this.newUser.password : (originalUser?.password || '');

        this.authService.updateUser({
            id: this.editingUserId,
            code: this.newUser.code,
            name: this.newUser.name,
            password: passwordToSave,
            role: this.newUser.role,
            permissions: this.newUser.role === 'admin' ? undefined : { ...this.newUser.permissions }
        });
    } else {
        this.authService.addUser({
            id: crypto.randomUUID(),
            code: this.newUser.code,
            name: this.newUser.name,
            password: this.newUser.password,
            role: this.newUser.role,
            permissions: this.newUser.role === 'admin' ? undefined : { ...this.newUser.permissions }
        });
    }
    
    this.userFormMode = false;
    this.resetUserForm();
  }

  deleteUser(user: User) {
    this.modalState.set({
      isOpen: true,
      type: 'confirm',
      title: 'Xác nhận Xóa Nhân viên',
      message: `Bạn có chắc chắn muốn xóa nhân viên "${user.name}" (Mã NV: ${user.code})? Hành động này không thể hoàn tác.`,
      deleteTarget: 'user',
      itemToDelete: user
    });
  }

  // Helper to get current list based on tab
  currentMasterList() {
    switch (this.activeTab) {
      case 'warehouse': return this.dataService.warehouses();
      case 'unit': return this.dataService.units();
      case 'subUnit': return this.dataService.subUnits();
      case 'volumeUnit': return this.dataService.volumeUnits();
      case 'manufacturer': return this.dataService.manufacturers();
      default: return [];
    }
  }

  addMasterItem() {
    if (!this.newItemName.trim()) return;
    const name = this.newItemName.trim();
    
    switch (this.activeTab) {
      case 'warehouse': this.dataService.addWarehouse(name); break;
      case 'unit': this.dataService.addUnit(name); break;
      case 'subUnit': this.dataService.addSubUnit(name); break;
      case 'volumeUnit': this.dataService.addVolumeUnit(name); break;
      case 'manufacturer': this.dataService.addManufacturer(name); break;
    }
    this.newItemName = '';
  }

  deleteMasterItem(item: MasterData) {
    let itemType = '';
    let itemTypeTitle = '';
    switch (this.activeTab) {
      case 'warehouse':
        itemType = 'kho';
        itemTypeTitle = 'Kho';
        break;
      case 'unit':
        itemType = 'đơn vị tính';
        itemTypeTitle = 'Đơn vị tính';
        break;
      case 'subUnit':
        itemType = 'đơn vị con';
        itemTypeTitle = 'Đơn vị con';
        break;
      case 'volumeUnit':
        itemType = 'đơn vị thể tích';
        itemTypeTitle = 'Đơn vị thể tích';
        break;
      case 'manufacturer':
        itemType = 'hãng sản xuất';
        itemTypeTitle = 'Hãng sản xuất';
        break;
      default:
        return;
    }

    this.modalState.set({
      isOpen: true,
      type: 'confirm',
      title: `Xác nhận Xóa ${itemTypeTitle}`,
      message: `Bạn có chắc chắn muốn xóa ${itemType} "${item.name}" không? Hành động này không thể hoàn tác.`,
      deleteTarget: 'master',
      itemToDelete: item
    });
  }

  handleConfirmDelete() {
    const item = this.modalState().itemToDelete;
    if (!item) return;

    const target = this.modalState().deleteTarget;

    try {
      if (target === 'user') {
        this.authService.deleteUser(item.id);
      } else if (target === 'master') {
        switch (this.activeTab) {
          case 'warehouse':
            this.dataService.deleteWarehouse(item.id);
            break;
          case 'unit':
            this.dataService.deleteUnit(item.id);
            break;
          case 'subUnit':
            this.dataService.deleteSubUnit(item.id);
            break;
          case 'volumeUnit':
            this.dataService.deleteVolumeUnit(item.id);
            break;
          case 'manufacturer':
            this.dataService.deleteManufacturer(item.id);
            break;
        }
      }
      this.closeModal();
    } catch (e: any) {
      this.modalState.update(s => ({
        ...s,
        type: 'error',
        title: 'Thao tác thất bại',
        message: e.message,
      }));
    }
  }

  closeModal() {
    this.modalState.set({
      isOpen: false,
      type: 'confirm',
      title: '',
      message: '',
      deleteTarget: null,
      itemToDelete: null
    });
  }

  // ======= Usage Details Configuration =======
  usageConfigExpandedId: string | null = null;
  newColumnLabel = '';

  toggleUsageConfig(warehouseId: string) {
    this.usageConfigExpandedId = this.usageConfigExpandedId === warehouseId ? null : warehouseId;
    this.newColumnLabel = '';
  }

  getWarehouseUsageEnabled(warehouseId: string): boolean {
    const wh = this.dataService.getWarehouseConfig(warehouseId);
    return wh?.enableUsageDetails === true;
  }

  getWarehouseUsageColumns(warehouseId: string): UsageColumnDef[] {
    const wh = this.dataService.getWarehouseConfig(warehouseId);
    return wh?.usageColumns || [];
  }

  toggleWarehouseUsage(warehouseId: string) {
    const wh = this.dataService.getWarehouseConfig(warehouseId);
    if (!wh) return;
    const newState = !wh.enableUsageDetails;
    this.dataService.updateWarehouseConfig(warehouseId, newState, wh.usageColumns || []);
  }

  addUsageColumn(warehouseId: string) {
    if (!this.newColumnLabel.trim()) return;
    const wh = this.dataService.getWarehouseConfig(warehouseId);
    if (!wh) return;
    const currentCols = wh.usageColumns || [];
    const newKey = 'col_' + (currentCols.length + 1) + '_' + Date.now();
    const newCols: UsageColumnDef[] = [...currentCols, { key: newKey, label: this.newColumnLabel.trim() }];
    this.dataService.updateWarehouseConfig(warehouseId, wh.enableUsageDetails ?? false, newCols);
    this.newColumnLabel = '';
  }

  removeUsageColumn(warehouseId: string, columnKey: string) {
    const wh = this.dataService.getWarehouseConfig(warehouseId);
    if (!wh) return;
    const newCols = (wh.usageColumns || []).filter(c => c.key !== columnKey);
    this.dataService.updateWarehouseConfig(warehouseId, wh.enableUsageDetails ?? false, newCols);
  }

  restoreFromExcel() {
    this.isRestoring.set(true);
    this.dataService.restoreFromExcel().then(() => {
      this.isRestoring.set(false);
      this.modalState.set({
        isOpen: true,
        type: 'success',
        title: 'Thành công',
        message: 'Đã cập nhật cơ sở dữ liệu từ tệp mock_data.xlsx và làm mới ứng dụng!',
        deleteTarget: null,
        itemToDelete: null
      });
    }).catch(err => {
      this.isRestoring.set(false);
      this.modalState.set({
        isOpen: true,
        type: 'error',
        title: 'Thất bại',
        message: 'Lỗi khi tải tệp Excel: ' + err.message,
        deleteTarget: null,
        itemToDelete: null
      });
    });
  }

  clearLocalDb() {
    this.dataService.clearLocalDb();
    this.modalState.set({
      isOpen: true,
      type: 'success',
      title: 'Đã Reset',
      message: 'Cơ sở dữ liệu cục bộ đã được xóa sạch!',
      deleteTarget: null,
      itemToDelete: null
    });
  }
}
