const canvasContainer = document.getElementById('canvas-container');
const loadingScreen = document.getElementById('loading');
const entryOverlay = document.getElementById('entry-overlay');
const bgMusic = document.getElementById('bg-music');
const floatingImagesContainer = document.getElementById('floating-images');
const letterModal = document.getElementById('letter-modal');
const closeLetterButton = document.getElementById('close-letter');
const cameraButton = document.getElementById('btn-camera');
const floatingButton = document.getElementById('btn-floating');
const letterButton = document.getElementById('btn-letter');
const meteorButton = document.getElementById('btn-meteor');

let camera;
let renderer;
let scene;
let controls;
let particleSphereGroup;
let innerGlow;
let outerGlow;
let centerLight;
let photoMeshes = [];
let orbitRings = [];
let stars;
let meteorEnabled = false;
let meteors = [];
let cameraShake = 0;
let clock;

const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous');

const fallbackPhotoUrls = Array.from({ length: 48 }, (_, index) => `photos/photo${index + 1}.jpg`);
let photoSlots = [];

const rings = [
    { count: 12, radius: 15, height: 0 },
    { count: 18, radius: 21, height: 0 },
    { count: 24, radius: 27, height: 0 },
    { count: 30, radius: 33, height: 0 }
];

let saturnRing;
let photoGroup; 
let header3D;

function create3DHeader() {
    const fontLoader = new THREE.FontLoader();
    // Menggunakan font dari CDN resmi Three.js
    fontLoader.load('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json', (font) => {
        const textGeometry = new THREE.TextGeometry('Laeli Kurniawati', {
            font: font,
            size: 1.5,
            height: 0.4, // Ketebalan teks
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.1,
            bevelSize: 0.05,
            bevelOffset: 0,
            bevelSegments: 5
        });

        textGeometry.center(); // Pusatkan teks

        // Material dengan warna gradien pink membara
        const material = new THREE.MeshPhongMaterial({
            color: 0xff6b9d,
            emissive: 0x441122,
            specular: 0xffffff,
            shininess: 100
        });

        header3D = new THREE.Mesh(textGeometry, material);
        header3D.position.set(0, 13, 0); // Di atas matahari
        scene.add(header3D);

        // Tambahkan cahaya khusus untuk teks agar terlihat mewah
        const textLight = new THREE.PointLight(0xf8b500, 2, 20);
        textLight.position.set(0, 15, 5);
        scene.add(textLight);
    });
}

function createSaturnRing() {
    const ringCount = 15000; 
    const innerRadius = 12;
    const outerRadius = 38; 
    const ringGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(ringCount * 3);
    const colors = new Float32Array(ringCount * 3);

    for (let i = 0; i < ringCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
        
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (Math.random() - 0.5) * 0.2; 

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const greyScale = 0.5 + Math.random() * 0.5;
        colors[i * 3] = greyScale;
        colors[i * 3 + 1] = greyScale;
        colors[i * 3 + 2] = greyScale;
    }

    ringGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    ringGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const ringMaterial = new THREE.PointsMaterial({
        size: 0.07,
        vertexColors: true,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
    });

    saturnRing = new THREE.Points(ringGeometry, ringMaterial);
    scene.add(saturnRing);
}

const ringVisuals = [
    { radius: 15, color: 0xcccccc, opacity: 0.1, y: 0 },
    { radius: 21, color: 0xaaaaaa, opacity: 0.1, y: 0 },
    { radius: 27, color: 0x888888, opacity: 0.05, y: 0 },
    { radius: 33, color: 0x666666, opacity: 0.05, y: 0 }
];

const ringHeightPattern = [0, 2, -1, 1, 3, -2, 2, -3, 4, 0];

function totalRingCapacity() {
    return rings.reduce((sum, ring) => sum + ring.count, 0);
}

