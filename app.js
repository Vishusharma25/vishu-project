// ==================================================
// STUDENT RECORD MANAGEMENT SYSTEM - ULTIMATE EDITION
// With Charts, Dark Mode, CSV Export, Bulk Operations
// ==================================================

// Student Data Manager Class
class StudentManager {
    constructor() {
        this.students = this.loadFromStorage();
        this.editingId = null;
        this.selectedIds = new Set();
    }

    loadFromStorage() {
        const data = localStorage.getItem('studentRecords');
        return data ? JSON.parse(data) : [];
    }

    saveToStorage() {
        try {
            localStorage.setItem('studentRecords', JSON.stringify(this.students));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                alert('Storage limit exceeded! Please delete some records or use smaller photos.');
            }
        }
    }

    addStudent(studentData) {
        if (this.students.some(s => s.studentId === studentData.studentId)) {
            throw new Error('Student ID already exists!');
        }

        const student = {
            ...studentData,
            id: Date.now().toString(),
            createdAt: new Date().toISOString()
        };

        this.students.push(student);
        this.saveToStorage();
        return student;
    }

    updateStudent(id, studentData) {
        const index = this.students.findIndex(s => s.id === id);
        if (index === -1) throw new Error('Student not found!');

        const existingStudent = this.students.find(s =>
            s.studentId === studentData.studentId && s.id !== id
        );

        if (existingStudent) {
            throw new Error('Student ID already exists!');
        }

        // Preserve existing photo if not updated
        const currentPhoto = this.students[index].photo;

        this.students[index] = {
            ...this.students[index],
            ...studentData,
            photo: studentData.photo || currentPhoto, // Keep old photo if new one is null/undefined
            updatedAt: new Date().toISOString()
        };

        this.saveToStorage();
        return this.students[index];
    }

    deleteStudent(id) {
        const index = this.students.findIndex(s => s.id === id);
        if (index === -1) throw new Error('Student not found!');

        const deleted = this.students.splice(index, 1)[0];
        this.saveToStorage();
        return deleted;
    }

    bulkDelete(ids) {
        ids.forEach(id => {
            const index = this.students.findIndex(s => s.id === id);
            if (index !== -1) {
                this.students.splice(index, 1);
            }
        });
        this.saveToStorage();
    }

    getAllStudents() {
        return [...this.students];
    }

    getStudentById(id) {
        return this.students.find(s => s.id === id);
    }

    searchStudents(query) {
        const lowerQuery = query.toLowerCase();
        return this.students.filter(student =>
            student.name.toLowerCase().includes(lowerQuery) ||
            student.studentId.toLowerCase().includes(lowerQuery) ||
            student.email.toLowerCase().includes(lowerQuery) ||
            student.phone.includes(lowerQuery)
        );
    }

    filterStudents(filters) {
        return this.students.filter(student => {
            if (filters.course && student.course !== filters.course) return false;
            if (filters.year && student.year !== filters.year) return false;
            return true;
        });
    }

    sortByName(ascending = true) {
        this.students.sort((a, b) => {
            const comparison = a.name.localeCompare(b.name);
            return ascending ? comparison : -comparison;
        });
    }

    sortByGPA(ascending = false) {
        this.students.sort((a, b) => {
            const gpaA = parseFloat(a.gpa) || 0;
            const gpaB = parseFloat(b.gpa) || 0;
            return ascending ? gpaA - gpaB : gpaB - gpaA;
        });
    }

    getStatistics() {
        const total = this.students.length;
        const avgGPA = total > 0
            ? (this.students.reduce((sum, s) => sum + (parseFloat(s.gpa) || 0), 0) / total).toFixed(2)
            : '0.00';
        const topGPA = total > 0
            ? Math.max(...this.students.map(s => parseFloat(s.gpa) || 0)).toFixed(2)
            : '0.00';
        const courses = new Set(this.students.map(s => s.course)).size;

        return { total, avgGPA, topGPA, courses };
    }

    getCourseDistribution() {
        const distribution = {};
        this.students.forEach(s => {
            distribution[s.course] = (distribution[s.course] || 0) + 1;
        });
        return distribution;
    }

    getGPADistribution() {
        const ranges = {
            '9.0-10.0': 0,
            '8.0-9.0': 0,
            '7.0-8.0': 0,
            '6.0-7.0': 0,
            'Below 6.0': 0
        };

        this.students.forEach(s => {
            const gpa = parseFloat(s.gpa) || 0;
            if (gpa >= 9.0) ranges['9.0-10.0']++;
            else if (gpa >= 8.0) ranges['8.0-9.0']++;
            else if (gpa >= 7.0) ranges['7.0-8.0']++;
            else if (gpa >= 6.0) ranges['6.0-7.0']++;
            else ranges['Below 6.0']++;
        });

        return ranges;
    }

    getYearDistribution() {
        const distribution = { '1': 0, '2': 0, '3': 0, '4': 0 };
        this.students.forEach(s => {
            distribution[s.year] = (distribution[s.year] || 0) + 1;
        });
        return distribution;
    }

    exportToJSON() {
        return JSON.stringify(this.students, null, 2);
    }

    exportToCSV() {
        if (this.students.length === 0) return '';

        const headers = ['Student ID', 'Name', 'Gender', 'Email', 'Phone', 'Course', 'Year', 'GPA', 'Enrollment Date'];
        const rows = this.students.map(s => [
            s.studentId,
            s.name,
            s.gender || '',
            s.email,
            s.phone,
            s.course,
            s.year,
            s.gpa || '',
            s.enrollmentDate
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csvContent;
    }

    importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!Array.isArray(data)) {
                throw new Error('Invalid format');
            }
            this.students = data;
            this.saveToStorage();
            return true;
        } catch (error) {
            throw new Error('Failed to import data: ' + error.message);
        }
    }
}

