const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let isRunning = false;
let simTime = 0;
let lastTime = 0;
let vehicles = [];
let passedVehicles = 0;
let vehicleIdCounter = 0;
let smartMode = true;

// Yol ve kavşak sabitleri
const ROAD_WIDTH = 80;
const LANE_WIDTH = 40;
const CENTER_X = 450;
const CENTER_Y = 350;

// Kavşak bölgesi tanımı
const INTERSECTION = {
  left: CENTER_X - ROAD_WIDTH,
  right: CENTER_X + ROAD_WIDTH,
  top: CENTER_Y - ROAD_WIDTH,
  bottom: CENTER_Y + ROAD_WIDTH
};

// --- YAPAY ZEKA (AI) AYARLARI ---
const AI_BRAIN = {
  qTable: {},
  learningRate: 0.1,
  discountFactor: 0.9,
  epsilon: 0.1,
  
  getState: function(nsWait, ewWait, currentGreen) {
    const level = (n) => n === 0 ? '0' : (n < 3 ? 'L' : (n < 6 ? 'M' : 'H'));
    return `${level(nsWait)}${level(ewWait)}${currentGreen}`;
  },

  getAction: function(state) {
    if (Math.random() < this.epsilon) return Math.floor(Math.random() * 2);
    const q0 = this.qTable[state + '_0'] || 0;
    const q1 = this.qTable[state + '_1'] || 0;
    return q0 >= q1 ? 0 : 1;
  },

  learn: function(oldState, action, reward, newState) {
    const oldQ = this.qTable[oldState + '_' + action] || 0;
    const maxNextQ = Math.max(
      this.qTable[newState + '_0'] || 0,
      this.qTable[newState + '_1'] || 0
    );
    const newQ = oldQ + this.learningRate * (reward + this.discountFactor * maxNextQ - oldQ);
    this.qTable[oldState + '_' + action] = newQ;
  }
};

const SMART_LIGHT = {
  currentGreen: 'NS',
  timeInCurrentState: 0,
  minGreenTime: 5,
  yellowTime: 3,
  isYellow: false,
  yellowStartTime: 0,
  lastAction: 0,
  lastState: null
};

// Klasik döngü
const CLASSIC_CYCLE = {
  NS_GREEN: 25, NS_YELLOW: 3, EW_GREEN: 25, EW_YELLOW: 3
};
const CYCLE_TOTAL = CLASSIC_CYCLE.NS_GREEN + CLASSIC_CYCLE.NS_YELLOW + 
                    CLASSIC_CYCLE.EW_GREEN + CLASSIC_CYCLE.EW_YELLOW;

// --- CSV YÜKLEME VE İŞLEME ---
let spawnQueue = [];

async function loadTrafficData() {
  try {
    const response = await fetch('traffic_data.csv');
    if (!response.ok) {
        throw new Error(`HTTP hatası! Durum: ${response.status}`);
    }
    const csvText = await response.text();
    processCSV(csvText);
    console.log("CSV başarıyla yüklendi. Planlanan araç grubu sayısı:", spawnQueue.length);
  } catch (error) {
    console.error("CSV yüklenirken hata oluştu:", error);
    alert("CSV dosyası yüklenemedi! Projeyi 'Live Server' veya localhost üzerinde çalıştırdığınızdan emin olun.");
  }
}

function parseTime(timeStr) {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
}

function mapDirection(csvDir) {
    // Veri setimiz artık temiz ("North", "South"...) olduğu için doğrudan eşleştiriyoruz
    const d = csvDir.trim().toLowerCase();
    
    if (d === 'north') return 'N';
    if (d === 'south') return 'S';
    if (d === 'east') return 'E';
    if (d === 'west') return 'W';

    return 'N'; // Hata durumunda varsayılan
}

