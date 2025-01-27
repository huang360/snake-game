class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 设置画布大小
        this.canvas.width = 400;
        this.canvas.height = 400;
        
        // 游戏配置
        this.gridSize = 20;
        this.tileCount = 20;
        this.tileSize = this.canvas.width / this.tileCount;
        
        // 添加难度配置
        this.difficulties = {
            easy: {
                speed: 200,
                scoreMultiplier: 1,
                name: '简单'
            },
            normal: {
                speed: 150,
                scoreMultiplier: 1.5,
                name: '普通'
            },
            hard: {
                speed: 100,
                scoreMultiplier: 2,
                name: '困难'
            }
        };
        
        // 从 URL 获取难度设置
        const urlParams = new URLSearchParams(window.location.search);
        const difficulty = urlParams.get('difficulty') || 'normal';
        this.currentDifficulty = this.difficulties[difficulty];
        
        // 检测是否为移动设备
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 如果是移动设备，调整画布大小
        if (this.isMobile) {
            const containerWidth = document.querySelector('.game-container').clientWidth - 20;
            this.canvas.width = containerWidth;
            this.canvas.height = containerWidth;
            this.tileSize = this.canvas.width / this.tileCount;
        }
        
        // 初始化游戏状态
        this.init();
        
        // 绑定按键事件
        this.bindEvents();

        // 初始绘制
        this.draw();
    }

    init() {
        // 蛇的初始位置和属性
        this.snake = {
            x: 10,
            y: 10,
            dx: 1,
            dy: 0,
            cells: [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}],
            maxCells: 3
        };

        // 食物位置
        this.food = this.getRandomFood();

        // 游戏状态
        this.gameOver = false;
        this.paused = false;
        this.score = 0;
        
        // 获取最高分
        const difficultyKey = this.currentDifficulty === this.difficulties.easy ? 'easy' :
                            this.currentDifficulty === this.difficulties.hard ? 'hard' : 'normal';
        this.highScore = localStorage.getItem(`snakeHighScore_${difficultyKey}`) || 0;
        this.highScore = parseInt(this.highScore);

        // 更新显示
        this.updateScore();
    }

    getRandomFood() {
        return {
            x: Math.floor(Math.random() * this.tileCount),
            y: Math.floor(Math.random() * this.tileCount)
        };
    }

    bindEvents() {
        // 键盘控制
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // 触摸控制
        if (this.isMobile) {
            this.bindTouchControls();
        }

        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
    }

    bindTouchControls() {
        // 方向按钮控制
        document.getElementById('upBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.changeDirection(0, -1);
        });

        document.getElementById('downBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.changeDirection(0, 1);
        });

        document.getElementById('leftBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.changeDirection(-1, 0);
        });

        document.getElementById('rightBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.changeDirection(1, 0);
        });

        // 滑动控制
        let touchStartX = 0;
        let touchStartY = 0;
        
        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault(); // 防止页面滚动
        });

        this.canvas.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;
            
            // 确定滑动方向
            if (Math.abs(dx) > Math.abs(dy)) {
                // 水平滑动
                if (dx > 50) {
                    this.changeDirection(1, 0); // 右
                } else if (dx < -50) {
                    this.changeDirection(-1, 0); // 左
                }
            } else {
                // 垂直滑动
                if (dy > 50) {
                    this.changeDirection(0, 1); // 下
                } else if (dy < -50) {
                    this.changeDirection(0, -1); // 上
                }
            }
        });
    }

    changeDirection(dx, dy) {
        if (this.gameOver || this.paused) return;

        // 防止反向移动
        if (this.snake.dx !== -dx && this.snake.dy !== -dy) {
            this.snake.dx = dx;
            this.snake.dy = dy;
        }
    }

    handleKeyPress(e) {
        if (this.gameOver) return;

        // 处理方向键和WASD
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.changeDirection(0, -1);
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.changeDirection(0, 1);
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.changeDirection(-1, 0);
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.changeDirection(1, 0);
                break;
            case ' ':
                this.togglePause();
                break;
        }
    }

    update() {
        if (this.gameOver || this.paused) return;

        // 移动蛇
        const head = {
            x: this.snake.cells[0].x + this.snake.dx,
            y: this.snake.cells[0].y + this.snake.dy
        };

        // 检查碰撞
        if (this.checkCollision(head)) {
            this.endGame();
            return;
        }

        // 添加新的头部
        this.snake.cells.unshift(head);

        // 检查是否吃到食物
        if (head.x === this.food.x && head.y === this.food.y) {
            // 根据难度调整得分
            this.score += Math.round(10 * this.currentDifficulty.scoreMultiplier);
            this.updateScore();
            this.food = this.getRandomFood();
            this.snake.maxCells++;
        } else {
            // 如果没有吃到食物，删除尾部
            this.snake.cells.pop();
        }
    }

    checkCollision(head) {
        // 检查墙壁碰撞
        if (head.x < 0 || head.x >= this.tileCount || 
            head.y < 0 || head.y >= this.tileCount) {
            return true;
        }

        // 检查自身碰撞
        return this.snake.cells.some(cell => 
            cell.x === head.x && cell.y === head.y
        );
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制蛇
        this.ctx.fillStyle = 'green';
        this.snake.cells.forEach((cell, index) => {
            this.ctx.fillRect(
                cell.x * this.tileSize,
                cell.y * this.tileSize,
                this.tileSize - 1,
                this.tileSize - 1
            );
        });

        // 绘制食物
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(
            this.food.x * this.tileSize,
            this.food.y * this.tileSize,
            this.tileSize - 1,
            this.tileSize - 1
        );
    }

    updateScore() {
        document.getElementById('current-score').textContent = this.score;
        const difficultyKey = this.currentDifficulty === this.difficulties.easy ? 'easy' :
                            this.currentDifficulty === this.difficulties.hard ? 'hard' : 'normal';
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem(`snakeHighScore_${difficultyKey}`, this.highScore);
        }
        document.getElementById('high-score').textContent = this.highScore;
    }

    startGame() {
        if (!this.gameLoop) {
            this.init();
            this.draw();
            
            // 重置暂停状态和按钮
            this.paused = false;
            document.getElementById('pauseBtn').textContent = '暂停';
            
            // 使用当前难度的速度
            this.gameLoop = setInterval(() => {
                this.update();
                this.draw();
            }, this.currentDifficulty.speed);
        }
    }

    togglePause() {
        this.paused = !this.paused;
        const pauseBtn = document.getElementById('pauseBtn');
        pauseBtn.textContent = this.paused ? '继续' : '暂停';
    }

    endGame() {
        this.gameOver = true;
        clearInterval(this.gameLoop);
        this.gameLoop = null;
        document.getElementById('finalScore').textContent = 
            `${this.score} (${this.currentDifficulty.name})`;
        document.getElementById('gameOver').classList.remove('hidden');

        // 添加返回主页按钮的事件监听
        document.getElementById('homeBtn').addEventListener('click', () => {
            window.location.href = './index.html';
        });
    }

    restart() {
        document.getElementById('gameOver').classList.add('hidden');
        this.startGame();
    }
}

// 创建游戏实例并自动开始
window.onload = () => {
    const game = new SnakeGame();
    game.startGame(); // 自动开始游戏
}; 