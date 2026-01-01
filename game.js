/**
 *  - Animal Rescue Mission
 * 1. 适配 1600x900 高清分辨率
 * 2. 自动缩放本地图片
 * 3. 强化视觉UI：卡片阴影、圆角、森林主题配色
 * 4. 用户登录系统 + 排行榜
 */
// 注意：SoundManager 类在 sounds.js 中定义
const gameOptions = {
    width: 1600,
    height: 900,
    score: 0,
    currentLevel: 0,
    timeLeft: 60,
    isGameOver: false,
    wrongWords: new Set(),
    currentUser: null,
    gameStartTime: null,  // 游戏开始时间戳
    animalData: [
        { name: 'Giraffe', desc: 'It has a very long neck.', labels: ['neck', 'giraffe'], img: 'assets/giraffe.png' },
        { name: 'Elephant', desc: 'It is a huge animal with a long trunk.', labels: ['huge', 'elephant'], img: 'assets/eleghant.png' },
        { name: 'Fox', desc: 'It is a clever animal with thick fur.', labels: ['fur', 'fox'], img: 'assets/fox.png' },
        { name: 'Wolf', desc: 'It lives in the forest and is dangerous.', labels: ['forest', 'wolf', 'danger'], img: 'assets/wolf.png' },
        { name: 'Snake', desc: 'It is a scary and long animal.', labels: ['snake', 'scary', 'long'], img: 'assets/snake.png' }
    ]
};

// --- 排行榜数据管理 ---
class LeaderboardManager {
    static getScores() {
        const data = localStorage.getItem('animalRescueScores');
        return data ? JSON.parse(data) : [];
    }

    static saveScore(username, score, wrongWords = []) {
        const scores = this.getScores();
        
        // 查找是否已存在该用户名
        const existingIndex = scores.findIndex(s => s.username === username);
        
        // 计算通关耗时（秒）
        const timeSpent = gameOptions.gameStartTime ? Math.round((Date.now() - gameOptions.gameStartTime) / 1000) : 0;
        
        const newEntry = { 
            username, 
            score, 
            timeSpent,  // 通关耗时（秒）
            wrongWords: Array.from(wrongWords),
            date: new Date().toLocaleString() 
        };
        
        if (existingIndex !== -1) {
            // 如果该用户名已存在，仅在新成绩更高时更新
            if (score > scores[existingIndex].score) {
                scores[existingIndex] = newEntry;
            }
            // 低于最高分时不更新，再次登录不获积分
        } else {
            // 新用户，直接添加
            scores.push(newEntry);
        }
        
        // 排序为：最高分优先，相同分数下耗时成少者优先
        scores.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;  // 分数高优先
            }
            return (a.timeSpent || 0) - (b.timeSpent || 0);  // 相同分数时，耗时少优先
        });
        localStorage.setItem('animalRescueScores', JSON.stringify(scores));
    }

    static getTopScores(limit = 10) {
        const scores = this.getScores();
        
        // 构建一个用户名到最高分的映射，去除重复用户
        const userHighestScores = {};
        
        scores.forEach(entry => {
            if (!userHighestScores[entry.username] || entry.score > userHighestScores[entry.username].score) {
                userHighestScores[entry.username] = entry;
            }
        });
        
        // 转换为数组并按分数排序（相同分数下按耗时排序）
        return Object.values(userHighestScores)
            .sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;  // 分数高优先
                }
                return (a.timeSpent || 0) - (b.timeSpent || 0);  // 相同分数时，耗时少优先
            })
            .slice(0, limit);
    }

    // 统计所有错误词汇
    static getErrorStatistics() {
        const scores = this.getScores();
        const errorStats = {};
        
        scores.forEach(entry => {
            if (entry.wrongWords && Array.isArray(entry.wrongWords)) {
                entry.wrongWords.forEach(word => {
                    errorStats[word] = (errorStats[word] || 0) + 1;
                });
            }
        });
        
        // 转换为数组并按频率排序
        return Object.entries(errorStats)
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => b.count - a.count);
    }
}

// --- 场景 0: 用户登录界面 ---
// 找到 class LoginScene 这一行，替换整个类的内容
class LoginScene extends Phaser.Scene {
    constructor() { super('LoginScene'); }

    preload() {
        this.load.image('bg', 'assets/background.png');
    }

