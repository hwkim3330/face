/**
 * FacePlay Service Worker
 * PWA 오프라인 지원 및 캐싱
 */

const CACHE_NAME = 'faceplay-v1';
const STATIC_CACHE = 'faceplay-static-v1';
const DYNAMIC_CACHE = 'faceplay-dynamic-v1';

// 정적 자원 (앱 쉘)
const STATIC_ASSETS = [
    '/face/',
    '/face/index.html',
    '/face/app.js',
    '/face/manifest.json'
];

// CDN 자원 (MediaPipe)
const CDN_ASSETS = [
    'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js',
    'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js',
    'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3/drawing_utils.js'
];

// 설치 이벤트
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');

    event.waitUntil(
        Promise.all([
            // 정적 자원 캐싱
            caches.open(STATIC_CACHE).then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            }),
            // CDN 자원은 나중에 캐싱 (CORS 이슈 방지)
        ]).then(() => {
            console.log('[SW] Installation complete');
            return self.skipWaiting();
        })
    );
});

// 활성화 이벤트
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => {
                        return name.startsWith('faceplay-') &&
                               name !== STATIC_CACHE &&
                               name !== DYNAMIC_CACHE;
                    })
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[SW] Activation complete');
            return self.clients.claim();
        })
    );
});

// Fetch 이벤트
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 같은 오리진의 요청만 처리
    if (url.origin === location.origin) {
        // Cache First 전략 (정적 자원)
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request).then((networkResponse) => {
                    // 동적 캐싱
                    if (networkResponse.ok) {
                        const responseClone = networkResponse.clone();
                        caches.open(DYNAMIC_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                }).catch(() => {
                    // 오프라인 폴백
                    if (request.destination === 'document') {
                        return caches.match('/face/index.html');
                    }
                });
            })
        );
    } else if (url.hostname.includes('cdn.jsdelivr.net')) {
        // CDN 자원: Network First, Cache Fallback
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    const responseClone = networkResponse.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match(request);
                })
        );
    }
});

// 백그라운드 동기화
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-gallery') {
        event.waitUntil(syncGallery());
    }
});

async function syncGallery() {
    // 갤러리 동기화 로직 (향후 서버 연동시 사용)
    console.log('[SW] Syncing gallery...');
}

// 푸시 알림
self.addEventListener('push', (event) => {
    console.log('[SW] Push received:', event);

    const options = {
        body: event.data?.text() || '새로운 필터가 추가되었습니다!',
        icon: '/face/icons/icon-192.png',
        badge: '/face/icons/badge-72.png',
        vibrate: [100, 50, 100],
        data: {
            url: '/face/'
        },
        actions: [
            { action: 'open', title: '열기' },
            { action: 'close', title: '닫기' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('FacePlay', options)
    );
});

// 알림 클릭
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow(event.notification.data?.url || '/face/')
        );
    }
});

// 메시지 핸들러
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
        });
    }
});