// UI Controller
class UIController {
    constructor(manager) {
        this.manager = manager;
        this.currentFilters = { course: '', year: '' };
        this.currentSearch = '';
        this.charts = {};
        this.currentPhoto = null;

        this.initializeElements();
        this.attachEventListeners();
        this.setupDarkMode();
        this.render();
        // Charts are hidden by default, so no need to render initially
    }

    initializeElements() {
        // Form elements
        this.form = document.getElementById('studentForm');
        this.formTitle = document.getElementById('formTitle');
        this.submitBtn = document.getElementById('submitBtn');
        this.cancelEdit = document.getElementById('cancelEdit');

        this.inputs = {
            studentId: document.getElementById('studentId'),
            name: document.getElementById('name'),
            email: document.getElementById('email'),
            phone: document.getElementById('phone'),
            gender: document.getElementById('gender'),
            course: document.getElementById('course'),
            year: document.getElementById('year'),
            gpa: document.getElementById('gpa'),
            enrollmentDate: document.getElementById('enrollmentDate')
        };

        this.photoInput = document.getElementById('studentPhoto');
        this.photoPreview = document.getElementById('photoPreview');

        // Search and filter
        this.searchInput = document.getElementById('searchInput');
        this.courseFilter = document.getElementById('courseFilter');
        this.yearFilter = document.getElementById('yearFilter');
        this.clearFiltersBtn = document.getElementById('clearFilters');

        // Table
        this.tableBody = document.getElementById('studentsTableBody');
        this.selectAllCheckbox = document.getElementById('selectAll');

        // Statistics
        this.totalStudents = document.getElementById('totalStudents');
        this.avgGPA = document.getElementById('avgGPA');
        this.topGPA = document.getElementById('topGPA');
        this.totalCourses = document.getElementById('totalCourses');

        // Buttons
        this.toggleAnalyticsBtn = document.getElementById('toggleAnalyticsBtn');
        this.themeCheckbox = document.getElementById('checkbox');
        this.exportCSV = document.getElementById('exportCSV');
        this.exportJSON = document.getElementById('exportJSON');
        this.exportBtn = document.getElementById('exportBtn');
        this.importBtn = document.getElementById('importBtn');
        this.importFile = document.getElementById('importFile');
        this.printBtn = document.getElementById('printBtn');
        this.sortByNameBtn = document.getElementById('sortByName');
        this.sortByGPABtn = document.getElementById('sortByGPA');
        this.bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        this.selectedCount = document.getElementById('selectedCount');
        this.deleteSelectedBtn = document.getElementById('deleteSelected');
        this.exportSelectedBtn = document.getElementById('exportSelected');

        // Modals
        this.deleteModal = document.getElementById('deleteModal');
        this.confirmDeleteBtn = document.getElementById('confirmDelete');
        this.cancelDeleteBtn = document.getElementById('cancelDelete');
        this.bulkDeleteModal = document.getElementById('bulkDeleteModal');
        this.confirmBulkDeleteBtn = document.getElementById('confirmBulkDelete');
        this.cancelBulkDeleteBtn = document.getElementById('cancelBulkDelete');
        this.bulkDeleteCount = document.getElementById('bulkDeleteCount');

        // Toast
        this.toast = document.getElementById('toast');
    }