    create() {
        // --- 修复：防止多次进入登录页产生多个输入框 ---
        const existingInput = document.getElementById('phaser-hidden-input');
        if (existingInput) existingInput.remove();

        let bg = this.add.image(800, 450, 'bg').setDisplaySize(1600, 900).setAlpha(0.7);
        this.add.text(800, 200, 'Welcome!', {
            fontSize: '100px', color: '#1a237e', fontWeight: '900', stroke: '#ffffff', strokeThickness: 12
        }).setOrigin(0.5);

        this.add.text(800, 300, 'Enter your name to start playing', {
            fontSize: '48px', color: '#ff6b6b', fontWeight: '900', stroke: '#ffffff', strokeThickness: 4
        }).setOrigin(0.5);

        const inputBox = this.add.rectangle(800, 420, 600, 80, 0xffffff).setStrokeStyle(4, 0x1a237e).setInteractive();
        this.inputText = this.add.text(800, 420, 'Click to Enter', {
            fontSize: '40px', color: '#999'
        }).setOrigin(0.5);

        let username = '';
        const maxLength = 15;

        // 创建隐藏输入框
        const hiddenInput = document.createElement('input');
        hiddenInput.id = 'phaser-hidden-input';
        hiddenInput.type = 'text';
        hiddenInput.style = 'position:absolute; opacity:0; width:1px; height:1px; pointer-events:none;';
        document.body.appendChild(hiddenInput);
        
        inputBox.on('pointerdown', () => { 
            hiddenInput.focus();
            this.inputText.setColor('#1a237e');
        });
        
        hiddenInput.addEventListener('input', (e) => {
            username = e.target.value.slice(0, maxLength);
            this.inputText.setText(username);
        });
        
        // --- 核心修复点：安全的 DOM 移除逻辑 ---
        this.events.on('shutdown', () => {
            if (hiddenInput && hiddenInput.parentNode === document.body) {
                document.body.removeChild(hiddenInput);
            }
        });

        // LOGIN 按钮
        const loginBtn = this.add.container(800, 580);
        const btnBg = this.add.rectangle(0, 0, 400, 100, 0x4caf50).setInteractive({ useHandCursor: true });
        const btnTxt = this.add.text(0, 0, 'LOGIN', { fontSize: '48px', color: '#ffffff', fontWeight: 'bold' }).setOrigin(0.5);
        loginBtn.add([btnBg, btnTxt]);

        btnBg.on('pointerdown', () => {
            if (username.trim()) {
                gameOptions.currentUser = username;
                gameOptions.wrongWords.clear();
                this.scene.start('StartScene');
            }
        });

        // LEADERBOARD 按钮
        const lbBtn = this.add.container(800, 730);
        const lbBg = this.add.rectangle(0, 0, 400, 80, 0x1a237e).setInteractive({ useHandCursor: true });
        const lbTxt = this.add.text(0, 0, 'LEADERBOARD', { fontSize: '36px', color: '#ffffff', fontWeight: 'bold' }).setOrigin(0.5);
        lbBtn.add([lbBg, lbTxt]);

        lbBg.on('pointerdown', () => {
            this.scene.start('LeaderboardScene'); // 这里不再报错，因为 shutdown 逻辑已修复
        });
    }
}

// --- 场景 1: 开始界面 ---
class StartScene extends Phaser.Scene {
    constructor() { super('StartScene'); }
    
    preload() {
        this.load.image('bg', 'assets/background.png');
    }

    create() {
        // 重置游戏状态（保留 wrongWords 用于累积跨关卡的错词）
        gameOptions.score = 0;
        gameOptions.currentLevel = 0;
        gameOptions.isGameOver = false;
        // 不在这里清除 wrongWords，因为需要累积所有关卡的错词
        
        // 背景
        let bg = this.add.image(800, 450, 'bg');
        bg.setDisplaySize(1600, 900);
        bg.setAlpha(0.7);

        // 标题
        this.add.text(800, 220, 'Animal Rescue Mission', { 
            fontSize: '100px', color: '#1a237e', fontWeight: '900', stroke: '#ffffff', strokeThickness: 12
        }).setOrigin(0.5);

        this.add.text(800, 320, 'Drag words to the animal to save them!', { 
            fontSize: '48px', color: '#ffeb3b', fontWeight: '900', stroke: '#1a237e', strokeThickness: 3
        }).setOrigin(0.5);

        // 显示当前用户
        this.add.text(800, 400, `Player: ${gameOptions.currentUser}`, {
            fontSize: '44px', color: '#4caf50', fontWeight: '900', stroke: '#ffffff', strokeThickness: 3
        }).setOrigin(0.5);
        
        // 开始按钮
        const startBtn = this.add.container(800, 550);
        const btnShadow = this.add.rectangle(5, 5, 400, 110, 0x000000, 0.2);
        const btnBg = this.add.rectangle(0, 0, 400, 110, 0x4caf50).setInteractive({ useHandCursor: true });
        const btnTxt = this.add.text(0, 0, 'START GAME', { 
            fontSize: '48px', color: '#ffffff', fontWeight: 'bold' 
        }).setOrigin(0.5);
        
        startBtn.add([btnShadow, btnBg, btnTxt]);

        btnBg.on('pointerdown', () => {
            // 确保 SoundManager 存在才调用，双重保险
            if (typeof SoundManager !== 'undefined') {
                SoundManager.playClick();
            }
            
            // 激活音频上下文（解决 AudioContext not allowed 提示）
            if (this.sound && this.sound.context && this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }

            this.scene.start('MainScene');
        });
        
        // 悬停动画保持不变...

        // 返回登录按钮
        const backBtn = this.add.container(800, 720);
        const backBg = this.add.rectangle(0, 0, 300, 90, 0x1a237e).setInteractive({ useHandCursor: true });
        const backTxt = this.add.text(0, 0, 'CHANGE USER', {
            fontSize: '32px', color: '#ffffff', fontWeight: 'bold'
        }).setOrigin(0.5);

        backBtn.add([backBg, backTxt]);

        backBg.on('pointerdown', () => {
            SoundManager.playClick();
            this.scene.start('LoginScene');
        });
        backBg.on('pointerover', () => {
            backBg.setFillStyle(0x424242);
            backBtn.setScale(1.05);
        });
        backBg.on('pointerout', () => {
            backBg.setFillStyle(0x1a237e);
            backBtn.setScale(1.0);
        });
    }
}