function processCSV(csvRawData) {
    spawnQueue = [];
    const rows = csvRawData.trim().split('\n');
    
    // Header kontrolü
    if (rows.length < 2) return;

    // Referans zaman
    const firstRowData = rows[1].split(',');
    if (firstRowData.length < 2) return; 
    
    const firstRowTime = parseTime(firstRowData[1]);

    for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(',');
        
        // En az 4 sütun (Date, Time, Direction, Number)
        if (cols.length < 4) continue; 

        const timeStr = cols[1];
        const dirStr = cols[2];
        const count = parseInt(cols[3]);
        const type = 'Normal'; 

        const absoluteTime = parseTime(timeStr);
        const spawnTime = absoluteTime - firstRowTime;
        const direction = mapDirection(dirStr);

        for (let n = 0; n < count; n++) {
            spawnQueue.push({
                direction: direction,
                spawnTime: spawnTime + (n * 0.8), 
                type: type
            });
        }
    }
}

function analyzeTrafficDensity() {
  let nsWaiting = 0;
  let ewWaiting = 0;
  vehicles.forEach(v => {
    if (!v.hasEnteredIntersection && !v.checkPassedIntersection() && v.speed < 20) {
      if (v.direction === 'N' || v.direction === 'S') nsWaiting++;
      else ewWaiting++;
    }
  });
  return { nsWaiting, ewWaiting };
}

// --- IŞIK KONTROLÜ ---
function updateSmartLights(dt) {
  const density = analyzeTrafficDensity();
  
  if (SMART_LIGHT.isYellow) {
    SMART_LIGHT.yellowStartTime += dt;
    if (SMART_LIGHT.yellowStartTime >= SMART_LIGHT.yellowTime) {
      SMART_LIGHT.isYellow = false;
      SMART_LIGHT.yellowStartTime = 0;
      SMART_LIGHT.currentGreen = SMART_LIGHT.currentGreen === 'NS' ? 'EW' : 'NS';
      SMART_LIGHT.timeInCurrentState = 0;
    }
  } else {
    SMART_LIGHT.timeInCurrentState += dt;
    if (SMART_LIGHT.timeInCurrentState >= SMART_LIGHT.minGreenTime) {
      const currentState = AI_BRAIN.getState(density.nsWaiting, density.ewWaiting, SMART_LIGHT.currentGreen);
      
      if (SMART_LIGHT.lastState) {
        const totalWaiting = density.nsWaiting + density.ewWaiting;
        const reward = -totalWaiting; 
        AI_BRAIN.learn(SMART_LIGHT.lastState, SMART_LIGHT.lastAction, reward, currentState);
      }

      const action = AI_BRAIN.getAction(currentState);
      SMART_LIGHT.lastState = currentState;
      SMART_LIGHT.lastAction = action;

      if (action === 1) {
        SMART_LIGHT.isYellow = true;
        SMART_LIGHT.yellowStartTime = 0;
      }
    }
  }
  
  if (SMART_LIGHT.isYellow) {
    return {
      NS: SMART_LIGHT.currentGreen === 'NS' ? 'yellow' : 'red',
      EW: SMART_LIGHT.currentGreen === 'EW' ? 'yellow' : 'red'
    };
  } else {
    return {
      NS: SMART_LIGHT.currentGreen === 'NS' ? 'green' : 'red',
      EW: SMART_LIGHT.currentGreen === 'EW' ? 'green' : 'red'
    };
  }
}

function getClassicLightState(time) {
  const cyclePos = time % CYCLE_TOTAL;
  if (cyclePos < CLASSIC_CYCLE.NS_GREEN) return { NS: 'green', EW: 'red' };
  else if (cyclePos < CLASSIC_CYCLE.NS_GREEN + CLASSIC_CYCLE.NS_YELLOW) return { NS: 'yellow', EW: 'red' };
  else if (cyclePos < CLASSIC_CYCLE.NS_GREEN + CLASSIC_CYCLE.NS_YELLOW + CLASSIC_CYCLE.EW_GREEN) return { NS: 'red', EW: 'green' };
  else return { NS: 'red', EW: 'yellow' };
}

// --- ARAÇ SINIFI ---
class Vehicle {
  constructor(direction, type) {
    this.id = vehicleIdCounter++;
    this.direction = direction;
    this.type = type || 'Normal';
    
    let baseWidth = 28;
    let baseLength = 45;
    
    this.width = (direction === 'N' || direction === 'S') ? baseWidth : baseLength;
    this.height = (direction === 'N' || direction === 'S') ? baseLength : baseWidth;
    
    this.speed = 120;
    this.maxSpeed = 120;
    this.color = this.getRandomColor();
    this.state = 'moving';
    this.inIntersection = false;
    this.hasEnteredIntersection = false;
    
    this.setInitialPosition();
  }
  
