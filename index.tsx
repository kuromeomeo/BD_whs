
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation, Routes } from '@angular/router';
import { AppComponent } from './src/app.component';
import { LoginComponent } from './src/features/auth/login.component';
import { DashboardComponent } from './src/features/dashboard/dashboard.component';
import { ChemicalListComponent } from './src/features/chemicals/chemical-list.component';
import { InventoryComponent } from './src/features/inventory/inventory.component';
import { SettingsComponent } from './src/features/settings/settings.component';
import { inject } from '@angular/core';
import { AuthService } from './src/core/services/auth.service';
import { GoodsReceiptComponent } from './src/features/goods-receipt/goods-receipt.component';
import { GoodsIssueComponent } from './src/features/goods-issue/goods-issue.component';
import { ReportComponent } from './src/features/reports/report.component';
import { TestResultComponent } from './src/features/test-result/test-result.component';


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
      { path: 'test-results', component: TestResultComponent },
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
