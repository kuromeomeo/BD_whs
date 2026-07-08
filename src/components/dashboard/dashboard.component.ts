
import { Component, inject, computed, ElementRef, ViewChild, AfterViewInit, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../services/data.service';

declare var d3: any;

interface RecentActivity {
  id: string;
  type: 'in' | 'out';
  date: string;
  chemicalName: string;
  quantity: number;
  unit: string;
  user: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-8 animate-fade-in pb-8">
      <!-- Header Section -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <div class="text-sm font-bold text-[#63C3C7] uppercase tracking-wider mb-1">{{ currentDateStr }}</div>
           <h2 class="text-3xl font-extrabold text-gray-800 tracking-tight">Tổng quan Kho</h2>
           <p class="text-gray-500 mt-1">Báo cáo tình hình nhập xuất và tồn kho hóa chất.</p>
        </div>
        <div class="flex gap-3">
            <button routerLink="/goods-receipt" class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm">
                <svg class="w-5 h-5 text-[#63C3C7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                Nhập kho
            </button>
            <button routerLink="/goods-issue" class="flex items-center gap-2 px-4 py-2 bg-[#63C3C7] text-white rounded-xl font-bold hover:bg-[#55a8ac] transition-all shadow-lg shadow-[#63C3C7]/20 hover:-translate-y-0.5">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4m16 0l-4-4m4 4l-4 4"></path></svg>
                Xuất kho
            </button>
        </div>
      </div>
      
      <!-- Summary Cards (KPIs) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <!-- Card 1: Low Stock (Critical) -->
        <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between h-full relative overflow-hidden group hover:shadow-md transition-all cursor-pointer" routerLink="/inventory">
          <div class="absolute right-0 top-0 w-32 h-32 bg-orange-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          <div class="relative z-10">
             <div class="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
               <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
             </div>
             <p class="text-sm text-gray-500 font-bold uppercase tracking-wider">Cảnh báo tồn kho</p>
             <h3 class="text-3xl font-extrabold text-gray-800 mt-1" [class.text-orange-500]="lowStockCount() > 0">
                {{ lowStockCount() }} <span class="text-sm font-medium text-gray-400">mã sắp hết</span>
             </h3>
          </div>
        </div>

        <!-- Card 2: Expiring Soon -->
        <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between h-full relative overflow-hidden group hover:shadow-md transition-all cursor-pointer" routerLink="/inventory">
          <div class="absolute right-0 top-0 w-32 h-32 bg-red-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          <div class="relative z-10">
             <div class="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
               <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
             </div>
             <p class="text-sm text-gray-500 font-bold uppercase tracking-wider">Hạn sử dụng</p>
             <h3 class="text-3xl font-extrabold text-gray-800 mt-1" [class.text-red-500]="expiringSoonCount() > 0">
                {{ expiringSoonCount() }} <span class="text-sm font-medium text-gray-400">lô cần chú ý</span>
             </h3>
          </div>
        </div>
      </div>

      <!-- Charts & Alerts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         <!-- Chart: In/Out Trends -->
         <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 lg:col-span-2 min-h-[400px]">
           <div class="flex justify-between items-center mb-6">
             <div>
                <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-[#63C3C7]"></span>
                    Biểu đồ Nhập / Xuất
                </h3>
                <p class="text-sm text-gray-400">Thống kê 7 ngày gần nhất</p>
             </div>
             <div class="flex gap-4 text-xs font-bold bg-gray-50 p-1.5 rounded-lg">
                <div class="flex items-center gap-2 px-2 py-1"><span class="w-2.5 h-2.5 rounded-full bg-[#63C3C7]"></span> Nhập kho</div>
                <div class="flex items-center gap-2 px-2 py-1"><span class="w-2.5 h-2.5 rounded-full bg-red-400"></span> Xuất kho</div>
             </div>
           </div>
           <div class="w-full h-[300px]" #inOutChart></div>
         </div>
         
         <!-- Action Required List -->
         <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-orange-500"></span>
                Cần xử lý ngay
            </h3>
            
            <!-- Tabs inside widget -->
            <div class="flex p-1 bg-gray-100 rounded-xl mb-4">
                <button (click)="activeAlertTab.set('stock')" class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
                   [class]="activeAlertTab() === 'stock' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'">Tồn thấp</button>
                <button (click)="activeAlertTab.set('expiry')" class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
                   [class]="activeAlertTab() === 'expiry' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'">Hết hạn</button>
            </div>

            <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
                @if(activeAlertTab() === 'stock') {
                    @for (item of lowStockItems(); track item.id) {
                        <div class="p-3 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-between group cursor-pointer hover:bg-orange-100 transition-colors" routerLink="/inventory">
                            <div>
                                <div class="font-bold text-gray-800 text-sm line-clamp-1" [title]="item.name">{{ item.name }}</div>
                                <div class="text-xs text-orange-600 font-semibold mt-0.5">
                                    Còn: {{ item.currentStock }} {{ getUnitName(item.unitId) }}
                                </div>
                            </div>
                            <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-orange-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                            </div>
                        </div>
                    }
                    @if(lowStockItems().length === 0) {
                        <div class="text-center py-8 text-gray-400 text-sm flex flex-col items-center">
                            <svg class="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Tất cả tồn kho đều ổn định
                        </div>
                    }
                } @else {
                    @for (lot of expiringLots(); track lot.key) {
                        <div class="p-3 rounded-xl border flex items-center justify-between group cursor-pointer hover:bg-white transition-colors" 
                             [class]="lot.days <= 0 ? 'bg-red-50 border-red-100 hover:bg-red-100' : 'bg-yellow-50 border-yellow-100 hover:bg-yellow-100'"
                             routerLink="/inventory">
                            <div>
                                <div class="font-bold text-gray-800 text-sm line-clamp-1" [title]="lot.chemicalName">{{ lot.chemicalName }}</div>
                                <div class="text-xs text-gray-500 font-mono mt-0.5">Lot: {{ lot.lotNumber }}</div>
                                <div class="text-[10px] font-bold mt-1" [class]="lot.days <= 0 ? 'text-red-600' : 'text-yellow-700'">
                                    {{ lot.days <= 0 ? 'Đã hết hạn' : 'Còn ' + lot.days + ' ngày' }}
                                </div>
                            </div>
                            <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                 [class]="lot.days <= 0 ? 'text-red-500' : 'text-yellow-600'">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                            </div>
                        </div>
                    }
                    @if(expiringLots().length === 0) {
                         <div class="text-center py-8 text-gray-400 text-sm flex flex-col items-center">
                            <svg class="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Không có lô nào sắp hết hạn
                        </div>
                    }
                }
            </div>
            
            <button routerLink="/inventory" class="w-full mt-4 py-2 text-xs font-bold text-[#63C3C7] bg-[#63C3C7]/10 rounded-lg hover:bg-[#63C3C7] hover:text-white transition-all">
                Xem chi tiết tại Tồn kho
            </button>
         </div>
      </div>

      <!-- Recent Activities Table -->
      <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
         <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-blue-500"></span>
              Giao dịch gần đây
            </h3>
            <button class="text-sm font-bold text-[#63C3C7] hover:underline" routerLink="/reports">Xem tất cả</button>
         </div>
         
         <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
               <thead class="text-xs font-bold text-gray-400 uppercase border-b border-gray-100">
                  <tr>
                     <th class="py-3 px-2">Trạng thái</th>
                     <th class="py-3 px-2">Thời gian</th>
                     <th class="py-3 px-2">Hóa chất / Vật tư</th>
                     <th class="py-3 px-2 text-right">Biến động</th>
                     <th class="py-3 px-2 text-right">Người thực hiện</th>
                  </tr>
               </thead>
               <tbody class="divide-y divide-gray-50">
                  @for (act of recentActivities(); track act.id) {
                     <tr class="group hover:bg-gray-50/80 transition-colors">
                        <td class="py-4 px-2">
                           @if (act.type === 'in') {
                              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#63C3C7]/10 text-[#63C3C7] border border-[#63C3C7]/20">
                                 <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                                 Nhập
                              </span>
                           } @else {
                              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-500 border border-red-100">
                                 <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                                 Xuất
                              </span>
                           }
                        </td>
                        <td class="py-4 px-2 text-sm text-gray-500 font-medium">{{ formatDateTime(act.date) }}</td>
                        <td class="py-4 px-2">
                           <span class="font-bold text-gray-700 block text-sm">{{ act.chemicalName }}</span>
                        </td>
                        <td class="py-4 px-2 text-right">
                           <span class="font-bold text-sm" [class]="act.type === 'in' ? 'text-[#63C3C7]' : 'text-red-500'">
                              {{ act.type === 'in' ? '+' : '-' }}{{ act.quantity }}
                           </span>
                           <span class="text-xs text-gray-400 ml-1 font-medium">{{ act.unit }}</span>
                        </td>
                        <td class="py-4 px-2 text-right">
                           <div class="inline-flex items-center justify-end gap-2">
                               <span class="text-xs font-bold text-gray-600">{{ act.user }}</span>
                               <div class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                   {{ act.user.charAt(0).toUpperCase() }}
                               </div>
                           </div>
                        </td>
                     </tr>
                  }
                  @if (recentActivities().length === 0) {
                     <tr><td colspan="5" class="py-12 text-center text-gray-400 text-sm">Chưa có hoạt động nào được ghi nhận</td></tr>
                  }
               </tbody>
            </table>
         </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class DashboardComponent implements AfterViewInit {
  dataService = inject(DataService);

  @ViewChild('inOutChart') inOutChartRef!: ElementRef;
  
  activeAlertTab = signal<'stock' | 'expiry'>('stock');

  get currentDateStr() {
    return new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  // --- Computed Metrics ---
  totalChemicals = computed(() => this.dataService.chemicals().length);
  
  lowStockCount = computed(() => {
    return this.dataService.chemicals().filter(c => c.lowStockThreshold !== undefined && c.currentStock <= c.lowStockThreshold).length;
  });

  lowStockItems = computed(() => {
    return this.dataService.chemicals()
        .filter(c => c.lowStockThreshold !== undefined && c.currentStock <= c.lowStockThreshold)
        .sort((a, b) => a.currentStock - b.currentStock)
        .slice(0, 10);
  });

  expiringSoonCount = computed(() => {
    return this.calculateExpiringLots().length;
  });

  expiringLots = computed(() => {
    return this.calculateExpiringLots().slice(0, 10);
  });
  
  todayActivities = computed(() => {
    const todayObj = new Date();
    const localTodayYMD = todayObj.getFullYear() + '-' + String(todayObj.getMonth() + 1).padStart(2, '0') + '-' + String(todayObj.getDate()).padStart(2, '0');
    
    const receipts = this.dataService.goodsReceipts().filter(r => {
       if (!r.createdDate) return false;
       const dObj = new Date(r.createdDate);
       const rLocalYMD = dObj.getFullYear() + '-' + String(dObj.getMonth() + 1).padStart(2, '0') + '-' + String(dObj.getDate()).padStart(2, '0');
       return rLocalYMD === localTodayYMD;
    }).length;
    
    const issues = this.dataService.goodsIssues().filter(i => {
       if (!i.createdDate) return false;
       const dObj = new Date(i.createdDate);
       const iLocalYMD = dObj.getFullYear() + '-' + String(dObj.getMonth() + 1).padStart(2, '0') + '-' + String(dObj.getDate()).padStart(2, '0');
       return iLocalYMD === localTodayYMD;
    }).length;
    
    return receipts + issues;
  });

  recentActivities = computed(() => {
    const receipts: RecentActivity[] = this.dataService.goodsReceipts().map(r => ({
      id: r.id, type: 'in', date: r.createdDate,
      chemicalName: this.getChemicalName(r.chemicalId),
      quantity: r.quantity,
      unit: this.getUnitName(this.getChemical(r.chemicalId)?.unitId),
      user: r.createdBy
    }));
    
    const issues: RecentActivity[] = this.dataService.goodsIssues().map(i => {
       const chem = this.getChemical(i.chemicalId);
       return {
        id: i.id, type: 'out', date: i.createdDate,
        chemicalName: chem?.name || '---',
        quantity: i.quantity,
        unit: i.isSubUnit ? (chem?.subItemName || '') : this.getUnitName(chem?.unitId),
        user: i.createdBy
      };
    });

    return [...receipts, ...issues]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  });

  chartsDataTrigger = computed(() => {
     return {
        receipts: this.dataService.goodsReceipts(),
        issues: this.dataService.goodsIssues(),
     };
  });

  constructor() {
    effect(() => {
        const data = this.chartsDataTrigger();
        setTimeout(() => {
            this.drawInOutChart();
        }, 100);
    });
  }

  ngAfterViewInit() { }

  // --- Logic Helpers ---
  getChemical(id: string) { return this.dataService.chemicals().find(c => c.id === id); }
  getChemicalName(id: string) { return this.getChemical(id)?.name || '---'; }
  getUnitName(id: string | undefined) { return this.dataService.units().find(u => u.id === id)?.name || '---'; }
  formatDateTime(d: string) { 
      return new Date(d).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
  }

  calculateExpiringLots() {
      const warning = this.dataService.warningThresholdDays();
      const receipts = this.dataService.goodsReceipts();
      const issues = this.dataService.goodsIssues();
      const today = new Date().getTime();

      // Simple calculation of remaining quantity per lot
      const lots = new Map<string, {expiry: string, qty: number, chemId: string, lot: string}>();
      receipts.forEach(r => {
        const key = `${r.chemicalId}_${r.lotNumber}`;
        if (!lots.has(key)) lots.set(key, {expiry: r.expiryDate, qty: 0, chemId: r.chemicalId, lot: r.lotNumber});
        lots.get(key)!.qty += r.quantity;
      });
      issues.forEach(i => {
         const key = `${i.chemicalId}_${i.lotNumber}`;
         // Note: Assuming primary unit match for dashboard simplicity
         if (lots.has(key)) lots.get(key)!.qty -= i.quantity;
      });

      const expiringList: any[] = [];
      lots.forEach(val => {
          if (val.qty > 0.01) {
              const exp = new Date(val.expiry).getTime();
              const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
              if (daysLeft <= warning) {
                  expiringList.push({
                      key: `${val.chemId}_${val.lot}`,
                      chemicalName: this.getChemicalName(val.chemId),
                      lotNumber: val.lot,
                      days: daysLeft
                  });
              }
          }
      });
      
      return expiringList.sort((a, b) => a.days - b.days);
  }

  // --- Chart D3 ---
  drawInOutChart() {
    if (!this.inOutChartRef || typeof d3 === 'undefined') return;
    const element = this.inOutChartRef.nativeElement;
    d3.select(element).selectAll('*').remove();

    // Data 7 days
    const days = 7;
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const localYMD = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        
        const inQty = this.dataService.goodsReceipts().filter(r => {
            if (!r.receiptDate) return false;
            const dObj = new Date(r.receiptDate);
            const rLocalYMD = dObj.getFullYear() + '-' + String(dObj.getMonth() + 1).padStart(2, '0') + '-' + String(dObj.getDate()).padStart(2, '0');
            const storedYMD = r.receiptDate.length === 10 ? r.receiptDate : rLocalYMD;
            return storedYMD === localYMD;
        }).reduce((sum, r) => sum + r.quantity, 0);

        const outQty = this.dataService.goodsIssues().filter(i => {
            if (!i.issueDate) return false;
            const dObj = new Date(i.issueDate);
            const iLocalYMD = dObj.getFullYear() + '-' + String(dObj.getMonth() + 1).padStart(2, '0') + '-' + String(dObj.getDate()).padStart(2, '0');
            const storedYMD = i.issueDate.length === 10 ? i.issueDate : iLocalYMD;
            return storedYMD === localYMD;
        }).reduce((sum, i) => sum + i.quantity, 0);

        data.push({ date: d.toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'}), in: inQty, out: outQty });
    }

    const margin = {top: 20, right: 20, bottom: 30, left: 40};
    const width = element.offsetWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(element)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${element.offsetWidth} 300`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().range([0, width]).domain(data.map((d: any) => d.date)).padding(0.3);
    const maxVal = Math.max(...data.map((d: any) => Math.max(d.in, d.out)), 5);
    const y = d3.scaleLinear().domain([0, maxVal * 1.1]).range([height, 0]);

    // Grid lines
    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""))
      .style("stroke-dasharray", ("3,3"))
      .style("stroke-opacity", 0.1);

    // Axes
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x)).selectAll("text").style("color", "#9CA3AF").style("font-size", "11px");
    svg.append("g").call(d3.axisLeft(y).ticks(5)).style("color", "#9CA3AF").style("font-size", "11px");
    svg.selectAll(".domain").style("display", "none");

    const xSubgroup = d3.scaleBand().domain(['in', 'out']).range([0, x.bandwidth()]).padding(0.1);

    // Bars In
    svg.selectAll(".bar-in")
      .data(data)
      .enter().append("rect")
      .attr("x", (d: any) => x(d.date)!)
      .attr("y", (d: any) => y(d.in))
      .attr("width", xSubgroup.bandwidth())
      .attr("height", (d: any) => height - y(d.in))
      .attr("fill", "url(#gradIn)")
      .attr("rx", 3);

    // Bars Out
    svg.selectAll(".bar-out")
      .data(data)
      .enter().append("rect")
      .attr("x", (d: any) => x(d.date)! + xSubgroup.bandwidth())
      .attr("y", (d: any) => y(d.out))
      .attr("width", xSubgroup.bandwidth())
      .attr("height", (d: any) => height - y(d.out))
      .attr("fill", "url(#gradOut)")
      .attr("rx", 3);

    // Gradients
    const defs = svg.append("defs");
    
    const gradIn = defs.append("linearGradient").attr("id", "gradIn").attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
    gradIn.append("stop").attr("offset", "0%").style("stop-color", "#63C3C7");
    gradIn.append("stop").attr("offset", "100%").style("stop-color", "#4FA8AC");

    const gradOut = defs.append("linearGradient").attr("id", "gradOut").attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
    gradOut.append("stop").attr("offset", "0%").style("stop-color", "#F87171");
    gradOut.append("stop").attr("offset", "100%").style("stop-color", "#EF4444");
  }
}
