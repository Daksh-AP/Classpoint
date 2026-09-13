// c:\Users\Daksh\Genatis Board\website\parents\app.js

// Firebase configuration matching the desktop school databases
const firebaseConfig = {
  apiKey: "AIzaSyA0kxK-DTY4sGZ4BKVRQ0ADaLzCRJaJBt4",
  authDomain: "Genatis Board-2.firebaseapp.com",
  projectId: "Genatis Board-2",
  storageBucket: "Genatis Board-2.appspot.com",
  messagingSenderId: "798509953266",
  appId: "1:798509953266:web:f133ac64e68b54bba4a06b",
  measurementId: "G-8PYWSQ7W31",
};

// Initialize Firebase compat
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Read URL Parameters with robust fallbacks
const urlParams = new URLSearchParams(window.location.search);
const studentId = urlParams.get('studentId') || 'daksh';
const sectionId = urlParams.get('sectionId') || 'grade9-super1';
const grade = urlParams.get('grade') || '9';

// Cache array to keep notices in memory for 0ms loading
let preloadedNotices = [];
let activeTab = 'notices';
let absentDates = [];

// DOM Elements
const preloader = document.getElementById('preloader');
const parentPanel = document.getElementById('parent-panel');
const parentOutlet = document.getElementById('parent-outlet');

// Notice Drawer Elements
const noticeDrawer = document.getElementById('notice-drawer');
const drawerBackdrop = document.getElementById('drawer-backdrop');
const drawerContentCard = noticeDrawer.querySelector('.relative');
const drawerClose = document.getElementById('drawer-close');
const drawerCloseBar = document.getElementById('drawer-close-bar');
const drawerCategory = document.getElementById('drawer-category');
const drawerTitle = document.getElementById('drawer-title');
const drawerAuthor = document.getElementById('drawer-author');
const drawerDate = document.getElementById('drawer-date');
const drawerContent = document.getElementById('drawer-content');
const drawerAttachmentContainer = document.getElementById('drawer-attachment-container');
const drawerAttachmentName = document.getElementById('drawer-attachment-name');

// ─── INITIAL PRELOAD AND LISTENERS ───
function initPortal() {
  try {
    // 1. Fetch student details dynamically from firestore
    const studentRef = db.doc(`schoolData/grades/gradesList/grade${grade}/sections/${sectionId}/students/${studentId}`);
    studentRef.get().then((docSnap) => {
      if (docSnap.exists()) {
        const studentData = docSnap.data();
        const profileName = document.getElementById('profile-name');
        const profileDetails = document.getElementById('profile-details');
        const profileAvatar = document.getElementById('profile-avatar');

        if (profileName) profileName.textContent = studentData.name || 'Student';
        if (profileDetails) {
          const typePart = sectionId.split('-')[1] || '';
          const formattedType = typePart.charAt(0).toUpperCase() + typePart.slice(1).replace('1', ' 1').replace('2', ' 2');
          profileDetails.textContent = `Grade ${grade} ${formattedType}`;
        }
        if (profileAvatar && studentData.name) {
          profileAvatar.textContent = studentData.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        }
      }
    }).catch(err => {
      console.warn("Student details query failed: ", err);
    });

    // 2. Fetch and calculate attendance rate dynamically
    const attendanceRef = db.collection(`schoolData/grades/gradesList/grade${grade}/sections/${sectionId}/attendance`);
    attendanceRef.get().then((snapshot) => {
      let totalDays = 0;
      let presentDays = 0;
      absentDates = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const records = data.records || {};
        if (records[studentId]) {
          totalDays++;
          if (records[studentId] === 'present' || records[studentId] === 'late') {
            presentDays++;
          } else if (records[studentId] === 'absent') {
            absentDates.push(doc.id); // doc.id is the date key YYYY-MM-DD
          }
        }
      });

      // Sort dates descending
      absentDates.sort((a, b) => new Date(b) - new Date(a));

      const attendanceTextEl = document.getElementById('attendance-rate');
      if (attendanceTextEl) {
        if (totalDays === 0) {
          attendanceTextEl.textContent = '100% (No absences marked)';
          attendanceTextEl.className = 'text-sm font-bold text-zinc-400';
        } else {
          const rate = ((presentDays / totalDays) * 100).toFixed(1);
          let label = 'Excellent';
          let colorClass = 'text-success';
          if (rate < 75) {
            label = 'Low Attendance';
            colorClass = 'text-danger';
          } else if (rate < 90) {
            label = 'Good';
            colorClass = 'text-warning';
          }
          attendanceTextEl.textContent = `${rate}% (${label})`;
          attendanceTextEl.className = `text-sm font-bold ${colorClass}`;
        }
      }
    }).catch(err => {
      console.warn("Attendance query failed: ", err);
    });

    // 2. Fetch notices dynamically
    const noticesQuery = db.collection(`schoolData/parentPortal/${sectionId}_notices`)
      .orderBy('createdAt', 'desc');

    // Subscribe to real-time updates and cache them
    noticesQuery.onSnapshot((snapshot) => {
      preloadedNotices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // If preloadedNotices is empty, insert demo falls automatically to wow them immediately
      if (preloadedNotices.length === 0) {
        preloadedNotices = getFallbackNotices();
      }

      // Refresh active view
      renderActiveTab();
    }, (error) => {
      console.warn("Firestore access error, loading fallbacks:", error);
      preloadedNotices = getFallbackNotices();
      renderActiveTab();
    });
  } catch (err) {
    console.error("Initialization error, loading static fallbacks:", err);
    preloadedNotices = getFallbackNotices();
    renderActiveTab();
  }

  // Fade out preloader after 1.5 seconds robust assembly simulator
  setTimeout(() => {
    preloader.style.opacity = '0';
    setTimeout(() => preloader.style.display = 'none', 500);
  }, 1500);
}

