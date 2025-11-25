/**
 * FacePlay - 스노우 스타일 얼굴 인식 앱
 * MediaPipe Face Mesh + Web Audio API
 */

class FacePlayApp {
    constructor() {
        // DOM Elements
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.overlayCanvas = document.getElementById('overlay-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlayCtx = this.overlayCanvas.getContext('2d');

        // State
        this.faceMesh = null;
        this.camera = null;
        this.currentFilter = 'none';
        this.currentMode = 'camera';
        this.isRecording = false;
        this.facingMode = 'user';
        this.gallery = [];
        this.gameScore = 0;
        this.gameObjects = [];
        this.lastFaceData = null;

        // Audio
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.pitchShifter = null;
        this.voiceEffectEnabled = false;
        this.currentPitch = 1.0;

        // Settings
        this.settings = {
            showFaceInfo: true,
            hdMode: false,
            voiceEffect: false,
            soundEnabled: true,
            difficulty: 2
        };

        // Filter definitions
        this.filters = {
            none: { draw: () => {} },
            dog: { draw: (ctx, face) => this.drawDogFilter(ctx, face) },
            cat: { draw: (ctx, face) => this.drawCatFilter(ctx, face) },
            rabbit: { draw: (ctx, face) => this.drawRabbitFilter(ctx, face) },
            crown: { draw: (ctx, face) => this.drawCrownFilter(ctx, face) },
            glasses: { draw: (ctx, face) => this.drawGlassesFilter(ctx, face) },
            heart: { draw: (ctx, face) => this.drawHeartFilter(ctx, face) },
            sparkle: { draw: (ctx, face) => this.drawSparkleFilter(ctx, face) },
            devil: { draw: (ctx, face) => this.drawDevilFilter(ctx, face) },
            angel: { draw: (ctx, face) => this.drawAngelFilter(ctx, face) },
            clown: { draw: (ctx, face) => this.drawClownFilter(ctx, face) },
            alien: { draw: (ctx, face) => this.drawAlienFilter(ctx, face) }
        };

        // Sparkle particles
        this.sparkles = [];

        // Initialize
        this.init();
    }

    async init() {
        try {
            this.updateLoadingProgress(10, 'MediaPipe 초기화 중...');
            await this.initFaceMesh();

            this.updateLoadingProgress(40, '카메라 연결 중...');
            await this.initCamera();

            this.updateLoadingProgress(70, '오디오 설정 중...');
            await this.initAudio();

            this.updateLoadingProgress(90, 'UI 초기화 중...');
            this.initUI();
            this.initSoundVisualizer();

            this.updateLoadingProgress(100, '준비 완료!');
            setTimeout(() => {
                document.getElementById('loadingScreen').classList.add('hidden');
            }, 500);

            // Load gallery from localStorage
            this.loadGallery();

        } catch (error) {
            console.error('Initialization error:', error);
            this.showError(error.message);
        }
    }

    updateLoadingProgress(percent, text) {
        document.getElementById('loadingProgress').style.width = percent + '%';
        document.getElementById('loadingText').textContent = text;
    }

    showError(message) {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('errorScreen').classList.add('show');
        document.getElementById('errorMessage').textContent = message;
    }

    async initFaceMesh() {
        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`;
            }
        });

        this.faceMesh.setOptions({
            maxNumFaces: 4,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.faceMesh.onResults((results) => this.onFaceResults(results));
    }

    async initCamera() {
        const constraints = {
            video: {
                facingMode: this.facingMode,
                width: { ideal: this.settings.hdMode ? 1920 : 1280 },
                height: { ideal: this.settings.hdMode ? 1080 : 720 }
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = stream;

            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    this.overlayCanvas.width = this.video.videoWidth;
                    this.overlayCanvas.height = this.video.videoHeight;

                    // Start processing
                    this.startProcessing();
                    resolve();
                };
            });
        } catch (error) {
            throw new Error('카메라에 접근할 수 없습니다. 카메라 권한을 확인해주세요.');
        }
    }

    startProcessing() {
        const processFrame = async () => {
            if (this.video.readyState >= 2) {
                await this.faceMesh.send({ image: this.video });
            }
            requestAnimationFrame(processFrame);
        };
        processFrame();
    }

    async initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;

            // Create gain node for volume control
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = 1;

        } catch (error) {
            console.warn('Audio initialization failed:', error);
        }
    }

    async enableVoiceEffect() {
        if (!this.audioContext) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.microphone = this.audioContext.createMediaStreamSource(stream);

            // Create script processor for pitch shifting
            this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
            this.grainSize = 256;
            this.pitchRatio = this.currentPitch;
            this.overlapRatio = 0.5;

            let buffer = new Float32Array(this.grainSize * 2);
            let grainWindow = this.hannWindow(this.grainSize);
            let writeIndex = 0;

            this.scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const outputData = e.outputBuffer.getChannelData(0);

                for (let i = 0; i < inputData.length; i++) {
                    // Simple pitch shift using granular synthesis
                    const readIndex = (i * this.pitchRatio) % inputData.length;
                    const readIndexInt = Math.floor(readIndex);
                    const frac = readIndex - readIndexInt;

                    if (readIndexInt < inputData.length - 1) {
                        outputData[i] = inputData[readIndexInt] * (1 - frac) +
                                       inputData[readIndexInt + 1] * frac;
                    } else {
                        outputData[i] = inputData[readIndexInt];
                    }
                }
            };

            this.microphone.connect(this.scriptProcessor);
            this.scriptProcessor.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            this.voiceEffectEnabled = true;
            document.getElementById('voiceIndicator').classList.add('show');

        } catch (error) {
            console.error('Voice effect error:', error);
            this.showToast('마이크 권한이 필요합니다');
        }
    }

    hannWindow(length) {
        const window = new Float32Array(length);
        for (let i = 0; i < length; i++) {
            window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (length - 1)));
        }
        return window;
    }

    disableVoiceEffect() {
        if (this.microphone) {
            this.microphone.disconnect();
        }
        if (this.scriptProcessor) {
            this.scriptProcessor.disconnect();
        }
        this.voiceEffectEnabled = false;
        document.getElementById('voiceIndicator').classList.remove('show');
    }

    initSoundVisualizer() {
        const visualizer = document.getElementById('soundVisualizer');
        for (let i = 0; i < 20; i++) {
            const bar = document.createElement('div');
            bar.className = 'sound-bar';
            bar.style.height = '5px';
            visualizer.appendChild(bar);
        }
    }

    updateSoundVisualizer() {
        if (!this.analyser || !this.voiceEffectEnabled) return;

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);

        const bars = document.querySelectorAll('.sound-bar');
        const step = Math.floor(dataArray.length / bars.length);

        bars.forEach((bar, i) => {
            const value = dataArray[i * step];
            bar.style.height = Math.max(5, value / 5) + 'px';
        });

        if (this.voiceEffectEnabled) {
            requestAnimationFrame(() => this.updateSoundVisualizer());
        }
    }

    onFaceResults(results) {
        // Clear canvases
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            this.lastFaceData = results.multiFaceLandmarks;

            // Update face info
            if (this.settings.showFaceInfo) {
                this.updateFaceInfo(results.multiFaceLandmarks);
            }

            // Draw filters for each face
            results.multiFaceLandmarks.forEach((landmarks, index) => {
                const faceData = this.processFaceLandmarks(landmarks);

                // Apply current filter
                if (this.filters[this.currentFilter]) {
                    this.filters[this.currentFilter].draw(this.overlayCtx, faceData);
                }
            });

            // Game mode
            if (this.currentMode === 'game') {
                this.updateGame(results.multiFaceLandmarks[0]);
            }
        } else {
            document.getElementById('faceInfo').style.display = 'none';
        }

        // Update sparkles
        this.updateSparkles();
    }

    processFaceLandmarks(landmarks) {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Key points
        const noseTip = landmarks[4];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const leftEyeOuter = landmarks[133];
        const rightEyeOuter = landmarks[362];
        const leftEyeInner = landmarks[173];
        const rightEyeInner = landmarks[398];
        const upperLip = landmarks[13];
        const lowerLip = landmarks[14];
        const chin = landmarks[152];
        const forehead = landmarks[10];
        const leftCheek = landmarks[234];
        const rightCheek = landmarks[454];
        const leftEar = landmarks[234];
        const rightEar = landmarks[454];

        // Calculate face dimensions
        const eyeDistance = Math.sqrt(
            Math.pow((rightEye.x - leftEye.x) * w, 2) +
            Math.pow((rightEye.y - leftEye.y) * h, 2)
        );

        const faceWidth = Math.sqrt(
            Math.pow((rightCheek.x - leftCheek.x) * w, 2) +
            Math.pow((rightCheek.y - leftCheek.y) * h, 2)
        );

        const faceHeight = Math.sqrt(
            Math.pow((forehead.x - chin.x) * w, 2) +
            Math.pow((forehead.y - chin.y) * h, 2)
        );

        // Face center
        const centerX = (leftEye.x + rightEye.x) / 2 * w;
        const centerY = (leftEye.y + rightEye.y) / 2 * h;

        // Face rotation
        const rotation = Math.atan2(
            (rightEye.y - leftEye.y) * h,
            (rightEye.x - leftEye.x) * w
        );

        // Mouth open detection
        const mouthOpen = Math.abs(upperLip.y - lowerLip.y) * h > eyeDistance * 0.15;

        // Eye blink detection
        const leftEyeHeight = this.getEyeOpenness(landmarks, 'left');
        const rightEyeHeight = this.getEyeOpenness(landmarks, 'right');
        const leftEyeClosed = leftEyeHeight < 0.02;
        const rightEyeClosed = rightEyeHeight < 0.02;

        return {
            landmarks,
            noseTip: { x: noseTip.x * w, y: noseTip.y * h },
            leftEye: { x: leftEye.x * w, y: leftEye.y * h },
            rightEye: { x: rightEye.x * w, y: rightEye.y * h },
            leftEyeOuter: { x: leftEyeOuter.x * w, y: leftEyeOuter.y * h },
            rightEyeOuter: { x: rightEyeOuter.x * w, y: rightEyeOuter.y * h },
            upperLip: { x: upperLip.x * w, y: upperLip.y * h },
            lowerLip: { x: lowerLip.x * w, y: lowerLip.y * h },
            chin: { x: chin.x * w, y: chin.y * h },
            forehead: { x: forehead.x * w, y: forehead.y * h },
            leftCheek: { x: leftCheek.x * w, y: leftCheek.y * h },
            rightCheek: { x: rightCheek.x * w, y: rightCheek.y * h },
            center: { x: centerX, y: centerY },
            eyeDistance,
            faceWidth,
            faceHeight,
            rotation,
            mouthOpen,
            leftEyeClosed,
            rightEyeClosed,
            width: w,
            height: h
        };
    }

    getEyeOpenness(landmarks, side) {
        const indices = side === 'left' ?
            { upper: 159, lower: 145 } :
            { upper: 386, lower: 374 };

        const upper = landmarks[indices.upper];
        const lower = landmarks[indices.lower];

        return Math.abs(upper.y - lower.y);
    }

    updateFaceInfo(faces) {
        const faceInfo = document.getElementById('faceInfo');
        faceInfo.style.display = 'block';

        document.getElementById('faceCount').textContent = `얼굴: ${faces.length}개`;

        if (faces.length > 0) {
            const face = this.processFaceLandmarks(faces[0]);

            // Expression detection
            let expression = '보통';
            if (face.mouthOpen) expression = '😮 놀람';
            else if (face.leftEyeClosed && face.rightEyeClosed) expression = '😌 눈감음';
            else if (face.leftEyeClosed || face.rightEyeClosed) expression = '😉 윙크';

            document.getElementById('expression').textContent = `표정: ${expression}`;

            // Head pose
            const rotationDeg = face.rotation * 180 / Math.PI;
            let pose = '정면';
            if (rotationDeg < -15) pose = '← 왼쪽';
            else if (rotationDeg > 15) pose = '→ 오른쪽';

            document.getElementById('headPose').textContent = `자세: ${pose}`;
        }
    }

    // =========== FILTER DRAWING FUNCTIONS ===========

    drawDogFilter(ctx, face) {
        const scale = face.eyeDistance / 80;

        // Dog ears
        ctx.save();
        ctx.translate(face.forehead.x, face.forehead.y - 30 * scale);
        ctx.rotate(face.rotation);

        // Left ear
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.ellipse(-60 * scale, -40 * scale, 35 * scale, 60 * scale, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Inner left ear
        ctx.fillStyle = '#DEB887';
        ctx.beginPath();
        ctx.ellipse(-60 * scale, -35 * scale, 20 * scale, 40 * scale, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Right ear
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.ellipse(60 * scale, -40 * scale, 35 * scale, 60 * scale, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Inner right ear
        ctx.fillStyle = '#DEB887';
        ctx.beginPath();
        ctx.ellipse(60 * scale, -35 * scale, 20 * scale, 40 * scale, 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Dog nose
        ctx.save();
        ctx.translate(face.noseTip.x, face.noseTip.y);
        ctx.rotate(face.rotation);

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(0, 0, 20 * scale, 15 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Nose highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(-5 * scale, -5 * scale, 6 * scale, 4 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Tongue (when mouth open)
        if (face.mouthOpen) {
            ctx.save();
            ctx.translate(face.lowerLip.x, face.lowerLip.y + 10 * scale);
            ctx.rotate(face.rotation);

            ctx.fillStyle = '#FF69B4';
            ctx.beginPath();
            ctx.ellipse(0, 15 * scale, 25 * scale, 30 * scale, 0, 0, Math.PI);
            ctx.fill();

            // Tongue line
            ctx.strokeStyle = '#FF1493';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, 35 * scale);
            ctx.stroke();

            ctx.restore();
        }
    }

    drawCatFilter(ctx, face) {
        const scale = face.eyeDistance / 80;

        // Cat ears
        ctx.save();
        ctx.translate(face.forehead.x, face.forehead.y - 20 * scale);
        ctx.rotate(face.rotation);

        // Left ear
        ctx.fillStyle = '#FFA07A';
        ctx.beginPath();
        ctx.moveTo(-70 * scale, 0);
        ctx.lineTo(-50 * scale, -70 * scale);
        ctx.lineTo(-30 * scale, 0);
        ctx.closePath();
        ctx.fill();

        // Inner left ear
        ctx.fillStyle = '#FFB6C1';
        ctx.beginPath();
        ctx.moveTo(-65 * scale, -5 * scale);
        ctx.lineTo(-50 * scale, -50 * scale);
        ctx.lineTo(-35 * scale, -5 * scale);
        ctx.closePath();
        ctx.fill();

        // Right ear
        ctx.fillStyle = '#FFA07A';
        ctx.beginPath();
        ctx.moveTo(30 * scale, 0);
        ctx.lineTo(50 * scale, -70 * scale);
        ctx.lineTo(70 * scale, 0);
        ctx.closePath();
        ctx.fill();

        // Inner right ear
        ctx.fillStyle = '#FFB6C1';
        ctx.beginPath();
        ctx.moveTo(35 * scale, -5 * scale);
        ctx.lineTo(50 * scale, -50 * scale);
        ctx.lineTo(65 * scale, -5 * scale);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Cat nose
        ctx.save();
        ctx.translate(face.noseTip.x, face.noseTip.y);
        ctx.rotate(face.rotation);

        ctx.fillStyle = '#FFB6C1';
        ctx.beginPath();
        ctx.moveTo(0, -8 * scale);
        ctx.lineTo(-12 * scale, 8 * scale);
        ctx.lineTo(12 * scale, 8 * scale);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Whiskers
        ctx.save();
        ctx.translate(face.noseTip.x, face.noseTip.y + 10 * scale);
        ctx.rotate(face.rotation);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;

        // Left whiskers
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(-15 * scale, (i - 1) * 10 * scale);
            ctx.lineTo(-70 * scale, (i - 1) * 15 * scale - 10 * scale);
            ctx.stroke();
        }

        // Right whiskers
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(15 * scale, (i - 1) * 10 * scale);
            ctx.lineTo(70 * scale, (i - 1) * 15 * scale - 10 * scale);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawRabbitFilter(ctx, face) {
        const scale = face.eyeDistance / 80;

        // Rabbit ears
        ctx.save();
        ctx.translate(face.forehead.x, face.forehead.y - 50 * scale);
        ctx.rotate(face.rotation);

        // Left ear
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.ellipse(-40 * scale, -60 * scale, 25 * scale, 80 * scale, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Inner left ear
        ctx.fillStyle = '#FFB6C1';
        ctx.beginPath();
        ctx.ellipse(-40 * scale, -55 * scale, 15 * scale, 60 * scale, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Right ear
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.ellipse(40 * scale, -60 * scale, 25 * scale, 80 * scale, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Inner right ear
        ctx.fillStyle = '#FFB6C1';
        ctx.beginPath();
        ctx.ellipse(40 * scale, -55 * scale, 15 * scale, 60 * scale, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Bunny nose
        ctx.save();
        ctx.translate(face.noseTip.x, face.noseTip.y);
        ctx.rotate(face.rotation);

        ctx.fillStyle = '#FFB6C1';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12 * scale, 8 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Bunny teeth (when mouth open)
        if (face.mouthOpen) {
            ctx.save();
            ctx.translate(face.upperLip.x, face.upperLip.y + 5 * scale);
            ctx.rotate(face.rotation);

            ctx.fillStyle = '#FFF';
            ctx.strokeStyle = '#DDD';
            ctx.lineWidth = 1;

            // Left tooth
            ctx.beginPath();
            ctx.roundRect(-10 * scale, 0, 8 * scale, 20 * scale, 2);
            ctx.fill();
            ctx.stroke();

            // Right tooth
            ctx.beginPath();
            ctx.roundRect(2 * scale, 0, 8 * scale, 20 * scale, 2);
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }
    }

    drawCrownFilter(ctx, face) {
        const scale = face.eyeDistance / 80;

        ctx.save();
        ctx.translate(face.forehead.x, face.forehead.y - 60 * scale);
        ctx.rotate(face.rotation);

        // Crown base
        const gradient = ctx.createLinearGradient(0, 0, 0, -60 * scale);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(1, '#FFA500');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(-70 * scale, 0);
        ctx.lineTo(-60 * scale, -30 * scale);
        ctx.lineTo(-40 * scale, -10 * scale);
        ctx.lineTo(-20 * scale, -50 * scale);
        ctx.lineTo(0, -20 * scale);
        ctx.lineTo(20 * scale, -50 * scale);
        ctx.lineTo(40 * scale, -10 * scale);
        ctx.lineTo(60 * scale, -30 * scale);
        ctx.lineTo(70 * scale, 0);
        ctx.closePath();
        ctx.fill();

        // Crown outline
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Jewels
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(-20 * scale, -35 * scale, 8 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0000FF';
        ctx.beginPath();
        ctx.arc(0, -10 * scale, 8 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(20 * scale, -35 * scale, 8 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawGlassesFilter(ctx, face) {
        const scale = face.eyeDistance / 80;

        ctx.save();
        ctx.translate(face.center.x, face.center.y);
        ctx.rotate(face.rotation);

        // Gradient for lenses
        const lensGradient = ctx.createLinearGradient(0, -20 * scale, 0, 20 * scale);
        lensGradient.addColorStop(0, 'rgba(50, 50, 50, 0.8)');
        lensGradient.addColorStop(1, 'rgba(20, 20, 20, 0.9)');

        // Left lens
        ctx.fillStyle = lensGradient;
        ctx.beginPath();
        ctx.ellipse(-face.eyeDistance / 2, 0, 45 * scale, 35 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Right lens
        ctx.beginPath();
        ctx.ellipse(face.eyeDistance / 2, 0, 45 * scale, 35 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Frame
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 5 * scale;

        ctx.beginPath();
        ctx.ellipse(-face.eyeDistance / 2, 0, 45 * scale, 35 * scale, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(face.eyeDistance / 2, 0, 45 * scale, 35 * scale, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Bridge
        ctx.beginPath();
        ctx.moveTo(-face.eyeDistance / 2 + 45 * scale, 0);
        ctx.lineTo(face.eyeDistance / 2 - 45 * scale, 0);
        ctx.stroke();

        // Lens reflection
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(-face.eyeDistance / 2 - 15 * scale, -10 * scale, 10 * scale, 0, Math.PI * 0.5);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(face.eyeDistance / 2 - 15 * scale, -10 * scale, 10 * scale, 0, Math.PI * 0.5);
        ctx.stroke();

        ctx.restore();
    }

    drawHeartFilter(ctx, face) {
        const scale = face.eyeDistance / 80;

        // Floating hearts around face
        const time = Date.now() / 1000;

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + time * 0.5;
            const radius = 120 * scale + Math.sin(time * 2 + i) * 20 * scale;
            const x = face.center.x + Math.cos(angle) * radius;
            const y = face.center.y + Math.sin(angle) * radius;
            const heartScale = 0.5 + Math.sin(time * 3 + i) * 0.2;

            this.drawHeart(ctx, x, y, 20 * scale * heartScale, '#FF69B4');
        }

        // Heart eyes effect (when blinking)
        if (face.leftEyeClosed || face.rightEyeClosed) {
            if (face.leftEyeClosed) {
                this.drawHeart(ctx, face.leftEye.x, face.leftEye.y, 25 * scale, '#FF0000');
            }
            if (face.rightEyeClosed) {
                this.drawHeart(ctx, face.rightEye.x, face.rightEye.y, 25 * scale, '#FF0000');
            }
        }
    }

    drawHeart(ctx, x, y, size, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, size * 0.3);
        ctx.bezierCurveTo(-size, -size * 0.3, -size, -size, 0, -size * 0.5);
        ctx.bezierCurveTo(size, -size, size, -size * 0.3, 0, size * 0.3);
        ctx.fill();
        ctx.restore();
    }

    drawSparkleFilter(ctx, face) {
        const scale = face.eyeDistance / 80;
        const time = Date.now();

        // Add new sparkles
        if (Math.random() < 0.3) {
            this.sparkles.push({
                x: face.center.x + (Math.random() - 0.5) * face.faceWidth * 1.5,
                y: face.center.y + (Math.random() - 0.5) * face.faceHeight * 1.5,
                size: Math.random() * 15 + 5,
                life: 1,
                rotation: Math.random() * Math.PI * 2,
                color: ['#FFD700', '#FFF', '#FF69B4', '#00BFFF'][Math.floor(Math.random() * 4)]
            });
        }

        // Draw and update sparkles
        this.sparkles.forEach(sparkle => {
            ctx.save();
            ctx.translate(sparkle.x, sparkle.y);
            ctx.rotate(sparkle.rotation);
            ctx.globalAlpha = sparkle.life;

            // Four-pointed star
            ctx.fillStyle = sparkle.color;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const outerRadius = sparkle.size * sparkle.life;
                const innerRadius = outerRadius * 0.3;

                ctx.lineTo(
                    Math.cos(angle) * outerRadius,
                    Math.sin(angle) * outerRadius
                );
                ctx.lineTo(
                    Math.cos(angle + Math.PI / 4) * innerRadius,
                    Math.sin(angle + Math.PI / 4) * innerRadius
                );
            }
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        });

        // Eye sparkles
        this.drawEyeSparkle(ctx, face.leftEye.x, face.leftEye.y, scale, time);
        this.drawEyeSparkle(ctx, face.rightEye.x, face.rightEye.y, scale, time);
    }

    drawEyeSparkle(ctx, x, y, scale, time) {
        const sparkleSize = 8 * scale * (0.8 + Math.sin(time / 200) * 0.2);

        ctx.save();
        ctx.translate(x - 10 * scale, y - 8 * scale);
        ctx.fillStyle = '#FFF';

        // Main sparkle
        ctx.beginPath();
        ctx.arc(0, 0, sparkleSize, 0, Math.PI * 2);
        ctx.fill();

        // Small sparkle
        ctx.beginPath();
        ctx.arc(12 * scale, 8 * scale, sparkleSize * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    updateSparkles() {
        this.sparkles = this.sparkles.filter(s => {
            s.life -= 0.02;
            s.rotation += 0.05;
            s.y -= 1;
            return s.life > 0;
        });

        // Limit sparkles
        if (this.sparkles.length > 50) {
            this.sparkles = this.sparkles.slice(-50);
        }
    }

    drawDevilFilter(ctx, face) {
        const scale = face.eyeDistance / 80;

        ctx.save();
        ctx.translate(face.forehead.x, face.forehead.y - 30 * scale);
        ctx.rotate(face.rotation);

        // Devil horns
        const hornGradient = ctx.createLinearGradient(0, 0, 0, -80 * scale);
        hornGradient.addColorStop(0, '#8B0000');
        hornGradient.addColorStop(1, '#FF0000');

        ctx.fillStyle = hornGradient;

        // Left horn
        ctx.beginPath();
        ctx.moveTo(-50 * scale, 0);
        ctx.quadraticCurveTo(-80 * scale, -40 * scale, -70 * scale, -80 * scale);
        ctx.quadraticCurveTo(-60 * scale, -60 * scale, -30 * scale, 0);
        ctx.closePath();
        ctx.fill();

        // Right horn
        ctx.beginPath();
        ctx.moveTo(50 * scale, 0);
        ctx.quadraticCurveTo(80 * scale, -40 * scale, 70 * scale, -80 * scale);
        ctx.quadraticCurveTo(60 * scale, -60 * scale, 30 * scale, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Evil eyebrows
        ctx.save();
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 6 * scale;
        ctx.lineCap = 'round';

        // Left eyebrow
        ctx.beginPath();
        ctx.moveTo(face.leftEye.x - 30 * scale, face.leftEye.y - 25 * scale);
        ctx.lineTo(face.leftEye.x + 20 * scale, face.leftEye.y - 35 * scale);
        ctx.stroke();

        // Right eyebrow
        ctx.beginPath();
        ctx.moveTo(face.rightEye.x + 30 * scale, face.rightEye.y - 25 * scale);
        ctx.lineTo(face.rightEye.x - 20 * scale, face.rightEye.y - 35 * scale);
        ctx.stroke();

        ctx.restore();
    }

    drawAngelFilter(ctx, face) {
        const scale = face.eyeDistance / 80;
        const time = Date.now() / 1000;

        ctx.save();
        ctx.translate(face.forehead.x, face.forehead.y - 80 * scale);
        ctx.rotate(face.rotation);

        // Halo
        const haloY = Math.sin(time * 2) * 5 * scale;

        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 8 * scale;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.ellipse(0, haloY, 50 * scale, 15 * scale, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glow
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.ellipse(0, haloY, 45 * scale, 12 * scale, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();

        // Wings
        ctx.save();
        ctx.translate(face.center.x, face.center.y + 50 * scale);
        ctx.globalAlpha = 0.7;

        const wingFlap = Math.sin(time * 4) * 0.1;

        // Left wing
        ctx.save();
        ctx.rotate(-0.3 + wingFlap);
        this.drawWing(ctx, -80 * scale, 0, scale, true);
        ctx.restore();

        // Right wing
        ctx.save();
        ctx.rotate(0.3 - wingFlap);
        this.drawWing(ctx, 80 * scale, 0, scale, false);
        ctx.restore();

        ctx.restore();
    }

    drawWing(ctx, x, y, scale, flip) {
        ctx.save();
        ctx.translate(x, y);
        if (flip) ctx.scale(-1, 1);

        const gradient = ctx.createLinearGradient(0, 0, 100 * scale, 0);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');

        ctx.fillStyle = gradient;

        // Wing feathers
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.ellipse(
                30 * scale + i * 15 * scale,
                i * 10 * scale - 20 * scale,
                40 * scale - i * 5 * scale,
                15 * scale,
                0.3 + i * 0.1,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        ctx.restore();
    }

    drawClownFilter(ctx, face) {
        const scale = face.eyeDistance / 80;

        // Big red nose
        ctx.save();
        ctx.translate(face.noseTip.x, face.noseTip.y);

        const noseGradient = ctx.createRadialGradient(
            -5 * scale, -5 * scale, 0,
            0, 0, 30 * scale
        );
        noseGradient.addColorStop(0, '#FF6B6B');
        noseGradient.addColorStop(1, '#FF0000');

        ctx.fillStyle = noseGradient;
        ctx.beginPath();
        ctx.arc(0, 0, 30 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Nose highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(-8 * scale, -8 * scale, 10 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Rainbow hair/wig
        ctx.save();
        ctx.translate(face.forehead.x, face.forehead.y - 20 * scale);
        ctx.rotate(face.rotation);

        const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF'];

        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI - Math.PI / 2;
            const x = Math.cos(angle) * 80 * scale;
            const y = Math.sin(angle) * 40 * scale - 20 * scale;

            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.ellipse(x, y, 25 * scale, 35 * scale, angle, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Clown makeup - eye circles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.ellipse(face.leftEye.x, face.leftEye.y, 35 * scale, 25 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(face.rightEye.x, face.rightEye.y, 35 * scale, 25 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Big smile
        ctx.save();
        ctx.translate(face.upperLip.x, face.upperLip.y + 10 * scale);
        ctx.rotate(face.rotation);

        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.ellipse(0, 0, 50 * scale, 25 * scale, 0, 0, Math.PI);
        ctx.fill();

        ctx.restore();
    }

    drawAlienFilter(ctx, face) {
        const scale = face.eyeDistance / 80;
        const time = Date.now() / 1000;

        // Green tint overlay on face area
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#00FF00';

        ctx.beginPath();
        ctx.ellipse(face.center.x, face.center.y, face.faceWidth / 2, face.faceHeight / 2, face.rotation, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Big alien eyes
        ctx.save();

        // Left eye
        const leftEyeGradient = ctx.createRadialGradient(
            face.leftEye.x, face.leftEye.y, 0,
            face.leftEye.x, face.leftEye.y, 50 * scale
        );
        leftEyeGradient.addColorStop(0, '#000');
        leftEyeGradient.addColorStop(0.3, '#001100');
        leftEyeGradient.addColorStop(1, '#003300');

        ctx.fillStyle = leftEyeGradient;
        ctx.beginPath();
        ctx.ellipse(face.leftEye.x, face.leftEye.y, 45 * scale, 55 * scale, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Right eye
        const rightEyeGradient = ctx.createRadialGradient(
            face.rightEye.x, face.rightEye.y, 0,
            face.rightEye.x, face.rightEye.y, 50 * scale
        );
        rightEyeGradient.addColorStop(0, '#000');
        rightEyeGradient.addColorStop(0.3, '#001100');
        rightEyeGradient.addColorStop(1, '#003300');

        ctx.fillStyle = rightEyeGradient;
        ctx.beginPath();
        ctx.ellipse(face.rightEye.x, face.rightEye.y, 45 * scale, 55 * scale, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Eye shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(face.leftEye.x - 10 * scale, face.leftEye.y - 15 * scale, 10 * scale, 15 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(face.rightEye.x - 10 * scale, face.rightEye.y - 15 * scale, 10 * scale, 15 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Antennae
        ctx.save();
        ctx.translate(face.forehead.x, face.forehead.y - 30 * scale);
        ctx.rotate(face.rotation);

        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 4 * scale;
        ctx.lineCap = 'round';

        // Left antenna
        const leftWobble = Math.sin(time * 3) * 10 * scale;
        ctx.beginPath();
        ctx.moveTo(-30 * scale, 0);
        ctx.quadraticCurveTo(-40 * scale + leftWobble, -40 * scale, -35 * scale, -70 * scale);
        ctx.stroke();

        // Left antenna ball
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(-35 * scale, -70 * scale, 10 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Right antenna
        const rightWobble = Math.sin(time * 3 + 1) * 10 * scale;
        ctx.beginPath();
        ctx.moveTo(30 * scale, 0);
        ctx.quadraticCurveTo(40 * scale + rightWobble, -40 * scale, 35 * scale, -70 * scale);
        ctx.stroke();

        // Right antenna ball
        ctx.beginPath();
        ctx.arc(35 * scale, -70 * scale, 10 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect
        ctx.shadowColor = '#00FF00';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(-35 * scale, -70 * scale, 8 * scale, 0, Math.PI * 2);
        ctx.arc(35 * scale, -70 * scale, 8 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // =========== GAME MODE ===========

    initGame() {
        this.gameScore = 0;
        this.gameObjects = [];
        document.getElementById('gameScore').textContent = '0';
        this.spawnGameObject();
    }

    spawnGameObject() {
        if (this.currentMode !== 'game') return;

        const emojis = ['🍎', '🍊', '🍋', '🍇', '🍓', '🌟', '💎', '🎁'];
        const obj = {
            x: Math.random() * (this.canvas.width - 100) + 50,
            y: -50,
            emoji: emojis[Math.floor(Math.random() * emojis.length)],
            speed: 2 + this.settings.difficulty,
            points: Math.floor(Math.random() * 10) + 5,
            size: 40
        };

        this.gameObjects.push(obj);

        // Spawn next object
        const spawnDelay = 2000 - this.settings.difficulty * 500;
        setTimeout(() => this.spawnGameObject(), Math.max(500, spawnDelay));
    }

    updateGame(faceLandmarks) {
        if (!faceLandmarks) return;

        const face = this.processFaceLandmarks(faceLandmarks);
        const mouthX = face.upperLip.x;
        const mouthY = face.upperLip.y;
        const mouthOpen = face.mouthOpen;

        // Update game objects
        this.gameObjects = this.gameObjects.filter(obj => {
            obj.y += obj.speed;

            // Check collision with mouth
            if (mouthOpen) {
                const dist = Math.sqrt(
                    Math.pow(obj.x - mouthX, 2) +
                    Math.pow(obj.y - mouthY, 2)
                );

                if (dist < 60) {
                    this.gameScore += obj.points;
                    document.getElementById('gameScore').textContent = this.gameScore;
                    this.playSound('collect');
                    this.showToast(`+${obj.points}점!`);
                    return false;
                }
            }

            // Remove if off screen
            if (obj.y > this.canvas.height + 50) {
                return false;
            }

            return true;
        });

        // Draw game objects
        this.gameObjects.forEach(obj => {
            this.overlayCtx.font = `${obj.size}px Arial`;
            this.overlayCtx.textAlign = 'center';
            this.overlayCtx.fillText(obj.emoji, obj.x, obj.y);
        });

        // Draw mouth indicator
        if (mouthOpen) {
            this.overlayCtx.strokeStyle = '#00FF00';
            this.overlayCtx.lineWidth = 3;
            this.overlayCtx.beginPath();
            this.overlayCtx.arc(mouthX, mouthY, 40, 0, Math.PI * 2);
            this.overlayCtx.stroke();
        }
    }

    playSound(type) {
        if (!this.settings.soundEnabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        switch(type) {
            case 'collect':
                oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1760, this.audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                break;
            case 'capture':
                oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime);
                oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                break;
        }

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }

    // =========== UI HANDLERS ===========

    initUI() {
        // Filter selection
        document.querySelectorAll('.filter-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.filter-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.currentFilter = item.dataset.filter;
            });
        });

        // Mode tabs
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentMode = tab.dataset.mode;

                document.getElementById('gameContainer').classList.toggle('active', this.currentMode === 'game');
                document.getElementById('filterBar').style.display = this.currentMode === 'game' ? 'none' : 'flex';

                if (this.currentMode === 'game') {
                    this.initGame();
                } else if (this.currentMode === 'voice') {
                    if (!this.voiceEffectEnabled) {
                        this.enableVoiceEffect();
                        document.getElementById('soundVisualizer').classList.add('active');
                        this.updateSoundVisualizer();
                    }
                } else {
                    if (this.voiceEffectEnabled) {
                        this.disableVoiceEffect();
                        document.getElementById('soundVisualizer').classList.remove('active');
                    }
                }
            });
        });

        // Capture button
        document.getElementById('captureBtn').addEventListener('click', () => {
            this.capturePhoto();
        });

        // Flip camera
        document.getElementById('flipCamera').addEventListener('click', () => {
            this.flipCamera();
        });

        // Gallery
        document.getElementById('galleryBtn').addEventListener('click', () => {
            document.getElementById('galleryModal').classList.add('show');
        });

        document.getElementById('closeGallery').addEventListener('click', () => {
            document.getElementById('galleryModal').classList.remove('show');
        });

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => {
            document.getElementById('settingsPanel').classList.toggle('show');
        });

        // Close settings when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('settingsPanel');
            const btn = document.getElementById('settingsBtn');
            if (!panel.contains(e.target) && !btn.contains(e.target) && panel.classList.contains('show')) {
                panel.classList.remove('show');
            }
        });

        // Settings toggles
        document.getElementById('toggleFaceInfo').addEventListener('click', function() {
            this.classList.toggle('active');
            this.settings = this.settings || {};
            this.settings.showFaceInfo = this.classList.contains('active');
            document.getElementById('faceInfo').style.display = this.settings.showFaceInfo ? 'block' : 'none';
        }.bind(this));

        document.getElementById('toggleVoice').addEventListener('click', () => {
            const toggle = document.getElementById('toggleVoice');
            toggle.classList.toggle('active');
            if (toggle.classList.contains('active')) {
                this.enableVoiceEffect();
            } else {
                this.disableVoiceEffect();
            }
        });

        document.getElementById('toggleSound').addEventListener('click', function() {
            this.classList.toggle('active');
        });

        // Pitch slider
        document.getElementById('pitchSlider').addEventListener('input', (e) => {
            this.currentPitch = parseFloat(e.target.value);
            this.pitchRatio = this.currentPitch;
            document.getElementById('pitchValue').textContent = this.currentPitch.toFixed(1);
            document.getElementById('currentVoiceEffect').textContent =
                this.currentPitch > 1.3 ? '다람쥐 목소리' :
                this.currentPitch < 0.7 ? '거인 목소리' : '음성 효과';
        });

        // Difficulty slider
        document.getElementById('difficultySlider').addEventListener('input', (e) => {
            this.settings.difficulty = parseInt(e.target.value);
            const labels = ['쉬움', '보통', '어려움'];
            document.getElementById('difficultyValue').textContent = labels[this.settings.difficulty - 1];
        });

        // Preview modal
        document.getElementById('closePreview').addEventListener('click', () => {
            document.getElementById('previewModal').classList.remove('show');
        });

        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveCurrentPhoto();
        });

        document.getElementById('shareBtn').addEventListener('click', () => {
            this.sharePhoto();
        });

        // Effect button (random filter)
        document.getElementById('effectBtn').addEventListener('click', () => {
            const filters = Object.keys(this.filters).filter(f => f !== 'none');
            const randomFilter = filters[Math.floor(Math.random() * filters.length)];

            document.querySelectorAll('.filter-item').forEach(item => {
                item.classList.toggle('active', item.dataset.filter === randomFilter);
            });

            this.currentFilter = randomFilter;
            this.showToast(`${randomFilter} 필터 적용!`);
        });
    }

    async flipCamera() {
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';

        // Stop current stream
        const stream = this.video.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        await this.initCamera();
        this.showToast('카메라 전환');
    }

    capturePhoto() {
        // Resume audio context if suspended
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.playSound('capture');

        // Create capture canvas
        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = this.canvas.width;
        captureCanvas.height = this.canvas.height;
        const captureCtx = captureCanvas.getContext('2d');

        // Draw video (flipped)
        captureCtx.save();
        captureCtx.scale(-1, 1);
        captureCtx.drawImage(this.video, -captureCanvas.width, 0);
        captureCtx.restore();

        // Draw overlay (flipped)
        captureCtx.save();
        captureCtx.scale(-1, 1);
        captureCtx.drawImage(this.overlayCanvas, -captureCanvas.width, 0);
        captureCtx.restore();

        // Show preview
        const dataUrl = captureCanvas.toDataURL('image/png');
        document.getElementById('previewImage').src = dataUrl;
        document.getElementById('previewModal').classList.add('show');

        // Flash effect
        this.flashEffect();
    }

    flashEffect() {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            z-index: 1000;
            animation: flash 0.3s ease-out forwards;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes flash {
                0% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(flash);

        setTimeout(() => {
            flash.remove();
            style.remove();
        }, 300);
    }

    saveCurrentPhoto() {
        const img = document.getElementById('previewImage');

        // Add to gallery
        this.gallery.unshift({
            data: img.src,
            date: new Date().toISOString()
        });

        // Save to localStorage
        localStorage.setItem('faceplay_gallery', JSON.stringify(this.gallery.slice(0, 50)));

        // Update gallery UI
        this.updateGalleryUI();

        // Download
        const link = document.createElement('a');
        link.download = `faceplay_${Date.now()}.png`;
        link.href = img.src;
        link.click();

        this.showToast('사진이 저장되었습니다!');
        document.getElementById('previewModal').classList.remove('show');
    }

    async sharePhoto() {
        const img = document.getElementById('previewImage');

        if (navigator.share && navigator.canShare) {
            try {
                const blob = await (await fetch(img.src)).blob();
                const file = new File([blob], 'faceplay.png', { type: 'image/png' });

                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'FacePlay 사진',
                        text: 'FacePlay로 만든 재미있는 사진!'
                    });
                    return;
                }
            } catch (error) {
                console.log('Share failed:', error);
            }
        }

        // Fallback: copy to clipboard
        try {
            const blob = await (await fetch(img.src)).blob();
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            this.showToast('클립보드에 복사되었습니다!');
        } catch (error) {
            this.showToast('공유 기능을 사용할 수 없습니다');
        }
    }

    loadGallery() {
        try {
            const saved = localStorage.getItem('faceplay_gallery');
            if (saved) {
                this.gallery = JSON.parse(saved);
                this.updateGalleryUI();
            }
        } catch (error) {
            console.warn('Failed to load gallery:', error);
        }
    }

    updateGalleryUI() {
        const grid = document.getElementById('galleryGrid');

        if (this.gallery.length === 0) {
            grid.innerHTML = `
                <p style="grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.5); padding: 40px;">
                    아직 저장된 사진이 없습니다
                </p>
            `;
            return;
        }

        grid.innerHTML = this.gallery.map((item, index) => `
            <div class="gallery-item" data-index="${index}">
                <img src="${item.data}" alt="Photo ${index + 1}">
            </div>
        `).join('');

        // Add click handlers
        grid.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                document.getElementById('previewImage').src = this.gallery[index].data;
                document.getElementById('galleryModal').classList.remove('show');
                document.getElementById('previewModal').classList.add('show');
            });
        });
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new FacePlayApp();
});
