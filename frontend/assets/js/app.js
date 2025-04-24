// app.js - Core application authentication and initialization functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initApp();
});

function initApp() {
    // Check authentication using localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const accessToken = localStorage.getItem('access_token');
    
    // If not logged in and not on login page, redirect
    if (!currentUser && 
        !window.location.pathname.includes('login.html') && 
        !window.location.pathname.includes('reset-password.html')) {
        window.location.href = '/pages/login.html';
        return;
    }
    
    // If we're on login page and logged in, redirect to dashboard
    if (currentUser && (
        window.location.pathname.includes('login.html') || 
        window.location.pathname === '/' || 
        window.location.pathname.endsWith('/pages/'))) {
        window.location.href = '/pages/dashboard.html';
        return;
    }
    
    // If we're logged in and not on login/reset pages, render the UI
    if (currentUser && 
        !window.location.pathname.includes('login.html') && 
        !window.location.pathname.includes('reset-password.html')) {
        renderUserMenu(currentUser);
        renderSidebar(currentUser);
    }
    
    // Initialize page-specific content based on URL
    initPageContent();
}

function renderUserMenu(user) {
    const userMenu = document.getElementById('user-menu');
    if (!userMenu) return;
    
    userMenu.innerHTML = `
        <span class="mr-4">Welcome, ${user.name}</span>
        <button 
            onclick="logout()"
            class="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm"
        >
            Logout
        </button>
    `;
}

function renderSidebar(user) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    const isAdmin = user.is_admin;
    
    // Define navigation items without "pages/" prefix in paths
    const navItems = [
        { path: 'dashboard.html', label: 'Dashboard', icon: 'fa-gauge-high', adminOnly: true },
        { path: 'academic-years/', label: 'Academic Years', icon: 'fa-calendar-days', adminOnly: true },
        { path: 'class-groups/', label: 'Class Groups', icon: 'fa-users', adminOnly: true },
        { path: 'students/', label: 'Students', icon: 'fa-user-graduate', adminOnly: true },
        { path: 'subjects/', label: 'Subjects', icon: 'fa-book', everyone: true },
        { path: 'enrollments/', label:'Enrollments', icon:'fa-sign-in-alt', adminOnly: true },
        { path: 'teachers/', label: 'Teachers', icon: 'fa-chalkboard-user', adminOnly: true },
        { path: 'credits/assign.html', label: 'Assign Credits', icon: 'fa-star', everyone: true },
        { path: 'reports/', label: 'Reports', icon: 'fa-file-invoice', adminOnly: true },
    ];
    
    // Create the HTML for sidebar
    let sidebarHTML = `
        <div class="mb-8">
            <h2 class="text-xl font-bold mb-6 text-center">TY Credits</h2>
        </div>
        <nav>
            <ul>
    `;
    
    navItems.forEach(item => {
        // Only show admin items to admins, or items for everyone
        if (item.everyone || (!item.everyone && !item.adminOnly) || (item.adminOnly && isAdmin)) {
            // Check if current page matches this nav item
            const currentPath = window.location.pathname;
            const isActive = currentPath.includes(item.path);
            
            sidebarHTML += `
                <li class="mb-2">
                    <a 
                        href="/pages/${item.path}" 
                        class="flex items-center p-2 rounded hover:bg-gray-700 transition-colors ${isActive ? 'bg-gray-700 font-medium' : ''}"
                    >
                        <i class="fa-solid ${item.icon} mr-3 text-sm"></i>
                        <span>${item.label}</span>
                    </a>
                </li>
            `;
        }
    });
    
    sidebarHTML += `
            </ul>
        </nav>
    `;
    
    sidebar.innerHTML = sidebarHTML;
}

function initPageContent() {
    // Determine which page we're on and initialize accordingly
    const path = window.location.pathname;
    
    if (path.includes('dashboard.html')) {
        initDashboard();
    } else if (path.includes('students/')) {
        if (path.includes('new.html')) {
            initStudentForm('new');
        } else if (path.includes('edit.html')) {
            initStudentForm('edit');
        } else if (path.includes('import.html')) {
            initStudentImport();
        } else {
            initStudentList();
        }
    } else if (path.includes('subjects/')) {
        if (path.includes('new.html')) {
            initSubjectForm('new');
        } else if (path.includes('edit.html')) {
            initSubjectForm('edit');
        } else if (path.includes('import.html')) {
            initSubjectImport();
        } else {
            initSubjectList();
        }
    } else if (path.includes('teachers/')) {
        if (path.includes('new.html')) {
            initTeacherForm('new');
        } else if (path.includes('edit.html')) {
            initTeacherForm('edit');
        } else if (path.includes('import.html')) {
            initTeacherImport();
        } else {
            initTeacherList();
        }
    } else if (path.includes('class-groups/')) {
        if (path.includes('new.html')) {
            initClassGroupForm('new');
        } else if (path.includes('edit.html')) {
            initClassGroupForm('edit');
        } else {
            initClassGroupList();
        }
    } else if (path.includes('credits/')) {
        if (path.includes('assign.html')) {
            initAssignCredits();
        } else if (path.includes('student-view.html')) {
            initStudentCreditsView();
        }
    } else if (path.includes('academic-years/')) {
        if (path.includes('new.html')) {
            initAcademicYearForm('new');
        } else if (path.includes('edit.html')) {
            initAcademicYearForm('edit');
        } else {
            initAcademicYearList();
        }
    }
}

// Global logout function for inline onclick handlers
function logout() {
    // Use the new API service logout method
    window.apiService.auth.logout();
}