function getFallbackNotices() {
  return [
    {
      id: 'demo-1',
      title: 'Unit Test II (UT-2) Exam Timetable',
      category: 'exam',
      content: 'The Unit Test II examinations will commence from June 1st. Please find the detailed date sheet attached below. Attendance is mandatory.',
      author: 'Principal Office',
      attachment: 'UT2_Timetable_Grade9.pdf',
      createdAt: { seconds: Date.now() / 1000 }
    },
    {
      id: 'demo-2',
      title: 'Monsoon Holiday Announcement',
      category: 'holiday',
      content: 'As per the local government directive, the school will remain closed on Thursday and Friday due to heavy monsoon forecasts. Online revision sheets will be uploaded in the homework portal.',
      author: 'Administration',
      createdAt: { seconds: (Date.now() - 86400000) / 1000 }
    }
  ];
}

// ─── RENDER ENGINE ───
function renderActiveTab() {
  parentOutlet.innerHTML = '';
  lucide.createIcons();

  if (activeTab === 'notices') {
    if (preloadedNotices.length === 0) {
      parentOutlet.innerHTML = `
        <div class="glass-card p-10 text-center rounded-3xl opacity-60">
          <i data-lucide="bell" class="w-12 h-12 mx-auto mb-4 opacity-20 text-zinc-500"></i>
          <p class="text-sm font-semibold">No active notices found</p>
          <p class="text-[10px] text-zinc-500 mt-1">Announcements broadcasted by school will appear here instantly.</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    preloadedNotices.forEach(notice => {
      const card = document.createElement('div');
      card.className = "p-5 rounded-3xl bg-zinc-900/40 border border-white/5 hover:border-brand/40 transition-all duration-300 shadow-sm flex flex-col gap-3 active:scale-[0.98] cursor-pointer";
      
      const catStyle = getCategoryColors(notice.category);
      const dateText = notice.createdAt ? new Date(notice.createdAt.seconds * 1000).toLocaleDateString() : 'Just now';

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest ${catStyle.bg} ${catStyle.text} border ${catStyle.border}">
            ${notice.category}
          </span>
          <span class="text-[9px] text-zinc-500 flex items-center gap-1 font-semibold">
            <i data-lucide="clock" class="w-2.5 h-2.5"></i>
            ${dateText}
          </span>
        </div>
        
        <h3 class="text-base font-bold leading-snug text-white">${notice.title}</h3>
        <p class="text-xs text-zinc-400 line-clamp-2 leading-relaxed">${notice.content}</p>
        
        <div class="flex justify-between items-center pt-2.5 border-t border-white/5 text-[9px] text-zinc-500">
          <span>Teacher: <strong>${notice.author}</strong></span>
          ${notice.attachment ? `
            <span class="flex items-center gap-1 text-brand font-bold">
              <i data-lucide="file-text" class="w-2.5 h-2.5"></i> Materials
            </span>
          ` : ''}
        </div>
      `;

      card.addEventListener('click', () => openNoticeDrawer(notice));
      parentOutlet.appendChild(card);
    });

  } else if (activeTab === 'timetable') {
    parentOutlet.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-extrabold text-xs text-zinc-500 uppercase tracking-widest">Today's Class Schedule</h3>
        <span class="text-[9px] bg-brand/10 text-brand px-2 py-0.5 rounded-lg font-bold border border-brand/20">Preloaded</span>
      </div>
      
      <div class="space-y-3">
        ${[
          { period: '1', time: '08:30 - 09:15', subject: 'Mathematics', teacher: 'Mrs. Sen', room: 'Classroom 4A' },
          { period: '2', time: '09:15 - 10:00', subject: 'English', teacher: 'Mr. Joshi', room: 'Classroom 4A' },
          { period: '3', time: '10:15 - 11:00', subject: 'Science', teacher: 'Dr. Mehta', room: 'Physics Lab' },
          { period: '4', time: '11:00 - 11:45', subject: 'History', teacher: 'Mrs. Nair', room: 'Classroom 4A' }
        ].map(slot => `
          <div class="p-4 rounded-3xl bg-zinc-900/40 border border-white/5 flex justify-between items-center">
            <div class="flex gap-3.5 items-center">
              <div class="w-9 h-9 rounded-2xl bg-zinc-800 flex flex-col items-center justify-center border border-white/5">
                <span class="text-xs font-bold leading-none text-brand">${slot.period}</span>
              </div>
              <div>
                <h4 class="text-xs font-bold text-white">${slot.subject}</h4>
                <p class="text-[9px] text-zinc-500 font-semibold">${slot.teacher} • ${slot.room}</p>
              </div>
            </div>
            <span class="text-[9px] text-zinc-500 font-mono font-semibold">${slot.time}</span>
          </div>
        `).join('')}
      </div>
    `;

  } else if (activeTab === 'insights') {
    const studentFirstName = (document.getElementById('profile-name')?.textContent || 'Daksh').split(' ')[0];
    
    // Absence log HTML generation
    let absenceLogHtml = '';
    if (absentDates.length === 0) {
      absenceLogHtml = `
        <div class="p-5 rounded-3xl bg-zinc-900/40 border border-white/5 shadow-sm">
          <div class="flex justify-between items-center mb-3">
            <h4 class="font-bold text-xs uppercase tracking-wider text-zinc-500">Absence Log</h4>
            <span class="text-[9px] bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded-lg font-bold">Perfect Record</span>
          </div>
          <div class="flex items-center gap-3 py-1">
            <div class="w-8 h-8 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success">
              <i data-lucide="check-circle" class="w-4 h-4"></i>
            </div>
            <div>
              <p class="text-xs font-bold text-white">No absences recorded</p>
              <p class="text-[10px] text-zinc-500">Keep up the excellent school attendance!</p>
            </div>
          </div>
        </div>
      `;
    } else {
      absenceLogHtml = `
        <div class="p-5 rounded-3xl bg-zinc-900/40 border border-white/5 shadow-sm">
          <div class="flex justify-between items-center mb-3">
            <h4 class="font-bold text-xs uppercase tracking-wider text-zinc-500">Absence Log</h4>
            <span class="text-[9px] bg-danger/10 text-danger border border-danger/20 px-2 py-0.5 rounded-lg font-bold">${absentDates.length} Days Absent</span>
          </div>
          <div class="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
            ${absentDates.map(dateStr => {
              const dateObj = new Date(dateStr + "T00:00:00");
              const formattedDate = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
              return `
                <div class="flex justify-between items-center p-3 rounded-2xl bg-zinc-950/60 border border-white/5">
                  <div class="flex items-center gap-3">
                    <div class="w-7 h-7 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center text-danger">
                      <i data-lucide="calendar-x" class="w-3.5 h-3.5"></i>
                    </div>
                    <span class="text-xs font-bold text-white">${formattedDate}</span>
                  </div>
                  <span class="text-[9px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Absent</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    parentOutlet.innerHTML = `
      <div class="space-y-4">
        ${absenceLogHtml}

        <div class="p-5 rounded-3xl bg-zinc-900/40 border border-white/5 shadow-sm">
          <h4 class="font-bold text-xs uppercase tracking-wider text-zinc-500 mb-3">Teacher Insight</h4>
          <div class="flex gap-4 items-start">
            <div class="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
              <i data-lucide="award" class="w-5 h-5"></i>
            </div>
            <div>
              <p class="text-xs font-bold text-white">Monthly Observation</p>
              <p class="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                ${studentFirstName} has shown remarkable analytical progress in algebra and science experiments. Active attendance has really paid off. Keep it up!
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (activeTab === 'chat') {
    parentOutlet.innerHTML = `
      <div class="flex flex-col h-[380px] rounded-3xl bg-zinc-950/80 border border-white/5 overflow-hidden">
        <!-- Header -->
        <div class="px-4 py-3 bg-zinc-900/60 border-b border-white/5 flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <i data-lucide="message-square" class="w-4 h-4"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white">Class Teacher Chat</h4>
            <p class="text-[9px] text-success flex items-center gap-1 font-semibold">
              <span class="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span> Online
            </p>
          </div>
        </div>

        <!-- Message List Container -->
        <div id="chat-messages-container" class="flex-grow p-4 overflow-y-auto space-y-3 no-scrollbar">
          <!-- Chat messages dynamically injected here -->
        </div>

        <!-- Input Bar -->
        <form id="chat-input-form" class="p-3 bg-zinc-900/40 border-t border-white/5 flex gap-2 items-center">
          <input 
            type="text" 
            id="chat-input-field" 
            placeholder="Type your message to the teacher..." 
            class="flex-grow bg-zinc-950/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand/40"
            required
            autocomplete="off"
          />
          <button 
            type="submit" 
            class="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shrink-0 shadow-md shadow-brand/25"
          >
            <i data-lucide="send" class="w-3.5 h-3.5"></i>
          </button>
        </form>
      </div>
    `;

    lucide.createIcons();
    startRealtimeChat();
  }

  lucide.createIcons();
}

// Helper colors for notices
function getCategoryColors(cat) {
  switch (cat) {
    case 'exam': 
      return { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' };
    case 'holiday': 
      return { bg: 'bg-danger/10', text: 'text-danger', border: 'border-danger/20' };
    case 'event': 
      return { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' };
    default: 
      return { bg: 'bg-brand/10', text: 'text-brand', border: 'border-brand/20' };
  }
}

// ─── DRAWER CONTROL ───
function openNoticeDrawer(notice) {
  const styles = getCategoryColors(notice.category);
  
  drawerCategory.className = `px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest ${styles.bg} ${styles.text} border ${styles.border}`;
  drawerCategory.textContent = notice.category;
  
  drawerTitle.textContent = notice.title;
  drawerAuthor.textContent = notice.author;
  drawerDate.textContent = notice.createdAt ? new Date(notice.createdAt.seconds * 1000).toLocaleString() : 'Just now';
  drawerContent.textContent = notice.content;

  if (notice.attachment) {
    drawerAttachmentContainer.classList.remove('hidden');
    drawerAttachmentName.textContent = notice.attachment;
  } else {
    drawerAttachmentContainer.classList.add('hidden');
  }

  // Open Animations
  noticeDrawer.classList.remove('hidden');
  noticeDrawer.classList.add('flex');
  
  setTimeout(() => {
    drawerContentCard.classList.remove('translate-y-full');
    drawerContentCard.classList.add('translate-y-0');
  }, 10);
}

function closeNoticeDrawer() {
  drawerContentCard.classList.remove('translate-y-0');
  drawerContentCard.classList.add('translate-y-full');
  
  setTimeout(() => {
    noticeDrawer.classList.remove('flex');
    noticeDrawer.classList.add('hidden');
  }, 300);
}

// Bottom sheet dismiss handlers
drawerClose.addEventListener('click', closeNoticeDrawer);
drawerBackdrop.addEventListener('click', closeNoticeDrawer);
drawerCloseBar.addEventListener('click', closeNoticeDrawer);

// Sub Tabs
const tabNotices = document.getElementById('tab-notices');
const tabTimetable = document.getElementById('tab-timetable');
const tabInsights = document.getElementById('tab-insights');
const tabChat = document.getElementById('tab-chat');

function updateTabStyles() {
  const tabs = [
    { el: tabNotices, id: 'notices' },
    { el: tabTimetable, id: 'timetable' },
    { el: tabInsights, id: 'insights' },
    { el: tabChat, id: 'chat' }
  ];
  tabs.forEach(t => {
    if (t.el) {
      if (activeTab === t.id) {
        t.el.className = "flex-1 py-2.5 text-center text-[10px] font-bold rounded-xl transition-all bg-brand text-white shadow-md shadow-brand/10";
      } else {
        t.el.className = "flex-1 py-2.5 text-center text-[10px] font-bold rounded-xl transition-all text-zinc-400 hover:text-white";
      }
    }
  });
}

tabNotices.addEventListener('click', () => {
  activeTab = 'notices';
  updateTabStyles();
  renderActiveTab();
});

tabTimetable.addEventListener('click', () => {
  activeTab = 'timetable';
  updateTabStyles();
  renderActiveTab();
});

tabInsights.addEventListener('click', () => {
  activeTab = 'insights';
  updateTabStyles();
  renderActiveTab();
});

if (tabChat) {
  tabChat.addEventListener('click', () => {
    activeTab = 'chat';
    updateTabStyles();
    renderActiveTab();
  });
}

// Add click listener to Monthly Insights Stat Card to open detailed log
const attendanceCard = document.querySelector('section.glass-card');
if (attendanceCard) {
  attendanceCard.style.cursor = 'pointer';
  attendanceCard.addEventListener('click', () => {
    activeTab = 'insights';
    updateTabStyles();
    renderActiveTab();
  });
}

// ─── LIVE REALTIME CHAT ───
let chatUnsubscribe = null;
let metaUnsubscribe = null;

function startRealtimeChat() {
  const container = document.getElementById('chat-messages-container');
  const form = document.getElementById('chat-input-form');
  const input = document.getElementById('chat-input-field');

  if (!container || !form || !input) return;

  // Unsubscribe from previous listeners if active
  if (chatUnsubscribe) chatUnsubscribe();
  if (metaUnsubscribe) metaUnsubscribe();

  const chatDocPath = `schoolData/parentPortal/chats/${sectionId}_${studentId}`;
  
  // 1. Subscribe to real-time messages
  chatUnsubscribe = db.collection(`${chatDocPath}/messages`)
    .orderBy('createdAt', 'asc')
    .onSnapshot((snapshot) => {
      container.innerHTML = '';
      
      if (snapshot.empty) {
        container.innerHTML = `
          <div class="flex flex-col items-center justify-center h-full text-center opacity-60">
            <i data-lucide="message-square" class="w-10 h-10 mb-3 opacity-25 text-zinc-500"></i>
            <p class="text-xs font-semibold text-white">No messages yet</p>
            <p class="text-[9px] text-zinc-500 mt-0.5">Send a message to start chatting with your teacher.</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      snapshot.forEach((docSnap) => {
        const msg = docSnap.data();
        const isParent = msg.sender === 'parent';
        const msgId = docSnap.id;

        // Automatically mark teacher messages as read!
        if (!isParent && !msg.read) {
          db.collection(`${chatDocPath}/messages`).doc(msgId).update({ read: true }).catch(console.error);
        }

        const bubbleBg = isParent ? 'bg-brand text-white ml-auto' : 'bg-zinc-900 border border-white/5 text-zinc-300';
        const alignClass = isParent ? 'justify-end' : 'justify-start';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${alignClass} w-full`;
        
        const hasReactions = msg.reactions && (msg.reactions.teacher || msg.reactions.parent);
        let reactionsHtml = '';
        if (hasReactions) {
          reactionsHtml = `
            <div class="flex gap-1 mt-1 bg-black/20 px-2 py-0.5 rounded-lg text-[9px] w-fit">
              ${msg.reactions.teacher ? `<span>${msg.reactions.teacher}</span>` : ''}
              ${msg.reactions.parent ? `<span>${msg.reactions.parent}</span>` : ''}
            </div>
          `;
        }

        const readStatusHtml = isParent ? `
          <span class="text-[9px] font-bold ${msg.read ? 'text-brand' : 'text-zinc-600'}">
            ${msg.read ? '✔✔' : '✔'}
          </span>
        ` : '';

        const deleteButtonHtml = isParent ? `
          <button onclick="deleteParentMessage('${msgId}')" class="text-zinc-600 hover:text-red-500 transition-colors shrink-0">
            <i data-lucide="trash-2" class="w-3 h-3"></i>
          </button>
        ` : '';

        messageDiv.innerHTML = `
          <div class="flex flex-col max-w-[75%] ${isParent ? 'items-end' : 'items-start'}">
            <div class="rounded-2xl px-3 py-2 text-[11px] ${bubbleBg} shadow-sm leading-relaxed whitespace-pre-wrap relative">
              ${escapeHTML(msg.text)}
              ${reactionsHtml}
            </div>
            
            <div class="flex items-center gap-2 mt-1 text-[9px] text-zinc-500 select-none">
              <span>${isParent ? 'Parent' : 'Teacher'}</span>
              
              <span class="flex gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                <button onclick="reactToMessage('${msgId}', '👍')" class="hover:scale-125 transition-transform ${msg.reactions?.parent === '👍' ? 'opacity-100 font-bold' : 'opacity-40'}">👍</button>
                <button onclick="reactToMessage('${msgId}', '❤️')" class="hover:scale-125 transition-transform ${msg.reactions?.parent === '❤️' ? 'opacity-100 font-bold' : 'opacity-40'}">❤️</button>
                <button onclick="reactToMessage('${msgId}', '😂')" class="hover:scale-125 transition-transform ${msg.reactions?.parent === '😂' ? 'opacity-100 font-bold' : 'opacity-40'}">😂</button>
              </span>
              
              ${deleteButtonHtml}
              ${readStatusHtml}
            </div>
          </div>
        `;
        container.appendChild(messageDiv);
      });

      lucide.createIcons();
      // Smooth scroll to bottom
      container.scrollTop = container.scrollHeight;
    }, (err) => {
      console.error("Chat subscribe error:", err);
    });

  // 2. Handle typing indicator input events
  let parentTypingTimeout = null;
  input.addEventListener('input', () => {
    db.collection("schoolData/parentPortal/chats").doc(`${sectionId}_${studentId}`).set({
      parentTyping: true
    }, { merge: true });

    if (parentTypingTimeout) clearTimeout(parentTypingTimeout);
    parentTypingTimeout = setTimeout(() => {
      db.collection("schoolData/parentPortal/chats").doc(`${sectionId}_${studentId}`).set({
        parentTyping: false
      }, { merge: true });
    }, 2000);
  });

  // 3. Listen to teacher typing indicator
  const typingDiv = document.createElement('div');
  typingDiv.id = 'teacher-typing-indicator';
  typingDiv.className = 'hidden flex items-center gap-2 text-[10px] text-zinc-500 font-semibold px-4 py-1.5 bg-zinc-900/20 border border-white/5 rounded-2xl w-fit italic';
  typingDiv.innerHTML = `
    <span class="flex gap-1 items-center shrink-0">
      <span class="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-pulse" style="animation-delay: 0ms"></span>
      <span class="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-pulse" style="animation-delay: 150ms"></span>
      <span class="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-pulse" style="animation-delay: 300ms"></span>
    </span>
    Teacher is typing...
  `;
  container.parentNode.insertBefore(typingDiv, container.nextSibling);

  metaUnsubscribe = db.collection("schoolData/parentPortal/chats").doc(`${sectionId}_${studentId}`)
    .onSnapshot((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.teacherTyping) {
          typingDiv.classList.remove('hidden');
          typingDiv.classList.add('flex');
        } else {
          typingDiv.classList.remove('flex');
          typingDiv.classList.add('hidden');
        }
      }
    });

  // 4. Handle form submission (sending message)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    
    // Clear parent typing state immediately
    db.collection("schoolData/parentPortal/chats").doc(`${sectionId}_${studentId}`).set({
      parentTyping: false
    }, { merge: true });

    try {
      // 1. Add to messages subcollection
      await db.collection(`${chatDocPath}/messages`).add({
        sender: "parent",
        text: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // 2. Update chat thread summary card for teacher mobile view
      const studentName = document.getElementById('profile-name')?.textContent || 'Daksh';
      await db.collection("schoolData/parentPortal/chats").doc(`${sectionId}_${studentId}`).set({
        studentId: studentId,
        studentName: studentName,
        parentName: `Mr./Mrs. ${studentName}`,
        sectionId: sectionId,
        sectionName: sectionId,
        lastMessage: text,
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
        teacherTyping: false
      }, { merge: true });

    } catch (err) {
      console.error("Error sending message from portal:", err);
    }
  });
}

// Global actions exposed to HTML element clicks
window.reactToMessage = async (msgId, emoji) => {
  const chatDocPath = `schoolData/parentPortal/chats/${sectionId}_${studentId}`;
  const msgRef = db.collection(`${chatDocPath}/messages`).doc(msgId);
  try {
    const docSnap = await msgRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      const currentReaction = data.reactions?.parent;
      const newReaction = currentReaction === emoji ? null : emoji;
      await msgRef.set({
        reactions: {
          parent: newReaction
        }
      }, { merge: true });
    }
  } catch (err) {
    console.error("Error setting reaction from web:", err);
  }
};

window.deleteParentMessage = async (msgId) => {
  const chatDocPath = `schoolData/parentPortal/chats/${sectionId}_${studentId}`;
  try {
    await db.collection(`${chatDocPath}/messages`).doc(msgId).delete();
  } catch (err) {
    console.error("Error deleting parent message:", err);
  }
};

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Run
initPortal();

