// ============================================================
// 全局變數設定
// ============================================================
let selectedGender = '';        // 用戶選擇的性別
let quizTimer = null;           // 考試計時器引用
let timeLeft = 180;             // 考試倒計時總時長（秒）

// --- 考試相關變數 ---
let currentExamQuestions = [];  // 當前隨機抽取的題目列表
let currentIndex = 0;           // 當前做到第幾題
let examScore = 0;              // 當前考試得分

// ============================================================
// 核心功能：登入與進入系統
// ============================================================
function confirmStart() {
    const nameInput = document.getElementById('usernameInput');
    const userName = nameInput.value.trim();
    const errorMsg = document.getElementById('errorMsg');

    // 1. 驗證用戶名是否為空
    if (userName === '') {
        errorMsg.style.display = 'block';
    } else {
        // 2. 保存用戶基本信息到本地存儲 (LocalStorage)
        localStorage.setItem('study_username', userName);
        localStorage.setItem('study_gender', selectedGender);

        // 3. 更新登入次數
        let currentCount = parseInt(localStorage.getItem('study_login_count') || '0');
        currentCount++;
        localStorage.setItem('study_login_count', currentCount);

        // 4. 處理每日積分獎勵 (判斷是否為新的一天)
        const todayStr = new Date().toDateString(); 
        const lastLoginDate = localStorage.getItem('last_points_date');
        let currentPoints = parseInt(localStorage.getItem('study_points') || '0');

        if (lastLoginDate !== todayStr) {
            currentPoints += 10; // 每日首次登入獎勵 10 分
            localStorage.setItem('study_points', currentPoints);
            localStorage.setItem('last_points_date', todayStr);
        }
        
        // 5. 切換介面：隱藏歡迎頁，顯示主頁
        const welcomePage = document.getElementById('welcome-page');
        const homePage = document.getElementById('home-page');
        const modal = document.getElementById('loginModal');

        if (welcomePage && homePage) {
            modal.style.display = 'none';
            welcomePage.style.display = 'none';
            homePage.style.display = 'flex';
            initApp(); // 初始化主頁數據
        }
    }
}

// ============================================================
// 系統初始化：讀取數據並渲染畫面
// ============================================================
function initApp() {
    const name = localStorage.getItem('study_username');
    const gender = localStorage.getItem('study_gender');
    
    // 顯示用戶名
    const displayUser = document.getElementById('displayUsername');
    if (displayUser) displayUser.innerText = name;
    
    // 根據時間顯示不同的問候語
    const greetingTitle = document.getElementById('greetingText');
    if (greetingTitle) {
        const hour = new Date().getHours();
        let greeting = (hour >= 5 && hour < 12) ? '☀️ 早上好' : 
                       (hour >= 12 && hour < 18) ? '☕ 下午好' : 
                       (hour >= 18 && hour < 23) ? '🌙 晚上好' : '🦉 夜深了還在學習';
        greetingTitle.innerText = `${greeting}，${name}`;
    }

    // 顯示累計登入次數
    const loginCountDisplay = document.querySelector('.card.green .big-text');
    if (loginCountDisplay) {
        loginCountDisplay.innerText = localStorage.getItem('study_login_count') || '1';
    }

    updatePointsDisplay();

    // 計算並顯示倒數日 (目標日期：2026-03-09)
    const targetDate = new Date('2026-03-09T00:00:00');
    const d1 = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const d2 = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const diffDays = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
    const countdownDisplay = document.querySelector('.card.orange .big-text');
    if (countdownDisplay) {
        countdownDisplay.innerText = (diffDays > 0 ? diffDays : 0) + ' 天';
    }

    // 設定用戶頭像與主題顏色
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) userAvatar.src = (gender === 'boy') ? 'boy.png' : 'girl.png';
    document.body.className = (gender === 'boy') ? 'theme-boy' : 'theme-girl';

    // 載入筆記內容
    const noteArea = document.getElementById('chinese-note');
    if (noteArea) {
        noteArea.value = localStorage.getItem('chineseNote') || '';
        noteArea.oninput = (e) => localStorage.setItem('chineseNote', e.target.value);
    }

    updateWrongList(); // 載入錯題本
}

// 更新積分顯示的輔助函數
function updatePointsDisplay() {
    const pointsDisplay = document.querySelector('.card.purple .big-text');
    if (pointsDisplay) {
        const pts = localStorage.getItem('study_points') || '0';
        pointsDisplay.innerText = pts + ' 分';
    }
}

