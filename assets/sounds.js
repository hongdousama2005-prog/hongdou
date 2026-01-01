// --- 现代简约风格游戏音效管理系统 ---
class SoundManager {
    static getAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }

    
    // 通用播放器：增加类型、音高变化、包络控制
    static playModernSound(freq, type = 'triangle', duration = 0.2, ramp = false) {
        try {
            const ctx = this.getAudioContext();
            const now = ctx.currentTime;
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = type; // 现代感多用 triangle 或 sine
            osc.connect(gain);
            gain.connect(ctx.destination);

            // 音高处理
            if (ramp) {
                osc.frequency.setValueAtTime(freq, now);
                osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + duration);
            } else {
                osc.frequency.setValueAtTime(freq, now);
            }

            // 增益包络：快速攻击，指数衰减（现代质感的关键）
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.01); 
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            console.warn('Audio play blocked:', e);
        }
    }

    // 1. 成功音效：清脆的 Q 弹感
    static playSuccess() {
        const now = this.getAudioContext().currentTime;
        this.playModernSound(523.25, 'sine', 0.15); // C5
        setTimeout(() => this.playModernSound(783.99, 'sine', 0.2), 80); // G5
    }

    // 2. 错误音效：沉闷的敲击感
    static playError() {
        try {
            const ctx = this.getAudioContext();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.connect(gain);
            gain.connect(ctx.destination);

            // 音高从 200Hz 快速降到 100Hz，产生“失望”感
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.2);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

            osc.start(now);
            osc.stop(now + 0.2);
        } catch(e){}
    }

    // 3. 过关音效：上升的琶音
    static playLevelComplete() {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C-E-G-C 
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playModernSound(freq, 'sine', 0.3);
            }, i * 120);
        });
    }

    // 4. 点击音效：极短的低频敲击，类似手机 UI 交互
    static playClick() {
        this.playModernSound(400, 'triangle', 0.05);
    }

    // 5. 终极奖励音效：带有些许随机性的金属质感
    static playGameComplete() {
        const majorChord = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        majorChord.forEach((f, i) => {
            setTimeout(() => {
                this.playModernSound(f, 'sine', 0.6, true);
            }, i * 100);
        });
    }
}

// --- 文本到语音音频缓存与播放 ---
class AudioCache {
    static openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('AnimalRescueAudio', 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('audioBlobs')) {
                    db.createObjectStore('audioBlobs', { keyPath: 'text' });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    static async getAudioBlob(text) {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('audioBlobs', 'readonly');
                const store = tx.objectStore('audioBlobs');
                const r = store.get(text);
                r.onsuccess = () => {
                    const res = r.result;
                    resolve(res ? res.blob : null);
                };
                r.onerror = () => reject(r.error);
            });
        } catch (e) {
            return null;
        }
    }

    static async saveAudioBlob(text, blob) {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('audioBlobs', 'readwrite');
                const store = tx.objectStore('audioBlobs');
                const r = store.put({ text, blob });
                r.onsuccess = () => resolve(true);
                r.onerror = () => reject(r.error);
            });
        } catch (e) {
            return false;
        }
    }

    // 播放文本：优先使用本地缓存 -> 尝试请求本地/外部 TTS 服务 -> 回退到 SpeechSynthesis
    static async playText(text) {
        try {
            // 1) 优先尝试静态文件 assets/tts/<safe>.mp3
            const safe = encodeURIComponent(text.replace(/[^a-zA-Z0-9_-]/g, '_'));
            // 优先尝试 mp3，再尝试 wav（供 PowerShell 离线生成时使用）
            const staticMp3 = `/assets/tts/${safe}.mp3`;
            try {
                const r = await fetch(staticMp3, { method: 'HEAD' });
                if (r.ok) {
                    const a = new Audio(staticMp3);
                    await a.play();
                    return;
                }
            } catch (e) {
                // ignore and continue
            }

            const staticWav = `/assets/tts/${safe}.wav`;
            try {
                const r2 = await fetch(staticWav, { method: 'HEAD' });
                if (r2.ok) {
                    const a2 = new Audio(staticWav);
                    await a2.play();
                    return;
                }
            } catch (e) {
                // ignore and continue
            }

            // 2) 已缓存的 IndexedDB 音频
            const cached = await this.getAudioBlob(text);
            if (cached) {
                const url = URL.createObjectURL(cached);
                const a = new Audio(url);
                await a.play();
                URL.revokeObjectURL(url);
                return;
            }

            // 3) 尝试 /tts 接口（如果有部署）
            try {
                const resp = await fetch(`/tts?text=${encodeURIComponent(text)}`);
                if (resp.ok) {
                    const blob = await resp.blob();
                    this.saveAudioBlob(text, blob).catch(() => {});
                    const url = URL.createObjectURL(blob);
                    const a = new Audio(url);
                    await a.play();
                    URL.revokeObjectURL(url);
                    return;
                }
            } catch (e) {
                // ignore
            }

            // 4) 回退到 SpeechSynthesis
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.95;
            speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn('playText failed, fallback to speechSynthesis', e);
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'en-US';
            speechSynthesis.speak(u);
        }
    }
}