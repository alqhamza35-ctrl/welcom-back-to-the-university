// ========================================
// Back to University - Dashboard Module
// ========================================

(function() {
    'use strict';

    // ========================================
    // Security Utilities
    // ========================================
    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function sanitizeInput(str) {
        return escapeHtml(str).trim();
    }

    // Session timeout (30 minutes inactivity)
    let sessionTimer = null;
    const SESSION_TIMEOUT = 30 * 60 * 1000;

    function resetSessionTimer() {
        if (sessionTimer) clearTimeout(sessionTimer);
        sessionTimer = setTimeout(function() {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        }, SESSION_TIMEOUT);
    }

    function setupSessionTracking() {
        ['click', 'keypress', 'mousemove', 'scroll'].forEach(function(event) {
            document.addEventListener(event, resetSessionTimer, { passive: true });
        });
        resetSessionTimer();
    }

    // Rate limit AI responses
    let lastAiCall = 0;
    const AI_RATE_LIMIT = 1000;

    // State
    let currentUser = null;
    let currentPage = 'dashboard';
    let conversations = [];
    let currentConversation = null;
    let homework = [];
    let exams = [];
    let classes = [];
    let dailySchedule = [];
    let calendarDate = new Date();

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        checkAuth();
        initUI();
        loadData();
        initEventListeners();
        updateStats();
        renderCalendar();
        setupSessionTracking();
    });

    // Auth Check
    function checkAuth() {
        const userData = localStorage.getItem('currentUser');
        if (!userData) {
            window.location.href = 'index.html';
            return;
        }
        currentUser = JSON.parse(userData);
        // Remove sensitive fields from memory
        delete currentUser.password;
        delete currentUser.passwordHash;
        delete currentUser.salt;
        updateUserInfo();
    }

    // Update User Info
    function updateUserInfo() {
        const initial = currentUser.displayName ? currentUser.displayName.charAt(0) : 'م';
        document.getElementById('userAvatar').textContent = initial;
        document.getElementById('userAvatarSm').textContent = initial;
        document.getElementById('userName').textContent = currentUser.displayName || 'المستخدم';
        document.getElementById('userEmail').textContent = currentUser.email;
        document.getElementById('settingsName').textContent = currentUser.displayName;
        document.getElementById('settingsEmail').textContent = currentUser.email;
        
        // Load settings
        if (currentUser.settings) {
            document.getElementById('wakeUpTime').value = currentUser.settings.wakeUpTime || '06:00';
            document.getElementById('sleepTime').value = currentUser.settings.sleepTime || '22:00';
            document.getElementById('schoolStart').value = currentUser.settings.universityStart || '08:00';
            document.getElementById('schoolEnd').value = currentUser.settings.universityEnd || '15:00';
            document.getElementById('breakfastTime').value = currentUser.settings.breakfastTime || '06:30';
            document.getElementById('lunchTime').value = currentUser.settings.lunchTime || '13:00';
            document.getElementById('dinnerTime').value = currentUser.settings.dinnerTime || '20:00';
            document.getElementById('exerciseTime').value = currentUser.settings.exerciseTime || '16:00';
            document.getElementById('showerTime').value = currentUser.settings.showerTime || '21:00';
        }
    }

    // Load Data
    function loadData() {
        const userId = currentUser.id;
        conversations = JSON.parse(localStorage.getItem('btu_conversations_' + userId) || '[]');
        homework = JSON.parse(localStorage.getItem('btu_homework_' + userId) || '[]');
        exams = JSON.parse(localStorage.getItem('btu_exams_' + userId) || '[]');
        classes = JSON.parse(localStorage.getItem('btu_classes_' + userId) || '[]');
        dailySchedule = JSON.parse(localStorage.getItem('btu_schedule_' + userId) || '[]');
        
        renderConversations();
        renderHomework();
        renderExams();
        renderClasses();
        updateSubjectsSummary();
        renderDailySchedule();
    }

    // Save Data
    function saveData() {
        const userId = currentUser.id;
        localStorage.setItem('btu_conversations_' + userId, JSON.stringify(conversations));
        localStorage.setItem('btu_homework_' + userId, JSON.stringify(homework));
        localStorage.setItem('btu_exams_' + userId, JSON.stringify(exams));
        localStorage.setItem('btu_classes_' + userId, JSON.stringify(classes));
        localStorage.setItem('btu_schedule_' + userId, JSON.stringify(dailySchedule));
    }

    // Init UI
    function initUI() {
        // Set today's date as default for forms
        const today = new Date().toISOString().split('T')[0];
        const hwDueDate = document.getElementById('hwDueDate');
        const examDate = document.getElementById('examDate');
        if (hwDueDate) hwDueDate.value = today;
        if (examDate) examDate.value = today;
    }

    // Event Listeners
    function initEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const page = this.dataset.page;
                navigateTo(page);
            });
        });

        // Mobile menu
        document.getElementById('mobileMenuBtn').addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('active');
        });

        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('collapsed');
        });

        // New Chat
        document.getElementById('newChatBtn').addEventListener('click', createNewConversation);

        // Chat input
        document.getElementById('chatInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendChatMessage();
        });
        document.getElementById('sendChatBtn').addEventListener('click', sendChatMessage);

        // Generate schedule
        document.getElementById('generateScheduleBtn').addEventListener('click', generateDailySchedule);
        document.getElementById('generateScheduleBtn2').addEventListener('click', generateDailySchedule);

        // Time inputs - auto save settings
        ['wakeUpTime', 'sleepTime', 'schoolStart', 'schoolEnd', 'breakfastTime', 'lunchTime', 'dinnerTime', 'exerciseTime', 'showerTime'].forEach(id => {
            document.getElementById(id).addEventListener('change', saveSettings);
        });

        // Add Homework
        document.getElementById('addHomeworkBtn').addEventListener('click', function() {
            document.getElementById('homeworkModal').classList.add('active');
        });

        // Add Exam
        document.getElementById('addExamBtn').addEventListener('click', function() {
            document.getElementById('examModal').classList.add('active');
        });

        // Add Class
        document.getElementById('addClassBtn').addEventListener('click', function() {
            document.getElementById('classModal').classList.add('active');
        });

        // Class Form
        document.getElementById('classForm').addEventListener('submit', addClass);

        // Homework Form
        document.getElementById('homeworkForm').addEventListener('submit', addHomework);

        // Exam Form
        document.getElementById('examForm').addEventListener('submit', addExam);

        // Homework Filters
        document.querySelectorAll('.homework-filters .filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.homework-filters .filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                renderHomework(this.dataset.filter);
            });
        });

        // Calendar navigation
        document.getElementById('prevMonth').addEventListener('click', function() {
            calendarDate.setMonth(calendarDate.getMonth() - 1);
            renderCalendar();
        });
        document.getElementById('nextMonth').addEventListener('click', function() {
            calendarDate.setMonth(calendarDate.getMonth() + 1);
            renderCalendar();
        });

        // Settings - Change Password
        document.getElementById('changePasswordForm').addEventListener('submit', changePassword);

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', logout);
        document.getElementById('logoutBtnSettings').addEventListener('click', logout);

        // Close modals on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                }
            });
        });
    }

    // Navigation
    function navigateTo(page) {
        if (!page) return;
        currentPage = page;
        
        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        
        // Update pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        const pageEl = document.getElementById('page-' + page);
        if (pageEl) pageEl.classList.add('active');
        
        // Update page title
        const titles = {
            dashboard: { title: 'لوحة التحكم', subtitle: 'مرحباً بك اليوم' },
            classes: { title: 'محاضرات اليوم', subtitle: 'المواد التي درستها اليوم' },
            homework: { title: 'الواجبات', subtitle: 'إدارة واجباتك الجامعية' },
            exams: { title: 'الامتحانات', subtitle: 'تتبع امتحاناتك القادمة' },
            schedule: { title: 'الجدول اليومي', subtitle: 'خطط يومك بذكاء' },
            calendar: { title: 'التقويم', subtitle: 'عرض أحداثك ومواعيدك' },
            settings: { title: 'الإعدادات', subtitle: 'تخصيص حسابك' }
        };
        
        const titleData = titles[page];
        if (titleData) {
            document.getElementById('pageTitle').innerHTML = `<h1>${titleData.title}</h1><p>${titleData.subtitle}</p>`;
        }
        
        // Close mobile menu
        document.getElementById('sidebar').classList.remove('active');
    }

    // ========================================
    // Conversations
    // ========================================
    function createNewConversation() {
        const conversation = {
            id: generateId(),
            title: 'محادثة جديدة',
            messages: [],
            createdAt: new Date().toISOString()
        };
        
        conversations.unshift(conversation);
        currentConversation = conversation;
        saveData();
        renderConversations();
        clearChat();
        navigateTo('dashboard');
    }

    function renderConversations() {
        const list = document.getElementById('conversationsList');
        
        if (conversations.length === 0) {
            list.innerHTML = '<div class="conversation-empty">لا توجد محادثات بعد</div>';
            return;
        }
        
        list.innerHTML = conversations.map(conv => `
            <div class="conversation-item ${currentConversation && currentConversation.id === conv.id ? 'active' : ''}" 
                 data-id="${conv.id}" onclick="loadConversation('${conv.id}')">
                <i class="fas fa-comment-dots"></i>
                <span>${conv.title}</span>
            </div>
        `).join('');
    }

    window.loadConversation = function(id) {
        currentConversation = conversations.find(c => c.id === id);
        renderConversations();
        loadChatHistory();
    };

    function loadChatHistory() {
        const chatMessages = document.getElementById('chatMessages');
        
        if (!currentConversation || currentConversation.messages.length === 0) {
            chatMessages.innerHTML = `
                <div class="message assistant">
                    <div class="message-avatar"><i class="fas fa-robot"></i></div>
                    <div class="message-content">
                        <p>مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟</p>
                    </div>
                </div>
            `;
            return;
        }
        
        chatMessages.innerHTML = currentConversation.messages.map(msg => `
            <div class="message ${msg.role}">
                <div class="message-avatar">
                    <i class="fas fa-${msg.role === 'assistant' ? 'robot' : 'user'}"></i>
                </div>
                <div class="message-content">${msg.content}</div>
            </div>
        `).join('');
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function clearChat() {
        document.getElementById('chatMessages').innerHTML = `
            <div class="message assistant">
                <div class="message-avatar"><i class="fas fa-robot"></i></div>
                <div class="message-content">
                    <p>مرحباً! أنا مساعدك الذكي للتخطيط اليومي. يمكنني مساعدتك في:</p>
                    <ul>
                        <li>تنظيم جدول يومك</li>
                        <li>جدولة الواجبات والامتحانات</li>
                        <li>تخصيص أوقات للتمارين والراحة</li>
                    </ul>
                    <p>اكتب "إنشاء الجدول" لإنشاء جدول يومك!</p>
                </div>
            </div>
        `;
    }

    // ========================================
    // AI Chat
    // ========================================
    function sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;

        // Rate limit AI calls
        const now = Date.now();
        if (now - lastAiCall < AI_RATE_LIMIT) {
            addChatMessage('يرجى الانتظار قليلاً قبل إرسال رسالة أخرى.', 'assistant');
            return;
        }
        lastAiCall = now;
        
        // Create conversation if none exists
        if (!currentConversation) {
            createNewConversation();
        }
        
        // Add user message
        addChatMessage(escapeHtml(message), 'user');
        input.value = '';
        
        // Generate AI response
        setTimeout(() => {
            const response = generateAIResponse(message);
            addChatMessage(response, 'assistant');
        }, 500);
    }

    function addChatMessage(content, role) {
        const chatMessages = document.getElementById('chatMessages');
        
        const messageHtml = `
            <div class="message ${role}">
                <div class="message-avatar">
                    <i class="fas fa-${role === 'assistant' ? 'robot' : 'user'}"></i>
                </div>
                <div class="message-content">${content}</div>
            </div>
        `;
        
        chatMessages.insertAdjacentHTML('beforeend', messageHtml);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Save to conversation
        if (currentConversation) {
            currentConversation.messages.push({ role, content, timestamp: new Date().toISOString() });
            
            // Update title from first message
            if (currentConversation.messages.length === 1 && role === 'user') {
                currentConversation.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
                renderConversations();
            }
            
            saveData();
        }
    }

    function generateAIResponse(message) {
        const lowerMsg = message.toLowerCase();
        
        // Schedule generation
        if (lowerMsg.includes('جدول') || lowerMsg.includes('تنظيم') || lowerMsg.includes('خطة')) {
            generateDailySchedule();
            return 'تم إنشاء جدول يومك بناءً على الوقت المحدد! يمكنك مشاهدته في قسم "الجدول اليومي" أو في الشريط الجانبي.';
        }
        
        // Classes today
        if (lowerMsg.includes('محاضرات') || lowerMsg.includes('محاضرة') || lowerMsg.includes('مواد') || lowerMsg.includes('حصص')) {
            const todayDate = new Date().toISOString().split('T')[0];
            const todaySubjects = classes.filter(c => c.date === todayDate);
            
            if (todaySubjects.length > 0) {
                const totalTime = todaySubjects.reduce((sum, s) => sum + (s.duration || 45), 0);
                return `لديك ${todaySubjects.length} مواد اليوم (${totalTime} دقيقة مذاكرة):<br>` + 
                    todaySubjects.map(c => `• ${escapeHtml(c.name)} - ${c.duration} دقيقة (الأولوية: ${c.priority === 'high' ? 'عالية' : c.priority === 'medium' ? 'متوسطة' : 'منخفضة'})`).join('<br>') +
                    '<br>هل تريد إنشاء جدول يومي يشمل هذه المواد؟';
            }
            return 'لم تضف مواد اليوم بعد. أضف المواد التي درستها اليوم لتظهر هنا.';
        }
        
        // Homework related
        if (lowerMsg.includes('واجب') || lowerMsg.includes('تمرين') || lowerMsg.includes('assignment')) {
            const todayHw = homework.filter(h => {
                const dueDate = new Date(h.dueDate);
                const today = new Date();
                return dueDate.toDateString() === today.toDateString() && !h.completed;
            });
            
            if (todayHw.length > 0) {
                return `لديك ${todayHw.length} واجب مستحق اليوم:<br>` + 
                    todayHw.map(h => `• ${escapeHtml(h.title)} - ${escapeHtml(h.subject)}`).join('<br>') +
                    '<br>هل تريد مساعدة في تنظيم وقت للعمل عليها؟';
            }
            return 'لا توجد واجبات مستحقة اليوم. هل تريد إضافة واجبات جديدة؟';
        }
        
        // Exam related
        if (lowerMsg.includes('امتحان') || lowerMsg.includes('اختبار') || lowerMsg.includes('exam')) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const tomorrowExams = exams.filter(e => {
                const examDate = new Date(e.date);
                return examDate.toDateString() === tomorrow.toDateString();
            });
            
            if (tomorrowExams.length > 0) {
                return `لديك ${tomorrowExams.length} امتحان غداً:<br>` + 
                    tomorrowExams.map(e => `• ${escapeHtml(e.name)} - ${escapeHtml(e.subject)} في ${formatTime12(e.time)}`).join('<br>') +
                    '<br>أنصحك بالبدء في المذاكر الآن!';
            }
            
            const upcomingExams = exams.filter(e => new Date(e.date) > new Date()).slice(0, 3);
            if (upcomingExams.length > 0) {
                return 'امتحاناتك القادمة:<br>' + 
                    upcomingExams.map(e => `• ${escapeHtml(e.name)} - ${escapeHtml(e.subject)} (${formatDate(e.date)})`).join('<br>') +
                    '<br>هل تريد مساعدة في إنشاء خطة مذاكرة؟';
            }
            return 'لا توجد امتحانات قادمة. أضف امتحاناتك لتتبعها.';
        }
        
        // Exercise/sports
        if (lowerMsg.includes('تمارين') || lowerMsg.includes('رياضة') || lowerMsg.includes('sport') || lowerMsg.includes('exercise')) {
            return 'التمارين الرياضية مهمة لصحتك! الوقت المقترح للتمرين هو ' + 
                formatTime12(document.getElementById('exerciseTime').value) + '. هل تريد تغيير الوقت؟';
        }
        
        // Sleep schedule
        if (lowerMsg.includes('نوم') || lowerMsg.includes('استيقاظ') || lowerMsg.includes('sleep')) {
            const wakeUp = formatTime12(document.getElementById('wakeUpTime').value);
            const sleep = formatTime12(document.getElementById('sleepTime').value);
            return `وقت نومك الحالي: ${sleep}<br>وقت استيقاظك: ${wakeUp}<br>` +
                'هل تريد تعديل أوقات النوم والاستيقاظ؟ أنصح بالنوم 7-8 ساعات.';
        }
        
        // Greeting
        if (lowerMsg.includes('مرحبا') || lowerMsg.includes('السلام') || lowerMsg.includes('أهلا') || lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
            return 'مرحباً بك! كيف يمكنني مساعدتك في تنظيم يومك اليوم؟ يمكنك سؤالي عن الواجبات، الامتحانات، أو إنشاء جدول يومي.';
        }
        
        // Help
        if (lowerMsg.includes('مساعدة') || lowerMsg.includes('ساعد') || lowerMsg.includes('help')) {
            return 'يمكنني مساعدتك في:<br>' +
                '• إنشاء جدول يومي ذكي<br>' +
                '• عرض محاضرات اليوم (اكتب "محاضراتي")<br>' +
                '• تنظيم الواجبات والامتحانات<br>' +
                '• اقتراح أوقات للدراسة والتمارين<br>' +
                '• حساب أفضل أوقات النوم<br>' +
                'اكتب "إنشاء الجدول" للبدء!';
        }
        
        // Thanks
        if (lowerMsg.includes('شكرا') || lowerMsg.includes('thanks')) {
            return 'العفو! أنا هنا لمساعدتك دائماً. هل تحتاج شيء آخر؟';
        }
        
        // Default response
        return 'أفهم أنك تريد مساعدة في التنظيم. يمكنني:<br>' +
            '• إنشاء جدول يومي (اكتب "إنشاء الجدول")<br>' +
            '• متابعة الواجبات (اكتب "واجباتي")<br>' +
            '• تتبع الامتحانات (اكتب "امتحاناتي")<br>' +
            'كيف يمكنني مساعدتك؟';
    }

    // ========================================
    // Daily Schedule Generator
    // ========================================
    function generateDailySchedule() {
        const wakeUp = document.getElementById('wakeUpTime').value;
        const sleep = document.getElementById('sleepTime').value;
        const schoolStart = document.getElementById('schoolStart').value;
        const schoolEnd = document.getElementById('schoolEnd').value;
        const breakfast = document.getElementById('breakfastTime').value;
        const lunch = document.getElementById('lunchTime').value;
        const dinner = document.getElementById('dinnerTime').value;
        const exercise = document.getElementById('exerciseTime').value;
        const shower = document.getElementById('showerTime').value;
        
        // Get today's day name in English
        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const today = new Date();
        const todayDay = dayNames[today.getDay()];
        
        // Get classes for today
        const todayClasses = classes.filter(c => c.day === todayDay).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
        
        // Build schedule
        dailySchedule = [];
        
        // Morning routine
        dailySchedule.push({ time: wakeUp, activity: 'الاستيقاظ', icon: 'sun', type: 'other', desc: 'بداية يوم جديد' });
        
        // Calculate wake up + 15 min for preparation
        const wakeUpMinutes = timeToMinutes(wakeUp);
        dailySchedule.push({ time: minutesToTime(wakeUpMinutes + 15), activity: 'الاستعداد', icon: 'shower', type: 'other', desc: 'اغسل وجهك وصلّب' });
        
        // Breakfast
        dailySchedule.push({ time: breakfast, activity: 'وجبة الإفطار', icon: 'utensils', type: 'meal', desc: 'وجبة صحية لبداية يوم نشط' });
        
        if (todayClasses.length > 0) {
            // Add classes to schedule
            const firstClassStart = todayClasses[0].startTime;
            const lastClassEnd = todayClasses[todayClasses.length - 1].endTime;
            
            // Travel to first class (30 min before)
            const firstClassMinutes = timeToMinutes(firstClassStart);
            dailySchedule.push({ time: minutesToTime(firstClassMinutes - 30), activity: 'الذهاب للجامعة', icon: 'bus', type: 'other', desc: 'السفر إلى الجامعة' });
            
            // Add each class
            todayClasses.forEach(cls => {
                dailySchedule.push({ 
                    time: cls.startTime, 
                    activity: cls.name, 
                    icon: 'book-open', 
                    type: 'class', 
                    desc: `${cls.teacher ? 'المعلم: ' + cls.teacher : ''}${cls.room ? ' | القاعة: ' + cls.room : ''}`,
                    classId: cls.id,
                    classColor: cls.color
                });
                dailySchedule.push({ 
                    time: cls.endTime, 
                    activity: `نهاية ${cls.name}`, 
                    icon: 'book', 
                    type: 'class', 
                    desc: 'انتهاء المحاضرة',
                    classColor: cls.color
                });
            });
            
            // Return home after last class
            const lastClassMinutes = timeToMinutes(lastClassEnd);
            dailySchedule.push({ time: minutesToTime(lastClassMinutes + 30), activity: 'العودة للمنزل', icon: 'home', type: 'other', desc: 'العودة من الجامعة' });
        } else {
            // No classes today - use general school time
            const schoolStartMinutes = timeToMinutes(schoolStart);
            dailySchedule.push({ time: minutesToTime(schoolStartMinutes - 30), activity: 'الذهاب للجامعة', icon: 'bus', type: 'other', desc: 'السفر إلى الجامعة' });
            dailySchedule.push({ time: schoolStart, activity: 'بداية المحاضرات', icon: 'university', type: 'school', desc: 'بداية يوم جامعي' });
            dailySchedule.push({ time: schoolEnd, activity: 'نهاية المحاضرات', icon: 'university', type: 'school', desc: 'انتهاء اليوم الجامعي' });
            const schoolEndMinutes = timeToMinutes(schoolEnd);
            dailySchedule.push({ time: minutesToTime(schoolEndMinutes + 30), activity: 'العودة للمنزل', icon: 'home', type: 'other', desc: 'العودة من الجامعة' });
        }
        
        // Lunch
        dailySchedule.push({ time: lunch, activity: 'وجبة الغداء', icon: 'utensils', type: 'meal', desc: 'استرخاء ووجبة غداء' });
        
        // Rest time after lunch
        dailySchedule.push({ time: minutesToTime(timeToMinutes(lunch) + 60), activity: 'وقت الراحة', icon: 'couch', type: 'other', desc: 'استرخاء بعد الغداء' });
        
        // Study/Homework time - based on subjects added
        const todayDate = new Date().toISOString().split('T')[0];
        const todaySubjects = classes.filter(c => c.date === todayDate);
        const totalStudyMinutes = todaySubjects.reduce((sum, s) => sum + (s.duration || 45), 0);
        
        const studyStart = minutesToTime(timeToMinutes(lunch) + 90);
        let currentStudyTime = timeToMinutes(studyStart);
        
        if (todaySubjects.length > 0) {
            // Add study time for each subject
            dailySchedule.push({ 
                time: studyStart, 
                activity: `المذاكرة (${todaySubjects.length} مواد - ${totalStudyMinutes} دقيقة)`, 
                icon: 'book', 
                type: 'study', 
                desc: 'وقت مخصص لدراسة المواد المضافة' 
            });
            
            // Add each subject as a study block
            todaySubjects.forEach(subject => {
                dailySchedule.push({ 
                    time: minutesToTime(currentStudyTime), 
                    activity: `مذاكرة: ${subject.name}`, 
                    icon: 'book-open', 
                    type: 'study', 
                    desc: `${subject.duration} دقيقة - الأولوية: ${subject.priority === 'high' ? 'عالية' : subject.priority === 'medium' ? 'متوسطة' : 'منخفضة'}`,
                    classColor: subject.color
                });
                currentStudyTime += subject.duration;
            });
        } else {
            // Default study time if no subjects added
            dailySchedule.push({ 
                time: studyStart, 
                activity: 'المذاكرة والواجبات', 
                icon: 'book', 
                type: 'study', 
                desc: 'وقت مخصص للدراسة وحل الواجبات (أضف مواد اليوم لتحديد المدة)' 
            });
        }
        
        // Check for homework today
        const todayHw = homework.filter(h => !h.completed);
        if (todayHw.length > 0) {
            dailySchedule.push({ time: minutesToTime(currentStudyTime + 15), activity: `حل ${todayHw.length} واجبات`, icon: 'tasks', type: 'study', desc: todayHw.map(h => h.title).join(', ') });
            currentStudyTime += 30;
        }
        
        // Exercise
        dailySchedule.push({ time: exercise, activity: 'التمارين الرياضية', icon: 'dumbbell', type: 'exercise', desc: 'نشاط بدني للحفاظ على اللياقة' });
        
        // Shower after exercise
        const exerciseMinutes = timeToMinutes(exercise);
        dailySchedule.push({ time: minutesToTime(exerciseMinutes + 60), activity: 'الاستحمام', icon: 'shower', type: 'other', desc: 'تنظيف بعد التمرين' });
        
        // Dinner
        dailySchedule.push({ time: dinner, activity: 'وجبة العشاء', icon: 'utensils', type: 'meal', desc: 'وجبة العشاء' });
        
        // Free time
        dailySchedule.push({ time: minutesToTime(timeToMinutes(dinner) + 60), activity: 'وقت حر', icon: 'gamepad', type: 'other', desc: 'ترفيه واسترخاء' });
        
        // Prepare for next day
        dailySchedule.push({ time: minutesToTime(timeToMinutes(sleep) - 60), activity: 'الاستعداد للنوم', icon: 'bed', type: 'other', desc: 'تجهيز أغراض الغد' });
        
        // Sleep
        dailySchedule.push({ time: sleep, activity: 'النوم', icon: 'moon', type: 'sleep', desc: 'نوم مريح للحصول على طاقة الغد' });
        
        // Sort by time
        dailySchedule.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
        
        // Remove duplicates and overlapping
        const uniqueSchedule = [];
        dailySchedule.forEach(item => {
            if (!uniqueSchedule.find(s => s.time === item.time)) {
                uniqueSchedule.push(item);
            }
        });
        dailySchedule = uniqueSchedule;
        
        saveData();
        renderDailySchedule();
        
        // Show in AI chat
        if (currentConversation) {
            let scheduleText = 'تم إنشاء جدول يومك! ';
            
            if (todayClasses.length > 0) {
                scheduleText += `لديك ${todayClasses.length} محاضرات اليوم:<br>`;
                scheduleText += todayClasses.map(c => `• ${c.name} (${formatTime12(c.startTime)} - ${formatTime12(c.endTime)})`).join('<br>');
                scheduleText += '<br><br>الجدول الكامل يتضمن:<br>';
            } else {
                scheduleText += 'الجدول يتضمن:<br>';
            }
            
            scheduleText += dailySchedule.slice(0, 8).map(s => `${formatTime12(s.time)} - ${s.activity}`).join('<br>');
            scheduleText += '<br><br>يمكنك مشاهدة التفاصيل الكاملة في صفحة "الجدول اليومي".';
            
            addChatMessage(scheduleText, 'assistant');
        }
        
        navigateTo('schedule');
    }

    function renderDailySchedule() {
        const timeline = document.getElementById('scheduleTimeline');
        const preview = document.getElementById('dailySchedulePreview');
        
        if (dailySchedule.length === 0) {
            timeline.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-day"></i><h3>لم يتم إنشاء الجدول بعد</h3><p>اضغط "إنشاء الجدول" لإنشاء جدول يومك</p></div>';
            preview.innerHTML = '<div class="schedule-empty">لم يتم إنشاء الجدول بعد</div>';
            return;
        }
        
        // Full timeline
        timeline.innerHTML = dailySchedule.map(item => {
            const iconStyle = item.classColor ? `background: ${item.classColor}20; color: ${item.classColor}` : '';
            const borderStyle = item.classColor ? `border-right: 3px solid ${item.classColor}` : '';
            return `
            <div class="timeline-item" style="${borderStyle}">
                <div class="timeline-time">${formatTime12(item.time)}</div>
                <div class="timeline-icon ${item.type}" style="${iconStyle}">
                    <i class="fas fa-${item.icon}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-title">${item.activity}</div>
                    <div class="timeline-desc">${item.desc}</div>
                </div>
            </div>
        `}).join('');
        
        // Sidebar preview (show next 6 items based on current time)
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        let nextItems = dailySchedule.filter(item => timeToMinutes(item.time) >= currentMinutes);
        if (nextItems.length < 6) {
            nextItems = dailySchedule.slice(0, 6);
        } else {
            nextItems = nextItems.slice(0, 6);
        }
        
        preview.innerHTML = nextItems.map(item => `
            <div class="schedule-item-preview">
                <span class="schedule-time">${formatTime12(item.time)}</span>
                <span class="schedule-activity">${item.activity}</span>
            </div>
        `).join('');
    }

    // ========================================
    // Homework
    // ========================================
    function addHomework(e) {
        e.preventDefault();
        
        const hw = {
            id: generateId(),
            title: document.getElementById('hwTitle').value,
            subject: document.getElementById('hwSubject').value,
            description: document.getElementById('hwDescription').value,
            dueDate: document.getElementById('hwDueDate').value,
            day: document.getElementById('hwDay').value,
            priority: document.getElementById('hwPriority').value,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        homework.push(hw);
        saveData();
        renderHomework();
        updateStats();
        
        closeModal('homeworkModal');
        document.getElementById('homeworkForm').reset();
        
        // Set default date again
        document.getElementById('hwDueDate').value = new Date().toISOString().split('T')[0];
    }

    function renderHomework(filter = 'all') {
        const list = document.getElementById('homeworkList');
        let filteredHw = [...homework];
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        switch (filter) {
            case 'today':
                filteredHw = homework.filter(h => {
                    const dueDate = new Date(h.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    return dueDate.getTime() === today.getTime() && !h.completed;
                });
                break;
            case 'upcoming':
                filteredHw = homework.filter(h => new Date(h.dueDate) > today && !h.completed);
                break;
            case 'completed':
                filteredHw = homework.filter(h => h.completed);
                break;
        }
        
        if (filteredHw.length === 0) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-book-open"></i><h3>لا توجد واجبات</h3><p>ابدأ بإضافة واجباتك هنا</p></div>';
            return;
        }
        
        list.innerHTML = filteredHw.map(hw => `
            <div class="task-card ${hw.completed ? 'completed' : ''}">
                <div class="task-checkbox ${hw.completed ? 'checked' : ''}" onclick="toggleHomework('${hw.id}')"></div>
                <div class="task-info">
                    <div class="task-title">${hw.title}</div>
                    <div class="task-meta">
                        <span><i class="fas fa-book"></i> ${hw.subject}</span>
                        <span><i class="fas fa-calendar"></i> ${formatDate(hw.dueDate)}</span>
                        <span class="priority-badge priority-${hw.priority}">${getPriorityLabel(hw.priority)}</span>
                    </div>
                    ${hw.description ? `<div class="task-desc">${hw.description}</div>` : ''}
                </div>
                <div class="task-actions">
                    <button onclick="deleteHomework('${hw.id}')" title="حذف"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    window.toggleHomework = function(id) {
        const hw = homework.find(h => h.id === id);
        if (hw) {
            hw.completed = !hw.completed;
            saveData();
            renderHomework(document.querySelector('.homework-filters .filter-btn.active').dataset.filter);
            updateStats();
        }
    };

    window.deleteHomework = function(id) {
        if (confirm('هل أنت متأكد من حذف هذا الواجب؟')) {
            homework = homework.filter(h => h.id !== id);
            saveData();
            renderHomework(document.querySelector('.homework-filters .filter-btn.active').dataset.filter);
            updateStats();
        }
    };

    // ========================================
    // Exams
    // ========================================
    function addExam(e) {
        e.preventDefault();
        
        const exam = {
            id: generateId(),
            name: document.getElementById('examName').value,
            subject: document.getElementById('examSubject').value,
            date: document.getElementById('examDate').value,
            time: document.getElementById('examTime').value,
            day: document.getElementById('examDay').value,
            notes: document.getElementById('examNotes').value,
            createdAt: new Date().toISOString()
        };
        
        exams.push(exam);
        saveData();
        renderExams();
        updateStats();
        
        closeModal('examModal');
        document.getElementById('examForm').reset();
        
        // Set default date again
        document.getElementById('examDate').value = new Date().toISOString().split('T')[0];
    }

    function renderExams() {
        const list = document.getElementById('examsList');
        const tomorrowList = document.getElementById('examsTomorrowList');
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Tomorrow's exams
        const tomorrowExams = exams.filter(e => {
            const examDate = new Date(e.date);
            examDate.setHours(0, 0, 0, 0);
            return examDate.getTime() === tomorrow.getTime();
        });
        
        if (tomorrowExams.length > 0) {
            document.getElementById('examsTomorrow').style.display = 'block';
            tomorrowList.innerHTML = tomorrowExams.map(e => `
                <div class="task-card">
                    <div class="timeline-icon exam"><i class="fas fa-file-alt"></i></div>
                    <div class="task-info">
                        <div class="task-title">${e.name}</div>
                        <div class="task-meta">
                            <span><i class="fas fa-book"></i> ${e.subject}</span>
                            <span><i class="fas fa-clock"></i> ${formatTime12(e.time)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            document.getElementById('examsTomorrow').style.display = 'none';
        }
        
        // All upcoming exams
        const upcomingExams = exams.filter(e => new Date(e.date) >= today).sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (upcomingExams.length === 0) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt"></i><h3>لا توجد امتحانات</h3><p>أضف امتحاناتك القادمة هنا</p></div>';
            return;
        }
        
        list.innerHTML = upcomingExams.map(exam => `
            <div class="task-card">
                <div class="timeline-icon exam"><i class="fas fa-file-alt"></i></div>
                <div class="task-info">
                    <div class="task-title">${exam.name}</div>
                    <div class="task-meta">
                        <span><i class="fas fa-book"></i> ${exam.subject}</span>
                        <span><i class="fas fa-calendar"></i> ${formatDate(exam.date)}</span>
                        <span><i class="fas fa-clock"></i> ${formatTime12(exam.time)}</span>
                    </div>
                    ${exam.notes ? `<div class="task-desc">${exam.notes}</div>` : ''}
                </div>
                <div class="task-actions">
                    <button onclick="deleteExam('${exam.id}')" title="حذف"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    window.deleteExam = function(id) {
        if (confirm('هل أنت متأكد من حذف هذا الامتحان؟')) {
            exams = exams.filter(e => e.id !== id);
            saveData();
            renderExams();
            updateStats();
        }
    };

    // ========================================
    // Classes (Daily Subjects)
    // ========================================
    function addClass(e) {
        e.preventDefault();
        
        const classItem = {
            id: generateId(),
            name: document.getElementById('className').value,
            duration: parseInt(document.getElementById('classDuration').value) || 45,
            priority: document.getElementById('classPriority').value,
            color: document.querySelector('input[name="classColor"]:checked').value,
            notes: document.getElementById('classNotes').value,
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
        };
        
        classes.push(classItem);
        saveData();
        renderClasses();
        updateSubjectsSummary();
        
        closeModal('classModal');
        document.getElementById('classForm').reset();
        document.querySelector('input[name="classColor"][value="#6c5ce7"]').checked = true;
    }

    function renderClasses() {
        const grid = document.getElementById('classesGrid');
        const today = new Date().toISOString().split('T')[0];
        const todayClasses = classes.filter(c => c.date === today);
        
        if (todayClasses.length === 0) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-book-reader"></i><h3>لم تضف مواد اليوم بعد</h3><p>أضف المواد التي درستها اليوم لتظهر في جدول المذاكرة</p></div>';
            return;
        }
        
        const priorityLabels = {
            low: 'منخفضة',
            medium: 'متوسطة',
            high: 'عالية'
        };
        
        grid.innerHTML = todayClasses.map(cls => `
            <div class="class-card">
                <div class="class-card-color" style="background: ${cls.color}"></div>
                <div class="class-card-header">
                    <div class="class-card-icon" style="background: ${cls.color}20; color: ${cls.color}">
                        <i class="fas fa-book-open"></i>
                    </div>
                    <div class="class-card-actions">
                        <button onclick="deleteClass('${cls.id}')" title="حذف"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="class-card-title">${cls.name}</div>
                <div class="class-card-info">
                    <div class="class-info-item">
                        <i class="fas fa-clock"></i>
                        <span>${cls.duration} دقيقة مذاكرة</span>
                    </div>
                    <div class="class-info-item">
                        <i class="fas fa-flag"></i>
                        <span>الأولوية: ${priorityLabels[cls.priority]}</span>
                    </div>
                </div>
                ${cls.notes ? `<div class="class-card-notes">${cls.notes}</div>` : ''}
            </div>
        `).join('');
    }

    function updateSubjectsSummary() {
        const today = new Date().toISOString().split('T')[0];
        const todayClasses = classes.filter(c => c.date === today);
        const totalTime = todayClasses.reduce((sum, c) => sum + (c.duration || 45), 0);
        
        document.getElementById('subjectsCount').textContent = todayClasses.length;
        document.getElementById('estimatedStudyTime').textContent = totalTime;
    }

    window.deleteClass = function(id) {
        if (confirm('هل أنت متأكد من حذف هذه المادة؟')) {
            classes = classes.filter(c => c.id !== id);
            saveData();
            renderClasses();
            updateSubjectsSummary();
        }
    };

    // ========================================
    // Calendar
    // ========================================
    function renderCalendar() {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        document.getElementById('calendarTitle').textContent = monthNames[month] + ' ' + year;
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        
        let html = '';
        
        // Previous month days
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = firstDay - 1; i >= 0; i--) {
            html += `<div class="calendar-day other-month">${prevMonthDays - i}</div>`;
        }
        
        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const hasEvent = checkDateHasEvent(dateStr);
            
            html += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}" onclick="showDayEvents('${dateStr}')">${day}</div>`;
        }
        
        // Next month days
        const remainingDays = 42 - (firstDay + daysInMonth);
        for (let i = 1; i <= remainingDays; i++) {
            html += `<div class="calendar-day other-month">${i}</div>`;
        }
        
        document.getElementById('calendarBody').innerHTML = html;
    }

    function checkDateHasEvent(dateStr) {
        // Check homework
        if (homework.some(h => h.dueDate === dateStr)) return true;
        // Check exams
        if (exams.some(e => e.date === dateStr)) return true;
        // Check schedule
        if (dailySchedule.length > 0) return true;
        return false;
    }

    window.showDayEvents = function(dateStr) {
        const events = [];
        
        // Get homework for this date
        homework.filter(h => h.dueDate === dateStr).forEach(h => {
            events.push({ time: '', title: h.title, type: 'homework', desc: h.subject });
        });
        
        // Get exams for this date
        exams.filter(e => e.date === dateStr).forEach(e => {
            events.push({ time: e.time, title: e.name, type: 'exam', desc: e.subject });
        });
        
        const eventsList = document.getElementById('eventsList');
        
        if (events.length === 0) {
            eventsList.innerHTML = '<div class="empty-state-sm">لا توجد أحداث لهذا اليوم</div>';
            return;
        }
        
        eventsList.innerHTML = events.map(e => `
            <div class="event-item ${e.type}">
                ${e.time ? `<span class="event-time">${formatTime12(e.time)}</span>` : ''}
                <div class="event-info">
                    <div class="event-title">${e.title}</div>
                    <div class="event-type">${e.desc}</div>
                </div>
            </div>
        `).join('');
    };

    // ========================================
    // Settings
    // ========================================
    function saveSettings() {
        currentUser.settings = {
            wakeUpTime: document.getElementById('wakeUpTime').value,
            sleepTime: document.getElementById('sleepTime').value,
            universityStart: document.getElementById('schoolStart').value,
            universityEnd: document.getElementById('schoolEnd').value,
            breakfastTime: document.getElementById('breakfastTime').value,
            lunchTime: document.getElementById('lunchTime').value,
            dinnerTime: document.getElementById('dinnerTime').value,
            exerciseTime: document.getElementById('exerciseTime').value,
            showerTime: document.getElementById('showerTime').value
        };
        
        // Update in users array
        const users = JSON.parse(localStorage.getItem('btu_users') || '[]');
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex].settings = currentUser.settings;
            localStorage.setItem('btu_users', JSON.stringify(users));
        }
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }

    function changePassword(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;
        const errorEl = document.getElementById('passwordError');
        
        errorEl.textContent = '';
        
        if (newPassword.length < 6) {
            errorEl.textContent = 'يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل.';
            return;
        }
        
        if (newPassword.length > 128) {
            errorEl.textContent = 'كلمة المرور طويلة جداً (الحد الأقصى 128 حرف).';
            return;
        }
        
        if (newPassword !== confirmPassword) {
            errorEl.textContent = 'كلمتا المرور الجديدتان غير متطابقتين.';
            return;
        }
        
        // Get users
        const users = JSON.parse(localStorage.getItem('btu_users') || '[]');
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        
        if (userIndex === -1) {
            errorEl.textContent = 'حدث خطأ. يرجى المحاولة مرة أخرى.';
            return;
        }
        
        // Verify current password (supports hashed and legacy)
        verifyPassword(currentPassword, users[userIndex]).then(function(valid) {
            if (!valid) {
                errorEl.textContent = 'كلمة المرور الحالية غير صحيحة.';
                return;
            }
            
            // Hash new password
            const salt = generateSalt();
            hashPassword(newPassword, salt).then(function(hash) {
                users[userIndex].salt = salt;
                users[userIndex].passwordHash = hash;
                delete users[userIndex].password;
                localStorage.setItem('btu_users', JSON.stringify(users));
                
                // Don't store password in session
                alert('تم تحديث كلمة المرور بنجاح!');
                document.getElementById('changePasswordForm').reset();
            });
        });
    }

    function generateSalt() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function hashPassword(password, salt) {
        const encoder = new TextEncoder();
        const data = encoder.encode(salt + password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function verifyPassword(password, user) {
        if (user.salt && user.passwordHash) {
            const hash = await hashPassword(password, user.salt);
            return hash === user.passwordHash;
        }
        // Legacy plain text fallback
        return user.password === password;
    }

    function logout() {
        if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('btu_login_attempts');
            if (sessionTimer) clearTimeout(sessionTimer);
            window.location.href = 'index.html';
        }
    }

    // ========================================
    // Stats
    // ========================================
    function updateStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayDate = new Date().toISOString().split('T')[0];
        const pendingHw = homework.filter(h => !h.completed && new Date(h.dueDate) >= today).length;
        const upcomingExams = exams.filter(e => new Date(e.date) >= today).length;
        const completed = homework.filter(h => h.completed).length;
        const pending = homework.filter(h => !h.completed).length + exams.filter(e => new Date(e.date) >= today).length;
        const todaySubjects = classes.filter(c => c.date === todayDate).length;
        
        document.getElementById('statHomework').textContent = pendingHw;
        document.getElementById('statExams').textContent = upcomingExams;
        document.getElementById('statCompleted').textContent = completed;
        document.getElementById('statPending').textContent = pending;
        document.getElementById('statClasses').textContent = todaySubjects;
    }

    // ========================================
    // Utilities
    // ========================================
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    function timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    function minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60) % 24;
        const mins = minutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    function formatTime12(time24) {
        if (!time24) return '';
        const [hours24, minutes] = time24.split(':').map(Number);
        const period = hours24 >= 12 ? 'م' : 'ص';
        let hours12 = hours24 % 12;
        if (hours12 === 0) hours12 = 12;
        return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        const day = date.getDate();
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return `${day} ${months[date.getMonth()]}`;
    }

    function getPriorityLabel(priority) {
        const labels = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };
        return labels[priority] || priority;
    }

    window.closeModal = function(id) {
        document.getElementById(id).classList.remove('active');
    };

})();
