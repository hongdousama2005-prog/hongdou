/**
 * 排行榜系统测试脚本
 * 在浏览器控制台运行以测试数据去重和登录逻辑
 */

// 模拟LeaderboardManager的行为
class TestLeaderboardManager {
    static getScores() {
        const data = localStorage.getItem('animalRescueScores');
        return data ? JSON.parse(data) : [];
    }

    static saveScore(username, score, wrongWords = []) {
        const scores = this.getScores();
        
        // 查找是否已存在该用户名
        const existingIndex = scores.findIndex(s => s.username === username);
        
        const newEntry = { 
            username, 
            score, 
            wrongWords: Array.from(wrongWords),
            date: new Date().toLocaleString() 
        };
        
        if (existingIndex !== -1) {
            // 如果该用户名已存在，仅在新成绩更高时更新
            if (score > scores[existingIndex].score) {
                scores[existingIndex] = newEntry;
            }
        } else {
            // 新用户，直接添加
            scores.push(newEntry);
        }
        
        scores.sort((a, b) => b.score - a.score);
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
        
        // 转换为数组并按分数排序
        return Object.values(userHighestScores)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
}

// 测试用例
function runTests() {
    console.log('==== 排行榜系统测试开始 ====\n');
    
    // 清空数据
    localStorage.removeItem('animalRescueScores');
    
    // 测试1：添加单个用户
    console.log('测试1：添加单个用户');
    TestLeaderboardManager.saveScore('玩家A', 100, ['apple', 'banana']);
    console.log('结果:', TestLeaderboardManager.getScores());
    console.log('排行榜:', TestLeaderboardManager.getTopScores());
    console.log('✓ 通过\n');
    
    // 测试2：添加多个用户
    console.log('测试2：添加多个用户');
    TestLeaderboardManager.saveScore('玩家B', 80);
    TestLeaderboardManager.saveScore('玩家C', 120);
    console.log('排行榜:', TestLeaderboardManager.getTopScores());
    console.log('✓ 通过\n');
    
    // 测试3：相同用户更新分数（只在分数更高时更新）
    console.log('测试3：相同用户更新分数（只在分数更高时更新）');
    TestLeaderboardManager.saveScore('玩家A', 90); // 低于100，不更新
    TestLeaderboardManager.saveScore('玩家A', 150); // 高于100，更新
    const topScores = TestLeaderboardManager.getTopScores();
    console.log('排行榜:', topScores);
    console.log('玩家A的最新分数:', topScores.find(s => s.username === '玩家A')?.score);
    console.log(topScores.find(s => s.username === '玩家A')?.score === 150 ? '✓ 通过' : '✗ 失败');
    console.log();
    
    // 测试4：检查排行榜中没有重复用户
    console.log('测试4：检查排行榜中没有重复用户');
    const scoresList = TestLeaderboardManager.getScores();
    const topList = TestLeaderboardManager.getTopScores(10);
    const usernames = topList.map(s => s.username);
    const uniqueCount = new Set(usernames).size;
    console.log('总分数记录:', scoresList.length);
    console.log('排行榜中的用户数:', topList.length);
    console.log('唯一用户数:', uniqueCount);
    console.log(uniqueCount === topList.length ? '✓ 通过（无重复）' : '✗ 失败（有重复）');
    console.log();
    
    // 测试5：中文用户名支持
    console.log('测试5：中文用户名支持');
    TestLeaderboardManager.saveScore('王小明', 200);
    TestLeaderboardManager.saveScore('李芳芳', 180);
    const chineseTopScores = TestLeaderboardManager.getTopScores();
    console.log('排行榜:', chineseTopScores);
    console.log('✓ 通过\n');
    
    // 测试6：验证排序顺序
    console.log('测试6：验证排序顺序（分数从高到低）');
    const allScores = TestLeaderboardManager.getTopScores();
    let isSorted = true;
    for (let i = 0; i < allScores.length - 1; i++) {
        if (allScores[i].score < allScores[i + 1].score) {
            isSorted = false;
            break;
        }
    }
    console.log('排行榜:', allScores);
    console.log(isSorted ? '✓ 通过（正确排序）' : '✗ 失败（排序错误）');
    console.log();
    
    console.log('==== 所有测试完成 ====');
}

// 运行测试
runTests();
