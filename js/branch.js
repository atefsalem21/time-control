// التحقق من تسجيل الدخول
if (!sessionStorage.getItem('branchId') || sessionStorage.getItem('userType') !== 'branch') {
    window.location.href = 'index.html';
}

const branchId = sessionStorage.getItem('branchId');
const branchName = sessionStorage.getItem('branchName');

// عرض اسم الفرع
document.getElementById('branchName').textContent = branchName;

// تعيين التاريخ الحالي
const today = new Date().toISOString().split('T')[0];
document.getElementById('currentDate').textContent = formatDate(today);

// تعيين الشهر الحالي في التقارير
document.getElementById('reportMonth').value = today.substring(0, 7);

// تبديل القائمة الجانبية
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('show');
}

// عرض القسم المحدد
function showSection(sectionId) {
    // إخفاء جميع الأقسام
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // إزالة الفئة النشطة من جميع روابط القائمة
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
    
    // عرض القسم المحدد
    document.getElementById(sectionId).classList.add('active');
    
    // إضافة الفئة النشطة للرابط
    event.target.classList.add('active');
    
    // إغلاق القائمة الجانبية في الهاتف
    if (window.innerWidth <= 992) {
        document.getElementById('sidebar').classList.remove('show');
    }
    
    // تحميل البيانات حسب القسم
    if (sectionId === 'dashboard') {
        loadDashboardStats();
    } else if (sectionId === 'trainers') {
        loadTrainers();
    } else if (sectionId === 'daily-hours') {
        loadActiveTrainers('trainerSelectHours');
        loadTodayHours();
    } else if (sectionId === 'additional-items') {
        loadActiveTrainers('trainerSelectItems');
        loadTodayItems();
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
        day: 'numeric',
        weekday: 'long'
    });
}

// تحميل إحصائيات لوحة المعلومات
async function loadDashboardStats() {
    try {
        // تحميل المدربين
        const trainersRes = await fetch(`tables/trainers?limit=1000`);
        const trainersData = await trainersRes.json();
        const branchTrainers = trainersData.data.filter(t => t.branch_id === branchId);
        
        document.getElementById('totalTrainers').textContent = branchTrainers.length;
        document.getElementById('activeTrainers').textContent = 
            branchTrainers.filter(t => t.status === 'نشط').length;
        
        // تحميل ساعات الشهر الحالي
        const currentMonth = today.substring(0, 7);
        const hoursRes = await fetch(`tables/daily_hours?limit=1000`);
        const hoursData = await hoursRes.json();
        const monthHours = hoursData.data.filter(h => 
            h.branch_id === branchId && h.month === currentMonth
        );
        
        const totalHours = monthHours.reduce((sum, h) => 
            sum + (h.hours_24 || 0) + (h.hours_16 || 0), 0
        );
        document.getElementById('monthlyHours').textContent = totalHours.toFixed(1);
        
        // تحميل البنود الإضافية
        const itemsRes = await fetch(`tables/additional_items?limit=1000`);
        const itemsData = await itemsRes.json();
        const monthItems = itemsData.data.filter(i => 
            i.branch_id === branchId && i.month === currentMonth
        );
        document.getElementById('additionalItems').textContent = monthItems.length;
        
    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
    }
}

