import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ============================================
   إعدادات التصميم القابلة للتوسعة
   ============================================ */
const MODEL_ID = new URLSearchParams(location.search).get('model') || 'royal';
const MODEL_LABELS = { royal: 'الملكي' };

const COLORS = [
  { hex: '#1b3358', name: 'كحلي' },
  { hex: '#1f5c4d', name: 'زمردي' },
  { hex: '#7a1f2b', name: 'عنابي' },
  { hex: '#171717', name: 'أسود' },
  { hex: '#b6892c', name: 'ذهبي' },
  { hex: '#e9e2cd', name: 'عاجي' },
];

const FONTS = [
  { id: 'tajawal', label: 'تجاوَل — عصري', family: '"Tajawal", sans-serif' },
  { id: 'aref', label: 'عارف رقعة — رسمي', family: '"Aref Ruqaa", serif' },
  { id: 'amiri', label: 'أميري — كلاسيكي', family: '"Amiri", serif' },
];

const state = {
  sashText: 'اسمك هنا',
  capText: 'دفعة ٢٠٢٦',
  color: COLORS[0].hex,
  font: FONTS[0],
};

/* ============================================
   الأساس: المشهد، الكاميرا، الإضاءة
   ============================================ */
const holder = document.getElementById('three-canvas-holder');
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(38, holder.clientWidth / holder.clientHeight, 0.1, 50);
camera.position.set(0, 0.3, 4.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(holder.clientWidth, holder.clientHeight);
holder.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0x9fb4d8, 0x14202f, 0.9);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff2d6, 1.4);
key.position.set(2.5, 3.5, 3);
scene.add(key);
const rim = new THREE.DirectionalLight(0x6f9fff, 0.5);
rim.position.set(-3, 1.5, -2);
scene.add(rim);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2.4;
controls.maxDistance = 6.5;
controls.maxPolarAngle = Math.PI * 0.62;
controls.minPolarAngle = Math.PI * 0.18;
controls.target.set(0, 0.1, 0);
controls.update();

/* ============================================
   المانيكان المطور (مطابق للشكل الكلاسيكي)
   ============================================ */
const mannequinGroup = new THREE.Group();
scene.add(mannequinGroup);

// خامات القماش والخشب
const fabricMat = new THREE.MeshStandardMaterial({ color: 0xe3d5b8, roughness: 0.9 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.5 });

// 1. القاعدة الخشبية الثلاثية
const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.1, 32), woodMat);
base.position.y = -2.2;
mannequinGroup.add(base);

// 2. العمود الخشبي
const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.4, 16), woodMat);
pole.position.y = -1.45;
mannequinGroup.add(pole);

// 3. الجذع (Torso) - تم تعديل الأبعاد ليكون أنحف عند الخصر وأعرض عند الأكتاف
const torsoGeo = new THREE.CylinderGeometry(0.45, 0.35, 1.4, 40);
const torso = new THREE.Mesh(torsoGeo, fabricMat);
torso.position.y = 0.1;
mannequinGroup.add(torso);

// 4. الرقبة (Neck)
const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.3, 20), fabricMat);
neck.position.y = 0.95;
mannequinGroup.add(neck);

// 5. الكرة الخشبية أعلى الرقبة
const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), woodMat);
knob.position.y = 1.15;
mannequinGroup.add(knob);

/* ============================================
   الوشاح — شريط منحني حول الجسم
   ============================================ */
function buildSashCurvePoints() {
  const pts = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const y = THREE.MathUtils.lerp(0.86, -0.84, t);
    const x = THREE.MathUtils.lerp(0.34, -0.3, t);
    const zBase = 0.32 + Math.sin(t * Math.PI) * 0.2;
    pts.push(new THREE.Vector3(x, y, zBase));
  }
  return pts;
}