// --- 场景 2: 主游戏界面 ---
class MainScene extends Phaser.Scene {
    constructor() { super('MainScene'); }

    preload() {
        this.load.image('bg', 'assets/background.jpg');
        gameOptions.animalData.forEach(animal => {
            this.load.image(animal.name.toLowerCase(), animal.img);
        });
    }

    create() {
        this.initGameLayout();
    }

    initGameLayout() {
        gameOptions.isGameOver = false;
        gameOptions.timeLeft = 60;
        gameOptions.gameStartTime = Date.now();
        const levelData = gameOptions.animalData[gameOptions.currentLevel];

        // 1. 背景层
        this.add.image(800, 450, 'bg').setDisplaySize(1600, 900).setAlpha(0.5);

        // 2. 顶部 UI
        this.add.rectangle(230, 70, 400, 80, 0xffffff, 0.8).setStrokeStyle(3, 0x1a237e);
        this.scoreText = this.add.text(60, 70, `Score: ${gameOptions.score}`, { 
            fontSize: '40px', color: '#1a237e', fontWeight: 'bold' 
        }).setOrigin(0, 0.5);

        this.add.rectangle(1370, 70, 350, 80, 0xffffff, 0.8).setStrokeStyle(3, 0xc62828);
        this.timerText = this.add.text(1230, 70, `Time: ${gameOptions.timeLeft}s`, { 
            fontSize: '40px', color: '#c62828', fontWeight: 'bold' 
        }).setOrigin(0, 0.5);

        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (gameOptions.timeLeft > 0) {
                    gameOptions.timeLeft--;
                    this.timerText.setText(`Time: ${gameOptions.timeLeft}s`);
                } else { this.endGame("TIME UP!"); }
            },
            loop: true
        });

        // 3. 描述气泡
        const bubble = this.add.container(800, 180);
        const bubbleBg = this.add.rectangle(0, 0, 1000, 110, 0xffeb3b, 0.9).setStrokeStyle(4, 0xf9a825);
        const descTxt = this.add.text(0, 0, levelData.desc, { 
            fontSize: '36px', color: '#424242', fontWeight: 'bold' 
        }).setOrigin(0.5);
        bubble.add([bubbleBg, descTxt]);

        // 4. 动物角色
        const key = levelData.name.toLowerCase();
        if (this.textures.exists(key)) {
            const animalImg = this.add.image(800, 480, key);
            const scale = Math.min(800 / animalImg.width, 450 / animalImg.height);
            animalImg.setScale(scale);
        }

        // 5. 选项生成逻辑
        const distractors = ['fox','giraffe','eagle','wolf','penguin','care','sandwich','snake','scary','neck','guess','shark','whale','huge','dangerous','culture','however','danger','forest','kill','ivory','friendly','quite','fur','blind','hearing'];
        const neededDistractors = 5 - levelData.labels.length;
        const correctLabelsSet = new Set(levelData.labels.map(l => l.toLowerCase()));
        const filteredDistractors = [...new Set(distractors.filter(d => !correctLabelsSet.has(d.toLowerCase())))];
        const shuffledDistractors = filteredDistractors.sort(() => Math.random() - 0.5).slice(0, neededDistractors);
        const currentLabels = [...levelData.labels, ...shuffledDistractors].sort(() => Math.random() - 0.5);

        // 6. 布局卡片
        const cardsPerRow = 5;
        const cardWidth = 200;
        const spacing = 15;
        const totalWidth = cardsPerRow * cardWidth + (cardsPerRow - 1) * spacing;
        const startX = Math.max(100, (1600 - totalWidth) / 2);
        const startY = 800;

        currentLabels.forEach((text, i) => {
            const cardX = startX + i * (cardWidth + spacing) + cardWidth / 2;
            this.createWordCard(cardX, startY, text, levelData.labels.includes(text));
        });

        // 初始化目标区
        this.targetHighlight = this.add.circle(800, 480, 280, 0x4caf50, 0.05).setDepth(500).setVisible(false);
        this.targetSnapZone = this.add.circle(800, 480, 120, 0x4caf50, 0.08).setDepth(501).setVisible(false);
    }

    // --- 独立的方法，不再嵌套在 initGameLayout 里 ---
    createWordCard(x, y, text, isCorrect) {
        const container = this.add.container(x, y);
        const randomColor = [0x81d4fa, 0xffe082, 0xa5d6a7, 0xce93d8][Math.floor(Math.random() * 4)];
        
        const shadow = this.add.rectangle(3, 3, 200, 90, 0x000000, 0.2);
        const cardBg = this.add.rectangle(0, 0, 200, 90, randomColor).setStrokeStyle(3, 0xffffff);
        const cardTxt = this.add.text(0, 0, text, { fontSize: '26px', color: '#222', fontWeight: 'bold' }).setOrigin(0.5);
        const audioBtn = this.add.rectangle(70, 25, 40, 35, 0xff6b6b).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
        const audioIcon = this.add.text(70, 25, '🔊', { fontSize: '18px' }).setOrigin(0.5);

        container.add([shadow, cardBg, cardTxt, audioBtn, audioIcon]);
        container.setSize(200, 90).setInteractive({ draggable: true });
        container.isCorrect = isCorrect;
        container.setData('originalX', x);
        container.setData('originalY', y);
        container.setData('originalColor', randomColor);

        // 音频播放函数：优先播放本地同名音频文件，否则回退到 SpeechSynthesis
        const playAudio = async () => {
            const safe = text.replace(/[^a-zA-Z0-9_-]/g, '_');
            const mp3Path = `assets/tts/${encodeURIComponent(safe)}.mp3`;
            const wavPath = `assets/tts/${encodeURIComponent(safe)}.wav`;

            try {
                // 先尝试 mp3
                let res = await fetch(mp3Path, { method: 'HEAD' });
                if (res && res.ok) {
                    const a = new Audio(mp3Path);
                    await a.play();
                    return;
                }
            } catch (e) {
                // ignore
            }

            try {
                // 再尝试 wav
                let res2 = await fetch(wavPath, { method: 'HEAD' });
                if (res2 && res2.ok) {
                    const a2 = new Audio(wavPath);
                    await a2.play();
                    return;
                }
            } catch (e) {
                // ignore
            }

            // 回退：使用浏览器 TTS
            try {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'en-US';
                utterance.rate = 0.95;
                speechSynthesis.speak(utterance);
            } catch (e) {
                console.warn('TTS failed', e);
            }
        };

        // 拖拽逻辑
        const TARGET_X = 800;
        const TARGET_Y = 480;
        const DETECTION_RADIUS = 280;
        const SNAP_RADIUS = 120;

        container.on('dragstart', () => {
            if (gameOptions.isGameOver) return;
            container.isDragging = true;
            const origColor = container.getData('originalColor');
            cardBg.setFillStyle(origColor);
            container.setDepth(1100);
            this.targetHighlight.setVisible(true);
            this.targetSnapZone.setVisible(true);
        });

        container.on('drag', (p, dx, dy) => {
            if (gameOptions.isGameOver) return;
            container.setPosition(dx, dy);
            const dist = Phaser.Math.Distance.Between(dx, dy, TARGET_X, TARGET_Y);
            
            // 根据距离改变高亮颜色和不透明度
            if (dist <= SNAP_RADIUS) {
                this.targetHighlight.setFillStyle(0x4caf50, 0.12);
                this.targetSnapZone.setFillStyle(0x4caf50, 0.15);
                container.setScale(1.20);
            } else if (dist <= DETECTION_RADIUS) {
                this.targetHighlight.setFillStyle(0xffeb3b, 0.08);
                this.targetSnapZone.setFillStyle(0xffeb3b, 0.05);
                container.setScale(1.12);
            } else {
                this.targetHighlight.setFillStyle(0xff6b6b, 0.03);
                this.targetSnapZone.setFillStyle(0xff6b6b, 0.02);
                container.setScale(1.08);
            }
        });

        container.on('dragend', () => {
            container.isDragging = false;
            this.targetHighlight.setVisible(false);
            this.targetSnapZone.setVisible(false);
            
            const dist = Phaser.Math.Distance.Between(container.x, container.y, TARGET_X, TARGET_Y);
            const origX = container.getData('originalX');
            const origY = container.getData('originalY');
            
            // 吸附区内：自动成功/失败处理
            if (dist <= SNAP_RADIUS) {
                if (isCorrect) {
                    if (typeof SoundManager !== 'undefined' && SoundManager.playSuccess) {
                        SoundManager.playSuccess();
                    } else if (typeof SoundManager !== 'undefined') {
                        SoundManager.playCorrect();
                    }
                    gameOptions.score += 10;
                    this.scoreText.setText(`Score: ${gameOptions.score}`);
                    this.tweens.add({ targets: container, x: TARGET_X, y: TARGET_Y - 50, scale: 0, alpha: 0, duration: 400, ease: 'Cubic.easeIn', onComplete: () => { container.destroy(); this.checkLevelComplete(); } });
                } else {
                    if (typeof SoundManager !== 'undefined' && SoundManager.playError) {
                        SoundManager.playError();
                    } else if (typeof SoundManager !== 'undefined') {
                        SoundManager.playWrong();
                    }
                    gameOptions.score = Math.max(0, gameOptions.score - 5);
                    gameOptions.wrongWords.add(text);
                    this.scoreText.setText(`Score: ${gameOptions.score}`);
                    this.cameras.main.shake(200, 0.02);
                    this.tweens.add({ targets: container, x: origX, y: origY, scale: 1, duration: 450, ease: 'Elastic.easeOut' });
                }
                return;
            }
            
            // 检测区内：给予提示反馈
            if (dist <= DETECTION_RADIUS && !isCorrect) {
                if (typeof SoundManager !== 'undefined' && SoundManager.playError) {
                    SoundManager.playError();
                } else if (typeof SoundManager !== 'undefined') {
                    SoundManager.playWrong();
                }
                gameOptions.score = Math.max(0, gameOptions.score - 3);
                gameOptions.wrongWords.add(text);
                this.scoreText.setText(`Score: ${gameOptions.score}`);
                this.cameras.main.shake(120, 0.01);
            }
            
            // 返回原点
            container.setScale(1.0);
            this.tweens.add({ targets: container, x: origX, y: origY, duration: 350, ease: 'Back.easeOut' });
        });

        // 卡片悬停效果
        container.on('pointerover', () => {
            if (gameOptions.isGameOver || container.isDragging) return;
            cardBg.setFillStyle(0xe0e0e0);
        });
        
        container.on('pointerout', () => {
            const origColor = container.getData('originalColor');
            cardBg.setFillStyle(origColor);
        });

        // 音频按钮事件
        audioBtn.on('pointerdown', (p) => {
            if (p && p.event && typeof p.event.stopPropagation === 'function') {
                p.event.stopPropagation();
            }
            playAudio();
        });
        
        audioBtn.on('pointerover', () => {
            audioBtn.setFillStyle(0xff7043);
            this.tweens.killTweensOf(audioBtn);
            this.tweens.add({ targets: audioBtn, scaleX: 1.1, scaleY: 1.1, duration: 100 });
        });
        
        audioBtn.on('pointerout', () => {
            audioBtn.setFillStyle(0xff6b6b);
            this.tweens.killTweensOf(audioBtn);
            this.tweens.add({ targets: audioBtn, scaleX: 1, scaleY: 1, duration: 100 });
        });
    }

    checkLevelComplete() {
        const remaining = this.children.list.filter(c => c instanceof Phaser.GameObjects.Container && c.isCorrect);
        if (remaining.length === 0) {
            if (typeof SoundManager !== 'undefined' && SoundManager.playLevelComplete) {
                SoundManager.playLevelComplete();
            }
            const nextBtn = this.add.container(1450, 480);
            const btnBg = this.add.rectangle(0, 0, 180, 80, 0xff9800).setInteractive({ useHandCursor: true }).setStrokeStyle(3, 0xffffff);
            nextBtn.add([btnBg, this.add.text(0, 0, 'NEXT >>', { fontSize: '32px', color: '#fff', fontWeight: 'bold' }).setOrigin(0.5)]);
            btnBg.on('pointerdown', () => {
                if (typeof SoundManager !== 'undefined') SoundManager.playClick();
                gameOptions.currentLevel++;
                if (gameOptions.currentLevel >= gameOptions.animalData.length) {
                    if (typeof SoundManager !== 'undefined' && SoundManager.playGameComplete) {
                        SoundManager.playGameComplete();
                    }
                    this.endGame("WELL DONE!");
                } else { 
                    this.scene.restart(); 
                }
            });
        }
    }

    endGame(title) {
        gameOptions.isGameOver = true;
        if (this.timerEvent) this.timerEvent.remove();
        
        // 保存成绩到排行榜
        if (title === "WELL DONE!") {
            LeaderboardManager.saveScore(gameOptions.currentUser, gameOptions.score, gameOptions.wrongWords);
        }

        this.add.rectangle(800, 450, 1600, 900, 0x000000, 0.8).setDepth(2000);
        
        const panel = this.add.container(800, 450).setDepth(2001);
        panel.add(this.add.rectangle(0, 0, 900, 680, 0xffffff).setStrokeStyle(8, 0x4caf50));
        
        panel.add(this.add.text(0, -260, title, { fontSize: '90px', color: '#1b5e20', fontWeight: 'bold' }).setOrigin(0.5));
        panel.add(this.add.text(0, -160, `${gameOptions.currentUser}: ${gameOptions.score}`, { fontSize: '50px', color: '#333' }).setOrigin(0.5));

        const wordsDisplay = Array.from(gameOptions.wrongWords).join(', ') || 'None! You are an expert!';
        panel.add(this.add.text(0, -30, "Review Words:", { fontSize: '38px', color: '#d32f2f', fontWeight: 'bold' }).setOrigin(0.5));
        panel.add(this.add.text(0, 80, wordsDisplay, { 
            fontSize: '32px', color: '#555', wordWrap: { width: 750 }, align: 'center' 
        }).setOrigin(0.5));

        const restartBtn = this.add.rectangle(-180, 240, 350, 100, 0x1a237e).setInteractive({ useHandCursor: true });
        panel.add([restartBtn, this.add.text(-180, 240, 'MAIN MENU', { color: '#fff', fontSize: '40px', fontWeight: 'bold' }).setOrigin(0.5)]);
        restartBtn.on('pointerdown', () => {
            if (typeof SoundManager !== 'undefined') SoundManager.playClick();
            this.scene.start('StartScene');
        });
        
        // 复习闪卡按钮（仅当有错词时显示）
        if (gameOptions.wrongWords.size > 0) {
            const reviewBtn = this.add.rectangle(180, 240, 350, 100, 0x4caf50).setInteractive({ useHandCursor: true }).setStrokeStyle(3, 0xffffff);
            panel.add([reviewBtn, this.add.text(180, 240, 'REVIEW\nFLASHCARDS', { color: '#fff', fontSize: '28px', fontWeight: 'bold', align: 'center' }).setOrigin(0.5).setMaxLines(2)]);
            
            reviewBtn.on('pointerover', () => {
                reviewBtn.setFillStyle(0x66bb6a);
            });
            reviewBtn.on('pointerout', () => {
                reviewBtn.setFillStyle(0x4caf50);
            });
            
            reviewBtn.on('pointerdown', () => {
                if (typeof SoundManager !== 'undefined') SoundManager.playClick();
                const reviewList = Array.from(gameOptions.wrongWords || []);
                // store temporarily for iframe fallback
                localStorage.setItem('flashcardReview', JSON.stringify(reviewList));

                // create responsive container for iframe and controls
                const container = document.createElement('div');
                container.id = 'embeddedFlashcardsContainer';
                container.style.position = 'fixed';
                container.style.left = '50%';
                container.style.top = '50%';
                container.style.transform = 'translate(-50%, -50%)';
                container.style.width = 'min(95vw, 1000px)';
                container.style.maxWidth = '1000px';
                container.style.height = 'min(80vh, 760px)';
                container.style.maxHeight = '760px';
                container.style.zIndex = 10000;
                container.style.display = 'flex';
                container.style.alignItems = 'stretch';
                container.style.justifyContent = 'center';
                container.style.borderRadius = '10px';
                container.style.overflow = 'hidden';

                // inner iframe
                const iframe = document.createElement('iframe');
                iframe.src = 'flashcards.html';
                iframe.id = 'embeddedFlashcards';
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.border = 'none';
                iframe.style.flex = '1 1 auto';

                // overlay backdrop
                const backdrop = document.createElement('div');
                backdrop.id = 'embeddedFlashcardsBackdrop';
                backdrop.style.position = 'fixed';
                backdrop.style.left = 0;
                backdrop.style.top = 0;
                backdrop.style.width = '100%';
                backdrop.style.height = '100%';
                backdrop.style.background = 'rgba(0,0,0,0.45)';
                backdrop.style.zIndex = 9999;

                // close button (inside container, top-right)
                const closeBtn = document.createElement('button');
                closeBtn.innerText = '✕';
                closeBtn.id = 'embeddedFlashcardsClose';
                closeBtn.style.position = 'absolute';
                closeBtn.style.right = '12px';
                closeBtn.style.top = '12px';
                closeBtn.style.zIndex = 10001;
                closeBtn.style.padding = '6px 10px';
                closeBtn.style.borderRadius = '6px';
                closeBtn.style.border = 'none';
                closeBtn.style.background = '#ff6b6b';
                closeBtn.style.color = 'white';
                closeBtn.style.fontSize = '16px';

                // remove function with cleanup
                function removeEmbedded() {
                    const containerEl = document.getElementById('embeddedFlashcardsContainer');
                    const b = document.getElementById('embeddedFlashcardsBackdrop');
                    if (containerEl) containerEl.remove();
                    if (b) b.remove();
                    try { localStorage.removeItem('flashcardReview'); } catch (e) {}
                    window.removeEventListener('message', receiveMessage);
                    window.removeEventListener('keydown', onEsc);
                }

                closeBtn.addEventListener('click', removeEmbedded);

                // ESC closes
                function onEsc(e) { if (e.key === 'Escape') removeEmbedded(); }
                window.addEventListener('keydown', onEsc);

                // message receiver to forward review list if iframe requests it
                function receiveMessage(event) {
                    // accept messages requesting the review list
                    if (event && event.data === 'requestFlashcardReview') {
                        const data = { review: reviewList };
                        const f = document.getElementById('embeddedFlashcards');
                        if (f && f.contentWindow) {
                            f.contentWindow.postMessage({ type: 'flashcardReviewData', payload: data }, '*');
                        }
                    }
                }

                window.addEventListener('message', receiveMessage);

                container.appendChild(iframe);
                container.appendChild(closeBtn);
                document.body.appendChild(backdrop);
                document.body.appendChild(container);
            });
        }
    }
}