// تحميل المدربين
async function loadTrainers() {
    try {
        const response = await fetch(`tables/trainers?limit=1000`);
        const data = await response.json();
        const branchTrainers = data.data.filter(t => t.branch_id === branchId);
        
        const tbody = document.getElementById('trainersTable');
        tbody.innerHTML = '';
        
        branchTrainers.forEach(trainer => {
            const groupPrice = trainer.total_contract / trainer.num_groups;
            const rate24 = groupPrice / 24;
            const rate16 = groupPrice / 16;
            
            const row = `
                <tr>
                    <td>${trainer.name}</td>
                    <td>${trainer.phone}</td>
                    <td>${trainer.num_groups}</td>
                    <td>${trainer.total_contract} جنيه</td>
                    <td>${groupPrice.toFixed(2)} جنيه</td>
                    <td>${rate24.toFixed(2)} جنيه</td>
                    <td>${rate16.toFixed(2)} جنيه</td>
                    <td><span class="status-badge ${trainer.status === 'نشط' ? 'status-active' : 'status-inactive'}">${trainer.status}</span></td>
                    <td>
                        <button class="btn btn-warning btn-sm" onclick="editTrainer('${trainer.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteTrainer('${trainer.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
        
    } catch (error) {
        console.error('خطأ في تحميل المدربين:', error);
        alert('حدث خطأ في تحميل المدربين');
    }
}

// عرض نافذة إضافة مدرب
function showAddTrainerModal() {
    document.getElementById('addTrainerModal').classList.add('show');
}

// إغلاق نافذة إضافة مدرب
function closeAddTrainerModal() {
    document.getElementById('addTrainerModal').classList.remove('show');
    document.getElementById('addTrainerForm').reset();
}

// إضافة مدرب جديد
document.getElementById('addTrainerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const trainerData = {
        branch_id: branchId,
        name: document.getElementById('trainerName').value,
        phone: document.getElementById('trainerPhone').value,
        num_groups: parseInt(document.getElementById('numGroups').value),
        total_contract: parseFloat(document.getElementById('totalContract').value),
        status: document.getElementById('trainerStatus').value,
        created_date: new Date().toISOString()
    };
    
    try {
        const response = await fetch('tables/trainers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trainerData)
        });
        
        if (response.ok) {
            alert('تم إضافة المدرب بنجاح');
            closeAddTrainerModal();
            loadTrainers();
        } else {
            alert('حدث خطأ في إضافة المدرب');
        }
    } catch (error) {
        console.error('خطأ:', error);
        alert('حدث خطأ في إضافة المدرب');
    }
});

// حذف مدرب
async function deleteTrainer(trainerId) {
    if (!confirm('هل أنت متأكد من حذف هذا المدرب؟')) return;
    
    try {
        const response = await fetch(`tables/trainers/${trainerId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('تم حذف المدرب بنجاح');
            loadTrainers();
        } else {
            alert('حدث خطأ في حذف المدرب');
        }
    } catch (error) {
        console.error('خطأ:', error);
        alert('حدث خطأ في حذف المدرب');
    }
}

// تحميل المدربين النشطين
async function loadActiveTrainers(selectId) {
    try {
        const response = await fetch(`tables/trainers?limit=1000`);
        const data = await response.json();
        const activeTrainers = data.data.filter(t => 
            t.branch_id === branchId && t.status === 'نشط'
        );
        
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">-- اختر المدرب --</option>';
        
        activeTrainers.forEach(trainer => {
            const option = document.createElement('option');
            option.value = trainer.id;
            option.textContent = trainer.name;
            option.dataset.name = trainer.name;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('خطأ في تحميل المدربين:', error);
    }
}

// تسجيل الساعات اليومية
document.getElementById('dailyHoursForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const trainerSelect = document.getElementById('trainerSelectHours');
    const trainerId = trainerSelect.value;
    const trainerName = trainerSelect.options[trainerSelect.selectedIndex].dataset.name;
    const hours24 = parseFloat(document.getElementById('hours24').value) || 0;
    const hours16 = parseFloat(document.getElementById('hours16').value) || 0;
    
    if (!trainerId) {
        alert('الرجاء اختيار المدرب');
        return;
    }
    
    if (hours24 === 0 && hours16 === 0) {
        alert('الرجاء إدخال عدد الساعات');
        return;
    }
    
    try {
        // التحقق من وجود سجل لنفس المدرب في نفس اليوم
        const checkRes = await fetch(`tables/daily_hours?limit=1000`);
        
        if (!checkRes.ok) {
            throw new Error('فشل في تحميل البيانات');
        }
        
        const checkData = await checkRes.json();
        const existingRecord = checkData.data.find(h => 
            h.branch_id === branchId && 
            h.trainer_id === trainerId && 
            h.date === today
        );
        
        let response;
        let hoursData;
        
        if (existingRecord) {
            // تحديث السجل الموجود بالإضافة للساعات الموجودة
            hoursData = {
                branch_id: branchId,
                trainer_id: trainerId,
                trainer_name: trainerName,
                date: today,
                hours_24: (parseFloat(existingRecord.hours_24) || 0) + hours24,
                hours_16: (parseFloat(existingRecord.hours_16) || 0) + hours16,
                month: today.substring(0, 7),
                year: parseInt(today.substring(0, 4))
            };
            
            response = await fetch(`tables/daily_hours/${existingRecord.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(hoursData)
            });
        } else {
            // إضافة سجل جديد
            hoursData = {
                branch_id: branchId,
                trainer_id: trainerId,
                trainer_name: trainerName,
                date: today,
                hours_24: hours24,
                hours_16: hours16,
                month: today.substring(0, 7),
                year: parseInt(today.substring(0, 4))
            };
            
            response = await fetch('tables/daily_hours', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(hoursData)
            });
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', errorText);
            throw new Error('فشل في حفظ البيانات');
        }
        
        alert('تم حفظ الساعات بنجاح');
        document.getElementById('dailyHoursForm').reset();
        document.getElementById('hours24').value = '0';
        document.getElementById('hours16').value = '0';
        await loadTodayHours();
        await loadDashboardStats();
        
    } catch (error) {
        console.error('خطأ:', error);
        alert('حدث خطأ في حفظ الساعات: ' + error.message);
    }
});

// تحميل ساعات اليوم
async function loadTodayHours() {
    try {
        const response = await fetch(`tables/daily_hours?limit=1000`);
        
        if (!response.ok) {
            throw new Error('فشل في تحميل البيانات');
        }
        
        const data = await response.json();
        const todayHours = data.data.filter(h => 
            h.branch_id === branchId && h.date === today
        );
        
        const tbody = document.getElementById('todayHoursTable');
        tbody.innerHTML = '';
        
        if (todayHours.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">لا توجد ساعات مسجلة اليوم</td></tr>';
            return;
        }
        
        todayHours.forEach(hour => {
            const hours24 = parseFloat(hour.hours_24) || 0;
            const hours16 = parseFloat(hour.hours_16) || 0;
            const total = hours24 + hours16;
            
            const row = `
                <tr>
                    <td>${hour.trainer_name || 'غير محدد'}</td>
                    <td>${hours24.toFixed(1)} ساعة</td>
                    <td>${hours16.toFixed(1)} ساعة</td>
                    <td><strong>${total.toFixed(1)} ساعة</strong></td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="deleteDailyHours('${hour.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
        
    } catch (error) {
        console.error('خطأ في تحميل الساعات:', error);
        const tbody = document.getElementById('todayHoursTable');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: red;">حدث خطأ في تحميل البيانات</td></tr>';
    }
}

// حذف ساعات اليوم
async function deleteDailyHours(recordId) {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
    
    try {
        const response = await fetch(`tables/daily_hours/${recordId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('تم حذف السجل بنجاح');
            loadTodayHours();
            loadDashboardStats();
        } else {
            alert('حدث خطأ في حذف السجل');
        }
    } catch (error) {
        console.error('خطأ:', error);
        alert('حدث خطأ في حذف السجل');
    }
}

// تسجيل البنود الإضافية
document.getElementById('additionalItemsForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const trainerSelect = document.getElementById('trainerSelectItems');
    const trainerId = trainerSelect.value;
    const trainerName = trainerSelect.options[trainerSelect.selectedIndex].dataset.name;
    const itemType = document.getElementById('itemType').value;
    const duration = parseInt(document.getElementById('itemDuration').value);
    const packageType = document.getElementById('itemPackageType').value;
    
    if (!trainerId || !itemType || !duration || !packageType) {
        alert('الرجاء ملء جميع الحقول');
        return;
    }
    
    // جلب بيانات المدرب لحساب السعر
    try {
        const trainerRes = await fetch(`tables/trainers?limit=1000`);
        const trainerData = await trainerRes.json();
        const trainer = trainerData.data.find(t => t.id === trainerId);
        
        if (!trainer) {
            alert('خطأ في العثور على بيانات المدرب');
            return;
        }
        
        const groupPrice = trainer.total_contract / trainer.num_groups;
        const ratePerHour = packageType === '24' ? (groupPrice / 24) : (groupPrice / 16);
        const durationHours = duration / 60;
        const payment = ratePerHour * durationHours;
        
        const itemData = {
            branch_id: branchId,
            trainer_id: trainerId,
            trainer_name: trainerName,
            item_type: itemType,
            duration_minutes: duration,
            package_type: packageType,
            rate_per_hour: ratePerHour,
            payment: payment,
            date: today,
            month: today.substring(0, 7),
            year: parseInt(today.substring(0, 4))
        };
        
        const response = await fetch('tables/additional_items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData)
        });
        
        if (response.ok) {
            alert('تم إضافة البند بنجاح');
            document.getElementById('additionalItemsForm').reset();
            loadTodayItems();
            loadDashboardStats();
        } else {
            alert('حدث خطأ في إضافة البند');
        }
    } catch (error) {
        console.error('خطأ:', error);
        alert('حدث خطأ في إضافة البند');
    }
});

// تحميل بنود اليوم
async function loadTodayItems() {
    try {
        const response = await fetch(`tables/additional_items?limit=1000`);
        const data = await response.json();
        const todayItems = data.data.filter(i => 
            i.branch_id === branchId && i.date === today
        );
        
        const tbody = document.getElementById('todayItemsTable');
        tbody.innerHTML = '';
        
        if (todayItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد بنود مسجلة اليوم</td></tr>';
            return;
        }
        
        todayItems.forEach(item => {
            const hours = Math.floor(item.duration_minutes / 60);
            const minutes = item.duration_minutes % 60;
            const durationText = hours > 0 ? 
                `${hours} ساعة ${minutes > 0 ? `و ${minutes} دقيقة` : ''}` : 
                `${minutes} دقيقة`;
            
            const packageText = item.package_type === '24' ? 'باكدج 24' : 'باكدج 16';
            const payment = item.payment ? item.payment.toFixed(2) : '0.00';
            
            const row = `
                <tr>
                    <td>${item.trainer_name}</td>
                    <td>${item.item_type}</td>
                    <td>${durationText}</td>
                    <td>${packageText}</td>
                    <td>${payment} جنيه</td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="deleteItem('${item.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
        
    } catch (error) {
        console.error('خطأ في تحميل البنود:', error);
    }
}

// حذف بند إضافي
async function deleteItem(itemId) {
    if (!confirm('هل أنت متأكد من حذف هذا البند؟')) return;
    
    try {
        const response = await fetch(`tables/additional_items/${itemId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('تم حذف البند بنجاح');
            loadTodayItems();
            loadDashboardStats();
        } else {
            alert('حدث خطأ في حذف البند');
        }
    } catch (error) {
        console.error('خطأ:', error);
        alert('حدث خطأ في حذف البند');
    }
}

// إنشاء التقرير
async function generateReport() {
    const selectedMonth = document.getElementById('reportMonth').value;
    
    if (!selectedMonth) {
        alert('الرجاء اختيار الشهر');
        return;
    }
    
    try {
        // تحميل المدربين
        const trainersRes = await fetch(`tables/trainers?limit=1000`);
        const trainersData = await trainersRes.json();
        const branchTrainers = trainersData.data.filter(t => t.branch_id === branchId);
        
        // تحميل الساعات
        const hoursRes = await fetch(`tables/daily_hours?limit=1000`);
        const hoursData = await hoursRes.json();
        const monthHours = hoursData.data.filter(h => 
            h.branch_id === branchId && h.month === selectedMonth
        );
        
        // تحميل البنود الإضافية
        const itemsRes = await fetch(`tables/additional_items?limit=1000`);
        const itemsData = await itemsRes.json();
        const monthItems = itemsData.data.filter(i => 
            i.branch_id === branchId && i.month === selectedMonth
        );
        
        // إنشاء التقرير
        let reportHTML = '<div class="table-container"><table class="data-table"><thead><tr>';
        reportHTML += '<th>المدرب</th><th>باكدج 24</th><th>باكدج 16</th><th>إجمالي الساعات</th>';
        reportHTML += '<th>Rate 24</th><th>Rate 16</th><th>مستحقات 24</th><th>مستحقات 16</th><th>الإجمالي</th>';
        reportHTML += '<th>البنود الإضافية</th></tr></thead><tbody>';
        
        branchTrainers.forEach(trainer => {
            const groupPrice = trainer.total_contract / trainer.num_groups;
            const rate24 = groupPrice / 24;
            const rate16 = groupPrice / 16;
            
            // حساب ساعات المدرب
            const trainerHours = monthHours.filter(h => h.trainer_id === trainer.id);
            const total24 = trainerHours.reduce((sum, h) => sum + (h.hours_24 || 0), 0);
            const total16 = trainerHours.reduce((sum, h) => sum + (h.hours_16 || 0), 0);
            
            const payment24 = total24 * rate24;
            const payment16 = total16 * rate16;
            const totalPayment = payment24 + payment16;
            
            // حساب البنود الإضافية
            const trainerItems = monthItems.filter(i => i.trainer_id === trainer.id);
            const itemsCount = trainerItems.length;
            const itemsMinutes = trainerItems.reduce((sum, i) => sum + i.duration_minutes, 0);
            const itemsHours = (itemsMinutes / 60).toFixed(2);
            const itemsPayment = trainerItems.reduce((sum, i) => sum + (i.payment || 0), 0);
            
            reportHTML += `<tr>
                <td>${trainer.name}</td>
                <td>${total24.toFixed(1)} ساعة</td>
                <td>${total16.toFixed(1)} ساعة</td>
                <td><strong>${(total24 + total16).toFixed(1)} ساعة</strong></td>
                <td>${rate24.toFixed(2)} جنيه</td>
                <td>${rate16.toFixed(2)} جنيه</td>
                <td>${payment24.toFixed(2)} جنيه</td>
                <td>${payment16.toFixed(2)} جنيه</td>
                <td><strong>${totalPayment.toFixed(2)} جنيه</strong></td>
                <td>${itemsCount} بند (${itemsHours} ساعة، ${itemsPayment.toFixed(2)} جنيه)</td>
            </tr>`;
        });
        
        reportHTML += '</tbody></table></div>';
        
        // عرض قائمة البنود الإضافية لكل مدرب
        reportHTML += '<h3 class="section-subtitle" style="margin-top: 30px;">تفاصيل البنود الإضافية</h3>';
        
        branchTrainers.forEach(trainer => {
            const trainerItems = monthItems.filter(i => i.trainer_id === trainer.id);
            
            if (trainerItems.length > 0) {
                // حساب إجمالي مبالغ البنود الإضافية
                const totalItemsPayment = trainerItems.reduce((sum, item) => sum + (item.payment || 0), 0);
                
                reportHTML += `<div class="table-container" style="margin-top: 20px;">`;
                reportHTML += `<h4 style="padding: 10px; background: #f5f7fa; border-radius: 8px;">${trainer.name} - إجمالي البنود الإضافية: ${totalItemsPayment.toFixed(2)} جنيه</h4>`;
                reportHTML += '<table class="data-table"><thead><tr>';
                reportHTML += '<th>نوع البند</th><th>التاريخ</th><th>المدة</th><th>الباكدج</th><th>Rate</th><th>المبلغ</th></tr></thead><tbody>';
                
                trainerItems.forEach(item => {
                    const hours = Math.floor(item.duration_minutes / 60);
                    const minutes = item.duration_minutes % 60;
                    const durationText = hours > 0 ? 
                        `${hours} ساعة ${minutes > 0 ? `و ${minutes} دقيقة` : ''}` : 
                        `${minutes} دقيقة`;
                    
                    const packageText = item.package_type === '24' ? 'باكدج 24' : (item.package_type === '16' ? 'باكدج 16' : '-');
                    const rate = item.rate_per_hour ? item.rate_per_hour.toFixed(2) : '0.00';
                    const payment = item.payment ? item.payment.toFixed(2) : '0.00';
                    
                    reportHTML += `<tr>
                        <td>${item.item_type}</td>
                        <td>${formatDate(item.date)}</td>
                        <td>${durationText}</td>
                        <td>${packageText}</td>
                        <td>${rate} جنيه/ساعة</td>
                        <td style="color: #28a745; font-weight: bold;">${payment} جنيه</td>
                    </tr>`;
                });
                
                reportHTML += '</tbody></table></div>';
            }
        });
        
        document.getElementById('reportContent').innerHTML = reportHTML;
        
    } catch (error) {
        console.error('خطأ في إنشاء التقرير:', error);
        alert('حدث خطأ في إنشاء التقرير');
    }
}

// تصدير إلى Excel
async function exportToExcel() {
    const selectedMonth = document.getElementById('reportMonth').value;
    
    if (!selectedMonth) {
        alert('الرجاء اختيار الشهر أولاً');
        return;
    }
    
    try {
        // تحميل البيانات
        const trainersRes = await fetch(`tables/trainers?limit=1000`);
        const trainersData = await trainersRes.json();
        const branchTrainers = trainersData.data.filter(t => t.branch_id === branchId);
        
        const hoursRes = await fetch(`tables/daily_hours?limit=1000`);
        const hoursData = await hoursRes.json();
        const monthHours = hoursData.data.filter(h => 
            h.branch_id === branchId && h.month === selectedMonth
        );
        
        const itemsRes = await fetch(`tables/additional_items?limit=1000`);
        const itemsData = await itemsRes.json();
        const monthItems = itemsData.data.filter(i => 
            i.branch_id === branchId && i.month === selectedMonth
        );
        
        // إنشاء محتوى CSV
        let csv = '\uFEFF'; // BOM للدعم العربي
        csv += 'الفرع,' + branchName + '\n';
        csv += 'الشهر,' + selectedMonth + '\n\n';
        csv += 'اسم المدرب,باكدج 24 ساعة,باكدج 16 ساعة,إجمالي الساعات,Rate 24,Rate 16,مستحقات 24,مستحقات 16,الإجمالي,البنود الإضافية\n';
        
        branchTrainers.forEach(trainer => {
            const groupPrice = trainer.total_contract / trainer.num_groups;
            const rate24 = groupPrice / 24;
            const rate16 = groupPrice / 16;
            
            const trainerHours = monthHours.filter(h => h.trainer_id === trainer.id);
            const total24 = trainerHours.reduce((sum, h) => sum + (h.hours_24 || 0), 0);
            const total16 = trainerHours.reduce((sum, h) => sum + (h.hours_16 || 0), 0);
            
            const payment24 = total24 * rate24;
            const payment16 = total16 * rate16;
            const totalPayment = payment24 + payment16;
            
            const trainerItems = monthItems.filter(i => i.trainer_id === trainer.id);
            const itemsCount = trainerItems.length;
            
            csv += `${trainer.name},${total24.toFixed(1)},${total16.toFixed(1)},${(total24 + total16).toFixed(1)},`;
            csv += `${rate24.toFixed(2)},${rate16.toFixed(2)},${payment24.toFixed(2)},${payment16.toFixed(2)},${totalPayment.toFixed(2)},${itemsCount}\n`;
        });
        
        // إضافة تفاصيل البنود الإضافية
        csv += '\n\nتفاصيل البنود الإضافية\n';
        csv += 'المدرب,نوع البند,التاريخ,المدة (دقائق),الباكدج,Rate/ساعة,المبلغ المستحق\n';
        
        monthItems.forEach(item => {
            const packageText = item.package_type === '24' ? 'باكدج 24' : (item.package_type === '16' ? 'باكدج 16' : '-');
            const rate = item.rate_per_hour ? item.rate_per_hour.toFixed(2) : '0';
            const payment = item.payment ? item.payment.toFixed(2) : '0';
            csv += `${item.trainer_name},${item.item_type},${item.date},${item.duration_minutes},${packageText},${rate},${payment}\n`;
        });
        
        // تنزيل الملف
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `تقرير_${branchName}_${selectedMonth}.csv`;
        link.click();
        
    } catch (error) {
        console.error('خطأ في التصدير:', error);
        alert('حدث خطأ في تصدير البيانات');
    }
}

// تحميل لوحة المعلومات عند تحميل الصفحة
loadDashboardStats();