  getRandomColor() {
      const colors = ['#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#06b6d4', '#84cc16', '#f59e0b', '#ec4899'];
      return colors[Math.floor(Math.random() * colors.length)];
  }
  
  setInitialPosition() {
    const stopMargin = 3; 
    switch(this.direction) {
      case 'N':
        this.x = CENTER_X - LANE_WIDTH - this.width / 2;
        this.y = -150; 
        this.stopLine = CENTER_Y - ROAD_WIDTH - stopMargin;
        break;
      case 'S':
        this.x = CENTER_X + LANE_WIDTH - this.width / 2;
        this.y = canvas.height + 150;
        this.stopLine = CENTER_Y + ROAD_WIDTH + this.height + stopMargin;
        break;
      case 'E':
        this.x = canvas.width + 150;
        this.y = CENTER_Y - LANE_WIDTH - this.height / 2;
        this.stopLine = CENTER_X + ROAD_WIDTH + this.width + stopMargin;
        break;
      case 'W':
        this.x = -150;
        this.y = CENTER_Y + LANE_WIDTH - this.height / 2;
        this.stopLine = CENTER_X - ROAD_WIDTH - stopMargin;
        break;
    }
  }
  
  isIntersectionBlockedByCrossTraffic(others) {
    const myAxis = (this.direction === 'N' || this.direction === 'S') ? 'NS' : 'EW';
    return others.some(v => {
      if (v.id === this.id) return false;
      const otherAxis = (v.direction === 'N' || v.direction === 'S') ? 'NS' : 'EW';
      if (myAxis === otherAxis) return false;
      return v.inIntersection;
    });
  }
  
  checkInIntersection() {
    switch(this.direction) {
      case 'N': return this.y + this.height >= INTERSECTION.top && this.y <= INTERSECTION.bottom;
      case 'S': return this.y <= INTERSECTION.bottom && this.y + this.height >= INTERSECTION.top;
      case 'E': return this.x <= INTERSECTION.right && this.x + this.width >= INTERSECTION.left;
      case 'W': return this.x + this.width >= INTERSECTION.left && this.x <= INTERSECTION.right;
    }
    return false;
  }
  
  update(dt, lights, otherVehicles) {
    const isNS = this.direction === 'N' || this.direction === 'S';
    const myLight = isNS ? lights.NS : lights.EW;
    
    this.inIntersection = this.checkInIntersection();
    if (this.inIntersection && !this.hasEnteredIntersection) {
      this.hasEnteredIntersection = true;
    }
    
    const vehicleAheadInfo = this.getVehicleAhead(otherVehicles);
    const vehicleAhead = vehicleAheadInfo ? vehicleAheadInfo.vehicle : null;
    const distanceToAhead = vehicleAheadInfo ? vehicleAheadInfo.distance : Infinity;
    
    const SAFE_FOLLOW_DISTANCE = 12;
    const BRAKING_DISTANCE = 60;
    const YELLOW_LIGHT_DISTANCE = 60;

    let targetSpeed = this.maxSpeed;

    if (vehicleAhead) {
      if (distanceToAhead <= SAFE_FOLLOW_DISTANCE) {
        targetSpeed = 0;
        this.state = 'stopped';
      } else if (distanceToAhead < BRAKING_DISTANCE) {
        const factor = (distanceToAhead - SAFE_FOLLOW_DISTANCE) / (BRAKING_DISTANCE - SAFE_FOLLOW_DISTANCE);
        targetSpeed = Math.min(this.maxSpeed * factor, vehicleAhead.speed > 10 ? vehicleAhead.speed : this.maxSpeed); 
        this.state = 'following';
      }
    }

    if (!this.hasEnteredIntersection) {
        const distToStop = this.getDistanceToStopLine();
        if (distToStop < 20) {
            if (this.isIntersectionBlockedByCrossTraffic(otherVehicles)) {
                targetSpeed = 0;
                this.state = 'waiting_clearance';
            }
        }
    }

    if (!this.hasEnteredIntersection && !this.checkPassedIntersection()) {
      const distToStop = this.getDistanceToStopLine();
      if (targetSpeed > 0 || this.state !== 'waiting_clearance') { 
        if (myLight === 'red') {
          if (distToStop <= 5 && distToStop >= -10) {
            targetSpeed = 0;
            this.state = 'stopped';
          } else if (distToStop < BRAKING_DISTANCE && distToStop > 0) {
            targetSpeed = Math.min(targetSpeed, this.maxSpeed * (distToStop / BRAKING_DISTANCE));
            this.state = 'stopping';
          }
        } else if (myLight === 'yellow') {
          if (distToStop > YELLOW_LIGHT_DISTANCE) {
             targetSpeed = Math.min(targetSpeed, this.maxSpeed * (distToStop / (BRAKING_DISTANCE + 20)));
             if (distToStop < 20) targetSpeed = 0;
             this.state = 'stopping';
          } else {
             targetSpeed = this.maxSpeed; 
          }
        }
      }
    } else {
        if (!vehicleAhead || distanceToAhead > SAFE_FOLLOW_DISTANCE + 20) {
             targetSpeed = this.maxSpeed; 
        }
    }

    if (this.speed < targetSpeed) {
      this.speed += 250 * dt;
      if (this.speed > targetSpeed) this.speed = targetSpeed;
    } else if (this.speed > targetSpeed) {
      this.speed -= 350 * dt;
      if (this.speed < targetSpeed) this.speed = targetSpeed;
    }

    this.move(dt);
    
    if (this.checkOffScreen()) {
      this.state = 'passed';
    }
  }
  