    attachEventListeners() {
        // Form
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.form.addEventListener('reset', () => this.cancelEditing());
        this.cancelEdit.addEventListener('click', () => this.cancelEditing());
        if (this.photoInput) {
            this.photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        }

        // Search and filter
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.courseFilter.addEventListener('change', (e) => this.handleFilter('course', e.target.value));
        this.yearFilter.addEventListener('change', (e) => this.handleFilter('year', e.target.value));
        this.clearFiltersBtn.addEventListener('click', () => this.clearFilters());

        // Analytics Toggle (optional)
        if (this.toggleAnalyticsBtn) {
            this.toggleAnalyticsBtn.addEventListener('click', () => this.toggleAnalytics());
        }

        // Export/Import
        this.exportCSV.addEventListener('click', () => this.exportDataCSV());
        if (this.exportJSON) {
            this.exportJSON.addEventListener('click', () => this.exportDataJSON());
        }
        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => this.exportDataJSON());
        }
        this.importBtn.addEventListener('click', () => this.importFile.click());
        this.importFile.addEventListener('change', (e) => this.importData(e));
        if (this.printBtn) {
            this.printBtn.addEventListener('click', () => window.print());
        }

        // Sorting
        this.sortByNameBtn.addEventListener('click', () => this.sortByName());
        this.sortByGPABtn.addEventListener('click', () => this.sortByGPA());

        // Dark mode
        this.themeCheckbox.addEventListener('change', () => this.toggleDarkMode());

        // Bulk delete (optional)
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        }
        if (this.bulkDeleteBtn) {
            this.bulkDeleteBtn.addEventListener('click', () => this.showBulkDeleteModal());
        }
        if (this.confirmBulkDeleteBtn) {
            this.confirmBulkDeleteBtn.addEventListener('click', () => this.confirmBulkDelete());
        }
        if (this.cancelBulkDeleteBtn) {
            this.cancelBulkDeleteBtn.addEventListener('click', () => this.closeBulkDeleteModal());
        }

        // Modals
        this.cancelDeleteBtn.addEventListener('click', () => this.closeModal());
        this.deleteModal.addEventListener('click', (e) => {
            if (e.target === this.deleteModal) this.closeModal();
        });
        if (this.bulkDeleteModal) {
            this.bulkDeleteModal.addEventListener('click', (e) => {
                if (e.target === this.bulkDeleteModal) this.closeBulkDeleteModal();
            });
        }
    }

    setupDarkMode() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.themeCheckbox.checked = savedTheme === 'dark';
    }

    toggleDarkMode() {
        const newTheme = this.themeCheckbox.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode activated! 🎨`, 'info');
    }

    toggleAnalytics() {
        const section = document.getElementById('analyticsSection');
        if (section.style.display === 'none') {
            section.style.display = 'block';
            this.renderCharts();
            this.toggleAnalyticsBtn.classList.add('active');
        } else {
            section.style.display = 'none';
            this.toggleAnalyticsBtn.classList.remove('active');
        }
    }

    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Limit size to 1MB
        if (file.size > 1024 * 1024) {
            this.showToast('Image too large. Please choose an image under 1MB.', 'error');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            // Resize image using canvas
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxSize = 150; // Thumbnail size

                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                this.currentPhoto = canvas.toDataURL('image/jpeg', 0.8);

                // Show preview
                const previewImg = this.photoPreview.querySelector('img');
                previewImg.src = this.currentPhoto;
                this.photoPreview.classList.add('active');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    handleSubmit(e) {
        e.preventDefault();

        if (!this.validateForm()) {
            return;
        }

        const formData = this.getFormData();

        try {
            if (this.manager.editingId) {
                this.manager.updateStudent(this.manager.editingId, formData);
                this.showToast('Student updated successfully! ✅', 'success');
            } else {
                const student = this.manager.addStudent(formData);
                this.showToast('Student added successfully! 🎉', 'success');

                // Confetti for high GPA!
                if (parseFloat(formData.gpa) >= 9.0 && typeof confetti !== 'undefined') {
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                }
            }

            this.form.reset();
            this.cancelEditing();
            this.render();
            if (document.getElementById('analyticsSection').style.display !== 'none') {
                this.renderCharts();
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    getFormData() {
        return {
            studentId: this.inputs.studentId.value.trim(),
            name: this.inputs.name.value.trim(),
            email: this.inputs.email.value.trim(),
            phone: this.inputs.phone.value.trim(),
            gender: this.inputs.gender.value,
            course: this.inputs.course.value,
            year: this.inputs.year.value,
            gpa: this.inputs.gpa.value,
            enrollmentDate: this.inputs.enrollmentDate.value,
            photo: this.currentPhoto // Will be null if no new photo uploaded
        };
    }

    validateForm() {
        let isValid = true;

        Object.keys(this.inputs).forEach(key => {
            this.inputs[key].classList.remove('error');
            const errorSpan = document.getElementById(`${key}Error`);
            if (errorSpan) errorSpan.textContent = '';
        });

        if (!this.inputs.studentId.value.trim()) {
            this.showFieldError('studentId', 'Student ID is required');
            isValid = false;
        }

        if (!this.inputs.name.value.trim()) {
            this.showFieldError('name', 'Name is required');
            isValid = false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!this.inputs.email.value.trim()) {
            this.showFieldError('email', 'Email is required');
            isValid = false;
        } else if (!emailRegex.test(this.inputs.email.value)) {
            this.showFieldError('email', 'Invalid email format');
            isValid = false;
        }

        if (!this.inputs.phone.value.trim()) {
            this.showFieldError('phone', 'Phone is required');
            isValid = false;
        }

        if (!this.inputs.gender.value) {
            this.showFieldError('gender', 'Please select a gender');
            isValid = false;
        }

        if (!this.inputs.course.value) {
            this.showFieldError('course', 'Please select a course');
            isValid = false;
        }

        if (!this.inputs.year.value) {
            this.showFieldError('year', 'Please select a year');
            isValid = false;
        }

        if (!this.inputs.gpa.value) {
            this.showFieldError('gpa', 'GPA is required');
            isValid = false;
        } else {
            const gpa = parseFloat(this.inputs.gpa.value);
            if (gpa < 0 || gpa > 10) {
                this.showFieldError('gpa', 'CGPA must be between 0 and 10');
                isValid = false;
            }
        }

        if (!this.inputs.enrollmentDate.value) {
            this.showFieldError('enrollmentDate', 'Enrollment date is required');
            isValid = false;
        }

        return isValid;
    }

    showFieldError(fieldName, message) {
        this.inputs[fieldName].classList.add('error');
        const errorSpan = document.getElementById(`${fieldName}Error`);
        if (errorSpan) errorSpan.textContent = message;
    }

    handleSearch(query) {
        this.currentSearch = query;
        this.renderTable();
    }

    handleFilter(type, value) {
        this.currentFilters[type] = value;
        this.renderTable();
    }

    clearFilters() {
        this.currentFilters = { course: '', year: '' };
        this.currentSearch = '';
        this.searchInput.value = '';
        this.courseFilter.value = '';
        this.yearFilter.value = '';
        this.renderTable();
    }

    editStudent(id) {
        const student = this.manager.getStudentById(id);
        if (!student) return;

        this.manager.editingId = id;

        Object.keys(this.inputs).forEach(key => {
            if (student[key] !== undefined && this.inputs[key]) {
                this.inputs[key].value = student[key];
            }
        });

        // Handle photo preview
        if (student.photo) {
            this.currentPhoto = student.photo;
            const previewImg = this.photoPreview.querySelector('img');
            previewImg.src = student.photo;
            this.photoPreview.classList.add('active');
        } else {
            this.currentPhoto = null;
            this.photoPreview.classList.remove('active');
        }

        this.formTitle.textContent = 'Edit Student';
        this.submitBtn.innerHTML = '<span>💾</span> Update Student';
        this.cancelEdit.style.display = 'inline-flex';

        this.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    deleteStudent(id) {
        this.studentToDelete = id;
        this.deleteModal.classList.add('active');

        this.confirmDeleteBtn.onclick = () => {
            try {
                this.manager.deleteStudent(this.studentToDelete);
                this.showToast('Student deleted successfully! 🗑️', 'success');
                this.render();
                if (document.getElementById('analyticsSection').style.display !== 'none') {
                    this.renderCharts();
                }
                this.closeModal();
            } catch (error) {
                this.showToast(error.message, 'error');
            }
        };
    }

    closeModal() {
        this.deleteModal.classList.remove('active');
        this.studentToDelete = null;
    }

    toggleRowSelection(id, checked) {
        if (checked) {
            this.manager.selectedIds.add(id);
        } else {
            this.manager.selectedIds.delete(id);
        }
        this.updateBulkDeleteButton();
    }

    toggleSelectAll(checked) {
        const students = this.getFilteredStudents();
        students.forEach(s => {
            if (checked) {
                this.manager.selectedIds.add(s.id);
            } else {
                this.manager.selectedIds.delete(s.id);
            }
        });
        this.renderTable();
        this.updateBulkDeleteButton();
    }

    updateBulkDeleteButton() {
        const count = this.manager.selectedIds.size;
        this.selectedCount.textContent = count;
        this.bulkDeleteBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    showBulkDeleteModal() {
        const count = this.manager.selectedIds.size;
        this.bulkDeleteCount.textContent = count;
        this.bulkDeleteModal.classList.add('active');
    }

    closeBulkDeleteModal() {
        this.bulkDeleteModal.classList.remove('active');
    }

    confirmBulkDelete() {
        const ids = Array.from(this.manager.selectedIds);
        this.manager.bulkDelete(ids);
        this.manager.selectedIds.clear();
        this.selectAllCheckbox.checked = false;
        this.closeBulkDeleteModal();
        this.showToast(`Deleted ${ids.length} student(s) successfully! 🗑️`, 'success');
        this.render();
        if (document.getElementById('analyticsSection').style.display !== 'none') {
            this.renderCharts();
        }
    }

    cancelEditing() {
        this.manager.editingId = null;
        this.currentPhoto = null;
        this.photoPreview.classList.remove('active');
        this.formTitle.textContent = 'Add New Student';
        this.submitBtn.innerHTML = '<span>➕</span> Add Student';
        this.cancelEdit.style.display = 'none';
    }

    sortByName() {
        this.manager.sortByName();
        this.renderTable();
        this.showToast('Sorted by name', 'info');
    }

    sortByGPA() {
        this.manager.sortByGPA();
        this.renderTable();
        this.showToast('Sorted by GPA (highest first)', 'info');
    }

    exportDataJSON() {
        const jsonData = this.manager.exportToJSON();
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `students-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('JSON exported successfully! 📥', 'success');
    }

    exportDataCSV() {
        const csvData = this.manager.exportToCSV();
        if (!csvData) {
            this.showToast('No data to export!', 'error');
            return;
        }
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `students-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('CSV exported successfully! 📊', 'success');
    }

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                this.manager.importFromJSON(event.target.result);
                this.render();
                if (document.getElementById('analyticsSection').style.display !== 'none') {
                    this.renderCharts();
                }
                this.showToast('Data imported successfully! 📤', 'success');
            } catch (error) {
                this.showToast(error.message, 'error');
            }
        };
        reader.readAsText(file);
        this.importFile.value = '';
    }

    getFilteredStudents() {
        let students = this.manager.getAllStudents();

        if (this.currentSearch) {
            students = this.manager.searchStudents(this.currentSearch);
        }

        students = students.filter(student => {
            if (this.currentFilters.course && student.course !== this.currentFilters.course) return false;
            if (this.currentFilters.year && student.year !== this.currentFilters.year) return false;
            return true;
        });

        return students;
    }

    getAvatarInitials(name) {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    getAvatarClass(course) {
        const classMap = {
            'Computer Science': 'avatar-cs',
            'Engineering': 'avatar-engineering',
            'Business': 'avatar-business',
            'Arts': 'avatar-arts',
            'Science': 'avatar-science',
            'Mathematics': 'avatar-mathematics'
        };
        return classMap[course] || 'avatar-cs';
    }

    renderTable() {
        const students = this.getFilteredStudents();

        if (students.length === 0) {
            this.tableBody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="12">
                        <div class="empty-state-content">
                            <span class="empty-icon">📝</span>
                            <p>${this.currentSearch || this.currentFilters.course || this.currentFilters.year
                    ? 'No students found matching your criteria.'
                    : 'No student records yet. Add your first student!'}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        this.tableBody.innerHTML = students.map(student => `
            <tr class="fade-in ${this.manager.selectedIds.has(student.id) ? 'row-selected' : ''}">
                <td><input type="checkbox" ${this.manager.selectedIds.has(student.id) ? 'checked' : ''} onchange="ui.toggleRowSelection('${student.id}', this.checked)"></td>
                <td>
                    ${student.photo
                ? `<img src="${student.photo}" class="student-photo" alt="${student.name}">`
                : `<div class="student-avatar ${this.getAvatarClass(student.course)}">${this.getAvatarInitials(student.name)}</div>`
            }
                </td>
                <td>${this.escapeHtml(student.studentId)}</td>
                <td>${this.escapeHtml(student.name)}</td>
                <td>${this.escapeHtml(student.gender || '-')}</td>
                <td>${this.escapeHtml(student.email)}</td>
                <td>${this.escapeHtml(student.phone)}</td>
                <td>${this.escapeHtml(student.course)}</td>
                <td>Year ${student.year}</td>
                <td>${student.gpa || 'N/A'}</td>
                <td>${this.formatDate(student.enrollmentDate)}</td>
                <td>
                    <div class="table-actions-cell">
                        <button class="action-btn edit-btn" onclick="ui.editStudent('${student.id}')">
                            ✏️ Edit
                        </button>
                        <button class="action-btn delete-btn" onclick="ui.deleteStudent('${student.id}')">
                            🗑️ Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderStatistics() {
        const stats = this.manager.getStatistics();
        this.totalStudents.textContent = stats.total;
        this.avgGPA.textContent = stats.avgGPA;
        this.topGPA.textContent = stats.topGPA;
        this.totalCourses.textContent = stats.courses;
    }

    renderCharts() {
        // Only render if visible
        if (document.getElementById('analyticsSection').style.display === 'none') return;

        // Destroy existing charts
        Object.values(this.charts).forEach(chart => chart?.destroy());

        const theme = document.documentElement.getAttribute('data-theme');
        const textColor = theme === 'dark' ? '#f9fafb' : '#1f2937';
        const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';

        // Course Distribution Chart
        const courseData = this.manager.getCourseDistribution();
        const courseCtx = document.getElementById('courseChart');
        if (courseCtx) {
            this.charts.course = new Chart(courseCtx, {
                type: 'pie',
                data: {
                    labels: Object.keys(courseData),
                    datasets: [{
                        data: Object.values(courseData),
                        backgroundColor: [
                            '#667eea',
                            '#f093fb',
                            '#4facfe',
                            '#43e97b',
                            '#fa709a',
                            '#30cfd0'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            labels: { color: textColor }
                        }
                    }
                }
            });
        }

        // GPA Distribution Chart
        const gpaData = this.manager.getGPADistribution();
        const gpaCtx = document.getElementById('gpaChart');
        if (gpaCtx) {
            this.charts.gpa = new Chart(gpaCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(gpaData),
                    datasets: [{
                        label: 'Number of Students',
                        data: Object.values(gpaData),
                        backgroundColor: '#8b5cf6',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: textColor, stepSize: 1 },
                            grid: { color: gridColor }
                        },
                        x: {
                            ticks: { color: textColor },
                            grid: { color: gridColor }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: { color: textColor }
                        }
                    }
                }
            });
        }

        // Year Distribution Chart
        const yearData = this.manager.getYearDistribution();
        const yearCtx = document.getElementById('yearChart');
        if (yearCtx) {
            this.charts.year = new Chart(yearCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(yearData).map(y => `Year ${y}`),
                    datasets: [{
                        data: Object.values(yearData),
                        backgroundColor: [
                            '#6366f1',
                            '#8b5cf6',
                            '#ec4899',
                            '#f59e0b'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            labels: { color: textColor }
                        }
                    }
                }
            });
        }
    }

    render() {
        this.renderTable();
        this.renderStatistics();
        this.updateBulkDeleteButton();
    }

    showToast(message, type = 'info') {
        this.toast.textContent = message;
        this.toast.className = `toast ${type} show`;

        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }

    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Initialize Application
let manager, ui;

document.addEventListener('DOMContentLoaded', () => {
    manager = new StudentManager();
    ui = new UIController(manager);

    console.log('🎓 Student Record Management System - Ultimate Edition');
});