// ============================================================
// 題目數據庫 (內建題庫)
// ============================================================
const chineseQuizzes = [
    { q: "《陋室銘》的作者哪個朝代的哪位詩人？", options: ["李白（唐朝）", "劉禹錫（唐朝）", "歐陽修（宋朝）"], correct: "劉禹錫（唐朝）", analysis: "原文選自《全唐文》，作者是唐朝「詩豪」劉禹錫。" },
    { q: "哪句是《陋室銘》的主旨句？", options: ["斯是陋室，惟吾德馨", "南陽諸葛廬，西蜀子雲亭", "何陋之有"], correct: "斯是陋室，惟吾德馨", analysis: "核心在於「惟吾德馨」，指只要品德高尚，環境簡陋也無妨。" },
    { q: "「無絲竹之亂耳」的「絲竹」如何運用借代修辭？", options: ["絲綢與竹子", "農耕的工具", "嘈雜的音樂（指官場應酬）"], correct: "嘈雜的音樂（指官場應酬）", analysis: "「絲」指弦樂，「竹」指管樂，這裡借指官場應酬中嘈雜的音樂。" },
    { q: "作者寫「南陽諸葛廬，西蜀子雲亭」目的是什麼？", options: ["說明房子地理位置很好", "表明自己想當政治家", "以古人自勉，表明自己志向高潔"], correct: "以古人自勉，表明自己志向高潔", analysis: "這是「以古人自勉」，表示自己和名臣賢才一樣，志向高潔。" },
    { q: "「談笑有鴻儒，往來無白丁」中「白丁」是指誰？", options: ["穿白衣服的人", "平民百姓或沒有學問的人", "做生意的人"], correct: "平民百姓或沒有學問的人", analysis: "原指穿白衣的平民，在文中指代「沒有學問的人」。" },
    { q: "荀巨伯面對賊兵不肯逃跑，體現了他什麼品質？", options: ["捨生取義，重視友情", "貪生怕死，腿軟跑不動", "魯莽衝動，不知變通"], correct: "捨生取義，重視友情", analysis: "體現他「捨生取義」，認為保護朋友的生命比自己的安全更重要。" },
    { q: "故事的最後，賊兵為什麼撤退了？", options: ["因為援軍到了", "被荀巨伯的「義」所感動慚愧", "搶不到錢嫌棄走了"], correct: "被荀巨伯的「義」所感動慚愧", analysis: "賊人被巨伯的道義感動，自感慚愧，認為闖入「有義之邦」是冒犯。" },
    { q: "「敗義以求生，豈荀巨伯所行邪」的意思是？", options: ["為了活命可以犧牲道義", "失敗了就要犧牲生命", "毀壞道義來苟且偷生，哪是我會做的事？"], correct: "毀壞道義來苟且偷生，哪是我會做的事？", analysis: "這是反問句，強調荀巨伯絕不會做出「毀壞道義來苟且偷生」的事。" },
    { q: "《曾子殺彘》這則故事，主要告訴父母什麼道理？", options: ["孩子想吃什麼就給他做", "父母必須言而有信，身教重於言教", "殺豬需要挑選好日子"], correct: "父母必須言而有信，身教重於言教", analysis: "強調父母對孩子應「言而有信」，明白身教的力量遠大於言語。" },
    { q: "為什麼妻子只是隨口哄騙孩子，曾子卻堅持殺豬？", options: ["妻子殺豬技術不好", "欺騙孩子會導致孩子學會撒謊", "豬養太久了浪費糧食"], correct: "欺騙孩子會導致孩子學會撒謊", analysis: "曾子認為欺騙孩子會破壞信任，讓孩子學會撒謊，後患無窮。" },
    { q: "「士別三日，即更刮目相待」是用來稱讚誰的進步？", options: ["呂蒙", "孫權", "魯肅"], correct: "呂蒙", analysis: "這是魯肅驚嘆呂蒙在短時間內學識大增，不再是當年的「吳下阿蒙」。" },
    { q: "「獨學而無友，則孤陋而寡聞」強調了什麼的重要性？", options: ["獨立思考", "與同學朋友切磋交流", "讀書環境要安靜"], correct: "與同學朋友切磋交流", analysis: "強調集體學習的重要性，缺乏與人切磋交流會導致見聞狹隘。" },
    { q: "「士別三日」的下一句是？", options: ["大兄何見事之晚", "即更刮目相待", "吳下廣蒙"], correct: "即更刮目相待", analysis: "原文是「士別三日，即更刮目相待」。" },
    { q: "「不積跬步」的下一句是？", options: ["無以成江海", "無以至千里", "難以成大器"], correct: "無以至千里", analysis: "原文是「不積跬步，無以至千里」。" },
    { q: "「獨學而無友」的下一句是？", options: ["則孤陋而寡聞", "則孤苦而無依", "則學識淺薄"], correct: "則孤陋而寡聞", analysis: "原文是「獨學而無友，則孤陋而寡聞」。" },
    { q: "「人誰無過，過而能改」的下一句是？", options: ["善莫大焉", "罪莫大焉", "過而不改"], correct: "善莫大焉", analysis: "原文是「人誰無過，過而能改，善莫大焉」。" },
    { q: "「物以類聚」的下一句是？", options: ["人以群分", "人以類聚", "善莫大焉"], correct: "人以群分", analysis: "原文是「物以類聚，人以群分」。" },
    { q: "「路漫漫其修遠兮」的下一句是？", options: ["壯士一去兮不復還", "吾將上下而求索", "物以類聚"], correct: "吾將上下而求索", analysis: "原文是「路漫漫其修遠兮，吾將上下而求索」。" }
];

