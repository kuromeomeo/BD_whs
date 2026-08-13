
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { DataService } from './core/services/data.service';
import { filter } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { initLocalDevGoogleScriptRun } from './dev-environment/google-script.run';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, RouterLink, RouterLinkActive, FormsModule],
  template: `
<div class="h-screen w-full bg-[#F3F6F9] flex font-sans overflow-hidden relative">
  @if(isLoadingData()) {
    <div class="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#F3F6F9] backdrop-blur-sm">
        <div class="w-16 h-16 border-4 border-[#63C3C7]/30 border-t-[#63C3C7] rounded-full animate-spin"></div>
        <p class="mt-4 text-[#63C3C7] font-bold text-lg animate-pulse">Đang đồng bộ dữ liệu Hệ thống...</p>
    </div>
  }
  
  @if (isLoggedIn) {
    <!-- Mobile Backdrop (Overlay khi mở menu trên điện thoại) -->
    @if (isMobileMenuOpen()) {
      <div (click)="toggleMobileMenu()" class="fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity backdrop-blur-sm"></div>
    }

    <!-- Sidebar Navigation -->
    <!-- 
      Mobile: Fixed position, slide in/out using translate.
      Desktop (lg): Static or Fixed, width changes based on isSidebarCollapsed.
    -->
    <aside 
      class="fixed inset-y-0 left-0 z-40 bg-white shadow-xl border-r border-gray-100 flex flex-col sidebar-transition
             lg:translate-x-0"
      [class.-translate-x-full]="!isMobileMenuOpen()" 
      [class.translate-x-0]="isMobileMenuOpen()"
      [class.w-52]="!isSidebarCollapsed()"
      [class.w-20]="isSidebarCollapsed()"
    >
      
      <!-- Brand Logo Area -->
      <div class="h-16 flex items-center justify-center border-b border-gray-50 shrink-0 relative">
        <a href="#" class="flex items-center gap-3 group overflow-hidden whitespace-nowrap px-4 w-full"
           [class.justify-center]="isSidebarCollapsed()" [class.justify-start]="!isSidebarCollapsed()">
          
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#63C3C7] to-[#4FA8AC] flex items-center justify-center text-white shadow-lg shadow-[#63C3C7]/30 flex-shrink-0 transition-transform group-hover:scale-105">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
          </div>
          
          <h1 class="text-lg font-bold text-gray-800 tracking-tight transition-all duration-300"
              [class.opacity-0]="isSidebarCollapsed()" 
              [class.hidden]="isSidebarCollapsed()"
              [class.w-0]="isSidebarCollapsed()">
              {{ dataService.appName() }}
          </h1>
        </a>
      </div>

      <!-- Navigation Links -->
      <nav class="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-1 custom-scrollbar px-3">
        
        <!-- Helper Template cho Menu Item -->
        <ng-template #navItem let-link="link" let-icon="icon" let-label="label">
           <a [routerLink]="link" routerLinkActive="active" 
              class="nav-item flex items-center py-3 rounded-xl text-gray-500 font-medium transition-all duration-200 cursor-pointer hover:bg-gray-50 hover:text-[#63C3C7] group mb-1 relative"
              [class.px-4]="!isSidebarCollapsed()"
              [class.justify-center]="isSidebarCollapsed()"
              [class.px-0]="isSidebarCollapsed()"
              [title]="label"> <!-- Title hiện tooltip khi hover trên máy tính -->
             
             <div class="flex-shrink-0">
                <!-- Icon Dashboard -->
                @if(icon === 'dashboard') { <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg> }
                <!-- Icon Chemical -->
                @if(icon === 'cube') { <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg> }
                <!-- Icon Inventory -->
                @if(icon === 'clipboard') { <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg> }
                <!-- Icon Import -->
                @if(icon === 'download') { <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg> }
                <!-- Icon Export -->
                @if(icon === 'upload') { <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4m16 0l-4-4m4 4l-4 4"></path></svg> }
                <!-- Icon Report -->
                @if(icon === 'chart') { <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> }
                <!-- Icon Settings -->
                @if(icon === 'cog') { <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> }
             </div>
             
             <!-- Label Text (Hidden when collapsed) -->
             <span class="ml-4 whitespace-nowrap overflow-hidden transition-all duration-300"
                   [class.w-0]="isSidebarCollapsed()" 
                   [class.opacity-0]="isSidebarCollapsed()"
                   [class.hidden]="isSidebarCollapsed()">
                {{ label }}
             </span>
           </a>
        </ng-template>

        <!-- Menu Section Header -->
        <div class="mb-2 mt-2 text-xs font-bold text-gray-400 uppercase tracking-wider transition-all duration-300"
             [class.px-4]="!isSidebarCollapsed()"
             [class.text-center]="isSidebarCollapsed()"
             [class.text-[10px]]="isSidebarCollapsed()">
             {{ isSidebarCollapsed() ? '---' : 'Menu' }}
        </div>
        
        <ng-container *ngTemplateOutlet="navItem; context: { link: '/dashboard', icon: 'dashboard', label: 'Tổng quan' }"></ng-container>
        <ng-container *ngTemplateOutlet="navItem; context: { link: '/chemicals', icon: 'cube', label: 'DS Hóa chất' }"></ng-container>
        <ng-container *ngTemplateOutlet="navItem; context: { link: '/inventory', icon: 'clipboard', label: 'Tồn kho' }"></ng-container>

        <!-- Kho vận Section -->
        <div class="mt-6 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider transition-all duration-300"
             [class.px-4]="!isSidebarCollapsed()"
             [class.text-center]="isSidebarCollapsed()"
             [class.text-[10px]]="isSidebarCollapsed()">
             {{ isSidebarCollapsed() ? '---' : 'Kho vận' }}
        </div>
        
        <ng-container *ngTemplateOutlet="navItem; context: { link: '/goods-receipt', icon: 'download', label: 'Nhập kho' }"></ng-container>
        <ng-container *ngTemplateOutlet="navItem; context: { link: '/goods-issue', icon: 'upload', label: 'Xuất kho' }"></ng-container>
        <ng-container *ngTemplateOutlet="navItem; context: { link: '/reports', icon: 'chart', label: 'Báo cáo' }"></ng-container>

        <!-- Admin Section -->
        @if (isAdmin) {
          <div class="mt-6 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider transition-all duration-300"
               [class.px-4]="!isSidebarCollapsed()"
               [class.text-center]="isSidebarCollapsed()"
               [class.text-[10px]]="isSidebarCollapsed()">
               {{ isSidebarCollapsed() ? '---' : 'Hệ thống' }}
          </div>
          <ng-container *ngTemplateOutlet="navItem; context: { link: '/settings', icon: 'cog', label: 'Cài đặt' }"></ng-container>
        }
      </nav>

      <!-- Desktop Toggle Button -->
      <div class="hidden lg:flex justify-end p-2">
         <button (click)="toggleSidebar()" class="p-1.5 rounded-lg text-gray-400 hover:text-[#63C3C7] hover:bg-gray-100 transition-colors" title="Thu gọn / Mở rộng">
            <svg class="w-5 h-5 transform transition-transform duration-300" [class.rotate-180]="isSidebarCollapsed()" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
         </button>
      </div>

      <!-- User Profile Card -->
      <div class="p-4 mt-auto border-t border-gray-100 bg-white z-10" [class.flex-col]="isSidebarCollapsed()">
        <div class="flex items-center gap-3" [class.justify-center]="isSidebarCollapsed()">
          <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[#63C3C7] font-bold text-lg flex-shrink-0 cursor-pointer" [title]="currentUserName">
            {{ currentUserName?.charAt(0) }}
          </div>
          
          <div class="flex-1 min-w-0 transition-all duration-300"
               [class.hidden]="isSidebarCollapsed()" 
               [class.opacity-0]="isSidebarCollapsed()"
               [class.w-0]="isSidebarCollapsed()">
            <p class="text-sm font-bold text-gray-800 truncate">{{ currentUserName }}</p>
            <p class="text-xs text-gray-500 truncate capitalize">{{ isAdmin ? 'Administrator' : 'Nhân viên kho' }}</p>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex mt-3 pt-2 border-t border-gray-50" 
             [class.justify-between]="!isSidebarCollapsed()"
             [class.flex-col]="isSidebarCollapsed()"
             [class.items-center]="isSidebarCollapsed()"
             [class.gap-2]="isSidebarCollapsed()">
             
           <button (click)="openChangePass()" class="text-gray-400 hover:text-[#63C3C7] p-1.5 rounded-lg hover:bg-gray-50 transition-colors" title="Đổi mật khẩu">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
           </button>
           <button (click)="logout()" class="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Đăng xuất">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
           </button>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0 transition-all duration-300 content-transition"
         [class.lg:ml-52]="!isSidebarCollapsed()"
         [class.lg:ml-20]="isSidebarCollapsed()">
         
       <!-- Mobile Header (Visible on small screens only) -->
       <header class="lg:hidden h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
          <div class="flex items-center gap-3">
             <button (click)="toggleMobileMenu()" class="p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
             </button>
             <span class="font-bold text-gray-800 text-lg">{{ dataService.appName() }}</span>
          </div>
          <div class="w-8 h-8 rounded-full bg-[#63C3C7] text-white flex items-center justify-center font-bold text-sm">
             {{ currentUserName?.charAt(0) }}
          </div>
       </header>

       <!-- Content Scroll Area -->
       <main class="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 relative custom-scrollbar overscroll-y-contain touch-pan-y">
           <div class="max-w-7xl mx-auto pb-10">
              <router-outlet></router-outlet>
           </div>
       </main>

       <!-- Fixed Sync Button -->
       @if (isLoggedIn) {
         <button (click)="refreshData()" [class.animate-pulse]="isSyncing()" class="fixed bottom-6 lg:bottom-10 right-6 lg:right-10 z-[60] flex items-center gap-3 px-5 py-3.5 bg-white/95 backdrop-blur-md text-gray-700 font-bold rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 hover:bg-gray-50 transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(99,195,199,0.3)] group cursor-pointer active:translate-y-0">
             <div class="relative flex items-center justify-center">
                 <svg [class.animate-spin]="isSyncing()" class="w-5 h-5 text-[#63C3C7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
             </div>
             <div class="flex flex-col text-left">
                <span class="text-[10px] text-gray-400 font-medium uppercase tracking-wider group-hover:text-[#63C3C7] transition-colors leading-none mb-1">Cập nhật: {{ lastSyncTime() | date:'HH:mm' }}</span>
                <span class="text-sm leading-none group-hover:text-gray-900 transition-colors">{{ isSyncing() ? 'Đang tải...' : 'Làm mới dữ liệu' }}</span>
             </div>
         </button>
       }
    </div>
  } @else {
    <!-- Login Screen (Full width) -->
    <main class="w-full h-full overflow-auto">
      <router-outlet></router-outlet>
    </main>
  }
</div>

<!-- Generic Alert Modal -->
@if (modalState().isOpen) {
  <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md transform transition-all scale-100 border border-gray-100 p-8">
      <div class="flex items-start gap-4">
        @if (modalState().type === 'error') {
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
         <button (click)="modalState.set({ isOpen: false, type: 'error', title: '', message: '' })" class="px-6 py-2.5 rounded-xl bg-[#63C3C7] text-white font-bold hover:bg-[#55a8ac] shadow-lg shadow-[#63C3C7]/20 transition-all">Đã hiểu</button>
      </div>
    </div>
  </div>
}

<!-- Change Password Modal -->
@if (isChangePasswordOpen) {
  <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 border border-gray-100">
      <div class="text-center mb-6">
        <div class="w-12 h-12 rounded-full bg-[#63C3C7]/10 flex items-center justify-center text-[#63C3C7] mx-auto mb-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </div>
        <h3 class="text-xl font-bold text-gray-800">Đổi Mật Khẩu</h3>
        <p class="text-sm text-gray-500">Nhập mật khẩu mới để bảo mật tài khoản</p>
      </div>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2 text-left">Mật khẩu mới</label>
          <input type="password" [value]="newPassword" (input)="newPassword = $any($event.target).value"
                 class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none transition-all tracking-widest bg-gray-50 focus:bg-white"
                 placeholder="••••••">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2 text-left">Xác nhận mật khẩu</label>
          <input type="password" [value]="confirmPassword" (input)="confirmPassword = $any($event.target).value"
                 class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#63C3C7]/10 focus:border-[#63C3C7] outline-none transition-all tracking-widest bg-gray-50 focus:bg-white"
                 placeholder="••••••">
        </div>
        <div class="flex gap-3 pt-2">
          <button (click)="isChangePasswordOpen = false" 
                  class="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold transition-colors">
            Hủy
          </button>
          <button (click)="submitChangePass()"
                  class="flex-1 px-4 py-3 rounded-xl bg-[#63C3C7] text-white hover:bg-[#55a8ac] font-bold shadow-lg shadow-[#63C3C7]/30 transition-all hover:shadow-xl hover:-translate-y-0.5">
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  </div>
}
`,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      height: 100dvh; /* Giúp điện thoại di động hiển thị đúng khi có thanh công cụ trình duyệt */
      overflow: hidden;
    }
    
    /* Smooth transition for width changes */
    .sidebar-transition {
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .content-transition {
      transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Active state styling */
    .nav-item.active {
      background-color: #63C3C7;
      color: white;
      box-shadow: 0 4px 6px -1px rgba(99, 195, 199, 0.4);
    }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class AppComponent {
  auth = inject(AuthService);
  router: Router = inject(Router);
  dataService = inject(DataService);

  // Responsive States
  isSidebarCollapsed = signal(false); // Trạng thái thu gọn trên Desktop
  isMobileMenuOpen = signal(false);   // Trạng thái mở menu trên Mobile
  isLoadingData = signal(true);       // Quá trình tải kết nối ban đầu
  
  isSyncing = signal(false);
  lastSyncTime = signal<Date>(new Date());

  isChangePasswordOpen = false;
  newPassword = '';
  confirmPassword = '';

  modalState = signal<{
    isOpen: boolean;
    type: 'confirm' | 'error' | 'success';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
  });

  declare window: any;

  constructor() {
    initLocalDevGoogleScriptRun(window);
    this.initGas();

    // Tự động đóng menu mobile khi chuyển trang
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.isMobileMenuOpen.set(false);
    });
  }

  initGas() {
    const googleObj = (window as any).google;
    if (typeof googleObj !== 'undefined' && googleObj.script && googleObj.script.run) {
        googleObj.script.run.withSuccessHandler((dataStr: string) => {
            const data = (typeof dataStr === 'string') ? JSON.parse(dataStr) : dataStr;
            this.dataService.initAppData(data);
            this.lastSyncTime.set(new Date());
            this.isLoadingData.set(false);
        }).getInitialAppData();
    } else {
        // Fallback cho môi trường Local
        this.dataService.initLocalDataFallback().then(() => {
            let localUsers: any[] = [];
            try {
              const savedUsers = localStorage.getItem('chem_users_backup');
              if (savedUsers) localUsers = JSON.parse(savedUsers);
            } catch (e) {}
            this.auth.initUsers(localUsers);
            this.lastSyncTime.set(new Date());
            this.isLoadingData.set(false);
        });
    }
  }

  refreshData() {
    this.isSyncing.set(true);
    const googleObj = (window as any).google;
    if (typeof googleObj !== 'undefined' && googleObj.script && googleObj.script.run) {
        googleObj.script.run.withSuccessHandler((dataStr: string) => {
            const data = (typeof dataStr === 'string') ? JSON.parse(dataStr) : dataStr;
            this.dataService.initAppData(data);
            this.lastSyncTime.set(new Date());
            this.isSyncing.set(false);
            this.modalState.set({ isOpen: true, type: 'success', title: 'Thành công', message: 'Dữ liệu đã được đồng bộ mới nhất từ hệ thống!' });
        }).getInitialAppData();
    } else {
        setTimeout(() => {
          this.lastSyncTime.set(new Date());
          this.isSyncing.set(false);
          this.modalState.set({ isOpen: true, type: 'success', title: 'Thành công', message: 'Dữ liệu Local đã được làm mới!' });
        }, 800);
    }
  }

  get isLoggedIn() {
    return this.auth.currentUser() !== null;
  }

  get isAdmin() {
    return this.auth.currentUser()?.role === 'admin';
  }

  get currentUserName() {
    return this.auth.currentUser()?.name;
  }

  // Toggle thu gọn sidebar trên Desktop
  toggleSidebar() {
    this.isSidebarCollapsed.update(v => !v);
  }

  // Toggle mở menu trên Mobile
  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }

  logout() {
    this.auth.logout();
    this.isMobileMenuOpen.set(false);
  }

  openChangePass() {
    this.isChangePasswordOpen = true;
    this.newPassword = '';
    this.confirmPassword = '';
    this.isMobileMenuOpen.set(false); // Đóng menu mobile nếu đang mở
  }

  submitChangePass() {
    if (this.newPassword.length < 3) {
      this.modalState.set({ isOpen: true, type: 'error', title: 'Lỗi', message: 'Mật khẩu quá ngắn!' });
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.modalState.set({ isOpen: true, type: 'error', title: 'Lỗi xác nhận', message: 'Mật khẩu xác nhận không khớp!' });
      return;
    }
    this.auth.changePassword(this.newPassword);
    this.isChangePasswordOpen = false;
    this.modalState.set({ isOpen: true, type: 'success', title: 'Thành công', message: 'Đổi mật khẩu thành công!' });
  }
}