// --- 场景 3: 排行榜界面 ---
class LeaderboardScene extends Phaser.Scene {
    constructor() { super('LeaderboardScene'); }

    preload() {
        this.load.image('bg', 'assets/background.png');
    }

    create() {
        // 背景
        let bg = this.add.image(800, 450, 'bg');
        bg.setDisplaySize(1600, 900);
        bg.setAlpha(0.7);

        // 添加纯色背景覆盖层
        this.add.rectangle(800, 450, 1600, 900, 0x263238, 0.4).setDepth(-1);
        
        // 排行榜面板背景
        const panelBg = this.add.rectangle(800, 400, 1000, 600, 0xffffff, 0.95).setStrokeStyle(6, 0x1a237e);
        
        // 排行榜头部背景
        const headerBg = this.add.rectangle(800, 180, 1000, 80, 0x1a237e, 1).setStrokeStyle(4, 0xffffff);

        // 标题
        this.add.text(800, 80, 'LEADERBOARD', {
            fontSize: '90px', color: '#1a237e', fontWeight: '900', stroke: '#ffffff', strokeThickness: 10
        }).setOrigin(0.5);

        // 获取排行榜数据
        const topScores = LeaderboardManager.getTopScores(10);

        // 排行榜表头
        this.add.text(350, 180, 'Rank', { fontSize: '30px', color: '#ffeb3b', fontWeight: 'bold' }).setOrigin(0.5);
        this.add.text(700, 180, 'Player', { fontSize: '30px', color: '#ffeb3b', fontWeight: 'bold' }).setOrigin(0.5);
        this.add.text(1050, 180, 'Score', { fontSize: '30px', color: '#ffeb3b', fontWeight: 'bold' }).setOrigin(0.5);
        this.add.text(1250, 180, 'Time(s)', { fontSize: '30px', color: '#ffeb3b', fontWeight: 'bold' }).setOrigin(0.5);

        // 排行榜内容
        let yPos = 250;
        topScores.forEach((entry, index) => {
            const bgColor = index % 2 === 0 ? 0xf5f5f5 : 0xfafafa;
            this.add.rectangle(800, yPos, 950, 50, bgColor, 0.8).setStrokeStyle(1, 0xcccccc);

            this.add.text(350, yPos, `${index + 1}`, { fontSize: '26px', color: '#333' }).setOrigin(0.5);
            this.add.text(700, yPos, entry.username, { fontSize: '26px', color: '#1a237e', fontWeight: 'bold' }).setOrigin(0.5);
            this.add.text(1050, yPos, entry.score.toString(), { fontSize: '26px', color: '#ff6b6b', fontWeight: 'bold' }).setOrigin(0.5);
            this.add.text(1250, yPos, `${entry.timeSpent || 0}s`, { fontSize: '26px', color: '#4caf50', fontWeight: 'bold' }).setOrigin(0.5);

            yPos += 60;
        });

        if (topScores.length === 0) {
            this.add.text(800, 400, 'No scores yet. Be the first to play!', {
                fontSize: '40px', color: '#999', fontWeight: 'bold'
            }).setOrigin(0.5);
        }

        // 按钮区域
        // 返回按钮
        const backBtn = this.add.container(600, 800);
        const backBg = this.add.rectangle(0, 0, 280, 80, 0x1a237e).setInteractive({ useHandCursor: true });
        const backTxt = this.add.text(0, 0, 'BACK', {
            fontSize: '36px', color: '#ffffff', fontWeight: 'bold'
        }).setOrigin(0.5);

        backBtn.add([backBg, backTxt]);

        backBg.on('pointerdown', () => {
            SoundManager.playClick();
            this.scene.start('LoginScene');
        });
        backBg.on('pointerover', () => {
            backBg.setFillStyle(0x424242);
            backBtn.setScale(1.05);
        });
        backBg.on('pointerout', () => {
            backBg.setFillStyle(0x1a237e);
            backBtn.setScale(1.0);
        });

        // 错题统计按钮
        const analysisBtn = this.add.container(1000, 800);
        const analysisBg = this.add.rectangle(0, 0, 280, 80, 0xff6b6b).setInteractive({ useHandCursor: true });
        const analysisTxt = this.add.text(0, 0, 'ERROR ANALYSIS', {
            fontSize: '32px', color: '#ffffff', fontWeight: 'bold'
        }).setOrigin(0.5);

        analysisBtn.add([analysisBg, analysisTxt]);

        analysisBg.on('pointerdown', () => {
            SoundManager.playClick();
            this.scene.start('ErrorAnalysisScene');
        });
        analysisBg.on('pointerover', () => {
            analysisBg.setFillStyle(0xff8787);
            analysisBtn.setScale(1.05);
        });
        analysisBg.on('pointerout', () => {
            analysisBg.setFillStyle(0xff6b6b);
            analysisBtn.setScale(1.0);
        });

        // 清空数据按钮
        const clearBtn = this.add.container(1400, 800);
        const clearBg = this.add.rectangle(0, 0, 280, 80, 0xf44336).setInteractive({ useHandCursor: true });
        const clearTxt = this.add.text(0, 0, 'CLEAR DATA', {
            fontSize: '32px', color: '#ffffff', fontWeight: 'bold'
        }).setOrigin(0.5);

        clearBtn.add([clearBg, clearTxt]);

        clearBg.on('pointerdown', () => {
            SoundManager.playClick();
            if (confirm('⚠️ 确定要清空所有排行榜记录吗？此操作无法撤销！\n\n(Sure to clear all leaderboard data? This cannot be undone!)')) {
                localStorage.removeItem('animalRescueScores');
                alert('排行榜数据已清空 (Leaderboard data cleared!)');
                this.scene.restart();
            }
        });
        clearBg.on('pointerover', () => {
            clearBg.setFillStyle(0xff5252);
            clearBtn.setScale(1.05);
        });
        clearBg.on('pointerout', () => {
            clearBg.setFillStyle(0xf44336);
            clearBtn.setScale(1.0);
        });
    }
}

