
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex min-h-screen items-center justify-center p-6 bg-gradient-to-br from-[#63C3C7]/20 to-gray-100">
      <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div class="h-2 bg-[#63C3C7]"></div>
        <div class="p-8 md:p-10">
          <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#63C3C7]/10 text-[#63C3C7] mb-4">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            </div>
            <h2 class="text-3xl font-extrabold text-gray-800 tracking-tight">Đăng Nhập</h2>
            <p class="text-gray-500 mt-2">Hệ thống Quản lý Kho Hóa chất</p>
          </div>

          <form (submit)="onLogin($event)" class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1 ml-1">Mã Nhân Viên</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                </div>
                <input type="text" [ngModel]="code" (ngModelChange)="code = $event.toUpperCase()" name="code" 
                       class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#63C3C7] focus:ring-2 focus:ring-[#63C3C7]/20 outline-none transition-all bg-gray-50 focus:bg-white uppercase"
                       placeholder="VD: ADMIN" required>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1 ml-1">Mật khẩu</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <input type="password" [(ngModel)]="password" name="password"
                       class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#63C3C7] focus:ring-2 focus:ring-[#63C3C7]/20 outline-none transition-all bg-gray-50 focus:bg-white"
                       placeholder="••••••" required>
              </div>
            </div>

            @if (errorMsg) {
              <div class="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {{ errorMsg }}
              </div>
            }

            <button type="submit" 
                    class="w-full bg-[#63C3C7] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#63C3C7]/30 hover:bg-[#55a8ac] hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200">
              Đăng nhập hệ thống
            </button>
          </form>

          <div class="mt-8 text-center text-xs text-gray-400">
             &copy; 2026 Designed by Tuấn Phú
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  auth = inject(AuthService);
  code = '';
  password = '';
  errorMsg = '';

  onLogin(e: Event) {
    e.preventDefault();
    if (!this.auth.login(this.code, this.password)) {
      this.errorMsg = 'Mã nhân viên hoặc mật khẩu không đúng!';
    } else {
      this.errorMsg = '';
    }
  }
}
