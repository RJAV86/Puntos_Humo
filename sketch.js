const NUM_POINTS = 25000;
const NUM_SMOKE = 50;
const NUM_BUTTERFLIES = 18;

// Arrays de puntos cuánticos
let normX = new Float32Array(NUM_POINTS);
let normY = new Float32Array(NUM_POINTS);
let velX = new Float32Array(NUM_POINTS);
let velY = new Float32Array(NUM_POINTS);

// Partículas de humo y mariposas
let smokeParticles = [];
let butterflies = [];
let showButterflies = true;

let ui = {
  smokeColor: null,
  smokeBlur: null,
  pointColor: null,
  bgColor: null,
  trail: null,
  angle: null,
  gravity: null,
  friction: null,
  spin: null,
  turbulence: null,
  toggleButterfliesBtn: null
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  createUI();

  // Inicializar puntos cuánticos
  for (let i = 0; i < NUM_POINTS; i++) {
    normX[i] = random(0.0, 1.0);
    normY[i] = random(0.0, 1.0);
    velX[i] = random(-0.001, 0.001);
    velY[i] = random(-0.001, 0.001);
  }

  // Inicializar humo
  for (let i = 0; i < NUM_SMOKE; i++) {
    smokeParticles.push(new SmokeParticle(random(width), random(height)));
  }

  // Inicializar mariposas
  for (let i = 0; i < NUM_BUTTERFLIES; i++) {
    butterflies.push(new Butterfly(random(width), random(height)));
  }
}

function draw() {
  let w = width;
  let h = height;

  // 1. Fondo con persistencia/estela
  let bgCol = color(ui.bgColor.value());
  let trailAlpha = ui.trail.value();
  background(red(bgCol), green(bgCol), blue(bgCol), trailAlpha);

  // Parámetros de física
  let frictionVal = ui.friction.value();
  let gravVal = ui.gravity.value() * 0.0005;
  let angleRad = radians(ui.angle.value());
  let dirForceX = cos(angleRad) * 0.00015;
  let dirForceY = sin(angleRad) * 0.00015;
  let spinVal = ui.spin.value() * 0.008;
  let turbVal = ui.turbulence.value() * 0.0008;

  // 2. CAPA: HUMO
  let sCol = color(ui.smokeColor.value());
  let blurMultiplier = ui.smokeBlur.value();
  noStroke();
  blendMode(ADD);

  for (let sp of smokeParticles) {
    sp.update(dirForceX * 400, dirForceY * 400 + gravVal * 400, turbVal * 1200, spinVal * 10, frictionVal);
    sp.display(sCol, blurMultiplier);
  }

  blendMode(BLEND);

  // 3. CAPA: PUNTOS CUÁNTICOS (Búfer de píxeles)
  let pCol = color(ui.pointColor.value());
  let pr = red(pCol);
  let pg = green(pCol);
  let pb = blue(pCol);
  let t = frameCount * 0.006;

  loadPixels();

  for (let i = 0; i < NUM_POINTS; i++) {
    let n = noise(normX[i] * 3.5, normY[i] * 3.5, t);
    let nAngle = n * TWO_PI * 3;
    velX[i] += cos(nAngle) * turbVal;
    velY[i] += sin(nAngle) * turbVal;

    velX[i] += dirForceX;
    velY[i] += dirForceY + gravVal;

    if (spinVal !== 0) {
      let dx = normX[i] - 0.5;
      let dy = normY[i] - 0.5;
      velX[i] += -dy * spinVal;
      velY[i] += dx * spinVal;
    }

    velX[i] *= frictionVal;
    velY[i] *= frictionVal;
    normX[i] += velX[i];
    normY[i] += velY[i];

    if (normX[i] < 0.0) normX[i] = 1.0;
    else if (normX[i] > 1.0) normX[i] = 0.0;
    if (normY[i] < 0.0) normY[i] = 1.0;
    else if (normY[i] > 1.0) normY[i] = 0.0;

    let px = (normX[i] * w) | 0;
    let py = (normY[i] * h) | 0;

    if (px >= 0 && px < w && py >= 0 && py < h) {
      let idx = (px + py * w) * 4;
      pixels[idx] = pr;
      pixels[idx + 1] = pg;
      pixels[idx + 2] = pb;
      pixels[idx + 3] = 255;
    }
  }

  updatePixels();

  // 4. CAPA: MARIPOSAS (Si están activadas)
  if (showButterflies) {
    for (let b of butterflies) {
      b.update();
      b.display();
    }
  }
}

