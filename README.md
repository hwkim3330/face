<div align="center">

# 🔬 AI Vision Lab

### 브라우저에서 실행되는 MediaPipe 기반 AI 비전 앱 컬렉션

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Visit_Site-6366f1?style=for-the-badge)](https://hwkim3330.github.io/face/)
[![GitHub Stars](https://img.shields.io/github/stars/hwkim3330/face?style=for-the-badge&logo=github&color=yellow)](https://github.com/hwkim3330/face/stargazers)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br>

**100% 클라이언트 사이드** · **설치 불필요** · **프라이버시 보장** · **모바일 최적화**

<br>

[🎭 FacePlay](#-faceplay) · [✋ HandsPlay](#-handsplay) · [🏃 BodyPlay](#-bodyplay) · [🌟 HolisticPlay](#-holisticplay)

---

</div>

<br>

## 📱 앱 컬렉션

### 🎭 FacePlay
> **스노우 스타일 얼굴 인식 AR 앱**

<table>
<tr>
<td width="50%">

#### 주요 기능
- 🐕 **AR 필터 20종** - 강아지, 고양이, 토끼, 왕관, 선글라스 등
- 🎮 **미니게임 5종** - 과일받기, 버블팝, 레이싱, 표정맞추기, 헤딩축구
- 🎤 **음성 효과** - 실시간 피치 조절 (다람쥐/거인 목소리)
- 📸 **캡처 & 공유** - 사진 저장 및 소셜 공유
- 👤 **468개 랜드마크** 정밀 추적

</td>
<td width="50%">

#### 기술 스택
| 기술 | 용도 |
|------|------|
| MediaPipe Face Mesh | 얼굴 인식 |
| Web Audio API | 음성 효과 |
| Canvas 2D | AR 렌더링 |
| LocalStorage | 갤러리 저장 |

</td>
</tr>
</table>

---

### ✋ HandsPlay
> **손 인식 인터랙티브 앱**

<table>
<tr>
<td width="50%">

#### 주요 기능
- 🎹 **가상 피아노** - 손가락으로 연주
- 🎨 **에어 드로잉** - 허공에 그림 그리기
- ✊ **제스처 인식** - 주먹, 가위, 보, 검지, 엄지척, 사랑해
- 🎮 **가위바위보** - AI와 대결
- 🖐️ **21개 랜드마크** 추적

</td>
<td width="50%">

#### 인식 가능 제스처
| 제스처 | 이모지 |
|--------|--------|
| 주먹 | ✊ |
| 가위 | ✌️ |
| 보 | 🖐️ |
| 검지 | ☝️ |
| 엄지척 | 👍 |
| 사랑해 | 🤟 |
| 오케이 | 👌 |

</td>
</tr>
</table>

---

### 🏃 BodyPlay
> **전신 자세 인식 피트니스 앱**

<table>
<tr>
<td width="50%">

#### 주요 기능
- 📐 **실시간 자세 분석** - 관절 각도 측정
- 🏋️ **운동 카운터** - 자동 횟수 카운팅
- 💃 **댄스 게임** - 타겟 맞추기 게임
- 🦴 **33개 랜드마크** 추적

</td>
<td width="50%">

#### 지원 운동
| 운동 | 측정 |
|------|------|
| 🏋️ 스쿼트 | 무릎 각도 |
| 💪 팔굽혀펴기 | 팔꿈치 각도 |
| ⭐ 점핑잭 | 팔/다리 위치 |
| 🦵 런지 | 무릎 굽힘 |

</td>
</tr>
</table>

---

### 🌟 HolisticPlay
> **얼굴 + 손 + 몸 통합 인식 앱**

<table>
<tr>
<td width="50%">

#### 주요 기능
- 🔍 **통합 트래킹** - 얼굴, 손, 몸 동시 인식
- 🎭 **AR 아바타** - 로봇, 고양이, 곰, 외계인
- 🎬 **VTuber 모드** - 애니메이션 캐릭터 조종
- 📹 **모션 캡처** - JSON 데이터 녹화/내보내기
- ✨ **522+ 랜드마크** 통합 추적

</td>
<td width="50%">

#### 모드
| 모드 | 설명 |
|------|------|
| 트래킹 | 실시간 스켈레톤 시각화 |
| 아바타 | AR 캐릭터 오버레이 |
| VTuber | 2D 애니메이션 캐릭터 |
| 모션캡처 | 데이터 녹화/내보내기 |

</td>
</tr>
</table>

---

## 🛠️ 기술 스택

<div align="center">

| 카테고리 | 기술 |
|----------|------|
| 🤖 **AI/ML** | MediaPipe (Face Mesh, Hands, Pose, Holistic) |
| 🎨 **렌더링** | Canvas 2D API, WebGL |
| 🔊 **오디오** | Web Audio API |
| 📱 **PWA** | Service Worker, Web App Manifest |
| 🎥 **미디어** | getUserMedia, MediaRecorder |

</div>

---

## 🚀 빠른 시작

### 온라인 데모
**[https://hwkim3330.github.io/face/](https://hwkim3330.github.io/face/)**

### 로컬 실행
```bash
# 저장소 클론
git clone https://github.com/hwkim3330/face.git
cd face

# 로컬 서버 실행 (아무거나 선택)
npx serve .
# 또는
python -m http.server 8000
# 또는
php -S localhost:8000
```

> ⚠️ **중요**: 카메라 접근을 위해 HTTPS 또는 localhost에서 실행해야 합니다.

---

## 📁 프로젝트 구조

```
face/
├── index.html          # 메인 랜딩 페이지
├── manifest.json       # PWA 매니페스트
├── sw.js              # Service Worker
├── README.md
│
├── apps/
│   ├── face/          # 🎭 FacePlay
│   │   ├── index.html
│   │   ├── app.js
│   │   ├── filters.js
│   │   └── games.js
│   │
│   ├── hands/         # ✋ HandsPlay
│   │   └── index.html
│   │
│   ├── body/          # 🏃 BodyPlay
│   │   └── index.html
│   │
│   └── holistic/      # 🌟 HolisticPlay
│       └── index.html
│
└── assets/
    ├── css/
    └── images/
```

---

## 🔒 프라이버시

- ✅ **100% 클라이언트 사이드** - 모든 처리가 브라우저에서 로컬로 수행
- ✅ **서버 전송 없음** - 카메라 데이터가 외부로 전송되지 않음
- ✅ **오프라인 지원** - PWA로 오프라인에서도 사용 가능

---

## 📱 브라우저 지원

| 브라우저 | 지원 | 비고 |
|----------|------|------|
| Chrome | ✅ 권장 | 최적 성능 |
| Edge | ✅ | 완전 지원 |
| Safari | ⚠️ | iOS 일부 제한 |
| Firefox | ⚠️ | 일부 기능 제한 |

---

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능

---

## 🙏 Credits

- [MediaPipe](https://mediapipe.dev/) - Google AI 비전 프레임워크
- [Google Fonts](https://fonts.google.com/) - Inter 폰트

---

<div align="center">

**Made with 💜 by [@hwkim3330](https://github.com/hwkim3330)**

[⬆ 맨 위로](#-ai-vision-lab)

</div>