// 初始化錯題本
let wrongQuestions = JSON.parse(localStorage.getItem('wrongBook')) || {};

// ============================================================
// 考試模式邏輯
// ============================================================
function startExamMode() {
    // 1. 隨機打亂題目並選取前 10 題
    currentExamQuestions = [...chineseQuizzes].sort(() => 0.5 - Math.random()).slice(0, 10);
    currentIndex = 0;
    examScore = 0;

    // 2. 重置並啟動倒計時
    const timerDisplay = document.getElementById('timer-count');
    clearInterval(quizTimer);
    timeLeft = 180; 
    if (timerDisplay) timerDisplay.innerText = timeLeft;

    quizTimer = setInterval(() => {
        timeLeft--;
        if (timerDisplay) timerDisplay.innerText = timeLeft;
        // 時間到自動提交
        if (timeLeft <= 0) {
            clearInterval(quizTimer);
            alert("時間到！自動提交試卷。");
            showExamResult();
        }
    }, 1000);

    // 3. 渲染第一題
    renderQuestion();
}

// 渲染當前題目的介面
function renderQuestion() {
    const quizCard = document.getElementById('quiz-question');
    const optionsDiv = document.getElementById('quiz-options');
    const analysisDiv = document.getElementById('quiz-analysis');
    const nextBtn = document.querySelector('.btn-next');
    const counterDisplay = document.getElementById('quiz-counter');

    if (!quizCard || !optionsDiv) return;

    // 重置介面狀態 (隱藏解析與下一步按鈕)
    if (analysisDiv) analysisDiv.style.display = 'none';
    if (nextBtn) nextBtn.style.visibility = 'hidden';

    const quiz = currentExamQuestions[currentIndex];
    
    // 更新題號
    if (counterDisplay) {
        counterDisplay.innerText = `第 ${currentIndex + 1} / 10 題`;
    }
    
    quizCard.innerText = quiz.q;
    
    // 生成選項按鈕
    optionsDiv.innerHTML = '';
    quiz.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => checkExamAnswer(opt, quiz.correct, quiz.q, btn, quiz.analysis);
        optionsDiv.appendChild(btn);
    });
}

