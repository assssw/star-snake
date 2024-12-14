// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Игровые переменные
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
let tileCount = 20;
let gridSize;
let headX = 10;
let headY = 10;
let dx = 0;
let dy = 0;
let appleX = 5;
let appleY = 5;
let trail = [];
let tail = 3; // Уменьшен начальный размер змеи
let score = 0;
let sun = 0;
let isGameRunning = false;
let touchStartX = null;
let touchStartY = null;
let animationFrame = null;
let lastTime = 0;
let snakeColor = '#4CAF50';
let hasSunSkin = false;
let hasPremiumSkin = false;
let lastGameTime = 0;
let bestScore = 0;
let gameSpeed = 150; // Увеличена начальная скорость

// Функция изменения размера канваса
function resizeCanvas() {
    const container = document.querySelector('.game-wrapper');
    const size = Math.min(container.clientWidth, window.innerHeight * 0.6);
    canvas.width = size;
    canvas.height = size;
    gridSize = size / tileCount;
}

// Инициализация при загрузке
window.onload = function() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    setupEventListeners();
    loadUserData();
    updateTimer();
    setInterval(updateTimer, 1000);
};

// Функции меню
function hideAllContainers() {
    ['main-menu', 'game-container', 'shop-container', 'tasks-container', 'leaderboard-container'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    });
}

function showMenu() {
    if (!isGameRunning) { // Показываем меню только если игра не запущена
        hideAllContainers();
        document.getElementById('main-menu').style.display = 'flex';
        document.querySelector('.back-button').style.display = 'none';
        stopGame();
    }
}

function showShop() {
    if (!isGameRunning) {
        hideAllContainers();
        document.getElementById('shop-container').style.display = 'block';
        document.querySelector('.back-button').style.display = 'flex';
    }
}

function showTasks() {
    if (!isGameRunning) {
        hideAllContainers();
        document.getElementById('tasks-container').style.display = 'block';
        document.querySelector('.back-button').style.display = 'flex';
    }
}

function showLeaderboard() {
    if (!isGameRunning) {
        hideAllContainers();
        document.getElementById('leaderboard-container').style.display = 'block';
        document.querySelector('.back-button').style.display = 'flex';
        loadLeaderboard();
    }
}

// Игровые функции
function tryStartGame() {
    const now = Date.now();
    const cooldownTime = hasPremiumSkin ? 5 * 60 * 1000 : 10 * 60 * 1000;
    
    if (lastGameTime && now - lastGameTime < cooldownTime) {
        const timeLeft = Math.ceil((cooldownTime - (now - lastGameTime)) / 60000);
        alert(`Подождите ${timeLeft} минут между играми!${hasPremiumSkin ? '\n✨ У вас Premium скин: ждать 5 минут вместо 10!' : ''}`);
        return;
    }
    startGame();
}

function startGame() {
    hideAllContainers();
    document.getElementById('game-container').style.display = 'block';
    // Не показываем кнопку назад во время игры
    document.querySelector('.back-button').style.display = 'none';
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    resetGame();
    
    isGameRunning = true;
    lastTime = performance.now();
    lastGameTime = Date.now();
    gameSpeed = 150; // Сброс скорости в начале игры
    saveUserData();
    animationFrame = requestAnimationFrame(gameLoop);
}

function gameLoop(currentTime) {
    if (!isGameRunning) return;

    animationFrame = requestAnimationFrame(gameLoop);

    if (!currentTime) currentTime = performance.now();
    const deltaTime = currentTime - lastTime;
    
    if (deltaTime > gameSpeed) {
        lastTime = currentTime;
        updateGame();
        render();
    }
}