function createOrbitRingMesh(config) {
    const ringGeometry = new THREE.TorusGeometry(config.radius, 0.04, 16, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: config.opacity,
        blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = config.y;
    scene.add(ring);
    orbitRings.push(ring);
}

function ensureRingsForCount(photoCount) {
    while (totalRingCapacity() < photoCount) {
        const lastRing = rings[rings.length - 1];
        const nextIndex = rings.length;
        const nextCount = lastRing.count + 4;
        const nextRadius = lastRing.radius + 4;
        const nextHeight = ringHeightPattern[nextIndex % ringHeightPattern.length];

        rings.push({
            count: nextCount,
            radius: nextRadius,
            height: nextHeight
        });

        const colors = [0xff6b9d, 0x4ecdc4, 0xf8b500, 0xff8b94];
        const opacities = [0.35, 0.3, 0.25, 0.2];
        const nextVisual = {
            radius: nextRadius,
            color: colors[nextIndex % colors.length],
            opacity: opacities[nextIndex % opacities.length],
            y: nextHeight
        };
        ringVisuals.push(nextVisual);

        if (typeof scene !== 'undefined') {
            createOrbitRingMesh(nextVisual);
        }
    }
}

function createPhotoSlotsFromUrls(urls) {
    ensureRingsForCount(urls.length);
    const slots = [];
    let photoIndex = 0;

    for (let ringIndex = 0; ringIndex < rings.length && photoIndex < urls.length; ringIndex++) {
        const ringCount = rings[ringIndex].count;

        for (let slotIndex = 0; slotIndex < ringCount && photoIndex < urls.length; slotIndex++) {
            slots.push({
                ring: ringIndex,
                slot: slotIndex,
                filename: urls[photoIndex],
                url: urls[photoIndex]
            });
            photoIndex += 1;
        }
    }

    return slots;
}

function clearPhotoFrames() {
    photoMeshes.forEach((mesh) => {
        scene.remove(mesh);
    });
    photoMeshes = [];
}

async function fetchStaticPhotoUrls() {
    const response = await fetch('/photos.json');
    if (!response.ok) {
        throw new Error(`Static photo list request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.photos)) {
        throw new Error('Invalid static photo list format.');
    }

    return data.photos
        .map((photo) => (typeof photo === 'string' ? photo : photo.url))
        .filter((url) => typeof url === 'string' && url.length > 0);
}

async function fetchDrivePhotoUrls() {
    const response = await fetch('/api/photos');
    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.photos)) {
        throw new Error('Invalid API response format.');
    }

    return data.photos
        .map((photo) => photo.url)
        .filter((url) => typeof url === 'string' && url.length > 0);
}

async function fetchPhotoUrls() {
    try {
        const driveUrls = await fetchDrivePhotoUrls();
        if (driveUrls.length > 0) {
            return driveUrls;
        }
    } catch (error) {
        console.warn('API photo load failed, trying static JSON fallback.', error);
    }

    try {
        const staticUrls = await fetchStaticPhotoUrls();
        if (staticUrls.length > 0) {
            return staticUrls;
        }
    } catch (error) {
        console.warn('Static JSON photo load failed, using fallback local photos.', error);
    }

    return [];
}

async function loadPhotoGallery() {
    let urls = fallbackPhotoUrls;

    const remoteUrls = await fetchPhotoUrls();
    if (remoteUrls.length > 0) {
        urls = remoteUrls;
    }

    photoSlots = createPhotoSlotsFromUrls(urls);
    clearPhotoFrames();
    
    // Inisialisasi photoGroup
    if (photoGroup) scene.remove(photoGroup);
    photoGroup = new THREE.Group();
    scene.add(photoGroup);
    
    createPhotoFrames();
}

function initScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.012);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 32);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    canvasContainer.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 12;
    controls.maxDistance = 60;
    controls.maxPolarAngle = Math.PI / 1.3;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;

    scene.add(new THREE.AmbientLight(0x404080, 0.5));

    const pointLight1 = new THREE.PointLight(0xff6b9d, 2, 50);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x4ecdc4, 2, 50);
    pointLight2.position.set(-10, 5, -10);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xf8b500, 1.5, 40);
    pointLight3.position.set(0, 15, 0);
    scene.add(pointLight3);

    particleSphereGroup = new THREE.Group();
    scene.add(particleSphereGroup);

    photoGroup = new THREE.Group();
    scene.add(photoGroup);

    createParticleSphere();
    createSaturnRing();
    create3DHeader();
    createOrbitRings();
    createStars();
    clock = new THREE.Clock();
    loadPhotoGallery();
    animate();
}

function createParticleSphere() {
    const particleCount = 4000;
    const sphereRadius = 7;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < particleCount; i++) {
        const theta = 2 * Math.PI * i / goldenRatio;
        const phi = Math.acos(1 - 2 * (i + 0.5) / particleCount);

        const x = sphereRadius * Math.sin(phi) * Math.cos(theta);
        const y = sphereRadius * Math.sin(phi) * Math.sin(theta);
        const z = sphereRadius * Math.cos(phi);

        particlePositions[i * 3] = x;
        particlePositions[i * 3 + 1] = y;
        particlePositions[i * 3 + 2] = z;

        const colorChoice = Math.random();
        if (colorChoice < 0.6) {
            particleColors[i * 3] = 1.0;
            particleColors[i * 3 + 1] = 0.2;
            particleColors[i * 3 + 2] = 0.0;
        } else {
            particleColors[i * 3] = 1.0;
            particleColors[i * 3 + 1] = 0.8;
            particleColors[i * 3 + 2] = 0.0;
        }
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });

    const particleSphere = new THREE.Points(particleGeometry, particleMaterial);
    particleSphereGroup.add(particleSphere);

    const innerGlowGeometry = new THREE.SphereGeometry(5.0, 32, 32);
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
    });
    innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    particleSphereGroup.add(innerGlow);

    const outerGlowGeometry = new THREE.SphereGeometry(9.0, 32, 32);
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
    });
    outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    particleSphereGroup.add(outerGlow);

    centerLight = new THREE.PointLight(0xffaa00, 4, 40);
    centerLight.position.set(0, 0, 0);
    particleSphereGroup.add(centerLight);
}

// --- Konfigurasi Ukuran Gambar ---
const PHOTO_WIDTH = 1.75;  // Ubah lebar di sini
const PHOTO_HEIGHT = 3.0; // Ubah tinggi di sini (Contoh: 3.2 untuk rasio 3:4)
const FRAME_PADDING = 0.2; // Jarak antara foto dan bingkai putih
// ---------------------------------

function createPhotoFrame(slotData) {
    const ringConfig = rings[slotData.ring];
    const angle = (slotData.slot / ringConfig.count) * Math.PI * 2;
    const x = Math.cos(angle) * ringConfig.radius;
    const z = Math.sin(angle) * ringConfig.radius;
    const y = ringConfig.height;

    const frameGroup = new THREE.Group();
    frameGroup.position.set(x, y, z);

    // Bingkai Putih
    const frameGeometry = new THREE.PlaneGeometry(PHOTO_WIDTH + FRAME_PADDING, PHOTO_HEIGHT + FRAME_PADDING);
    const frameMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.z = -0.02;
    frameGroup.add(frame);

    // Area Foto
    const photoGeometry = new THREE.PlaneGeometry(PHOTO_WIDTH, PHOTO_HEIGHT);
    const hue = ((slotData.ring * 120 + slotData.slot * 20) % 360) / 360;
    const placeholderMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(hue, 0.4, 0.15),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
    });
    const photoMesh = new THREE.Mesh(photoGeometry, placeholderMaterial);
    frameGroup.add(photoMesh);

    textureLoader.load(
        slotData.filename,
        (texture) => {
            console.log('Successfully loaded texture:', slotData.filename);
            texture.minFilter = THREE.LinearFilter;
            photoMesh.material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide,
                transparent: true
            });
        },
        undefined,
        (err) => {
            console.error('Error loading texture:', slotData.filename, err);
            console.warn('Placeholder used for:', slotData.filename);
        }
    );

    // Efek Glow di belakang
    const glowGeometry = new THREE.PlaneGeometry(PHOTO_WIDTH + 0.4, PHOTO_HEIGHT + 0.4);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6b9d,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.z = -0.05;
    frameGroup.add(glow);

    frameGroup.lookAt(x * 2, y, z * 2);

    frameGroup.userData = {
        originalX: x,
        originalY: y,
        originalZ: z,
        ringRadius: ringConfig.radius,
        angle,
        ringIndex: slotData.ring,
        photoIndex: slotData.slot,
        speed: 0.3 + Math.random() * 0.3,
        offset: slotData.slot * 0.5,
        filename: slotData.filename
    };

    photoMeshes.push(frameGroup);
    if (photoGroup) {
        photoGroup.add(frameGroup);
    } else {
        scene.add(frameGroup);
    }
}

function createPhotoFrames() {
    photoSlots.forEach(createPhotoFrame);
}

function createOrbitRings() {
    ringVisuals.forEach((config) => {
        createOrbitRingMesh(config);
    });
}

function createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 6000;
    const starsPosArray = new Float32Array(starsCount * 3);
    const starsColorArray = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
        starsPosArray[i] = (Math.random() - 0.5) * 250;
        starsPosArray[i + 1] = (Math.random() - 0.5) * 250;
        starsPosArray[i + 2] = (Math.random() - 0.5) * 250;

        // Warna Putih Keabuan
        const greyScale = 0.6 + Math.random() * 0.4;
        starsColorArray[i] = greyScale;
        starsColorArray[i + 1] = greyScale;
        starsColorArray[i + 2] = greyScale;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPosArray, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(starsColorArray, 3));

    const starsMaterial = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

function createMeteor() {
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
    });
    const meteor = new THREE.Mesh(geometry, material);

    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(20 * 3);
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));

    const trailMaterial = new THREE.LineBasicMaterial({
        color: 0xff6b9d,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });
    const trail = new THREE.Line(trailGeometry, trailMaterial);

    meteor.userData = {
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.5, -Math.random() * 0.5 - 0.2, (Math.random() - 0.5) * 0.5),
        trail,
        trailPositions: [],
        life: 1
    };

    meteor.position.set((Math.random() - 0.5) * 60, 30 + Math.random() * 20, (Math.random() - 0.5) * 60);

    scene.add(meteor);
    scene.add(trail);
    return meteor;
}

function updateMeteors() {
    if (meteorEnabled) {
        if (meteors.length < 50 && Math.random() < 0.1) {
            meteors.push(createMeteor());
        }

        for (let i = meteors.length - 1; i >= 0; i--) {
            const meteor = meteors[i];
            meteor.position.add(meteor.userData.velocity);
            meteor.userData.life -= 0.01;
            meteor.material.opacity = meteor.userData.life;

            meteor.userData.trailPositions.unshift(meteor.position.clone());
            if (meteor.userData.trailPositions.length > 20) {
                meteor.userData.trailPositions.pop();
            }

            const positions = meteor.userData.trail.geometry.attributes.position.array;
            meteor.userData.trailPositions.forEach((position, index) => {
                positions[index * 3] = position.x;
                positions[index * 3 + 1] = position.y;
                positions[index * 3 + 2] = position.z;
            });
            meteor.userData.trail.geometry.attributes.position.needsUpdate = true;

            if (meteor.userData.life <= 0 || meteor.position.y < -20) {
                scene.remove(meteor);
                scene.remove(meteor.userData.trail);
                meteors.splice(i, 1);
            }
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    particleSphereGroup.rotation.y = time * 0.2;
    particleSphereGroup.rotation.x = Math.sin(time * 0.1) * 0.1;

    innerGlow.scale.setScalar(1 + Math.sin(time * 2) * 0.1);
    innerGlow.material.opacity = 0.1 + Math.sin(time * 1.5) * 0.05;
    outerGlow.scale.setScalar(1 + Math.sin(time * 1.5 + 1) * 0.05);

    centerLight.intensity = 2 + Math.sin(time * 2) * 1;
    centerLight.color.setHSL(0.9 + Math.sin(time * 0.5) * 0.1, 1, 0.5);

    const rotationSpeed = time * 0.1;

    if (saturnRing) {
        saturnRing.rotation.y = rotationSpeed;
    }

    if (photoGroup) {
        photoGroup.rotation.y = rotationSpeed;
    }

    photoMeshes.forEach((photo) => {
        const data = photo.userData;
        const floatY = Math.sin(time * data.speed + data.offset) * 0.3;
        photo.position.y = data.originalY + floatY;
        
        // Foto tetap menghadap kamera
        photo.lookAt(camera.position);
    });

    updateMeteors();

    if (cameraShake > 0) {
        camera.position.x += (Math.random() - 0.5) * cameraShake;
        camera.position.y += (Math.random() - 0.5) * cameraShake;
        camera.position.z += (Math.random() - 0.5) * cameraShake;
        cameraShake *= 0.9;
        if (cameraShake < 0.01) cameraShake = 0;
    }

    controls.update();
    renderer.render(scene, camera);
}

function resizeRenderer() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function createClickEffect(event) {
    const ripple = document.createElement('div');
    ripple.className = 'click-effect';
    ripple.style.left = `${event.clientX - 50}px`;
    ripple.style.top = `${event.clientY - 50}px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    cameraShake = 0.5;

    const flash = document.createElement('div');
    flash.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.2); pointer-events: none; z-index: 999; animation: flash 0.3s ease-out forwards;`;
    const style = document.createElement('style');
    style.textContent = '@keyframes flash { from { opacity: 1; } to { opacity: 0; } }';
    document.head.appendChild(style);
    document.body.appendChild(flash);
    setTimeout(() => {
        flash.remove();
        style.remove();
    }, 300);
}

function toggleFloatingImages() {
    floatingButton.classList.toggle('active');
    floatingImagesContainer.classList.toggle('active');

    if (floatingImagesContainer.classList.contains('active')) {
        startFloatingImages();
    }
}

function startFloatingImages() {
    const colors = ['#ff6b9d', '#4ecdc4', '#f8b500', '#a8e6cf', '#ff8b94'];

    const interval = setInterval(() => {
        if (!floatingImagesContainer.classList.contains('active')) {
            clearInterval(interval);
            floatingImagesContainer.innerHTML = '';
            return;
        }

        const img = document.createElement('div');
        img.className = 'float-img';
        img.style.left = `${Math.random() * (window.innerWidth - 80)}px`;
        img.style.background = colors[Math.floor(Math.random() * colors.length)];
        img.style.animationDuration = `${5 + Math.random() * 5}s`;
        img.style.display = 'flex';
        img.style.alignItems = 'center';
        img.style.justifyContent = 'center';
        img.style.fontSize = '2rem';
        img.textContent = ['✨', '🌸', '💫', '🌟', '💖', '🎀'][Math.floor(Math.random() * 6)];

        floatingImagesContainer.appendChild(img);
        setTimeout(() => img.remove(), 10000);
    }, 800);
}

function openLetterModal() {
    letterModal.classList.add('show');
}

function closeLetterModal() {
    letterModal.classList.remove('show');
}

function toggleMeteorShower() {
    meteorButton.classList.toggle('active');
    meteorEnabled = !meteorEnabled;
}

let rotationMultiplier = 0; 

function enterGallery() {
    entryOverlay.classList.remove('show');
    canvasContainer.classList.remove('blurred');
    
    if (bgMusic) {
        bgMusic.play().catch(e => console.warn("Music play failed:", e));
    }

    if (controls) {
        controls.enabled = false;
        controls.autoRotate = false;
        
        setTimeout(() => {
            controls.enabled = true;
            controls.autoRotate = true;
            rotationMultiplier = 1;
            console.log("Gallery animation and controls started");
        }, 3000);
    }
}

function bindUI() {
    window.addEventListener('resize', resizeRenderer);
    document.addEventListener('dblclick', (event) => {
        if (entryOverlay.classList.contains('show')) {
            enterGallery();
        }
        createClickEffect(event);
    });
}

function hideLoadingScreen() {
    loadingScreen.classList.add('hide');
    entryOverlay.classList.add('show');
}

window.addEventListener('load', () => {
    initScene();
    bindUI();
    setTimeout(hideLoadingScreen, 1500);
});