// 檢查答案邏輯
function checkExamAnswer(selected, correct, question, clickedBtn, analysisText) {
    const allBtns = document.querySelectorAll('#quiz-options button');
    const analysisDiv = document.getElementById('quiz-analysis');
    const nextBtn = document.querySelector('.btn-next');

    // 鎖定所有按鈕，防止重複點擊
    allBtns.forEach(b => b.disabled = true);

    if (selected === correct) {
        // --- 答對處理 ---
        clickedBtn.classList.add('btn-correct');
        examScore += 10; 

        // 答對獎勵積分
        let pts = parseInt(localStorage.getItem('study_points') || '0');
        pts += 2; 
        localStorage.setItem('study_points', pts);
        updatePointsDisplay();
        
        // 答對時隱藏解析
        if (analysisDiv) analysisDiv.style.display = 'none';
    } else {
        // --- 答錯處理 ---
        clickedBtn.classList.add('btn-wrong');
        // 標示出正確答案
        allBtns.forEach(b => {
            if (b.innerText === correct) b.classList.add('btn-correct');
        });

        // 加入錯題本
        wrongQuestions[question] = { count: (wrongQuestions[question]?.count || 0) + 1 };
        localStorage.setItem('wrongBook', JSON.stringify(wrongQuestions));
        updateWrongList();

        // 顯示錯題解析
        if (analysisDiv) {
            analysisDiv.style.display = 'block';
            analysisDiv.innerHTML = `<strong>錯題分析：</strong>${analysisText}`;
        }
    }

    // 顯示下一題按鈕 (如果是最後一題則顯示查看結果)
    if (nextBtn) {
        nextBtn.innerText = (currentIndex === 9) ? "查看考試結果" : "下一題";
        nextBtn.style.visibility = 'visible';
    }
}

// 切換下一題
function nextQuiz() {
    if (currentIndex < 9) {
        currentIndex++;
        renderQuestion();
    } else {
        showExamResult();
    }
}

// 顯示考試結算畫面
function showExamResult() {
    clearInterval(quizTimer);
    const quizCard = document.getElementById('quiz-question');
    const optionsDiv = document.getElementById('quiz-options');
    const analysisDiv = document.getElementById('quiz-analysis');
    const nextBtn = document.querySelector('.btn-next');
    const counterDisplay = document.getElementById('quiz-counter');

    if (counterDisplay) counterDisplay.innerText = "測驗完成";

    quizCard.innerHTML = `
        <div style="text-align:center; padding:10px;">
            <h2 style="color:#2ecc71; margin-bottom:10px;">測驗完成！</h2>
            <p style="font-size:1.4rem;">你的得分：<span style="color:#e74c3c; font-weight:bold;">${examScore}</span> / 100</p>
            <p>剩餘時間：${timeLeft} 秒</p>
        </div>
    `;
    
    optionsDiv.innerHTML = `<button onclick="startExamMode()" class="btn-confirm" style="width:100%; margin-top:10px;">重新開始挑戰 🚀</button>`;
    if (analysisDiv) analysisDiv.style.display = 'none';
    if (nextBtn) nextBtn.style.visibility = 'hidden';
}

// ============================================================
// 輔助功能與事件處理
// ============================================================

// 打開性別選擇視窗
function openModal(gender) {
    selectedGender = gender;
    document.getElementById('errorMsg').style.display = 'none'; 
    document.getElementById('loginModal').style.display = 'flex';
    setTimeout(() => { document.querySelector('.modal-box').style.transform = 'scale(1)'; }, 10);
}

function closeModal() { document.getElementById('loginModal').style.display = 'none'; }

// 更新錯題列表顯示
function updateWrongList() {
    const list = document.getElementById('wrong-list');
    const displayCount = document.getElementById('errorCountDisplay');
    if (!list) return;
    list.innerHTML = '';
    const keys = Object.keys(wrongQuestions);
    
    if (keys.length === 0) {
        list.innerHTML = '<li style="color:#aaa; text-align:center;">目前沒有錯題！</li>';
        if (displayCount) displayCount.innerText = 0;
        return;
    }
    
    for (let q in wrongQuestions) {
        const li = document.createElement('li');
        li.className = 'wrong-item';
        li.innerHTML = `<span>${q}</span><span class="wrong-count">累計 ${wrongQuestions[q].count} 次</span>`;
        list.appendChild(li);
    }
    if (displayCount) displayCount.innerText = keys.length;
}

// 切換主頁內容區塊
function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
    
    const targetSection = document.getElementById(id);
    if (targetSection) targetSection.classList.add('active');
    
    const targetNav = document.getElementById('nav-' + id);
    if (targetNav) targetNav.classList.add('active');

    // 如果切換到練習區，自動開始考試
    if (id === 'practice') {
        startExamMode(); 
    }
}

// 清空錯題本
function clearWrongBook() {
    if (confirm("確定要清空嗎？")) { 
        wrongQuestions = {}; 
        localStorage.removeItem('wrongBook'); 
        updateWrongList(); 
    }
}

// 綁定輸入框 Enter 鍵事件
document.getElementById('usernameInput').addEventListener('keypress', (e) => { 
    if (e.key === 'Enter') confirmStart(); 
});