  move(dt) {
    const distance = this.speed * dt;
    switch(this.direction) {
      case 'N': this.y += distance; break;
      case 'S': this.y -= distance; break;
      case 'E': this.x -= distance; break;
      case 'W': this.x += distance; break;
    }
  }
  
  getDistanceToStopLine() {
    switch(this.direction) {
      case 'N': return this.stopLine - (this.y + this.height);
      case 'S': return this.y - this.stopLine;
      case 'E': return this.x - this.stopLine;
      case 'W': return this.stopLine - (this.x + this.width);
    }
    return Infinity;
  }
  
  getVehicleAhead(otherVehicles) {
    let closestVehicle = null;
    let minDistance = Infinity;
    
    for (const other of otherVehicles) {
      if (other.id === this.id || other.direction !== this.direction) continue;
      
      let distance = Infinity;
      let isAhead = false;
      
      switch(this.direction) {
        case 'N':
          isAhead = other.y > this.y;
          distance = other.y - (this.y + this.height);
          break;
        case 'S':
          isAhead = other.y < this.y;
          distance = this.y - (other.y + other.height);
          break;
        case 'E':
          isAhead = other.x < this.x;
          distance = this.x - (other.x + other.width);
          break;
        case 'W':
          isAhead = other.x > this.x;
          distance = other.x - (this.x + this.width);
          break;
      }
      
      if (isAhead && distance >= -5 && distance < minDistance) {
        minDistance = distance;
        closestVehicle = other;
      }
    }
    return closestVehicle ? { vehicle: closestVehicle, distance: minDistance } : null;
  }
  
  checkPassedIntersection() {
    switch(this.direction) {
      case 'N': return this.y > INTERSECTION.bottom + 10;
      case 'S': return this.y + this.height < INTERSECTION.top - 10;
      case 'E': return this.x + this.width < INTERSECTION.left - 10;
      case 'W': return this.x > INTERSECTION.right + 10;
    }
  }
  
  checkOffScreen() {
    const passedIntersection = this.checkPassedIntersection();
    if (!passedIntersection) return false;
    return this.x < -150 || this.x > canvas.width + 150 || 
           this.y < -150 || this.y > canvas.height + 150;
  }
  