function updateGame() {
    headX += dx;
    headY += dy;

    // Увеличение скорости каждые 5 очков
    if (score > 0 && score % 5 === 0) {
        gameSpeed = Math.max(50, gameSpeed - 1);
    }

    // Проверка границ
    if (headX < 0) headX = tileCount - 1;
    if (headX >= tileCount) headX = 0;
    if (headY < 0) headY = tileCount - 1;
    if (headY >= tileCount) headY = 0;

    // Проверка столкновений, начиная с 3-го сегмента
    for (let i = 3; i < trail.length; i++) {
        if (trail[i].x === headX && trail[i].y === headY) {
            gameOver();
            return;
        }
    }

    trail.push({x: headX, y: headY});
    while (trail.length > tail) {
        trail.shift();
    }

    // Сбор яблок
    if (headX === appleX && headY === appleY) {
        tail++;
        score += 1;
        let sunBonus = 1;
        if (hasSunSkin) sunBonus *= 1.1;
        if (hasPremiumSkin) sunBonus *= 1.5;
        sun += Math.floor(sunBonus);
        updateScore();
        placeApple();
        
        // Увеличиваем скорость
        gameSpeed = Math.max(50, gameSpeed - 2);
    }
}

function render() {
    // Очистка канваса
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Отрисовка змейки
    for (let i = 0; i < trail.length; i++) {
        // Голова змеи
        if (i === trail.length - 1) {
            // Основной цвет головы
            if (hasPremiumSkin) {
                const gradient = ctx.createLinearGradient(
                    trail[i].x * gridSize,
                    trail[i].y * gridSize,
                    (trail[i].x + 1) * gridSize,
                    (trail[i].y + 1) * gridSize
                );
                gradient.addColorStop(0, '#ff0066');
                gradient.addColorStop(1, '#6600ff');
                ctx.fillStyle = gradient;
            } else if (hasSunSkin) {
                const gradient = ctx.createLinearGradient(
                    trail[i].x * gridSize,
                    trail[i].y * gridSize,
                    (trail[i].x + 1) * gridSize,
                    (trail[i].y + 1) * gridSize
                );
                gradient.addColorStop(0, '#ffd700');
                gradient.addColorStop(1, '#ff8c00');
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = snakeColor;
            }
            
            // Рисуем голову
            ctx.fillRect(
                trail[i].x * gridSize + 1,
                trail[i].y * gridSize + 1,
                gridSize - 2,
                gridSize - 2
            );

            // Рисуем глаза
            ctx.fillStyle = 'white';
            const eyeSize = gridSize / 6;
            const eyeOffset = gridSize / 4;
            
            // Определяем направление глаз
            let eyeX = trail[i].x * gridSize + eyeOffset;
            let eyeX2 = trail[i].x * gridSize + gridSize - eyeOffset;
            let eyeY = trail[i].y * gridSize + eyeOffset;
            
            // Смещение глаз в зависимости от направления движения
            if (dx === 1) { // вправо
                eyeX += eyeSize/2;
                eyeX2 += eyeSize/2;
            } else if (dx === -1) { // влево
                eyeX -= eyeSize/2;
                eyeX2 -= eyeSize/2;
            } else if (dy === 1) { // вниз
                eyeY += eyeSize/2;
            } else if (dy === -1) { // вверх
                eyeY -= eyeSize/2;
            }
            
            // Левый глаз
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Правый глаз
            ctx.beginPath();
            ctx.arc(eyeX2, eyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Зрачки
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, eyeSize/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(eyeX2, eyeY, eyeSize/2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Тело змеи
            if (hasPremiumSkin) {
                const gradient = ctx.createLinearGradient(
                    trail[i].x * gridSize,
                    trail[i].y * gridSize,
                    (trail[i].x + 1) * gridSize,
                    (trail[i].y + 1) * gridSize
                );
                gradient.addColorStop(0, '#ff0066');
                gradient.addColorStop(1, '#6600ff');
                ctx.fillStyle = gradient;
            } else if (hasSunSkin) {
                const gradient = ctx.createLinearGradient(
                    trail[i].x * gridSize,
                    trail[i].y * gridSize,
                    (trail[i].x + 1) * gridSize,
                    (trail[i].y + 1) * gridSize
                );
                gradient.addColorStop(0, '#ffd700');
                gradient.addColorStop(1, '#ff8c00');
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = snakeColor;
            }
            
            ctx.fillRect(
                trail[i].x * gridSize + 1,
                trail[i].y * gridSize + 1,
                gridSize - 2,
                gridSize - 2
            );
        }
    }

    // Отрисовка яблока с градиентом и свечением
    ctx.shadowBlur = 15;
    ctx.shadowColor = "red";
    
    const appleGradient = ctx.createRadialGradient(
        appleX * gridSize + gridSize/2,
        appleY * gridSize + gridSize/2,
        0,
        appleX * gridSize + gridSize/2,
        appleY * gridSize + gridSize/2,
        gridSize/2
    );
    appleGradient.addColorStop(0, '#ff0000');
    appleGradient.addColorStop(1, '#990000');
    ctx.fillStyle = appleGradient;
    
    ctx.beginPath();
    ctx.arc(
        appleX * gridSize + gridSize/2,
        appleY * gridSize + gridSize/2,
        gridSize/2 - 1,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // Сброс эффекта свечения
    ctx.shadowBlur = 0;
}

// Обработчики событий
function handleKeyPress(e) {
    if (!isGameRunning) return;
    
    switch(e.keyCode) {
        case 37: // left
            if (dx !== 1) { dx = -1; dy = 0; }
            break;
        case 38: // up
            if (dy !== 1) { dx = 0; dy = -1; }
            break;
        case 39: // right
            if (dx !== -1) { dx = 1; dy = 0; }
            break;
        case 40: // down
            if (dy !== -1) { dx = 0; dy = 1; }
            break;
    }
}

function handleTouchStart(e) {
    if (!isGameRunning) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}

function handleTouchMove(e) {
    if (!isGameRunning || !touchStartX || !touchStartY) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    const minSwipeDistance = 30;
    
    if (Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0 && dx !== -1) { dx = 1; dy = 0; }
            else if (deltaX < 0 && dx !== 1) { dx = -1; dy = 0; }
        } else {
            if (deltaY > 0 && dy !== -1) { dx = 0; dy = 1; }
            else if (deltaY < 0 && dy !== 1) { dx = 0; dy = -1; }
        }
        
        touchStartX = touchEndX;
        touchStartY = touchEndY;
    }
}

function handleTouchEnd() {
    touchStartX = null;
    touchStartY = null;
}

function setupEventListeners() {
    document.addEventListener('keydown', handleKeyPress);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
}

// Вспомогательные функции
function resetGame() {
    headX = 10;
    headY = 10;
    dx = 0;
    dy = 0;
    trail = [
        {x: 10, y: 10},
        {x: 9, y: 10},
        {x: 8, y: 10}
    ]; // 3 сегмента вместо 4
    tail = 3;
    score = 0;
    updateScore();
    placeApple();
}

function updateScore() {
    const scoreElement = document.getElementById('score');
    const sunElement = document.getElementById('sun-display');
    
    scoreElement.textContent = `Score: ${score}`;
    sunElement.textContent = `☀️ ${sun}`;
    
    // Добавляем анимацию
    scoreElement.classList.add('highlight');
    sunElement.classList.add('highlight');
    
    setTimeout(() => {
        scoreElement.classList.remove('highlight');
        sunElement.classList.remove('highlight');
    }, 300);
}

function placeApple() {
    do {
        appleX = Math.floor(Math.random() * tileCount);
        appleY = Math.floor(Math.random() * tileCount);
    } while (trail.some(segment => segment.x === appleX && segment.y === appleY));
}

function gameOver() {
    isGameRunning = false;
    if (score > bestScore) {
        bestScore = score;
    }
    saveUserData();
    sendDataToBot();
    alert(`Игра окончена! Счет: ${score}`);
    showMenu();
}

function stopGame() {
    isGameRunning = false;
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
}

// Функции сохранения и загрузки
function loadUserData() {
    const savedData = localStorage.getItem('starSnakeData');
    if (savedData) {
        const data = JSON.parse(savedData);
        bestScore = data.bestScore || 0;
        sun = data.sun || 0;
        hasSunSkin = data.hasSunSkin || false;
        hasPremiumSkin = data.hasPremiumSkin || false;
        lastGameTime = data.lastGameTime || 0;
        if (hasSunSkin) snakeColor = '#ffd700';
    }
    document.getElementById('best-score').textContent = bestScore;
    document.getElementById('sun-balance').textContent = sun;
    updateTimer();
}

function saveUserData() {
    const data = {
        bestScore,
        sun,
        hasSunSkin,
        hasPremiumSkin,
        lastGameTime
    };
    localStorage.setItem('starSnakeData', JSON.stringify(data));
}

// Обновление таймера
function updateTimer() {
    if (!lastGameTime) return;
    
    const now = Date.now();
    const cooldown = hasPremiumSkin ? 5 * 60 * 1000 : 10 * 60 * 1000;
    const timePassed = now - lastGameTime;
    
    if (timePassed < cooldown) {
        const timeLeft = cooldown - timePassed;
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        document.getElementById('timer').textContent = 
            `Следующая игра через: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        document.querySelector('.play-button').disabled = true;
    } else {
        document.getElementById('timer').textContent = '';
        document.querySelector('.play-button').disabled = false;
    }
}

// Функции магазина
function buySunSkin() {
    if (sun >= 1000 && !hasSunSkin) {
        sun -= 1000;
        hasSunSkin = true;
        snakeColor = '#ffd700';
        document.getElementById('sun-balance').textContent = sun;
        alert('Вы приобрели Sun скин! Теперь вы получаете +10% к фарму.');
        saveUserData();
        sendDataToBot();
    } else if (hasSunSkin) {
        alert('У вас уже есть этот скин!');
    } else {
        alert('Недостаточно sun! Нужно 1000.');
    }
}

function buyPremiumSkin() {
    tg.openTelegramLink('https://t.me/Kertiron');
}

// Отправка данных боту
function sendDataToBot() {
    const data = {
        score: score,
        sun: sun,
        bestScore: bestScore,
        hasSunSkin: hasSunSkin,
        hasPremiumSkin: hasPremiumSkin
    };
    tg.WebApp.sendData(JSON.stringify(data));
}

// Загрузка таблицы лидеров
function loadLeaderboard() {
    const leaderboardContent = document.getElementById('leaderboard-content');
    leaderboardContent.innerHTML = '<div class="leaderboard-item"><span>Загрузка...</span></div>';
    
    tg.WebApp.sendData(JSON.stringify({
        action: 'get_leaderboard'
    }));

    tg.WebApp.onEvent('mainButtonClicked', function() {
        const data = tg.WebApp.initDataUnsafe.data;
        if (data) {
            try {
                const parsedData = JSON.parse(data);
                if (parsedData.type === 'leaderboard' && parsedData.leaders) {
                    let html = '';
                    parsedData.leaders.forEach((leader, index) => {
                        html += `
                            <div class="leaderboard-item glow">
                                <div class="leader-info">
                                    <span class="position">#${index + 1}</span>
                                    <span class="username">${leader.username}</span>
                                    <span class="sun">☀️ ${leader.sun}</span>
                                    <span class="score">🎮 ${leader.score}</span>
                                </div>
                            </div>
                        `;
                    });
                    leaderboardContent.innerHTML = html;
                }
            } catch (e) {
                leaderboardContent.innerHTML = '<div class="leaderboard-item"><span>Ошибка загрузки</span></div>';
            }
        }
    });
}

// Проверка подписки
function checkSubscription() {
    tg.WebApp.sendData(JSON.stringify({
        action: 'check_subscription',
        channelUsername: '@mariartytt'
    }));

    tg.WebApp.onEvent('mainButtonClicked', function() {
        const data = tg.WebApp.initDataUnsafe.data;
        if (data) {
            try {
                const parsedData = JSON.parse(data);
                if (parsedData.type === 'subscription_check') {
                    if (parsedData.success) {
                        sun += 100;
                        updateScore();
                        saveUserData();
                        alert('✅ Награда получена: +100 ☀️');
                    } else {
                        alert(parsedData.message || '❌ Вы не подписаны на канал');
                    }
                }
            } catch (e) {
                alert('Произошла ошибка при проверке подписки');
            }
        }
    });
}