// Clase para el humo
class SmokeParticle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(0.5);
    this.baseRadius = random(100, 220);
    this.noiseOffset = random(1000);
  }

  update(fx, fy, turb, spin, fric) {
    this.vel.x += fx;
    this.vel.y += fy;

    let n = noise(this.pos.x * 0.002, this.pos.y * 0.002, frameCount * 0.005 + this.noiseOffset);
    let angle = n * TWO_PI * 2;
    this.vel.x += cos(angle) * turb;
    this.vel.y += sin(angle) * turb;

    if (spin !== 0) {
      let dx = this.pos.x - width * 0.5;
      let dy = this.pos.y - height * 0.5;
      this.vel.x += -dy * spin * 0.001;
      this.vel.y += dx * spin * 0.001;
    }

    this.vel.mult(fric);
    this.pos.add(this.vel);

    if (this.pos.x < -150) this.pos.x = width + 150;
    else if (this.pos.x > width + 150) this.pos.x = -150;
    if (this.pos.y < -150) this.pos.y = height + 150;
    else if (this.pos.y > height + 150) this.pos.y = -150;
  }

  display(col, blurMult) {
    let currentRadius = this.baseRadius * blurMult;
    let steps = 6;
    let stepSize = currentRadius / steps;
    let baseAlpha = 14 / (blurMult * 0.8);

    for (let r = currentRadius; r > stepSize; r -= stepSize) {
      let t = 1.0 - (r / currentRadius);
      let ringAlpha = baseAlpha * Math.pow(t, 1.6);
      fill(red(col), green(col), blue(col), ringAlpha);
      circle(this.pos.x, this.pos.y, r * 2);
    }
  }
}

// Clase para las Mariposas
class Butterfly {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(1.2, 2.5));
    this.size = random(8, 14);
    this.noiseOffset = random(1000);
    this.wingPhase = random(TWO_PI);
    this.wingSpeed = random(0.2, 0.35);
    this.color = color(random(150, 255), random(100, 240), random(220, 255));
  }

  update() {
    // Vuelo orgánico con ruido Perlin
    let n = noise(this.pos.x * 0.004, this.pos.y * 0.004, frameCount * 0.01 + this.noiseOffset);
    let heading = n * TWO_PI * 2;
    let force = p5.Vector.fromAngle(heading).mult(0.2);
    this.vel.add(force);
    this.vel.limit(2.8);
    this.pos.add(this.vel);

    // Ciclo de alas
    this.wingPhase += this.wingSpeed;

    // Reciclaje en toda la pantalla
    if (this.pos.x < -30) this.pos.x = width + 30;
    else if (this.pos.x > width + 30) this.pos.x = -30;
    if (this.pos.y < -30) this.pos.y = height + 30;
    else if (this.pos.y > height + 30) this.pos.y = -30;
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading() + HALF_PI);

    // Amplitud de aleteo mediante seno
    let flap = abs(sin(this.wingPhase));
    let wingWidth = this.size * flap;

    noStroke();
    fill(red(this.color), green(this.color), blue(this.color), 220);

    // Ala izquierda (superior e inferior)
    ellipse(-wingWidth * 0.6, -this.size * 0.3, wingWidth * 1.2, this.size * 1.5);
    ellipse(-wingWidth * 0.5, this.size * 0.4, wingWidth * 0.9, this.size * 1.1);

    // Ala derecha (superior e inferior)
    ellipse(wingWidth * 0.6, -this.size * 0.3, wingWidth * 1.2, this.size * 1.5);
    ellipse(wingWidth * 0.5, this.size * 0.4, wingWidth * 0.9, this.size * 1.1);

    // Cuerpo
    fill(255, 255, 255, 230);
    ellipse(0, 0, 2.5, this.size * 1.4);

    pop();
  }
}

