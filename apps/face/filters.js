/**
 * FacePlay Advanced Filters Module
 * 고급 AR 필터 효과
 */

class AdvancedFilters {
    constructor() {
        this.particles = [];
        this.trailPoints = [];
        this.lastTime = Date.now();
    }

    // ========== 뷰티 필터 ==========
    drawBeautyFilter(ctx, face) {
        const scale = face.eyeDistance / 80;

        // 부드러운 피부 효과 (오버레이)
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#FFE4E1';

        // 얼굴 영역에 부드러운 블러 효과
        ctx.filter = 'blur(20px)';
        ctx.beginPath();
        ctx.ellipse(
            face.center.x, face.center.y,
            face.faceWidth / 2 * 0.9,
            face.faceHeight / 2 * 0.9,
            face.rotation, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.filter = 'none';
        ctx.restore();

        // 눈 강조
        this.drawEyeEnhancement(ctx, face, scale);

        // 볼터치
        this.drawBlush(ctx, face, scale);

        // 립글로스
        this.drawLipGloss(ctx, face, scale);
    }

    drawEyeEnhancement(ctx, face, scale) {
        // 눈 밑 하이라이트
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';

        ctx.beginPath();
        ctx.ellipse(face.leftEye.x, face.leftEye.y + 15 * scale, 20 * scale, 8 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(face.rightEye.x, face.rightEye.y + 15 * scale, 20 * scale, 8 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawBlush(ctx, face, scale) {
        ctx.fillStyle = 'rgba(255, 182, 193, 0.25)';

        ctx.beginPath();
        ctx.ellipse(face.leftCheek.x, face.leftCheek.y, 35 * scale, 25 * scale, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(face.rightCheek.x, face.rightCheek.y, 35 * scale, 25 * scale, -0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawLipGloss(ctx, face, scale) {
        const gradient = ctx.createRadialGradient(
            face.upperLip.x, face.upperLip.y, 0,
            face.upperLip.x, face.upperLip.y, 30 * scale
        );
        gradient.addColorStop(0, 'rgba(255, 105, 180, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 105, 180, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(face.upperLip.x, (face.upperLip.y + face.lowerLip.y) / 2, 25 * scale, 15 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // ========== 네온 필터 ==========
    drawNeonFilter(ctx, face) {
        const scale = face.eyeDistance / 80;
        const time = Date.now() / 1000;

        ctx.save();
        ctx.shadowBlur = 20;
        ctx.lineWidth = 3;

        // 네온 얼굴 윤곽
        const hue = (time * 50) % 360;
        ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
        ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;

        // 얼굴 윤곽선
        ctx.beginPath();
        ctx.ellipse(
            face.center.x, face.center.y,
            face.faceWidth / 2, face.faceHeight / 2,
            face.rotation, 0, Math.PI * 2
        );
        ctx.stroke();

        // 눈 네온
        ctx.shadowColor = '#00FFFF';
        ctx.strokeStyle = '#00FFFF';

        ctx.beginPath();
        ctx.ellipse(face.leftEye.x, face.leftEye.y, 25 * scale, 15 * scale, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(face.rightEye.x, face.rightEye.y, 25 * scale, 15 * scale, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 입술 네온
        ctx.shadowColor = '#FF00FF';
        ctx.strokeStyle = '#FF00FF';

        ctx.beginPath();
        ctx.ellipse(
            face.upperLip.x,
            (face.upperLip.y + face.lowerLip.y) / 2,
            35 * scale, 15 * scale, 0, 0, Math.PI * 2
        );
        ctx.stroke();

        ctx.restore();
    }

    // ========== 픽셀 아트 필터 ==========
    drawPixelFilter(ctx, face, videoCtx) {
        const scale = face.eyeDistance / 80;
        const pixelSize = 15;

        // 얼굴 영역 픽셀화
        const faceX = face.center.x - face.faceWidth / 2;
        const faceY = face.center.y - face.faceHeight / 2;
        const faceW = face.faceWidth;
        const faceH = face.faceHeight;

        ctx.save();

        // 픽셀화된 블록으로 그리기
        for (let y = 0; y < faceH; y += pixelSize) {
            for (let x = 0; x < faceW; x += pixelSize) {
                const px = faceX + x;
                const py = faceY + y;

                // 얼굴 영역 내부만 픽셀화
                const dist = Math.sqrt(
                    Math.pow((px + pixelSize/2 - face.center.x) / (faceW/2), 2) +
                    Math.pow((py + pixelSize/2 - face.center.y) / (faceH/2), 2)
                );

                if (dist < 1) {
                    // 무지개 색상
                    const hue = ((x + y) / 3 + Date.now() / 50) % 360;
                    ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.6)`;
                    ctx.fillRect(px, py, pixelSize - 1, pixelSize - 1);
                }
            }
        }

        ctx.restore();
    }

    // ========== 홀로그램 필터 ==========
    drawHologramFilter(ctx, face) {
        const scale = face.eyeDistance / 80;
        const time = Date.now() / 1000;

        ctx.save();

        // 스캔 라인 효과
        const scanY = (time * 200) % face.height;
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(face.width, scanY);
        ctx.stroke();

        // 홀로그램 얼굴 윤곽
        ctx.globalAlpha = 0.5 + Math.sin(time * 5) * 0.2;

        // RGB 분리 효과
        const offset = 3;

        // Red channel
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(
            face.center.x - offset, face.center.y,
            face.faceWidth / 2, face.faceHeight / 2,
            face.rotation, 0, Math.PI * 2
        );
        ctx.stroke();

        // Green channel
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(
            face.center.x, face.center.y,
            face.faceWidth / 2, face.faceHeight / 2,
            face.rotation, 0, Math.PI * 2
        );
        ctx.stroke();

        // Blue channel
        ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
        ctx.beginPath();
        ctx.ellipse(
            face.center.x + offset, face.center.y,
            face.faceWidth / 2, face.faceHeight / 2,
            face.rotation, 0, Math.PI * 2
        );
        ctx.stroke();

        // 글리치 효과
        if (Math.random() < 0.1) {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            const glitchY = face.center.y + (Math.random() - 0.5) * face.faceHeight;
            ctx.fillRect(0, glitchY, face.width, 5 + Math.random() * 10);
        }

        ctx.restore();
    }

    // ========== 불꽃 필터 ==========
    drawFireFilter(ctx, face) {
        const scale = face.eyeDistance / 80;
        const time = Date.now();

        // 불꽃 파티클 생성
        if (Math.random() < 0.5) {
            for (let i = 0; i < 3; i++) {
                this.particles.push({
                    x: face.forehead.x + (Math.random() - 0.5) * face.faceWidth * 0.8,
                    y: face.forehead.y - 20 * scale,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -3 - Math.random() * 3,
                    size: 10 + Math.random() * 20,
                    life: 1,
                    color: Math.random() < 0.3 ? '#FFFF00' : Math.random() < 0.5 ? '#FF8C00' : '#FF0000'
                });
            }
        }

        // 파티클 업데이트 및 그리기
        ctx.save();
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy -= 0.1; // 위로 올라감
            p.life -= 0.02;
            p.size *= 0.98;

            if (p.life > 0) {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                return true;
            }
            return false;
        });

        // 파티클 제한
        if (this.particles.length > 100) {
            this.particles = this.particles.slice(-100);
        }

        ctx.restore();

        // 눈에서 불꽃
        this.drawFireEyes(ctx, face, scale);
    }

    drawFireEyes(ctx, face, scale) {
        const gradient1 = ctx.createRadialGradient(
            face.leftEye.x, face.leftEye.y, 0,
            face.leftEye.x, face.leftEye.y - 20 * scale, 40 * scale
        );
        gradient1.addColorStop(0, 'rgba(255, 255, 0, 0.9)');
        gradient1.addColorStop(0.5, 'rgba(255, 140, 0, 0.5)');
        gradient1.addColorStop(1, 'rgba(255, 0, 0, 0)');

        ctx.fillStyle = gradient1;
        ctx.beginPath();
        ctx.ellipse(face.leftEye.x, face.leftEye.y - 10 * scale, 25 * scale, 35 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        const gradient2 = ctx.createRadialGradient(
            face.rightEye.x, face.rightEye.y, 0,
            face.rightEye.x, face.rightEye.y - 20 * scale, 40 * scale
        );
        gradient2.addColorStop(0, 'rgba(255, 255, 0, 0.9)');
        gradient2.addColorStop(0.5, 'rgba(255, 140, 0, 0.5)');
        gradient2.addColorStop(1, 'rgba(255, 0, 0, 0)');

        ctx.fillStyle = gradient2;
        ctx.beginPath();
        ctx.ellipse(face.rightEye.x, face.rightEye.y - 10 * scale, 25 * scale, 35 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // ========== 얼음 필터 ==========
    drawIceFilter(ctx, face) {
        const scale = face.eyeDistance / 80;
        const time = Date.now() / 1000;

        ctx.save();

        // 얼음 오버레이
        ctx.globalAlpha = 0.3;
        const iceGradient = ctx.createRadialGradient(
            face.center.x, face.center.y, 0,
            face.center.x, face.center.y, face.faceWidth
        );
        iceGradient.addColorStop(0, 'rgba(200, 240, 255, 0.5)');
        iceGradient.addColorStop(1, 'rgba(100, 200, 255, 0.2)');

        ctx.fillStyle = iceGradient;
        ctx.beginPath();
        ctx.ellipse(
            face.center.x, face.center.y,
            face.faceWidth / 2, face.faceHeight / 2,
            face.rotation, 0, Math.PI * 2
        );
        ctx.fill();

        ctx.globalAlpha = 1;

        // 눈송이
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + time * 0.5;
            const radius = 100 * scale + Math.sin(time * 2 + i) * 20 * scale;
            const x = face.center.x + Math.cos(angle) * radius;
            const y = face.center.y + Math.sin(angle) * radius;

            this.drawSnowflake(ctx, x, y, 15 * scale, time + i);
        }

        // 서리 효과
        this.drawFrost(ctx, face, scale);

        ctx.restore();
    }

    drawSnowflake(ctx, x, y, size, seed) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(seed);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;

        for (let i = 0; i < 6; i++) {
            ctx.rotate(Math.PI / 3);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -size);
            ctx.moveTo(0, -size * 0.6);
            ctx.lineTo(-size * 0.3, -size * 0.8);
            ctx.moveTo(0, -size * 0.6);
            ctx.lineTo(size * 0.3, -size * 0.8);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawFrost(ctx, face, scale) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;

        // 가장자리 서리
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const startR = face.faceWidth / 2 * 0.8;
            const x = face.center.x + Math.cos(angle) * startR;
            const y = face.center.y + Math.sin(angle) * startR * 0.8;

            ctx.beginPath();
            ctx.moveTo(x, y);

            let cx = x, cy = y;
            for (let j = 0; j < 5; j++) {
                cx += (Math.random() - 0.5) * 30;
                cy += (Math.random() - 0.5) * 30;
                ctx.lineTo(cx, cy);
            }
            ctx.stroke();
        }
    }

    // ========== 레인보우 필터 ==========
    drawRainbowFilter(ctx, face) {
        const scale = face.eyeDistance / 80;
        const time = Date.now() / 1000;

        // 레인보우 트레일
        this.trailPoints.push({
            x: face.noseTip.x,
            y: face.noseTip.y,
            time: Date.now()
        });

        // 오래된 포인트 제거
        this.trailPoints = this.trailPoints.filter(p => Date.now() - p.time < 1000);

        // 레인보우 트레일 그리기
        if (this.trailPoints.length > 2) {
            ctx.save();
            ctx.lineWidth = 20 * scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (let i = 1; i < this.trailPoints.length; i++) {
                const progress = i / this.trailPoints.length;
                const hue = (progress * 360 + time * 100) % 360;

                ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${progress})`;
                ctx.beginPath();
                ctx.moveTo(this.trailPoints[i-1].x, this.trailPoints[i-1].y);
                ctx.lineTo(this.trailPoints[i].x, this.trailPoints[i].y);
                ctx.stroke();
            }

            ctx.restore();
        }

        // 무지개 아이섀도
        const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF'];

        ctx.save();

        // 왼쪽 눈
        colors.forEach((color, i) => {
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.ellipse(
                face.leftEye.x,
                face.leftEye.y - 10 * scale - i * 4 * scale,
                (30 - i * 3) * scale,
                (15 - i * 2) * scale,
                0, Math.PI, Math.PI * 2
            );
            ctx.fill();
        });

        // 오른쪽 눈
        colors.forEach((color, i) => {
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.ellipse(
                face.rightEye.x,
                face.rightEye.y - 10 * scale - i * 4 * scale,
                (30 - i * 3) * scale,
                (15 - i * 2) * scale,
                0, Math.PI, Math.PI * 2
            );
            ctx.fill();
        });

        ctx.restore();
    }

    // ========== 좀비 필터 ==========
    drawZombieFilter(ctx, face) {
        const scale = face.eyeDistance / 80;

        // 녹색 피부 톤
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#556B2F';

        ctx.beginPath();
        ctx.ellipse(
            face.center.x, face.center.y,
            face.faceWidth / 2, face.faceHeight / 2,
            face.rotation, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.restore();

        // 다크 서클
        ctx.fillStyle = 'rgba(50, 0, 50, 0.5)';
        ctx.beginPath();
        ctx.ellipse(face.leftEye.x, face.leftEye.y + 10 * scale, 35 * scale, 20 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(face.rightEye.x, face.rightEye.y + 10 * scale, 35 * scale, 20 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // 썩은 부분
        this.drawDecay(ctx, face, scale);

        // 흉터
        this.drawScars(ctx, face, scale);
    }

    drawDecay(ctx, face, scale) {
        ctx.fillStyle = 'rgba(80, 60, 40, 0.6)';

        // 랜덤 썩은 부분
        const decaySpots = [
            { x: face.leftCheek.x, y: face.leftCheek.y, r: 25 },
            { x: face.rightCheek.x + 20, y: face.rightCheek.y - 10, r: 15 },
            { x: face.forehead.x - 30, y: face.forehead.y + 20, r: 20 }
        ];

        decaySpots.forEach(spot => {
            ctx.beginPath();
            ctx.arc(spot.x, spot.y, spot.r * scale, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawScars(ctx, face, scale) {
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        // 왼쪽 뺨 흉터
        ctx.beginPath();
        ctx.moveTo(face.leftCheek.x - 20 * scale, face.leftCheek.y - 30 * scale);
        ctx.lineTo(face.leftCheek.x + 10 * scale, face.leftCheek.y);
        ctx.lineTo(face.leftCheek.x - 5 * scale, face.leftCheek.y + 20 * scale);
        ctx.stroke();

        // 스티치 라인
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const y = face.leftCheek.y - 25 * scale + i * 15 * scale;
            ctx.beginPath();
            ctx.moveTo(face.leftCheek.x - 15 * scale, y);
            ctx.lineTo(face.leftCheek.x + 5 * scale, y);
            ctx.stroke();
        }
    }

    // ========== 사이버펑크 필터 ==========
    drawCyberpunkFilter(ctx, face) {
        const scale = face.eyeDistance / 80;
        const time = Date.now() / 1000;

        // 사이버 눈
        this.drawCyberEye(ctx, face.leftEye.x, face.leftEye.y, scale, time);
        this.drawCyberEye(ctx, face.rightEye.x, face.rightEye.y, scale, time);

        // 회로 패턴
        this.drawCircuitPattern(ctx, face, scale);

        // 데이터 스트림
        this.drawDataStream(ctx, face, scale, time);

        // 홀로그램 UI
        this.drawHoloUI(ctx, face, scale, time);
    }

    drawCyberEye(ctx, x, y, scale, time) {
        // 외부 링
        ctx.save();
        ctx.translate(x, y);

        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00FFFF';
        ctx.shadowBlur = 10;

        // 회전하는 링
        ctx.rotate(time * 2);
        ctx.beginPath();
        ctx.arc(0, 0, 30 * scale, 0, Math.PI * 1.5);
        ctx.stroke();

        ctx.rotate(-time * 3);
        ctx.strokeStyle = '#FF00FF';
        ctx.shadowColor = '#FF00FF';
        ctx.beginPath();
        ctx.arc(0, 0, 25 * scale, 0, Math.PI);
        ctx.stroke();

        // 중앙 동공
        ctx.rotate(time);
        ctx.fillStyle = '#FF0000';
        ctx.shadowColor = '#FF0000';
        ctx.beginPath();
        ctx.arc(0, 0, 10 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawCircuitPattern(ctx, face, scale) {
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
        ctx.lineWidth = 1;

        // 얼굴 옆 회로
        const startX = face.rightCheek.x + 20 * scale;
        const startY = face.rightCheek.y - 50 * scale;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + 30 * scale, startY);
        ctx.lineTo(startX + 30 * scale, startY + 40 * scale);
        ctx.lineTo(startX + 50 * scale, startY + 40 * scale);
        ctx.lineTo(startX + 50 * scale, startY + 80 * scale);
        ctx.stroke();

        // 노드 포인트
        ctx.fillStyle = '#00FFFF';
        [[startX, startY], [startX + 30 * scale, startY + 40 * scale], [startX + 50 * scale, startY + 80 * scale]].forEach(([px, py]) => {
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawDataStream(ctx, face, scale, time) {
        ctx.font = '10px monospace';
        ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';

        const chars = '01アイウエオカキクケコ';
        const x = face.rightCheek.x + 60 * scale;

        for (let i = 0; i < 10; i++) {
            const y = (time * 100 + i * 15) % 200 + face.center.y - 100;
            const char = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(char, x, y);
        }
    }

    drawHoloUI(ctx, face, scale, time) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        // 상태 바
        const barX = face.leftCheek.x - 80 * scale;
        const barY = face.center.y - 30 * scale;

        ctx.strokeRect(barX, barY, 60 * scale, 8);
        ctx.fillRect(barX, barY, 40 * scale * (0.5 + Math.sin(time) * 0.5), 8);

        ctx.font = '8px monospace';
        ctx.fillStyle = '#00FFFF';
        ctx.fillText('SYS: OK', barX, barY - 5);

        ctx.restore();
    }
}

// Export
window.AdvancedFilters = AdvancedFilters;
