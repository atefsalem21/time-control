// التحقق من تسجيل الدخول
if (!sessionStorage.getItem('userType') || sessionStorage.getItem('userType') !== 'admin') {
    window.location.href = 'index.html';
}

// تعيين التاريخ الحالي
const today = new Date().toISOString().split('T')[0];
const currentMonth = today.substring(0, 7);

document.getElementById('overviewMonth').value = currentMonth;
document.getElementById('reportMonthAdmin').value = currentMonth;
document.getElementById('comparisonMonth').value = currentMonth;

// إنشاء قائمة الأشهر للفلترة
const branchMonthFilter = document.getElementById('branchMonthFilter');
for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthValue = date.toISOString().substring(0, 7);
    const option = document.createElement('option');
    option.value = monthValue;
    option.textContent = formatMonthYear(monthValue);
    if (i === 0) option.selected = true;
    branchMonthFilter.appendChild(option);
}

// تبديل القائمة الجانبية
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('show');
}

// عرض القسم المحدد
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
    
    document.getElementById(sectionId).classList.add('active');
    event.target.classList.add('active');
    
    if (window.innerWidth <= 992) {
        document.getElementById('sidebar').classList.remove('show');
    }
    
    // تحميل البيانات حسب القسم
    if (sectionId === 'overview') {
        loadOverviewData();
    } else if (sectionId === 'all-branches') {
        loadAllBranchesData();
    } else if (sectionId === 'all-trainers') {
        loadBranchesForFilter();
        loadAllTrainers();
    } else if (sectionId === 'monthly-report') {
        loadBranchesForReport();
    }
}

// تسجيل الخروج
function logout() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}

// تنسيق التاريخ
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
}