  draw() {
    ctx.save();
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    const padding = 5;
    ctx.fillRect(
      this.x + padding, 
      this.y + padding, 
      this.width - padding * 2, 
      this.height - padding * 2
    );
    
    const isBraking = this.speed < 20; 
    
    if (this.direction === 'N' || this.direction === 'S') {
        const tailY = this.direction === 'N' ? this.y : this.y + this.height - 5;
        const headY = this.direction === 'N' ? this.y + this.height - 5 : this.y;
        
        ctx.fillStyle = isBraking ? '#ff0000' : '#550000';
        ctx.fillRect(this.x + 5, tailY, 6, 5);
        ctx.fillRect(this.x + this.width - 11, tailY, 6, 5);
        
        ctx.fillStyle = '#ffffaa';
        ctx.fillRect(this.x + 5, headY, 6, 5);
        ctx.fillRect(this.x + this.width - 11, headY, 6, 5);
        
    } else {
        const tailX = this.direction === 'W' ? this.x : this.x + this.width - 5;
        const headX = this.direction === 'W' ? this.x + this.width - 5 : this.x;

        ctx.fillStyle = isBraking ? '#ff0000' : '#550000';
        ctx.fillRect(tailX, this.y + 5, 5, 6);
        ctx.fillRect(tailX, this.y + this.height - 11, 5, 6);
        
        ctx.fillStyle = '#ffffaa';
        ctx.fillRect(headX, this.y + 5, 5, 6);
        ctx.fillRect(headX, this.y + this.height - 11, 5, 6);
    }
    
    ctx.restore();
  }
}

// --- ÇİZİM FONKSİYONLARI ---
function drawRoads() {
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#374151';
  ctx.fillRect(CENTER_X - ROAD_WIDTH, 0, ROAD_WIDTH * 2, canvas.height);
  ctx.fillRect(0, CENTER_Y - ROAD_WIDTH, canvas.width, ROAD_WIDTH * 2);
  
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(INTERSECTION.left, INTERSECTION.top, ROAD_WIDTH * 2, ROAD_WIDTH * 2);
  
  drawLaneMarkings();
  drawStopLines();
}

