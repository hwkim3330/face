/**
 * FacePlay Games Module
 * 다양한 얼굴 추적 미니게임
 */

class FacePlayGames {
    constructor(app) {
        this.app = app;
        this.currentGame = null;
        this.isRunning = false;

        // Game definitions
        this.games = {
            fruitCatch: new FruitCatchGame(this),
            bubblePop: new BubblePopGame(this),
            faceRace: new FaceRaceGame(this),
            expressionMatch: new ExpressionMatchGame(this),
            headSoccer: new HeadSoccerGame(this)
        };
    }

    start(gameName) {
        if (this.currentGame) {
            this.currentGame.stop();
        }

        this.currentGame = this.games[gameName];
        if (this.currentGame) {
            this.isRunning = true;
            this.currentGame.start();
        }
    }

    stop() {
        if (this.currentGame) {
            this.currentGame.stop();
            this.currentGame = null;
        }
        this.isRunning = false;
    }

    update(faceData) {
        if (this.isRunning && this.currentGame) {
            this.currentGame.update(faceData);
        }
    }

    draw(ctx) {
        if (this.isRunning && this.currentGame) {
            this.currentGame.draw(ctx);
        }
    }
}

// ========== 과일 받기 게임 ==========
class FruitCatchGame {
    constructor(manager) {
        this.manager = manager;
        this.score = 0;
        this.lives = 3;
        this.objects = [];
        this.spawnTimer = null;
        this.difficulty = 1;
    }

    start() {
        this.score = 0;
        this.lives = 3;
        this.objects = [];
        this.difficulty = 1;
        this.updateUI();
        this.spawnObject();
    }

    stop() {
        if (this.spawnTimer) {
            clearTimeout(this.spawnTimer);
        }
        this.objects = [];
    }

    spawnObject() {
        if (!this.manager.isRunning) return;

        const canvas = this.manager.app.canvas;
        const fruits = [
            { emoji: '🍎', points: 10, speed: 3 },
            { emoji: '🍊', points: 15, speed: 3.5 },
            { emoji: '🍋', points: 20, speed: 4 },
            { emoji: '🍇', points: 25, speed: 4.5 },
            { emoji: '🍓', points: 30, speed: 5 },
            { emoji: '🌟', points: 50, speed: 6 }, // 보너스
            { emoji: '💣', points: -30, speed: 4 } // 폭탄
        ];

        const fruit = fruits[Math.floor(Math.random() * fruits.length)];

        this.objects.push({
            x: Math.random() * (canvas.width - 60) + 30,
            y: -50,
            ...fruit,
            speed: fruit.speed + this.difficulty * 0.5,
            size: 50,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.2
        });

        // 다음 스폰
        const delay = Math.max(500, 2000 - this.difficulty * 200);
        this.spawnTimer = setTimeout(() => this.spawnObject(), delay);
    }

    update(faceData) {
        if (!faceData) return;

        const face = this.manager.app.processFaceLandmarks(faceData);
        const mouthX = face.upperLip.x;
        const mouthY = face.upperLip.y;
        const mouthOpen = face.mouthOpen;
        const canvas = this.manager.app.canvas;

        this.objects = this.objects.filter(obj => {
            obj.y += obj.speed;
            obj.rotation += obj.rotationSpeed;

            // 입으로 받기
            if (mouthOpen) {
                const dist = Math.sqrt(
                    Math.pow(obj.x - mouthX, 2) +
                    Math.pow(obj.y - mouthY, 2)
                );

                if (dist < 70) {
                    this.score += obj.points;
                    if (obj.points < 0) {
                        this.lives--;
                        this.manager.app.playSound('bomb');
                    } else {
                        this.manager.app.playSound('collect');
                    }
                    this.updateUI();

                    // 난이도 상승
                    if (this.score > 0 && this.score % 100 === 0) {
                        this.difficulty++;
                    }

                    // 게임 오버 체크
                    if (this.lives <= 0) {
                        this.gameOver();
                    }

                    return false;
                }
            }

            // 화면 밖으로 나감
            if (obj.y > canvas.height + 50) {
                if (obj.points > 0) {
                    this.lives--;
                    this.updateUI();
                    if (this.lives <= 0) {
                        this.gameOver();
                    }
                }
                return false;
            }

            return true;
        });
    }

