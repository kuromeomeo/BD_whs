
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation, Routes } from '@angular/router';
import { AppComponent } from './src/app.component';
import { LoginComponent } from './src/components/login/login.component';
import { DashboardComponent } from './src/components/dashboard/dashboard.component';
import { ChemicalListComponent } from './src/components/chemicals/chemical-list.component';
import { InventoryComponent } from './src/components/inventory/inventory.component';
import { SettingsComponent } from './src/components/settings/settings.component';
import { inject } from '@angular/core';
import { AuthService } from './src/services/auth.service';
import { GoodsReceiptComponent } from './src/components/goods-receipt/goods-receipt.component';
import { GoodsIssueComponent } from './src/components/goods-issue/goods-issue.component';
import { ReportComponent } from './src/components/reports/report.component';

const authGuard = () => {
  const auth = inject(AuthService);
  if (auth.currentUser()) return true;
  auth.logout(); // Redirects to login
  return false;
};

const adminGuard = () => {
  const auth = inject(AuthService);
  return auth.currentUser()?.role === 'admin';
};

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { 
    path: '', 
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'chemicals', component: ChemicalListComponent },
      { path: 'inventory', component: InventoryComponent },
      { path: 'goods-receipt', component: GoodsReceiptComponent },
      { path: 'goods-issue', component: GoodsIssueComponent },
      { path: 'reports', component: ReportComponent },
      { path: 'settings', component: SettingsComponent, canActivate: [adminGuard] },
    ]
  },
  { path: '**', redirectTo: 'login' }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation())
  ]
}).catch((err) => console.error(err));

// AI Studio always uses an `index.tsx` file for all project types.
