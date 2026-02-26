
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

function setShape(type) {
    currentMode = type;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        
        if (type === 'saturn') {
            if (i < PARTICLE_COUNT * 0.5) { 
                
                const phi = Math.acos(-1 + (2 * i) / (PARTICLE_COUNT * 0.5));
                const theta = Math.sqrt(PARTICLE_COUNT * 0.5 * Math.PI) * phi;
                targetArray[i3] = Math.cos(theta) * Math.sin(phi) * 1.2;
                targetArray[i3+1] = Math.sin(theta) * Math.sin(phi) * 1.2;
                targetArray[i3+2] = Math.cos(phi) * 1.2;
            } else { 
                // Outer Rings
                const angle = Math.random() * Math.PI * 2;
                const radius = 1.8 + Math.random() * 0.7;
                targetArray[i3] = Math.cos(angle) * radius;
                targetArray[i3+1] = (Math.random() - 0.5) * 0.1; 
                targetArray[i3+2] = Math.sin(angle) * radius;
            }
        } 
        
        else if (type === 'flower') {
            const t = (i / PARTICLE_COUNT) * Math.PI * 20;
            const petals = 5;
            const r = 2 * Math.cos(petals * t);
            targetArray[i3] = r * Math.cos(t);
            targetArray[i3+1] = r * Math.sin(t);
            targetArray[i3+2] = (Math.random() - 0.5) * 0.5;
        }

        else if (type === 'fireworks') {
            // Explosion from center
            const speed = 2 + Math.random() * 3;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            targetArray[i3] = speed * Math.sin(phi) * Math.cos(theta);
            targetArray[i3+1] = speed * Math.sin(phi) * Math.sin(theta);
            targetArray[i3+2] = speed * Math.cos(phi);
        }
    }
}
setShape('heart'); 


const videoElement = document.getElementById('input_video');
const statusText = document.getElementById('status');

const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7 });

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks[0]) {
        const hand = results.multiHandLandmarks[0];
        const indexTip = hand[8];
        const thumbTip = hand[4];
        const wrist = hand[0];

        points.position.x = (indexTip.x - 0.5) * -12;
        points.position.y = (indexTip.y - 0.5) * -8;
        const dist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        points.scale.setScalar(0.5 + dist * 4);

        if (indexTip.y < 0.25) {
            if (currentMode !== 'saturn') setShape('saturn');
        } 
        
        else if (indexTip.y > 0.75) {
            if (currentMode !== 'flower') setShape('flower');
        }

        else if (dist < 0.05) {
            setShape('fireworks'); 
        }
        
        
        material.color.setHSL(indexTip.x, 0.8, 0.5);
    }
});

const cameraUtils = new Camera(videoElement, {
    onFrame: async () => { await hands.send({image: videoElement}); },
    width: 640, height: 480
});
cameraUtils.start();

function animate() {
    requestAnimationFrame(animate);
    
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i++) {
        positions[i] += (targetArray[i] - positions[i]) * 0.1; 
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