    draw(ctx) {
        this.objects.forEach(obj => {
            ctx.save();
            ctx.translate(obj.x, obj.y);
            ctx.rotate(obj.rotation);
            ctx.font = `${obj.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(obj.emoji, 0, 0);
            ctx.restore();
        });

        // 생명력 표시
        ctx.font = '24px Arial';
        ctx.textAlign = 'left';
        for (let i = 0; i < this.lives; i++) {
            ctx.fillText('❤️', 20 + i * 30, 120);
        }
    }

    updateUI() {
        document.getElementById('gameScore').textContent = Math.max(0, this.score);
    }

    gameOver() {
        this.manager.stop();
        this.manager.app.showToast(`게임 오버! 점수: ${this.score}`);
    }
}

// ========== 버블 터뜨리기 게임 ==========
class BubblePopGame {
    constructor(manager) {
        this.manager = manager;
        this.score = 0;
        this.bubbles = [];
        this.spawnTimer = null;
        this.combo = 0;
        this.lastPopTime = 0;
    }

    start() {
        this.score = 0;
        this.bubbles = [];
        this.combo = 0;
        this.updateUI();
        this.spawnBubble();
    }

    stop() {
        if (this.spawnTimer) {
            clearTimeout(this.spawnTimer);
        }
        this.bubbles = [];
    }

    spawnBubble() {
        if (!this.manager.isRunning) return;

        const canvas = this.manager.app.canvas;
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

        this.bubbles.push({
            x: Math.random() * (canvas.width - 100) + 50,
            y: canvas.height + 50,
            size: 40 + Math.random() * 30,
            speed: 2 + Math.random() * 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.05 + Math.random() * 0.05
        });

        this.spawnTimer = setTimeout(() => this.spawnBubble(), 800);
    }

    update(faceData) {
        if (!faceData) return;

        const face = this.manager.app.processFaceLandmarks(faceData);
        const noseX = face.noseTip.x;
        const noseY = face.noseTip.y;
        const canvas = this.manager.app.canvas;
        const now = Date.now();

        this.bubbles = this.bubbles.filter(bubble => {
            bubble.y -= bubble.speed;
            bubble.wobble += bubble.wobbleSpeed;
            bubble.x += Math.sin(bubble.wobble) * 2;

            // 코로 터뜨리기
            const dist = Math.sqrt(
                Math.pow(bubble.x - noseX, 2) +
                Math.pow(bubble.y - noseY, 2)
            );

            if (dist < bubble.size + 20) {
                // 콤보 체크
                if (now - this.lastPopTime < 1000) {
                    this.combo++;
                } else {
                    this.combo = 1;
                }
                this.lastPopTime = now;

                const points = 10 * this.combo;
                this.score += points;
                this.manager.app.playSound('collect');
                this.updateUI();

                if (this.combo > 1) {
                    this.manager.app.showToast(`${this.combo}x 콤보! +${points}`);
                }

                return false;
            }

            // 화면 밖
            return bubble.y > -bubble.size;
        });
    }

    draw(ctx) {
        this.bubbles.forEach(bubble => {
            // 버블 그라데이션
            const gradient = ctx.createRadialGradient(
                bubble.x - bubble.size * 0.3,
                bubble.y - bubble.size * 0.3,
                0,
                bubble.x,
                bubble.y,
                bubble.size
            );
            gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
            gradient.addColorStop(0.4, bubble.color);
            gradient.addColorStop(1, 'rgba(0,0,0,0.2)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
            ctx.fill();

            // 하이라이트
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath();
            ctx.ellipse(
                bubble.x - bubble.size * 0.3,
                bubble.y - bubble.size * 0.3,
                bubble.size * 0.2,
                bubble.size * 0.15,
                -0.5,
                0,
                Math.PI * 2
            );
            ctx.fill();
        });

        // 콤보 표시
        if (this.combo > 1) {
            ctx.font = 'bold 32px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'center';
            ctx.fillText(`${this.combo}x COMBO`, this.manager.app.canvas.width / 2, 80);
        }
    }

    updateUI() {
        document.getElementById('gameScore').textContent = this.score;
    }
}

// ========== 얼굴 레이싱 게임 ==========
class FaceRaceGame {
    constructor(manager) {
        this.manager = manager;
        this.score = 0;
        this.obstacles = [];
        this.coins = [];
        this.playerLane = 1; // 0, 1, 2
        this.speed = 5;
        this.distance = 0;
    }

    start() {
        this.score = 0;
        this.obstacles = [];
        this.coins = [];
        this.playerLane = 1;
        this.speed = 5;
        this.distance = 0;
        this.spawnInterval = setInterval(() => this.spawn(), 1500);
        this.updateUI();
    }

    stop() {
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
        }
    }

    spawn() {
        const canvas = this.manager.app.canvas;
        const laneWidth = canvas.width / 3;
        const lane = Math.floor(Math.random() * 3);

        // 장애물 또는 코인
        if (Math.random() < 0.3) {
            this.coins.push({
                x: lane * laneWidth + laneWidth / 2,
                y: -50,
                lane
            });
        } else {
            this.obstacles.push({
                x: lane * laneWidth + laneWidth / 2,
                y: -50,
                lane
            });
        }
    }

    update(faceData) {
        if (!faceData) return;

        const face = this.manager.app.processFaceLandmarks(faceData);
        const canvas = this.manager.app.canvas;
        const laneWidth = canvas.width / 3;

        // 얼굴 위치로 레인 결정
        const faceX = face.center.x;
        if (faceX < canvas.width / 3) {
            this.playerLane = 0;
        } else if (faceX < canvas.width * 2 / 3) {
            this.playerLane = 1;
        } else {
            this.playerLane = 2;
        }

        // 거리 및 속도 증가
        this.distance++;
        this.speed = 5 + Math.floor(this.distance / 500);

        // 장애물 업데이트
        this.obstacles = this.obstacles.filter(obs => {
            obs.y += this.speed;

            // 충돌 체크
            if (obs.lane === this.playerLane && obs.y > canvas.height - 200 && obs.y < canvas.height - 100) {
                this.gameOver();
                return false;
            }

            return obs.y < canvas.height + 50;
        });

        // 코인 업데이트
        this.coins = this.coins.filter(coin => {
            coin.y += this.speed;

            // 수집
            if (coin.lane === this.playerLane && coin.y > canvas.height - 200 && coin.y < canvas.height - 100) {
                this.score += 10;
                this.manager.app.playSound('collect');
                this.updateUI();
                return false;
            }

            return coin.y < canvas.height + 50;
        });
    }

    draw(ctx) {
        const canvas = this.manager.app.canvas;
        const laneWidth = canvas.width / 3;

        // 도로 레인
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 3;
        ctx.setLineDash([30, 20]);

        for (let i = 1; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(i * laneWidth, 0);
            ctx.lineTo(i * laneWidth, canvas.height);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // 플레이어 위치 표시
        const playerX = this.playerLane * laneWidth + laneWidth / 2;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.fillRect(this.playerLane * laneWidth, canvas.height - 220, laneWidth, 150);

        // 장애물
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        this.obstacles.forEach(obs => {
            ctx.fillText('🚧', obs.x, obs.y);
        });

        // 코인
        this.coins.forEach(coin => {
            ctx.fillText('🪙', coin.x, coin.y);
        });

        // 거리 표시
        ctx.font = '18px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(`거리: ${Math.floor(this.distance / 10)}m`, 20, 150);
    }

    updateUI() {
        document.getElementById('gameScore').textContent = this.score;
    }

    gameOver() {
        this.manager.stop();
        this.manager.app.showToast(`게임 오버! 거리: ${Math.floor(this.distance / 10)}m, 점수: ${this.score}`);
    }
}

// ========== 표정 맞추기 게임 ==========
class ExpressionMatchGame {
    constructor(manager) {
        this.manager = manager;
        this.score = 0;
        this.currentExpression = null;
        this.timeLeft = 5;
        this.timer = null;
        this.expressions = [
            { name: '웃으세요! 😊', check: (face) => face.mouthOpen },
            { name: '윙크! 😉', check: (face) => (face.leftEyeClosed && !face.rightEyeClosed) || (!face.leftEyeClosed && face.rightEyeClosed) },
            { name: '눈 감기! 😌', check: (face) => face.leftEyeClosed && face.rightEyeClosed },
            { name: '입 벌리기! 😮', check: (face) => face.mouthOpen },
            { name: '왼쪽 보기! 👈', check: (face) => face.rotation < -0.2 },
            { name: '오른쪽 보기! 👉', check: (face) => face.rotation > 0.2 }
        ];
    }

    start() {
        this.score = 0;
        this.updateUI();
        this.nextExpression();
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    nextExpression() {
        this.currentExpression = this.expressions[Math.floor(Math.random() * this.expressions.length)];
        this.timeLeft = 5;

        if (this.timer) {
            clearInterval(this.timer);
        }

        this.timer = setInterval(() => {
            this.timeLeft--;
            if (this.timeLeft <= 0) {
                this.gameOver();
            }
        }, 1000);
    }

    update(faceData) {
        if (!faceData || !this.currentExpression) return;

        const face = this.manager.app.processFaceLandmarks(faceData);

        if (this.currentExpression.check(face)) {
            this.score += 10 + this.timeLeft * 2;
            this.manager.app.playSound('collect');
            this.manager.app.showToast(`정답! +${10 + this.timeLeft * 2}점`);
            this.updateUI();
            this.nextExpression();
        }
    }

    draw(ctx) {
        if (!this.currentExpression) return;

        const canvas = this.manager.app.canvas;

        // 현재 표정 표시
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(canvas.width / 2 - 150, 60, 300, 80);

        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(this.currentExpression.name, canvas.width / 2, 95);

        // 타이머
        ctx.font = '24px Arial';
        ctx.fillStyle = this.timeLeft <= 2 ? '#FF6B6B' : '#4ECDC4';
        ctx.fillText(`⏱️ ${this.timeLeft}초`, canvas.width / 2, 125);
    }

    updateUI() {
        document.getElementById('gameScore').textContent = this.score;
    }

    gameOver() {
        this.manager.stop();
        this.manager.app.showToast(`게임 오버! 점수: ${this.score}`);
    }
}

// ========== 헤딩 축구 게임 ==========
class HeadSoccerGame {
    constructor(manager) {
        this.manager = manager;
        this.score = 0;
        this.ball = null;
        this.gravity = 0.3;
    }

    start() {
        this.score = 0;
        this.updateUI();
        this.spawnBall();
    }

    stop() {
        this.ball = null;
    }

    spawnBall() {
        const canvas = this.manager.app.canvas;
        this.ball = {
            x: canvas.width / 2,
            y: 100,
            vx: (Math.random() - 0.5) * 5,
            vy: 0,
            size: 40
        };
    }

    update(faceData) {
        if (!faceData || !this.ball) return;

        const face = this.manager.app.processFaceLandmarks(faceData);
        const canvas = this.manager.app.canvas;

        // 중력
        this.ball.vy += this.gravity;
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        // 벽 반사
        if (this.ball.x < this.ball.size || this.ball.x > canvas.width - this.ball.size) {
            this.ball.vx *= -0.8;
            this.ball.x = Math.max(this.ball.size, Math.min(canvas.width - this.ball.size, this.ball.x));
        }

        // 천장 반사
        if (this.ball.y < this.ball.size) {
            this.ball.vy *= -0.8;
            this.ball.y = this.ball.size;
        }

        // 머리로 헤딩
        const headX = face.forehead.x;
        const headY = face.forehead.y;
        const dist = Math.sqrt(
            Math.pow(this.ball.x - headX, 2) +
            Math.pow(this.ball.y - headY, 2)
        );

        if (dist < this.ball.size + 50 && this.ball.vy > 0) {
            this.ball.vy = -10 - Math.random() * 5;
            this.ball.vx = (this.ball.x - headX) * 0.3;
            this.score++;
            this.manager.app.playSound('collect');
            this.updateUI();
        }

        // 바닥 체크
        if (this.ball.y > canvas.height) {
            this.gameOver();
        }
    }

    draw(ctx) {
        if (!this.ball) return;

        // 축구공
        ctx.font = `${this.ball.size * 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚽', this.ball.x, this.ball.y);

        // 그림자
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(
            this.ball.x,
            this.manager.app.canvas.height - 10,
            this.ball.size * 0.8,
            10,
            0, 0, Math.PI * 2
        );
        ctx.fill();
    }

    updateUI() {
        document.getElementById('gameScore').textContent = this.score;
    }

    gameOver() {
        this.manager.stop();
        this.manager.app.showToast(`게임 오버! 헤딩 횟수: ${this.score}`);
    }
}

// Export
window.FacePlayGames = FacePlayGames;