// --- 场景 4: 错题统计分析界面 ---
class ErrorAnalysisScene extends Phaser.Scene {
    constructor() { super('ErrorAnalysisScene'); }

    create() {
        this.add.image(800, 450, 'bg').setDisplaySize(1600, 900).setAlpha(0.2);
        
        this.add.text(800, 80, 'ERROR ANALYSIS', {
            fontSize: '70px', color: '#ff6b6b', fontWeight: '900'
        }).setOrigin(0.5);

        const errorStats = LeaderboardManager.getErrorStatistics();
        const maxErrors = errorStats.length > 0 ? errorStats[0].count : 1;
        const chartWidth = 600;

        errorStats.slice(0, 8).forEach((item, index) => {
            const y = 220 + index * 75;
            
            // 单词
            this.add.text(300, y, item.word, { fontSize: '28px', color: '#333', fontWeight: 'bold' }).setOrigin(0, 0.5);
            
            // 柱状图背景槽
            this.add.rectangle(850, y, chartWidth, 35, 0xeeeeee).setOrigin(0.5);
            
            // 动态进度条计算
            const barRatio = item.count / maxErrors;
            const barFinalWidth = chartWidth * barRatio;
            
            // 颜色从黄到红渐变
            const color = Phaser.Display.Color.Interpolate.ColorWithColor(
                Phaser.Display.Color.ValueToColor(0xffeb3b), 
                Phaser.Display.Color.ValueToColor(0xd32f2f), 
                100, barRatio * 100
            );
            const colorHex = Phaser.Display.Color.GetColor(color.r, color.g, color.b);

            const progressBar = this.add.rectangle(850 - chartWidth/2, y, 0, 35, colorHex).setOrigin(0, 0.5);
            
            // 柱状图伸展动画
            this.tweens.add({
                targets: progressBar,
                width: barFinalWidth,
                duration: 1200,
                delay: index * 100,
                ease: 'Cubic.easeOut'
            });

            // 错误次数
            this.add.text(1200, y, `${item.count} Times`, { 
                fontSize: '26px', color: '#ff6b6b', fontWeight: '900' 
            }).setOrigin(0, 0.5);
        });

        // 底部“返回”按钮
        const backBtn = this.add.rectangle(800, 850, 250, 70, 0x1a237e).setInteractive({ useHandCursor: true });
        this.add.text(800, 850, 'BACK', { fontSize: '32px', color: '#fff' }).setOrigin(0.5);
        backBtn.on('pointerdown', () => this.scene.start('LeaderboardScene'));
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1600,
    height: 900,
    backgroundColor: '#000000',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [LoginScene, StartScene, MainScene, LeaderboardScene, ErrorAnalysisScene]
};
const game = new Phaser.Game(config);
