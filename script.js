// --- 1. Setup Three.js Scene ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const PARTICLE_COUNT = 8000;
const posArray = new Float32Array(PARTICLE_COUNT * 3);
const targetArray = new Float32Array(PARTICLE_COUNT * 3);

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

const material = new THREE.PointsMaterial({
    size: 0.035,
    color: 0x00ffff,
    transparent: true,
    blending: THREE.AdditiveBlending
});

const points = new THREE.Points(geometry, material);
scene.add(points);
camera.position.z = 5;

// --- 2. Shape Generators ---
function setShape(type) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        if (type === 'heart') {
            const t = (i / PARTICLE_COUNT) * Math.PI * 2;
            targetArray[i3] = 0.15 * (16 * Math.pow(Math.sin(t), 3));
            targetArray[i3+1] = 0.15 * (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
            targetArray[i3+2] = (Math.random() - 0.5) * 0.2;
        } else if (type === 'saturn') {
            if (i < PARTICLE_COUNT * 0.6) { // Sphere core
                const phi = Math.acos(-1 + (2 * i) / (PARTICLE_COUNT * 0.6));
                const theta = Math.sqrt(PARTICLE_COUNT * 0.6 * Math.PI) * phi;
                targetArray[i3] = Math.cos(theta) * Math.sin(phi) * 1.5;
                targetArray[i3+1] = Math.sin(theta) * Math.sin(phi) * 1.5;
                targetArray[i3+2] = Math.cos(phi) * 1.5;
            } else { // Rings
                const angle = Math.random() * Math.PI * 2;
                const radius = 2.2 + Math.random() * 0.8;
                targetArray[i3] = Math.cos(angle) * radius;
                targetArray[i3+1] = Math.sin(angle) * 0.2; // Tilt
                targetArray[i3+2] = Math.sin(angle) * radius;
            }
        }
    }
}

setShape('heart'); // Default

// --- 3. Hand Tracking (MediaPipe) ---
const videoElement = document.getElementById('input_video');
const statusText = document.getElementById('status');

const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7 });

hands.onResults((results) => {
    statusText.innerText = results.multiHandLandmarks.length > 0 ? "Hand Detected" : "Searching for hand...";
    
    if (results.multiHandLandmarks && results.multiHandLandmarks[0]) {
        const hand = results.multiHandLandmarks[0];
        const indexTip = hand[8];
        const thumbTip = hand[4];

        // Move system with index finger
        points.position.x = (indexTip.x - 0.5) * -12;
        points.position.y = (indexTip.y - 0.5) * -8;

        // Dynamic Scale based on pinch distance
        const dist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        points.scale.setScalar(0.5 + dist * 4);

        // Switch shape based on height
        if (indexTip.y < 0.3) setShape('saturn');
        else if (indexTip.y > 0.7) setShape('heart');
        
        // Color shift based on X position
        material.color.setHSL(indexTip.x, 1.0, 0.5);
    }
});

const cameraUtils = new Camera(videoElement, {
    onFrame: async () => { await hands.send({image: videoElement}); },
    width: 640, height: 480
});
cameraUtils.start();

// --- 4. Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i++) {
        positions[i] += (targetArray[i] - positions[i]) * 0.1; // Smooth transition
    }
    geometry.attributes.position.needsUpdate = true;
    
    points.rotation.y += 0.005;
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