function drawLaneMarkings() {
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  ctx.setLineDash([20, 15]);
  
  ctx.beginPath(); ctx.moveTo(CENTER_X, 0); ctx.lineTo(CENTER_X, INTERSECTION.top); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(CENTER_X, INTERSECTION.bottom); ctx.lineTo(CENTER_X, canvas.height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, CENTER_Y); ctx.lineTo(INTERSECTION.left, CENTER_Y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(INTERSECTION.right, CENTER_Y); ctx.lineTo(canvas.width, CENTER_Y); ctx.stroke();
  
  ctx.strokeStyle = '#f3f4f6';
  ctx.lineWidth = 4;
  ctx.setLineDash([]);
  
  ctx.beginPath(); ctx.moveTo(CENTER_X - ROAD_WIDTH, 0); ctx.lineTo(CENTER_X - ROAD_WIDTH, canvas.height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(CENTER_X + ROAD_WIDTH, 0); ctx.lineTo(CENTER_X + ROAD_WIDTH, canvas.height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, CENTER_Y - ROAD_WIDTH); ctx.lineTo(canvas.width, CENTER_Y - ROAD_WIDTH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, CENTER_Y + ROAD_WIDTH); ctx.lineTo(canvas.width, CENTER_Y + ROAD_WIDTH); ctx.stroke();
}

function drawStopLines() {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.setLineDash([]);
  
  ctx.beginPath(); ctx.moveTo(INTERSECTION.left, INTERSECTION.top); ctx.lineTo(CENTER_X, INTERSECTION.top); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(CENTER_X, INTERSECTION.bottom); ctx.lineTo(INTERSECTION.right, INTERSECTION.bottom); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(INTERSECTION.right, INTERSECTION.top); ctx.lineTo(INTERSECTION.right, CENTER_Y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(INTERSECTION.left, CENTER_Y); ctx.lineTo(INTERSECTION.left, INTERSECTION.bottom); ctx.stroke();
}

function drawTrafficLights(lights) {
  drawLight(CENTER_X - ROAD_WIDTH - 35, CENTER_Y - ROAD_WIDTH - 90, lights.NS);
  drawLight(CENTER_X + ROAD_WIDTH + 35, CENTER_Y + ROAD_WIDTH + 90, lights.NS);
  drawLight(CENTER_X + ROAD_WIDTH + 90, CENTER_Y - ROAD_WIDTH - 35, lights.EW);
  drawLight(CENTER_X - ROAD_WIDTH - 90, CENTER_Y + ROAD_WIDTH + 35, lights.EW);
}

function drawLight(x, y, state) {
  const lightSize = 16;
  const spacing = 28;
  
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(x - 14, y - 14, 28, 90);
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 14, y - 14, 28, 90);
  
  const drawBulb = (offset, color, activeColor) => {
    ctx.fillStyle = state === color ? activeColor : '#3f3f46';
    ctx.beginPath();
    ctx.arc(x, y + offset, lightSize / 2, 0, Math.PI * 2);
    ctx.fill();
    if (state === color) {
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  };

  drawBulb(0, 'red', '#ef4444');
  drawBulb(spacing, 'yellow', '#fbbf24');
  drawBulb(spacing * 2, 'green', '#22c55e');
}

// --- ANA DÖNGÜ ---
function spawnVehicles(dt) {
  spawnQueue = spawnQueue.filter(item => {
    if (simTime >= item.spawnTime) {
      const isBlocked = vehicles.some(v => {
          if (v.direction !== item.direction) return false;
          let blocked = false;
          if (item.direction === 'N' && v.y < -50) blocked = true;
          if (item.direction === 'S' && v.y > canvas.height + 50) blocked = true;
          if (item.direction === 'E' && v.x > canvas.width + 50) blocked = true;
          if (item.direction === 'W' && v.x < -50) blocked = true;
          return blocked;
      });

      if (isBlocked) {
          item.spawnTime += 0.5;
          return true;
      }

      const vehicle = new Vehicle(item.direction, item.type);
      vehicles.push(vehicle);
      return false;
    }
    return true;
  });
}

function render(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  
  if (isRunning) {
    simTime += dt;
    spawnVehicles(dt);
    
    const lights = smartMode ? updateSmartLights(dt) : getClassicLightState(simTime);
    vehicles.forEach(v => v.update(dt, lights, vehicles));
    
    vehicles = vehicles.filter(v => {
      if (v.state === 'passed') {
        passedVehicles++;
        return false;
      }
      return true;
    });
    
    drawRoads();
    drawTrafficLights(lights);
    vehicles.forEach(v => v.draw());
    updateStats();
  }
  
  requestAnimationFrame(render);
}

function updateStats() {
  const density = analyzeTrafficDensity();
  document.getElementById('activeCount').textContent = vehicles.length;
  document.getElementById('passedCount').textContent = passedVehicles;
  document.getElementById('simTime').textContent = Math.floor(simTime) + 's';
  document.getElementById('nsCount').textContent = density.nsWaiting;
  document.getElementById('ewCount').textContent = density.ewWaiting;
}

document.getElementById('startBtn').addEventListener('click', () => {
  isRunning = !isRunning;
  document.getElementById('startBtn').textContent = isRunning ? '⏸ Duraklat' : '▶ Başlat';
  if (isRunning) lastTime = 0;
});

document.getElementById('resetBtn').addEventListener('click', () => {
  isRunning = false;
  simTime = 0;
  lastTime = 0;
  spawnQueue = [];
  vehicles = [];
  passedVehicles = 0;
  vehicleIdCounter = 0;
  SMART_LIGHT.currentGreen = 'NS';
  SMART_LIGHT.timeInCurrentState = 0;
  SMART_LIGHT.isYellow = false;
  SMART_LIGHT.yellowStartTime = 0;
  AI_BRAIN.qTable = {};
  document.getElementById('startBtn').textContent = '▶ Başlat';
  
  loadTrafficData().then(() => {
    updateStats();
    drawRoads();
    drawTrafficLights({ NS: 'red', EW: 'red' });
  });
});

document.getElementById('smartMode').addEventListener('change', (e) => {
  smartMode = e.target.checked;
  if (smartMode) {
    SMART_LIGHT.currentGreen = 'NS';
    SMART_LIGHT.timeInCurrentState = 0;
    SMART_LIGHT.isYellow = false;
    SMART_LIGHT.yellowStartTime = 0;
  }
});

// Başlangıç
loadTrafficData().then(() => {
    drawRoads();
    drawTrafficLights({ NS: 'red', EW: 'red' });
    render(0);
});