// تنسيق الشهر والسنة
function formatMonthYear(monthStr) {
    const [year, month] = monthStr.split('-');
    const monthNames = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 
                       'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}

// تحميل بيانات نظرة عامة
async function loadOverviewData() {
    const selectedMonth = document.getElementById('overviewMonth').value || currentMonth;
    
    try {
        // تحميل جميع البيانات
        const [branchesRes, trainersRes, hoursRes, itemsRes] = await Promise.all([
            fetch('tables/branches?limit=1000'),
            fetch('tables/trainers?limit=1000'),
            fetch('tables/daily_hours?limit=1000'),
            fetch('tables/additional_items?limit=1000')
        ]);
        
        const branches = await branchesRes.json();
        const trainers = await trainersRes.json();
        const hours = await hoursRes.json();
        const items = await itemsRes.json();
        
        // حساب الإحصائيات
        document.getElementById('totalBranches').textContent = branches.data.length;
        document.getElementById('totalTrainersAll').textContent = trainers.data.length;
        document.getElementById('activeTrainersAll').textContent = 
            trainers.data.filter(t => t.status === 'نشط').length;
        
        // حساب الساعات للشهر المحدد
        const monthHours = hours.data.filter(h => h.month === selectedMonth);
        const totalHours = monthHours.reduce((sum, h) => 
            sum + (parseFloat(h.hours_24) || 0) + (parseFloat(h.hours_16) || 0), 0
        );
        document.getElementById('monthlyHoursAll').textContent = totalHours.toFixed(1);
        
        // حساب البنود الإضافية للشهر المحدد
        const monthItems = items.data.filter(i => i.month === selectedMonth);
        document.getElementById('additionalItemsAll').textContent = monthItems.length;
        
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        alert('حدث خطأ في تحميل البيانات. الرجاء المحاولة مرة أخرى.');
    }
}

// تحميل بيانات جميع الفروع
async function loadAllBranchesData() {
    const selectedMonth = document.getElementById('branchMonthFilter').value || currentMonth;
    const regionFilter = document.getElementById('regionFilter').value;
    
    try {
        // تحميل جميع البيانات
        const [branchesRes, trainersRes, hoursRes, itemsRes] = await Promise.all([
            fetch('tables/branches?limit=1000'),
            fetch('tables/trainers?limit=1000'),
            fetch('tables/daily_hours?limit=1000'),
            fetch('tables/additional_items?limit=1000')
        ]);
        
        const branches = await branchesRes.json();
        const trainers = await trainersRes.json();
        const hours = await hoursRes.json();
        const items = await itemsRes.json();
        
        // فلترة الفروع حسب المنطقة
        let filteredBranches = branches.data;
        if (regionFilter) {
            filteredBranches = filteredBranches.filter(b => b.region === regionFilter);
        }
        
        const container = document.getElementById('branchesContainer');
        container.innerHTML = '';
        
        // عرض بيانات كل فرع
        for (const branch of filteredBranches) {
            const branchTrainers = trainers.data.filter(t => t.branch_id === branch.id);
            const branchHours = hours.data.filter(h => h.branch_id === branch.id && h.month === selectedMonth);
            const branchItems = items.data.filter(i => i.branch_id === branch.id && i.month === selectedMonth);
            
            const totalHours = branchHours.reduce((sum, h) => 
                sum + (parseFloat(h.hours_24) || 0) + (parseFloat(h.hours_16) || 0), 0
            );
            
            let branchHTML = `
                <div class="branch-section">
                    <div class="branch-header">
                        <h3>${branch.branch_name} - ${branch.region}</h3>
                        <div class="branch-stats">
                            <span><i class="fas fa-users"></i> ${branchTrainers.length} مدرب</span>
                            <span><i class="fas fa-clock"></i> ${totalHours.toFixed(1)} ساعة</span>
                            <span><i class="fas fa-plus-circle"></i> ${branchItems.length} بند إضافي</span>
                        </div>
                    </div>
            `;
            
            // عرض بيانات المدربين
            for (const trainer of branchTrainers) {
                const groupPrice = trainer.total_contract / trainer.num_groups;
                const rate24 = groupPrice / 24;
                const rate16 = groupPrice / 16;
                
                // حساب ساعات المدرب
                const trainerHours = branchHours.filter(h => h.trainer_id === trainer.id);
                const total24 = trainerHours.reduce((sum, h) => sum + (parseFloat(h.hours_24) || 0), 0);
                const total16 = trainerHours.reduce((sum, h) => sum + (parseFloat(h.hours_16) || 0), 0);
                
                const payment24 = total24 * rate24;
                const payment16 = total16 * rate16;
                const totalPayment = payment24 + payment16;
                
                // البنود الإضافية للمدرب
                const trainerItems = branchItems.filter(i => i.trainer_id === trainer.id);
                const totalMinutes = trainerItems.reduce((sum, i) => sum + (parseInt(i.duration_minutes) || 0), 0);
                
                branchHTML += `
                    <div class="trainer-card">
                        <div class="trainer-header">
                            <div class="trainer-name">${trainer.name}</div>
                            <span class="status-badge ${trainer.status === 'نشط' ? 'status-active' : 'status-inactive'}">
                                ${trainer.status}
                            </span>
                        </div>
                        <div class="trainer-details">
                            <div class="detail-item">
                                <div class="detail-label">رقم الهاتف</div>
                                <div class="detail-value">${trainer.phone}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">عدد الجروبات</div>
                                <div class="detail-value">${trainer.num_groups} جروب</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">إجمالي التعاقد</div>
                                <div class="detail-value">${trainer.total_contract} جنيه</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">سعر الجروب</div>
                                <div class="detail-value">${groupPrice.toFixed(2)} جنيه</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Rate 24 ساعة</div>
                                <div class="detail-value">${rate24.toFixed(2)} جنيه</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Rate 16 ساعة</div>
                                <div class="detail-value">${rate16.toFixed(2)} جنيه</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">ساعات باكدج 24</div>
                                <div class="detail-value">${total24.toFixed(1)} ساعة</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">ساعات باكدج 16</div>
                                <div class="detail-value">${total16.toFixed(1)} ساعة</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">مستحقات باكدج 24</div>
                                <div class="detail-value">${payment24.toFixed(2)} جنيه</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">مستحقات باكدج 16</div>
                                <div class="detail-value">${payment16.toFixed(2)} جنيه</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">إجمالي الساعات</div>
                                <div class="detail-value" style="color: #667eea; font-size: 16px;">
                                    ${(total24 + total16).toFixed(1)} ساعة
                                </div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">إجمالي المستحقات</div>
                                <div class="detail-value" style="color: #28a745; font-size: 16px;">
                                    ${totalPayment.toFixed(2)} جنيه
                                </div>
                            </div>
                        </div>
                `;
                
                // عرض البنود الإضافية
                if (trainerItems.length > 0) {
                    const totalItemsPayment = trainerItems.reduce((sum, item) => sum + (parseFloat(item.payment) || 0), 0);
                    
                    branchHTML += '<div class="items-list"><h5>البنود الإضافية (إجمالي: ' + totalItemsPayment.toFixed(2) + ' جنيه):</h5>';
                    branchHTML += '<table class="data-table" style="font-size: 12px; margin-top: 10px;"><thead><tr>';
                    branchHTML += '<th>النوع</th><th>التاريخ</th><th>المدة</th><th>الباكدج</th><th>المبلغ</th></tr></thead><tbody>';
                    
                    trainerItems.forEach(item => {
                        const hours = Math.floor(item.duration_minutes / 60);
                        const minutes = item.duration_minutes % 60;
                        const timeText = hours > 0 ? 
                            `${hours}س ${minutes > 0 ? `${minutes}د` : ''}` : 
                            `${minutes}د`;
                        const packageText = item.package_type === '24' ? 'باكدج 24' : (item.package_type === '16' ? 'باكدج 16' : '-');
                        const payment = item.payment ? parseFloat(item.payment).toFixed(2) : '0.00';
                        
                        branchHTML += `<tr>
                            <td>${item.item_type}</td>
                            <td>${item.date}</td>
                            <td>${timeText}</td>
                            <td>${packageText}</td>
                            <td style="color: #28a745;">${payment} ج</td>
                        </tr>`;
                    });
                    
                    branchHTML += '</tbody></table></div>';
                }
                
                branchHTML += '</div>';
            }
            
            branchHTML += '</div>';
            container.innerHTML += branchHTML;
        }
        
        if (filteredBranches.length === 0) {
            container.innerHTML = '<div class="alert alert-info">لا توجد فروع تطابق الفلترة المحددة</div>';
        }
        
    } catch (error) {
        console.error('خطأ في تحميل بيانات الفروع:', error);
        alert('حدث خطأ في تحميل بيانات الفروع. الرجاء المحاولة مرة أخرى.');
    }
}

// فلترة الفروع
function filterBranches() {
    loadAllBranchesData();
}

// تحميل الفروع للفلترة
async function loadBranchesForFilter() {
    try {
        const response = await fetch('tables/branches?limit=1000');
        const data = await response.json();
        
        const select = document.getElementById('trainerBranchFilter');
        select.innerHTML = '<option value="">جميع الفروع</option>';
        
        data.data.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.id;
            option.textContent = branch.branch_name;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('خطأ في تحميل الفروع:', error);
    }
}

// تحميل الفروع للتقارير
async function loadBranchesForReport() {
    try {
        const response = await fetch('tables/branches?limit=1000');
        const data = await response.json();
        
        const select = document.getElementById('reportBranchFilter');
        select.innerHTML = '<option value="">جميع الفروع</option>';
        
        data.data.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.id;
            option.textContent = branch.branch_name;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('خطأ في تحميل الفروع:', error);
    }
}

// تحميل جميع المدربين
async function loadAllTrainers() {
    const branchFilter = document.getElementById('trainerBranchFilter').value;
    const statusFilter = document.getElementById('trainerStatusFilter').value;
    
    try {
        const [trainersRes, branchesRes] = await Promise.all([
            fetch('tables/trainers?limit=1000'),
            fetch('tables/branches?limit=1000')
        ]);
        
        const trainers = await trainersRes.json();
        const branches = await branchesRes.json();
        
        // إنشاء خريطة للفروع
        const branchMap = {};
        branches.data.forEach(b => {
            branchMap[b.id] = b.branch_name;
        });
        
        // فلترة المدربين
        let filteredTrainers = trainers.data;
        if (branchFilter) {
            filteredTrainers = filteredTrainers.filter(t => t.branch_id === branchFilter);
        }
        if (statusFilter) {
            filteredTrainers = filteredTrainers.filter(t => t.status === statusFilter);
        }
        
        const tbody = document.getElementById('allTrainersTable');
        tbody.innerHTML = '';
        
        filteredTrainers.forEach(trainer => {
            const groupPrice = trainer.total_contract / trainer.num_groups;
            const rate24 = groupPrice / 24;
            const rate16 = groupPrice / 16;
            
            const row = `
                <tr>
                    <td>${trainer.name}</td>
                    <td>${branchMap[trainer.branch_id] || 'غير محدد'}</td>
                    <td>${trainer.phone}</td>
                    <td>${trainer.num_groups}</td>
                    <td>${trainer.total_contract} جنيه</td>
                    <td>${groupPrice.toFixed(2)} جنيه</td>
                    <td>${rate24.toFixed(2)} جنيه</td>
                    <td>${rate16.toFixed(2)} جنيه</td>
                    <td><span class="status-badge ${trainer.status === 'نشط' ? 'status-active' : 'status-inactive'}">${trainer.status}</span></td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
        
        if (filteredTrainers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">لا توجد بيانات</td></tr>';
        }
        
    } catch (error) {
        console.error('خطأ في تحميل المدربين:', error);
        alert('حدث خطأ في تحميل المدربين');
    }
}

// إنشاء تقرير الإدارة
async function generateAdminReport() {
    const selectedMonth = document.getElementById('reportMonthAdmin').value;
    const branchFilter = document.getElementById('reportBranchFilter').value;
    
    if (!selectedMonth) {
        alert('الرجاء اختيار الشهر');
        return;
    }
    
    try {
        // تحميل جميع البيانات
        const [branchesRes, trainersRes, hoursRes, itemsRes] = await Promise.all([
            fetch('tables/branches?limit=1000'),
            fetch('tables/trainers?limit=1000'),
            fetch('tables/daily_hours?limit=1000'),
            fetch('tables/additional_items?limit=1000')
        ]);
        
        const branches = await branchesRes.json();
        const trainers = await trainersRes.json();
        const hours = await hoursRes.json();
        const items = await itemsRes.json();
        
        // فلترة البيانات
        let filteredBranches = branches.data;
        if (branchFilter) {
            filteredBranches = filteredBranches.filter(b => b.id === branchFilter);
        }
        
        const monthHours = hours.data.filter(h => h.month === selectedMonth);
        const monthItems = items.data.filter(i => i.month === selectedMonth);
        
        // إنشاء التقرير
        let reportHTML = '<div class="table-container"><table class="data-table"><thead><tr>';
        reportHTML += '<th>الفرع</th><th>المدرب</th><th>باكدج 24</th><th>باكدج 16</th>';
        reportHTML += '<th>إجمالي الساعات</th><th>Rate 24</th><th>Rate 16</th>';
        reportHTML += '<th>مستحقات 24</th><th>مستحقات 16</th><th>الإجمالي</th>';
        reportHTML += '<th>البنود الإضافية</th></tr></thead><tbody>';
        
        let grandTotal = 0;
        let grandHours = 0;
        
        for (const branch of filteredBranches) {
            const branchTrainers = trainers.data.filter(t => t.branch_id === branch.id);
            
            for (const trainer of branchTrainers) {
                const groupPrice = trainer.total_contract / trainer.num_groups;
                const rate24 = groupPrice / 24;
                const rate16 = groupPrice / 16;
                
                const trainerHours = monthHours.filter(h => 
                    h.branch_id === branch.id && h.trainer_id === trainer.id
                );
                const total24 = trainerHours.reduce((sum, h) => sum + (parseFloat(h.hours_24) || 0), 0);
                const total16 = trainerHours.reduce((sum, h) => sum + (parseFloat(h.hours_16) || 0), 0);
                
                const payment24 = total24 * rate24;
                const payment16 = total16 * rate16;
                const totalPayment = payment24 + payment16;
                
                grandTotal += totalPayment;
                grandHours += total24 + total16;
                
                const trainerItems = monthItems.filter(i => 
                    i.branch_id === branch.id && i.trainer_id === trainer.id
                );
                
                const itemsPayment = trainerItems.reduce((sum, item) => sum + (parseFloat(item.payment) || 0), 0);
                
                reportHTML += `<tr>
                    <td>${branch.branch_name}</td>
                    <td>${trainer.name}</td>
                    <td>${total24.toFixed(1)} ساعة</td>
                    <td>${total16.toFixed(1)} ساعة</td>
                    <td><strong>${(total24 + total16).toFixed(1)} ساعة</strong></td>
                    <td>${rate24.toFixed(2)} جنيه</td>
                    <td>${rate16.toFixed(2)} جنيه</td>
                    <td>${payment24.toFixed(2)} جنيه</td>
                    <td>${payment16.toFixed(2)} جنيه</td>
                    <td><strong>${totalPayment.toFixed(2)} جنيه</strong></td>
                    <td>${trainerItems.length} بند (${itemsPayment.toFixed(2)} جنيه)</td>
                </tr>`;
            }
        }
        
        reportHTML += `<tr style="background: #f5f7fa; font-weight: bold;">
            <td colspan="4">الإجمالي الكلي</td>
            <td>${grandHours.toFixed(1)} ساعة</td>
            <td colspan="4"></td>
            <td style="color: #28a745; font-size: 16px;">${grandTotal.toFixed(2)} جنيه</td>
            <td></td>
        </tr>`;
        
        reportHTML += '</tbody></table></div>';
        
        // إضافة تفاصيل البنود الإضافية
        if (monthItems.length > 0) {
            reportHTML += '<h3 class="section-subtitle" style="margin-top: 30px;">تفاصيل البنود الإضافية</h3>';
            
            for (const branch of filteredBranches) {
                const branchTrainers = trainers.data.filter(t => t.branch_id === branch.id);
                
                for (const trainer of branchTrainers) {
                    const trainerItems = monthItems.filter(i => 
                        i.branch_id === branch.id && i.trainer_id === trainer.id
                    );
                    
                    if (trainerItems.length > 0) {
                        const totalItemsPayment = trainerItems.reduce((sum, item) => sum + (parseFloat(item.payment) || 0), 0);
                        
                        reportHTML += `<div class="table-container" style="margin-top: 20px;">`;
                        reportHTML += `<h4 style="padding: 10px; background: #f5f7fa; border-radius: 8px;">${branch.branch_name} - ${trainer.name} (إجمالي: ${totalItemsPayment.toFixed(2)} جنيه)</h4>`;
                        reportHTML += '<table class="data-table"><thead><tr>';
                        reportHTML += '<th>نوع البند</th><th>التاريخ</th><th>المدة</th><th>الباكدج</th><th>Rate/ساعة</th><th>المبلغ</th></tr></thead><tbody>';
                        
                        trainerItems.forEach(item => {
                            const hours = Math.floor(item.duration_minutes / 60);
                            const minutes = item.duration_minutes % 60;
                            const durationText = hours > 0 ? 
                                `${hours} ساعة ${minutes > 0 ? `و ${minutes} دقيقة` : ''}` : 
                                `${minutes} دقيقة`;
                            
                            const packageText = item.package_type === '24' ? 'باكدج 24' : (item.package_type === '16' ? 'باكدج 16' : '-');
                            const rate = item.rate_per_hour ? parseFloat(item.rate_per_hour).toFixed(2) : '0.00';
                            const payment = item.payment ? parseFloat(item.payment).toFixed(2) : '0.00';
                            const itemDate = item.date ? new Date(item.date).toLocaleDateString('ar-EG') : '-';
                            
                            reportHTML += `<tr>
                                <td>${item.item_type}</td>
                                <td>${itemDate}</td>
                                <td>${durationText}</td>
                                <td>${packageText}</td>
                                <td>${rate} جنيه</td>
                                <td style="color: #28a745; font-weight: bold;">${payment} جنيه</td>
                            </tr>`;
                        });
                        
                        reportHTML += '</tbody></table></div>';
                    }
                }
            }
        }
        
        document.getElementById('adminReportContent').innerHTML = reportHTML;
        
    } catch (error) {
        console.error('خطأ في إنشاء التقرير:', error);
        alert('حدث خطأ في إنشاء التقرير');
    }
}

// تصدير تقرير الإدارة إلى Excel
async function exportAdminToExcel() {
    const selectedMonth = document.getElementById('reportMonthAdmin').value;
    const branchFilter = document.getElementById('reportBranchFilter').value;
    
    if (!selectedMonth) {
        alert('الرجاء اختيار الشهر أولاً');
        return;
    }
    
    try {
        const [branchesRes, trainersRes, hoursRes, itemsRes] = await Promise.all([
            fetch('tables/branches?limit=1000'),
            fetch('tables/trainers?limit=1000'),
            fetch('tables/daily_hours?limit=1000'),
            fetch('tables/additional_items?limit=1000')
        ]);
        
        const branches = await branchesRes.json();
        const trainers = await trainersRes.json();
        const hours = await hoursRes.json();
        const items = await itemsRes.json();
        
        let filteredBranches = branches.data;
        if (branchFilter) {
            filteredBranches = filteredBranches.filter(b => b.id === branchFilter);
        }
        
        const monthHours = hours.data.filter(h => h.month === selectedMonth);
        const monthItems = items.data.filter(i => i.month === selectedMonth);
        
        // إنشاء محتوى CSV
        let csv = '\uFEFF'; // BOM للدعم العربي
        csv += 'التقرير الشهري الشامل - A.E.A Time Control\n';
        csv += 'الشهر,' + formatMonthYear(selectedMonth) + '\n\n';
        csv += 'الفرع,المدرب,رقم الهاتف,عدد الجروبات,إجمالي التعاقد,سعر الجروب,';
        csv += 'باكدج 24 ساعة,باكدج 16 ساعة,إجمالي الساعات,';
        csv += 'Rate 24,Rate 16,مستحقات 24,مستحقات 16,الإجمالي,البنود الإضافية\n';
        
        for (const branch of filteredBranches) {
            const branchTrainers = trainers.data.filter(t => t.branch_id === branch.id);
            
            for (const trainer of branchTrainers) {
                const groupPrice = trainer.total_contract / trainer.num_groups;
                const rate24 = groupPrice / 24;
                const rate16 = groupPrice / 16;
                
                const trainerHours = monthHours.filter(h => 
                    h.branch_id === branch.id && h.trainer_id === trainer.id
                );
                const total24 = trainerHours.reduce((sum, h) => sum + (parseFloat(h.hours_24) || 0), 0);
                const total16 = trainerHours.reduce((sum, h) => sum + (parseFloat(h.hours_16) || 0), 0);
                
                const payment24 = total24 * rate24;
                const payment16 = total16 * rate16;
                const totalPayment = payment24 + payment16;
                
                const trainerItems = monthItems.filter(i => 
                    i.branch_id === branch.id && i.trainer_id === trainer.id
                );
                
                csv += `${branch.branch_name},${trainer.name},${trainer.phone},${trainer.num_groups},`;
                csv += `${trainer.total_contract},${groupPrice.toFixed(2)},`;
                csv += `${total24.toFixed(1)},${total16.toFixed(1)},${(total24 + total16).toFixed(1)},`;
                csv += `${rate24.toFixed(2)},${rate16.toFixed(2)},`;
                csv += `${payment24.toFixed(2)},${payment16.toFixed(2)},${totalPayment.toFixed(2)},`;
                csv += `${trainerItems.length}\n`;
            }
        }
        
        // إضافة تفاصيل البنود الإضافية
        csv += '\n\nتفاصيل البنود الإضافية\n';
        csv += 'الفرع,المدرب,نوع البند,التاريخ,المدة (دقائق),الباكدج,Rate/ساعة,المبلغ المستحق\n';
        
        monthItems.forEach(item => {
            const branch = branches.data.find(b => b.id === item.branch_id);
            const packageText = item.package_type === '24' ? 'باكدج 24' : (item.package_type === '16' ? 'باكدج 16' : '-');
            const rate = item.rate_per_hour ? parseFloat(item.rate_per_hour).toFixed(2) : '0';
            const payment = item.payment ? parseFloat(item.payment).toFixed(2) : '0';
            csv += `${branch ? branch.branch_name : 'غير محدد'},${item.trainer_name},`;
            csv += `${item.item_type},${item.date},${item.duration_minutes},${packageText},${rate},${payment}\n`;
        });
        
        // تنزيل الملف
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `التقرير_الشامل_${selectedMonth}.csv`;
        link.click();
        
    } catch (error) {
        console.error('خطأ في التصدير:', error);
        alert('حدث خطأ في تصدير البيانات');
    }
}

// إنشاء مقارنة الفروع
async function generateComparison() {
    const selectedMonth = document.getElementById('comparisonMonth').value;
    
    if (!selectedMonth) {
        alert('الرجاء اختيار الشهر');
        return;
    }
    
    try {
        const [branchesRes, trainersRes, hoursRes, itemsRes] = await Promise.all([
            fetch('tables/branches?limit=1000'),
            fetch('tables/trainers?limit=1000'),
            fetch('tables/daily_hours?limit=1000'),
            fetch('tables/additional_items?limit=1000')
        ]);
        
        const branches = await branchesRes.json();
        const trainers = await trainersRes.json();
        const hours = await hoursRes.json();
        const items = await itemsRes.json();
        
        const monthHours = hours.data.filter(h => h.month === selectedMonth);
        const monthItems = items.data.filter(i => i.month === selectedMonth);
        
        // حساب إحصائيات كل فرع
        const branchStats = branches.data.map(branch => {
            const branchTrainers = trainers.data.filter(t => t.branch_id === branch.id);
            const activeTrainers = branchTrainers.filter(t => t.status === 'نشط');
            const branchHours = monthHours.filter(h => h.branch_id === branch.id);
            const branchItems = monthItems.filter(i => i.branch_id === branch.id);
            
            const totalHours = branchHours.reduce((sum, h) => 
                sum + (parseFloat(h.hours_24) || 0) + (parseFloat(h.hours_16) || 0), 0
            );
            
            return {
                name: branch.branch_name,
                region: branch.region,
                totalTrainers: branchTrainers.length,
                activeTrainers: activeTrainers.length,
                totalHours: totalHours,
                totalItems: branchItems.length
            };
        });
        
        // ترتيب حسب الساعات
        branchStats.sort((a, b) => b.totalHours - a.totalHours);
        
        let comparisonHTML = '<div class="table-container"><table class="data-table"><thead><tr>';
        comparisonHTML += '<th>الترتيب</th><th>الفرع</th><th>المنطقة</th>';
        comparisonHTML += '<th>عدد المدربين</th><th>المدربين النشطين</th>';
        comparisonHTML += '<th>إجمالي الساعات</th><th>البنود الإضافية</th></tr></thead><tbody>';
        
        branchStats.forEach((stat, index) => {
            const rankClass = index < 3 ? 'style="background: #fff3cd;"' : '';
            comparisonHTML += `<tr ${rankClass}>
                <td><strong>${index + 1}</strong></td>
                <td>${stat.name}</td>
                <td>${stat.region}</td>
                <td>${stat.totalTrainers}</td>
                <td>${stat.activeTrainers}</td>
                <td><strong>${stat.totalHours.toFixed(1)} ساعة</strong></td>
                <td>${stat.totalItems}</td>
            </tr>`;
        });
        
        comparisonHTML += '</tbody></table></div>';
        
        document.getElementById('comparisonContent').innerHTML = comparisonHTML;
        
    } catch (error) {
        console.error('خطأ في إنشاء المقارنة:', error);
        alert('حدث خطأ في إنشاء المقارنة');
    }
}

// تحميل البيانات عند تحميل الصفحة
loadOverviewData();