function buildSashGeometry(width = 0.32) {
  const pts = buildSashCurvePoints();
  const curve = new THREE.CatmullRomCurve3(pts);
  const samples = curve.getPoints(60);
  const positions = [];
  const uvs = [];
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < samples.length; i++) {
    const p = samples[i];
    const next = samples[Math.min(i + 1, samples.length - 1)];
    const prev = samples[Math.max(i - 1, 0)];
    const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
    let perp = new THREE.Vector3().crossVectors(tangent, up);
    if (perp.lengthSq() < 0.0001) perp.set(1, 0, 0);
    perp.normalize().multiplyScalar(width / 2);

    const left = new THREE.Vector3().subVectors(p, perp);
    const right = new THREE.Vector3().addVectors(p, perp);
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);

    const v = i / (samples.length - 1);
    uvs.push(0, v, 1, v);
  }

  const indices = [];
  for (let i = 0; i < samples.length - 1; i++) {
    const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
    indices.push(a, b, c, b, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const sashCanvas = document.createElement('canvas');
sashCanvas.width = 256;
sashCanvas.height = 1024;
const sashCtx = sashCanvas.getContext('2d');
const sashTexture = new THREE.CanvasTexture(sashCanvas);
sashTexture.colorSpace = THREE.SRGBColorSpace;

const sashMaterial = new THREE.MeshStandardMaterial({
  map: sashTexture,
  side: THREE.DoubleSide,
  roughness: 0.55,
  metalness: 0.08,
});

const sashMesh = new THREE.Mesh(buildSashGeometry(), sashMaterial);
mannequinGroup.add(sashMesh);

function drawSashTexture() {
  const w = sashCanvas.width, h = sashCanvas.height;
  sashCtx.clearRect(0, 0, w, h);
  sashCtx.fillStyle = state.color;
  sashCtx.fillRect(0, 0, w, h);

  // خط ذهبي على الحواف
  sashCtx.strokeStyle = 'rgba(228,198,96,0.9)';
  sashCtx.lineWidth = 10;
  sashCtx.strokeRect(6, 0, w - 12, h);

  const text = (state.sashText || '').trim() || 'اسمك هنا';
  sashCtx.save();
  sashCtx.translate(w / 2, h / 2);
  sashCtx.rotate(-Math.PI / 2);
  sashCtx.fillStyle = isLight(state.color) ? '#1b1b1b' : '#f4ecd8';
  sashCtx.textAlign = 'center';
  sashCtx.textBaseline = 'middle';
  sashCtx.font = `700 64px ${state.font.family}`;

  const repeatGap = 340;
  const total = Math.ceil(h / repeatGap) + 1;
  for (let i = -1; i <= total; i++) {
    sashCtx.fillText(text, i * repeatGap - h / 2 + repeatGap / 2, 0);
  }
  sashCtx.restore();
  sashTexture.needsUpdate = true;
}

function isLight(hex) {
  const c = new THREE.Color(hex);
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return lum > 0.6;
}

/* ============================================
   القبعة (مورتاربورد)
   ============================================ */
const capGroup = new THREE.Group();
capGroup.position.set(0.02, 1.9, -0.02);
capGroup.rotation.set(-0.05, 0.25, 0.08);
mannequinGroup.add(capGroup);

const capFabricMat = new THREE.MeshStandardMaterial({ color: state.color, roughness: 0.65 });
const capSkull = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.16, 28), capFabricMat);
capSkull.position.y = -0.08;
capGroup.add(capSkull);

const capCanvas = document.createElement('canvas');
capCanvas.width = 512;
capCanvas.height = 512;
const capCtx = capCanvas.getContext('2d');
const capTexture = new THREE.CanvasTexture(capCanvas);
capTexture.colorSpace = THREE.SRGBColorSpace;

const capTopMat = new THREE.MeshStandardMaterial({ map: capTexture, roughness: 0.6 });
const capSideMat = new THREE.MeshStandardMaterial({ color: state.color, roughness: 0.65 });
const boardMaterials = [capSideMat, capSideMat, capTopMat, capSideMat, capSideMat, capSideMat];
const capBoard = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.045, 0.95), boardMaterials);
capBoard.position.y = 0.02;
capGroup.add(capBoard);

const capButton = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), new THREE.MeshStandardMaterial({ color: 0xE4C660, metalness: 0.6, roughness: 0.3 }));
capButton.position.y = 0.045;
capGroup.add(capButton);

const tasselCord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0xE4C660, metalness: 0.5, roughness: 0.3 }));
tasselCord.position.set(0.42, -0.15, 0);
tasselCord.rotation.z = 0.15;
capGroup.add(tasselCord);

const tasselEnd = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 12), new THREE.MeshStandardMaterial({ color: 0xE4C660, metalness: 0.5, roughness: 0.3 }));
tasselEnd.position.set(0.45, -0.36, 0);
tasselEnd.rotation.z = Math.PI;
capGroup.add(tasselEnd);

function drawCapTexture() {
  const w = capCanvas.width, h = capCanvas.height;
  capCtx.clearRect(0, 0, w, h);
  capCtx.fillStyle = state.color;
  capCtx.fillRect(0, 0, w, h);
  capCtx.strokeStyle = 'rgba(228,198,96,0.9)';
  capCtx.lineWidth = 14;
  capCtx.strokeRect(10, 10, w - 20, h - 20);

  const text = (state.capText || '').trim() || 'دفعة ٢٠٢٦';
  capCtx.fillStyle = isLight(state.color) ? '#1b1b1b' : '#f4ecd8';
  capCtx.textAlign = 'center';
  capCtx.textBaseline = 'middle';
  let fontSize = 72;
  capCtx.font = `700 ${fontSize}px ${state.font.family}`;
  while (capCtx.measureText(text).width > w - 80 && fontSize > 24) {
    fontSize -= 4;
    capCtx.font = `700 ${fontSize}px ${state.font.family}`;
  }
  capCtx.fillText(text, w / 2, h / 2);
  capTexture.needsUpdate = true;
}

