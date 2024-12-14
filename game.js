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
let tail = 2;
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
let gameSpeed = 200;

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
        document.getElementById(id).style.display = 'none';
    });
}

function showMenu() {
    hideAllContainers();
    document.getElementById('main-menu').style.display = 'flex';
    document.querySelector('.back-button').style.display = 'none';
    stopGame();
}

function showShop() {
    hideAllContainers();
    document.getElementById('shop-container').style.display = 'block';
    document.querySelector('.back-button').style.display = 'flex';
}

function showTasks() {
    hideAllContainers();
    document.getElementById('tasks-container').style.display = 'block';
    document.querySelector('.back-button').style.display = 'flex';
}

function showLeaderboard() {
    hideAllContainers();
    document.getElementById('leaderboard-container').style.display = 'block';
    document.querySelector('.back-button').style.display = 'flex';
    loadLeaderboard();
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
    document.querySelector('.back-button').style.display = 'flex';
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    resetGame();
    
    // Увеличиваем задержку до 3 секунд
    setTimeout(() => {
        isGameRunning = true;
        lastTime = performance.now();
        lastGameTime = Date.now();
        saveUserData();
        animationFrame = requestAnimationFrame(gameLoop);
    }, 3000);
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

    // Проверка границ
    if (headX < 0) headX = tileCount - 1;
    if (headX >= tileCount) headX = 0;
    if (headY < 0) headY = tileCount - 1;
    if (headY >= tileCount) headY = 0;

    // Проверка столкновений
    for (let i = 0; i < trail.length; i++) {
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
        score += 10;
        let sunBonus = 1;
        if (hasSunSkin) sunBonus *= 1.1;
        if (hasPremiumSkin) sunBonus *= 1.5;
        sun += Math.floor(sunBonus);
        updateScore();
        placeApple();
    }
}

function render() {
    // Очистка канваса
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Отрисовка змейки
    for (let i = 0; i < trail.length; i++) {
        ctx.fillStyle = snakeColor;
        ctx.fillRect(
            trail[i].x * gridSize + 1,
            trail[i].y * gridSize + 1,
            gridSize - 2,
            gridSize - 2
        );
    }

    // Отрисовка яблока
    ctx.fillStyle = 'red';
    ctx.fillRect(
        appleX * gridSize + 1,
        appleY * gridSize + 1,
        gridSize - 2,
        gridSize - 2
    );
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
    trail = [];
    tail = 2;
    score = 0;
    updateScore();
    placeApple();
}

function updateScore() {
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('sun-display').textContent = `☀️ ${sun}`;
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
    tg.sendData(JSON.stringify(data));
}

// Загрузка таблицы лидеров
function loadLeaderboard() {
    const leaderboardContent = document.getElementById('leaderboard-content');
    leaderboardContent.innerHTML = '<div class="leaderboard-item"><span>Загрузка...</span></div>';
    tg.sendData(JSON.stringify({action: 'get_leaderboard'}));
}

// Проверка подписки
function checkSubscription() {
    tg.sendData(JSON.stringify({action: 'check_subscription'}));
}