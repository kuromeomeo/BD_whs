import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface UserPermissions {
  canApproveLot: boolean;
  canEditReceipt: boolean;
  canDeleteReceipt: boolean;
  canEditIssue: boolean;
  canDeleteIssue: boolean;
  canAddChemical?: boolean;
}

export interface User {
  id: string;
  code: string;
  name: string;
  password?: string;
  role: 'admin' | 'user';
  permissions?: UserPermissions;
}

// Helper để nhận diện môi trường Google Apps Script
declare const google: any;
const isGasEnvironment = typeof google !== 'undefined' && google.script && google.script.run;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _users = signal<User[]>([]);
  currentUser = signal<User | null>(null);
  
  private inactivityTimeout = 30 * 60 * 1000; // 30 mins
  private timeoutId: any;

  constructor(private router: Router) {
    const saved = sessionStorage.getItem('chem_user');
    if (saved) {
      this.currentUser.set(JSON.parse(saved));
      this.setupInactivityTimer();
    }
  }

  setupInactivityTimer() {
    this.resetTimer();
    window.addEventListener('mousemove', this.resetTimer.bind(this));
    window.addEventListener('keydown', this.resetTimer.bind(this));
    window.addEventListener('scroll', this.resetTimer.bind(this));
    window.addEventListener('touchstart', this.resetTimer.bind(this));
  }

  resetTimer() {
    if (!this.currentUser()) return;
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.logout(true), this.inactivityTimeout);
  }

  // Khởi tạo List Users. Được gọi từ DataService khi ứng dụng load lần đầu
  initUsers(loadedUsers: User[]) {
    if (loadedUsers && loadedUsers.length > 0) {
      this._users.set(loadedUsers);
    } else {
      // Dữ liệu mặc định nếu Sheet Users trống
      const defaultUsers: User[] = [
        { 
          id: '1', code: 'ADMIN', name: 'Quản trị viên', password: '123', role: 'admin',
          permissions: { canApproveLot: true, canEditReceipt: true, canDeleteReceipt: true, canEditIssue: true, canDeleteIssue: true, canAddChemical: true }
        }
      ];
      this._users.set(defaultUsers);
      this.syncUsersToGas();
    }
  }

  getUsers() {
    return this._users;
  }

  private syncUsersToGas() {
    // Lưu vào LocalStorage làm backup cho dev mode
    localStorage.setItem('chem_users_backup', JSON.stringify(this._users()));
    
    // Gửi lên Google Apps Script
    if (isGasEnvironment) {
       google.script.run.saveTable('Users', JSON.stringify(this._users()));
    }
  }

  private generateNextUserId(): string {
    const list = this._users();
    if (!list || list.length === 0) return 'NV01';
    let maxNum = 0;
    for (const user of list) {
        if (user.id && user.id.startsWith('NV')) {
            const numPart = user.id.substring(2);
            const parsed = parseInt(numPart, 10);
            if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
        }
    }
    return `NV${(maxNum + 1).toString().padStart(2, '0')}`;
  }

  addUser(user: User) {
    if (!user.id || user.id.length > 10) {
        user.id = this.generateNextUserId();
    }
    this._users.update(users => [...users, user]);
    this.syncUsersToGas();
  }

  updateUser(updatedUser: User) {
    this._users.update(users => users.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (this.currentUser()?.id === updatedUser.id) {
      this.currentUser.set(updatedUser);
      sessionStorage.setItem('chem_user', JSON.stringify(updatedUser));
    }
    this.syncUsersToGas();
  }

  deleteUser(id: string) {
    const userToDelete = this._users().find(u => u.id === id);
    if (!userToDelete) return;
    if (userToDelete.code === 'admin') throw new Error('Không thể xóa tài khoản Quản trị viên gốc.');
    if (this.currentUser()?.id === id) throw new Error('Bạn không thể tự xóa tài khoản của chính mình.');
    
    this._users.update(users => users.filter(u => u.id !== id));
    this.syncUsersToGas();
  }

  login(code: string, pass: string): boolean {
    const user = this._users().find(u => u.code.toUpperCase() === code.toUpperCase() && u.password === pass);
    if (user) {
      const safeUser = { ...user };
      this.currentUser.set(safeUser);
      localStorage.setItem('chem_user', JSON.stringify(safeUser));
      this.router.navigate(['/dashboard']);
      return true;
    }
    return false;
  }

  logout(autoOut = false) {
    this.currentUser.set(null);
    sessionStorage.removeItem('chem_user');
    clearTimeout(this.timeoutId);
    if (autoOut) {
       alert("Phiên đăng nhập đã hết hạn do không có thao tác. Vui lòng đăng nhập lại.");
    }
    this.router.navigate(['/login']);
  }

  changePassword(newPass: string) {
    const current = this.currentUser();
    if (current) {
      const updated = { ...current, password: newPass };
      this.updateUser(updated);
    }
  }

  hasPermission(permission: keyof UserPermissions): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    return !!user.permissions?.[permission];
  }
}