function createUI() {
  let panel = createDiv();
  panel.position(15, 15);
  panel.style('position', 'fixed');
  panel.style('width', '215px');
  panel.style('padding', '12px');
  panel.style('background', 'rgba(6, 10, 16, 0.88)');
  panel.style('backdrop-filter', 'blur(6px)');
  panel.style('color', '#fff');
  panel.style('font-family', 'sans-serif');
  panel.style('font-size', '11px');
  panel.style('border-radius', '8px');
  panel.style('border', '1px solid rgba(0, 255, 180, 0.45)');
  panel.style('z-index', '9999');

  // --- ELEMENTOS ACTIVOS ---
  createLabel(panel, '<b>— ELEMENTOS ACTIVOS —</b>');
  ui.toggleButterfliesBtn = createButton('Mariposas: ACTIVADAS').parent(panel);
  ui.toggleButterfliesBtn.style('width', '100%');
  ui.toggleButterfliesBtn.style('padding', '6px');
  ui.toggleButterfliesBtn.style('background', '#00ffbb');
  ui.toggleButterfliesBtn.style('color', '#040810');
  ui.toggleButterfliesBtn.style('border', 'none');
  ui.toggleButterfliesBtn.style('border-radius', '4px');
  ui.toggleButterfliesBtn.style('font-weight', 'bold');
  ui.toggleButterfliesBtn.style('cursor', 'pointer');
  ui.toggleButterfliesBtn.style('margin-top', '4px');

  // Evento de clic para alternar mariposas
  ui.toggleButterfliesBtn.mousePressed(() => {
    showButterflies = !showButterflies;
    if (showButterflies) {
      ui.toggleButterfliesBtn.html('Mariposas: ACTIVADAS');
      ui.toggleButterfliesBtn.style('background', '#00ffbb');
      ui.toggleButterfliesBtn.style('color', '#040810');
    } else {
      ui.toggleButterfliesBtn.html('Mariposas: DESACTIVADAS');
      ui.toggleButterfliesBtn.style('background', '#334155');
      ui.toggleButterfliesBtn.style('color', '#94a3b8');
    }
  });

  // --- ASPECTO Y ESTILO ---
  createLabel(panel, '<br><b>— ASPECTO Y ESTILO —</b>');

  createLabel(panel, 'Color del Humo:');
  ui.smokeColor = createColorPicker('#341f5e').parent(panel);

  createLabel(panel, 'Difuminación del Humo:');
  ui.smokeBlur = createSlider(0.5, 3.5, 1.8, 0.1).parent(panel);

  createLabel(panel, 'Color de Puntos:');
  ui.pointColor = createColorPicker('#00ffbb').parent(panel);

  createLabel(panel, 'Color de Fondo:');
  ui.bgColor = createColorPicker('#020408').parent(panel);

  createLabel(panel, 'Estela / Persistencia:');
  ui.trail = createSlider(20, 255, 130, 5).parent(panel);

  // --- COMPORTAMIENTO Y FÍSICA ---
  createLabel(panel, '<br><b>— COMPORTAMIENTO Y FÍSICA —</b>');

  createLabel(panel, 'Dirección / Ángulo:');
  ui.angle = createSlider(0, 360, 45, 5).parent(panel);

  createLabel(panel, 'Gravedad / Elevación:');
  ui.gravity = createSlider(-0.3, 0.3, -0.05, 0.01).parent(panel);

  createLabel(panel, 'Fricción:');
  ui.friction = createSlider(0.90, 1.0, 0.965, 0.005).parent(panel);

  createLabel(panel, 'Rotación / Vórtice:');
  ui.spin = createSlider(-0.3, 0.3, 0.04, 0.005).parent(panel);

  createLabel(panel, 'Turbulencia / Ruido:');
  ui.turbulence = createSlider(0, 2.0, 0.55, 0.05).parent(panel);
}

function createLabel(parent, text) {
  let label = createDiv(text);
  label.parent(parent);
  label.style('margin-top', '5px');
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}