function updateFabricColors() {
  capFabricMat.color.set(state.color);
  capSideMat.color.set(state.color);
}

/* ============================================
   حلقة الرسم + التجاوب مع الحجم
   ============================================ */
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

function onResize() {
  camera.aspect = holder.clientWidth / holder.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(holder.clientWidth, holder.clientHeight);
}
window.addEventListener('resize', onResize);

/* ============================================
   واجهة التحكم
   ============================================ */
const swatchWrap = document.getElementById('color-swatches');
COLORS.forEach((c) => {
  const btn = document.createElement('div');
  btn.className = 'swatch' + (c.hex === state.color ? ' active' : '');
  btn.style.background = c.hex;
  btn.title = c.name;
  btn.addEventListener('click', () => {
    state.color = c.hex;
    [...swatchWrap.children].forEach((el) => el.classList.remove('active'));
    btn.classList.add('active');
    drawSashTexture();
    drawCapTexture();
    updateFabricColors();
  });
  swatchWrap.appendChild(btn);
});

const fontWrap = document.getElementById('font-options');
FONTS.forEach((f) => {
  const btn = document.createElement('div');
  btn.className = 'font-option' + (f.id === state.font.id ? ' active' : '');
  btn.style.fontFamily = f.family;
  btn.textContent = f.label;
  btn.addEventListener('click', () => {
    state.font = f;
    [...fontWrap.children].forEach((el) => el.classList.remove('active'));
    btn.classList.add('active');
    drawSashTexture();
    drawCapTexture();
  });
  fontWrap.appendChild(btn);
});

document.getElementById('sash-text').addEventListener('input', (e) => {
  state.sashText = e.target.value;
  drawSashTexture();
});
document.getElementById('cap-text').addEventListener('input', (e) => {
  state.capText = e.target.value;
  drawCapTexture();
});

document.getElementById('btn-rotate-left').addEventListener('click', () => {
  mannequinGroup.rotation.y -= 0.5;
});
document.getElementById('btn-rotate-right').addEventListener('click', () => {
  mannequinGroup.rotation.y += 0.5;
});
document.getElementById('btn-reset-view').addEventListener('click', () => {
  mannequinGroup.rotation.y = 0;
  camera.position.set(0, 0.3, 4.2);
  controls.target.set(0, 0.1, 0);
});
document.getElementById('btn-zoom-in').addEventListener('click', () => {
  camera.position.z = Math.max(controls.minDistance, camera.position.z - 0.4);
});
document.getElementById('btn-zoom-out').addEventListener('click', () => {
  camera.position.z = Math.min(controls.maxDistance, camera.position.z + 0.4);
});
document.getElementById('btn-export-png').addEventListener('click', () => {
  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL('image/png');
  downloadDataUrl(dataUrl, `تصميم-${MODEL_LABELS[MODEL_ID] || MODEL_ID}.png`);
});

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function captureSnapshot() {
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL('image/png');
}

/* ============================================
   نافذة بيانات الزبون + الإرسال
   ============================================ */
const modal = document.getElementById('modal-overlay');
document.getElementById('btn-confirm').addEventListener('click', () => {
  modal.classList.add('open');
});
document.getElementById('btn-cancel-modal').addEventListener('click', () => {
  modal.classList.remove('open');
});

document.getElementById('btn-final-submit').addEventListener('click', async () => {
  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const college = document.getElementById('cust-college').value.trim();
  const statusEl = document.getElementById('status-msg');

  if (!name || !phone) {
    statusEl.textContent = 'الرجاء تعبئة الاسم ورقم الهاتف.';
    statusEl.className = 'status-msg err';
    return;
  }

  const submitBtn = document.getElementById('btn-final-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'جاري الإرسال...';

  const payload = {
    model: MODEL_ID,
    modelLabel: MODEL_LABELS[MODEL_ID] || MODEL_ID,
    sashText: state.sashText,
    capText: state.capText,
    color: state.color,
    font: state.font.label,
    customer: { name, phone, college },
    imageBase64: captureSnapshot(),
  };

  try {
    const res = await fetch('/.netlify/functions/submit-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('فشل الإرسال');

    modal.classList.remove('open');
    statusEl.textContent = 'تم إرسال طلبك بنجاح! رح نتواصل وياك قريباً.';
    statusEl.className = 'status-msg ok';
  } catch (err) {
    statusEl.textContent = 'صار خطأ بالإرسال، حاول مرة ثانية.';
    statusEl.className = 'status-msg err';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'تأكيد إرسال الطلب';
  }
});

/* ============================================
   الإطلاق الأولي
   ============================================ */
drawSashTexture();
drawCapTexture();
updateFabricColors();
document.querySelector('.swatch').classList.add('active');
document.querySelector('.font-option').classList.add('active');
