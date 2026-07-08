import re
import os

# 1. Update app.component.ts (Sidebar width)
app_path = r'd:\BATY\App\app-quan-ly-kho\src\app.component.ts'
with open(app_path, 'r', encoding='utf-8') as f:
    app_content = f.read()

app_content = app_content.replace('[class.w-72]="!isSidebarCollapsed()"', '[class.w-64]="!isSidebarCollapsed()"')
app_content = app_content.replace('lg:ml-72', 'lg:ml-64')

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(app_content)


# 2. Update report.component.ts
report_path = r'd:\BATY\App\app-quan-ly-kho\src\components\reports\report.component.ts'
with open(report_path, 'r', encoding='utf-8') as f:
    rep_content = f.read()

# a. Receipt Table CreatedBy
old_rec = '''                                    <td class="px-6 py-4">
                                        <div class="font-bold text-gray-800">{{ getChemical(item.chemicalId)?.name }}</div>
                                    </td>'''
new_rec = '''                                    <td class="px-6 py-4">
                                        <div class="font-bold text-gray-800">{{ getChemical(item.chemicalId)?.name }}</div>
                                        <div class="text-[10px] text-gray-400 mt-1">Tạo bởi {{ item.createdBy || 'Quản trị viên' }} • {{ item.createdDate ? formatDateTime(item.createdDate) : formatDate(item.receiptDate) }}</div>
                                    </td>'''
rep_content = rep_content.replace(old_rec, new_rec)

# b. Issue Table CreatedBy
old_iss = '''                                    <td class="px-6 py-4">
                                        <div class="font-bold text-gray-800">{{ getChemical(item.chemicalId)?.name }}</div>
                                    </td>'''
new_iss = '''                                    <td class="px-6 py-4">
                                        <div class="font-bold text-gray-800">{{ getChemical(item.chemicalId)?.name }}</div>
                                        <div class="text-[10px] text-gray-400 mt-1">Tạo bởi {{ item.createdBy || 'Quản trị viên' }} • {{ item.createdDate ? formatDateTime(item.createdDate) : formatDate(item.issueDate) }}</div>
                                    </td>'''
rep_content = rep_content.replace(old_iss, new_iss)

# c. Usage details width th
old_usg_th_1 = '<th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Ngày xuất</th>'
new_usg_th_1 = '<th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[100px]">Ngày xuất</th>'
rep_content = rep_content.replace(old_usg_th_1, new_usg_th_1)

old_usg_th_2 = '<th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">{{ col.label }}</th>'
new_usg_th_2 = '<th class="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[120px]">{{ col.label }}</th>'
rep_content = rep_content.replace(old_usg_th_2, new_usg_th_2)

# d. Usage details width td
old_usg_td_1 = '<td class="px-6 py-4 text-sm text-gray-600">{{ formatDate(item.issueDate) }}</td>'
new_usg_td_1 = '<td class="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{{ formatDate(item.issueDate) }}</td>'
rep_content = rep_content.replace(old_usg_td_1, new_usg_td_1)

old_usg_td_2 = '<td class="px-6 py-4 text-sm text-gray-800">{{ item.details[col.key] || \'---\' }}</td>'
new_usg_td_2 = '<td class="px-6 py-4 text-sm text-gray-800 whitespace-nowrap">{{ item.details[col.key] || \'---\' }}</td>'
rep_content = rep_content.replace(old_usg_td_2, new_usg_td_2)

with open(report_path, 'w', encoding='utf-8') as f:
    f.write(rep_content)

print("Patch applied")
