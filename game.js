// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Игровые переменные
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
let tileCount = 15;
let gridSize;
let headX = 10;
let headY = 10;
let dx = 0;
let dy = 0;
let appleX = 5;
let appleY = 5;
let trail = [];
let tail = 5;
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

// Инициализация при загрузке
window.onload = function() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    setupEventListeners();
    loadUserData();
    updateTimer();
    setInterval(updateTimer, 1000);
};

// Загрузка данных пользователя
function loadUserData() {
    // В реальном приложении здесь будет запрос к боту
    document.getElementById('best-score').textContent = bestScore;
    document.getElementById('sun-balance').textContent = sun;
}

// Обновление таймера
function updateTimer() {
    if (!lastGameTime) return;
    
    const now = Date.now();
    const timePassed = now - lastGameTime;
    const cooldown = 10 * 60 * 1000; // 10 минут в миллисекундах
    
    if (timePassed < cooldown) {
        const timeLeft = cooldown - timePassed;
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        document.getElementById('timer').textContent = 
            `Следующая игра через: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        document.querySelector('button[onclick="tryStartGame()"]').disabled = true;
    } else {
        document.getElementById('timer').textContent = '';
        document.querySelector('button[onclick="tryStartGame()"]').disabled = false;
    }
}

// Функции управления меню
function tryStartGame() {
    if (lastGameTime && Date.now() - lastGameTime < 10 * 60 * 1000) {
        alert('Подождите 10 минут между играми!');
        return;
    }
    
    startGame();
}

function startGame() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.querySelector('.back-button').style.display = 'block';
    resetGame();
    isGameRunning = true;
    lastTime = performance.now();
    animationFrame = requestAnimationFrame(gameLoop);
}

function showMenu() {
    document.getElementById('main-menu').style.display = 'flex';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('shop-container').style.display = 'none';
    document.getElementById('leaderboard-container').style.display = 'none';
    document.getElementById('tasks-container').style.display = 'none';
    document.querySelector('.back-button').style.display = 'none';
    stopGame();
}

function showShop() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('shop-container').style.display = 'block';
    document.querySelector('.back-button').style.display = 'block';
}

function showLeaderboard() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('leaderboard-container').style.display = 'block';
    document.querySelector('.back-button').style.display = 'block';
    loadLeaderboard();
}

function showTasks() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('tasks-container').style.display = 'block';
    document.querySelector('.back-button').style.display = 'block';
}

// Функции магазина
function buySunSkin() {
    if (sun >= 1000 && !hasSunSkin) {
        sun -= 1000;
        hasSunSkin = true;
        snakeColor = '#ffd700';
        document.getElementById('sun-balance').textContent = sun;
        alert('Вы приобрели Sun скин! Теперь вы получаете +10% к фарму.');
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

// Функции заданий
function checkChannelSubscription() {
    // В реальном приложении здесь будет проверка подписки через бота
    tg.sendData(JSON.stringify({action: 'check_channel'}));
}

// Загрузка таблицы лидеров
function loadLeaderboard() {
    // В реальном приложении здесь будет запрос к боту
    const leaderboardContent = document.getElementById('leaderboard-content');
    leaderboardContent.innerHTML = '<div class="leaderboard-item"><span>Загрузка...</span></div>';
}

// Отправка данных боту
function sendDataToBot() {
    const data = {
        score: score,
        sun: sun,
        bestScore: bestScore
    };
    tg.sendData(JSON.stringify(data));
}

// Игровые функции
function gameLoop(currentTime) {
    if (!isGameRunning) return;

    animationFrame = requestAnimationFrame(gameLoop);

    if (!currentTime) currentTime = performance.now();
    const deltaTime = currentTime - lastTime;
    const speed = 200; // Фиксированная скорость для лучшего контроля
    
    if (deltaTime > speed) {
        lastTime = currentTime;
        updateGame();
    }

    render();
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
        // Начисление sun с учетом бонусов от скинов
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Отрисовка змейки
    for (let i = 0; i < trail.length; i++) {
        if (hasPremiumSkin) {
            const hue = (Date.now() / 20 + i * 10) % 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        } else {
            ctx.fillStyle = snakeColor;
        }
        
        const x = trail[i].x * gridSize;
        const y = trail[i].y * gridSize;
        ctx.fillRect(x + 1, y + 1, gridSize - 2, gridSize - 2);
    }

    // Отрисовка яблока
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(appleX * gridSize + 1, appleY * gridSize + 1, gridSize - 2, gridSize - 2);
}

function gameOver() {
    stopGame();
    lastGameTime = Date.now();
    if (score > bestScore) {
        bestScore = score;
        document.getElementById('best-score').textContent = bestScore;
    }
    document.getElementById('sun-balance').textContent = sun;
    sendDataToBot();
    alert(`Игра окончена! Счет: ${score}`);
    showMenu();
    updateTimer();
}

// Настройка обработчиков событий
function setupEventListeners() {
    document.addEventListener('keydown', handleKeyPress);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Добавляем обработчики для всех кнопок
    document.querySelectorAll('.button').forEach(button => {
        button.addEventListener('click', function(e) {
            const action = this.getAttribute('onclick');
            if (action) {
                e.preventDefault();
                eval(action);
            }
        });
    });
}

// Изменение размера канваса
function resizeCanvas() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Уменьшаем размер поля до 90% от меньшей стороны экрана
    const size = Math.min(windowWidth * 0.9, (windowHeight - 100) * 0.9);
    
    // Устанавливаем размеры канваса
    canvas.width = size;
    canvas.height = size;
    
    // Центрируем канвас
    canvas.style.position = 'absolute';
    canvas.style.left = '50%';
    canvas.style.top = '50%';
    canvas.style.transform = 'translate(-50%, -50%)';
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    
    // Устанавливаем размер сетки
    gridSize = size / tileCount;
}

// Сброс игры
function resetGame() {
    headX = 10;
    headY = 10;
    dx = 0;
    dy = 0;
    trail = [];
    tail = 5;
    score = 0;
    updateScore();
    placeApple();
}

// Обновление счета
function updateScore() {
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('sun-display').textContent = `☀️ ${sun}`;
}

// Размещение яблока
function placeApple() {
    appleX = Math.floor(Math.random() * tileCount);
    appleY = Math.floor(Math.random() * tileCount);
}

// Остановка игры
function stopGame() {
    isGameRunning = false;
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
}

// Обработка нажатий клавиш
function handleKeyPress(e) {
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

// Обработка касаний
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
    
    const minSwipeDistance = 30; // Увеличиваем минимальное расстояние свайпа
    
    if (Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Горизонтальный свайп
            if (deltaX > 0 && dx !== -1) {
                dx = 1;
                dy = 0;
            } else if (deltaX < 0 && dx !== 1) {
                dx = -1;
                dy = 0;
            }
        } else {
            // Вертикальный свайп
            if (deltaY > 0 && dy !== -1) {
                dx = 0;
                dy = 1;
            } else if (deltaY < 0 && dy !== 1) {
                dx = 0;
                dy = -1;
            }
        }
        
        // Обновляем начальные координаты для следующего свайпа
        touchStartX = touchEndX;
        touchStartY = touchEndY;
    }
}

function handleTouchEnd() {
    touchStartX = null;
    touchStartY = null;
}

// ... existing code ... 