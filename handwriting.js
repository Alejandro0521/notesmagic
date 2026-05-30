/* ==========================================================================
   Goodnotes Mágica AI - handwriting.js
   Módulo de captura, almacenamiento y reproducción de caligrafía vectorial
   ========================================================================== */

const HandwritingManager = (() => {
  // Base de datos de caligrafía por defecto (trazos vectoriales pre-grabados)
  // Cada carácter contiene un array de trazos (strokes), y cada trazo un array de puntos {x, y} de 0 a 100.
  const defaultStrokes = {
    '0': [
      [{ x: 50, y: 15 }, { x: 75, y: 18 }, { x: 80, y: 50 }, { x: 75, y: 82 }, { x: 50, y: 85 }, { x: 25, y: 82 }, { x: 20, y: 50 }, { x: 25, y: 18 }, { x: 50, y: 15 }]
    ],
    '1': [
      [{ x: 32, y: 28 }, { x: 50, y: 15 }, { x: 50, y: 85 }]
    ],
    '2': [
      [{ x: 25, y: 35 }, { x: 30, y: 20 }, { x: 50, y: 15 }, { x: 72, y: 22 }, { x: 72, y: 40 }, { x: 50, y: 62 }, { x: 25, y: 85 }, { x: 75, y: 85 }]
    ],
    '3': [
      [{ x: 28, y: 25 }, { x: 50, y: 16 }, { x: 70, y: 24 }, { x: 70, y: 44 }, { x: 52, y: 50 }, { x: 72, y: 56 }, { x: 72, y: 78 }, { x: 48, y: 85 }, { x: 26, y: 76 }]
    ],
    '4': [
      [{ x: 58, y: 15 }, { x: 25, y: 62 }, { x: 78, y: 62 }],
      [{ x: 58, y: 42 }, { x: 58, y: 85 }]
    ],
    '5': [
      [{ x: 68, y: 18 }, { x: 36, y: 18 }, { x: 32, y: 46 }, { x: 52, y: 46 }, { x: 70, y: 54 }, { x: 70, y: 76 }, { x: 48, y: 85 }, { x: 26, y: 76 }]
    ],
    '6': [
      [{ x: 65, y: 15 }, { x: 32, y: 48 }, { x: 28, y: 72 }, { x: 45, y: 85 }, { x: 68, y: 80 }, { x: 68, y: 58 }, { x: 48, y: 48 }, { x: 30, y: 56 }]
    ],
    '7': [
      [{ x: 25, y: 18 }, { x: 75, y: 18 }, { x: 42, y: 85 }],
      [{ x: 38, y: 48 }, { x: 62, y: 48 }]
    ],
    '8': [
      [{ x: 50, y: 50 }, { x: 28, y: 35 }, { x: 32, y: 18 }, { x: 50, y: 15 }, { x: 68, y: 18 }, { x: 72, y: 35 }, { x: 50, y: 50 }, { x: 26, y: 65 }, { x: 30, y: 82 }, { x: 50, y: 85 }, { x: 70, y: 82 }, { x: 74, y: 65 }, { x: 50, y: 50 }]
    ],
    '9': [
      [{ x: 68, y: 52 }, { x: 38, y: 52 }, { x: 32, y: 32 }, { x: 48, y: 16 }, { x: 68, y: 22 }, { x: 70, y: 52 }, { x: 70, y: 85 }]
    ],
    '+': [
      [{ x: 20, y: 50 }, { x: 80, y: 50 }],
      [{ x: 50, y: 20 }, { x: 50, y: 80 }]
    ],
    '-': [
      [{ x: 20, y: 50 }, { x: 80, y: 50 }]
    ],
    '*': [
      [{ x: 28, y: 28 }, { x: 72, y: 72 }],
      [{ x: 72, y: 28 }, { x: 28, y: 72 }],
      [{ x: 20, y: 50 }, { x: 80, y: 50 }]
    ],
    '/': [
      [{ x: 20, y: 82 }, { x: 80, y: 18 }]
    ],
    '=': [
      [{ x: 20, y: 42 }, { x: 80, y: 42 }],
      [{ x: 20, y: 62 }, { x: 80, y: 62 }]
    ],
    '(': [
      [{ x: 65, y: 15 }, { x: 38, y: 50 }, { x: 65, y: 85 }]
    ],
    ')': [
      [{ x: 35, y: 15 }, { x: 62, y: 50 }, { x: 35, y: 85 }]
    ],
    'x': [
      [{ x: 28, y: 28 }, { x: 72, y: 72 }],
      [{ x: 72, y: 28 }, { x: 28, y: 72 }]
    ],
    'y': [
      [{ x: 25, y: 28 }, { x: 48, y: 55 }, { x: 72, y: 28 }],
      [{ x: 72, y: 28 }, { x: 32, y: 88 }]
    ],
    'z': [
      [{ x: 25, y: 28 }, { x: 75, y: 28 }, { x: 25, y: 72 }, { x: 75, y: 72 }]
    ],
    'a': [
      [{ x: 70, y: 48 }, { x: 50, y: 35 }, { x: 35, y: 48 }, { x: 38, y: 72 }, { x: 55, y: 82 }, { x: 70, y: 70 }, { x: 70, y: 42 }, { x: 70, y: 85 }]
    ],
    'b': [
      [{ x: 30, y: 15 }, { x: 30, y: 85 }],
      [{ x: 30, y: 52 }, { x: 52, y: 42 }, { x: 68, y: 52 }, { x: 68, y: 72 }, { x: 52, y: 82 }, { x: 30, y: 82 }]
    ],
    'c': [
      [{ x: 68, y: 38 }, { x: 52, y: 30 }, { x: 35, y: 48 }, { x: 38, y: 72 }, { x: 55, y: 82 }, { x: 68, y: 72 }]
    ],
    'd': [
      [{ x: 68, y: 48 }, { x: 50, y: 38 }, { x: 35, y: 52 }, { x: 38, y: 72 }, { x: 52, y: 82 }, { x: 68, y: 70 }, { x: 68, y: 15 }]
    ],
    'e': [
      [{ x: 32, y: 60 }, { x: 70, y: 60 }, { x: 68, y: 38 }, { x: 52, y: 32 }, { x: 35, y: 48 }, { x: 35, y: 72 }, { x: 52, y: 82 }, { x: 68, y: 75 }]
    ],
    'f': [
      [{ x: 62, y: 18 }, { x: 48, y: 15 }, { x: 45, y: 85 }],
      [{ x: 32, y: 45 }, { x: 58, y: 45 }]
    ],
    'g': [
      [{ x: 68, y: 45 }, { x: 48, y: 35 }, { x: 32, y: 48 }, { x: 35, y: 70 }, { x: 52, y: 78 }, { x: 68, y: 68 }, { x: 68, y: 40 }, { x: 68, y: 92 }, { x: 42, y: 95 }]
    ],
    'h': [
      [{ x: 30, y: 15 }, { x: 30, y: 85 }],
      [{ x: 30, y: 52 }, { x: 48, y: 45 }, { x: 65, y: 55 }, { x: 65, y: 85 }]
    ],
    'i': [
      [{ x: 50, y: 40 }, { x: 50, y: 85 }],
      [{ x: 50, y: 22 }, { x: 52, y: 22 }]
    ],
    'j': [
      [{ x: 58, y: 40 }, { x: 58, y: 88 }, { x: 35, y: 95 }],
      [{ x: 58, y: 22 }, { x: 60, y: 22 }]
    ],
    'k': [
      [{ x: 32, y: 15 }, { x: 32, y: 85 }],
      [{ x: 62, y: 38 }, { x: 32, y: 55 }, { x: 65, y: 82 }]
    ],
    'l': [
      [{ x: 45, y: 15 }, { x: 45, y: 80 }, { x: 55, y: 85 }]
    ],
    'm': [
      [{ x: 26, y: 45 }, { x: 26, y: 85 }],
      [{ x: 26, y: 55 }, { x: 38, y: 42 }, { x: 48, y: 55 }, { x: 48, y: 85 }],
      [{ x: 48, y: 55 }, { x: 60, y: 42 }, { x: 72, y: 55 }, { x: 72, y: 85 }]
    ],
    'n': [
      [{ x: 32, y: 45 }, { x: 32, y: 85 }],
      [{ x: 32, y: 55 }, { x: 50, y: 45 }, { x: 65, y: 58 }, { x: 65, y: 85 }]
    ],
    'o': [
      [{ x: 50, y: 35 }, { x: 68, y: 38 }, { x: 72, y: 60 }, { x: 68, y: 80 }, { x: 50, y: 85 }, { x: 32, y: 80 }, { x: 28, y: 60 }, { x: 32, y: 38 }, { x: 50, y: 35 }]
    ],
    'p': [
      [{ x: 30, y: 40 }, { x: 30, y: 95 }],
      [{ x: 30, y: 52 }, { x: 50, y: 42 }, { x: 65, y: 52 }, { x: 65, y: 72 }, { x: 50, y: 82 }, { x: 30, y: 82 }]
    ],
    'q': [
      [{ x: 65, y: 48 }, { x: 48, y: 38 }, { x: 32, y: 48 }, { x: 35, y: 72 }, { x: 48, y: 82 }, { x: 65, y: 70 }, { x: 65, y: 42 }, { x: 65, y: 95 }]
    ],
    'r': [
      [{ x: 35, y: 45 }, { x: 35, y: 85 }],
      [{ x: 35, y: 58 }, { x: 50, y: 46 }, { x: 65, y: 50 }]
    ],
    's': [
      [{ x: 65, y: 38 }, { x: 50, y: 32 }, { x: 35, y: 42 }, { x: 48, y: 55 }, { x: 65, y: 68 }, { x: 50, y: 82 }, { x: 32, y: 76 }]
    ],
    't': [
      [{ x: 45, y: 22 }, { x: 45, y: 78 }, { x: 58, y: 82 }],
      [{ x: 28, y: 42 }, { x: 62, y: 42 }]
    ],
    'u': [
      [{ x: 30, y: 45 }, { x: 30, y: 75 }, { x: 45, y: 85 }, { x: 65, y: 75 }, { x: 65, y: 45 }],
      [{ x: 65, y: 65 }, { x: 65, y: 85 }]
    ],
    'v': [
      [{ x: 28, y: 45 }, { x: 48, y: 82 }, { x: 68, y: 45 }]
    ],
    'w': [
      [{ x: 25, y: 45 }, { x: 35, y: 82 }, { x: 48, y: 58 }, { x: 60, y: 82 }, { x: 70, y: 45 }]
    ],
    'P': [
      [{ x: 32, y: 15 }, { x: 32, y: 85 }],
      [{ x: 32, y: 18 }, { x: 58, y: 18 }, { x: 68, y: 28 }, { x: 68, y: 45 }, { x: 55, y: 52 }, { x: 32, y: 52 }]
    ],
    'R': [
      [{ x: 32, y: 15 }, { x: 32, y: 85 }],
      [{ x: 32, y: 18 }, { x: 58, y: 18 }, { x: 68, y: 28 }, { x: 68, y: 45 }, { x: 55, y: 52 }, { x: 32, y: 52 }],
      [{ x: 48, y: 52 }, { x: 68, y: 85 }]
    ],
    'E': [
      [{ x: 32, y: 18 }, { x: 32, y: 82 }],
      [{ x: 32, y: 18 }, { x: 68, y: 18 }],
      [{ x: 32, y: 50 }, { x: 58, y: 50 }],
      [{ x: 32, y: 82 }, { x: 68, y: 82 }]
    ],
    'S': [
      [{ x: 65, y: 25 }, { x: 48, y: 15 }, { x: 30, y: 28 }, { x: 48, y: 50 }, { x: 70, y: 68 }, { x: 52, y: 85 }, { x: 32, y: 78 }]
    ],
    'A': [
      [{ x: 50, y: 15 }, { x: 26, y: 85 }],
      [{ x: 50, y: 15 }, { x: 74, y: 85 }],
      [{ x: 35, y: 58 }, { x: 65, y: 58 }]
    ],
    'I': [
      [{ x: 35, y: 18 }, { x: 65, y: 18 }],
      [{ x: 50, y: 18 }, { x: 50, y: 82 }],
      [{ x: 35, y: 82 }, { x: 65, y: 82 }]
    ],
    ':': [
      [{ x: 50, y: 35 }, { x: 52, y: 35 }],
      [{ x: 50, y: 65 }, { x: 52, y: 65 }]
    ],
    '.': [
      [{ x: 50, y: 80 }, { x: 52, y: 80 }]
    ],
    '∫': [
      [{ x: 62, y: 15 }, { x: 50, y: 12 }, { x: 44, y: 22 }, { x: 44, y: 78 }, { x: 38, y: 88 }, { x: 26, y: 85 }]
    ],
    '∑': [
      [{ x: 72, y: 20 }, { x: 30, y: 20 }, { x: 52, y: 50 }, { x: 30, y: 80 }, { x: 72, y: 80 }]
    ],
    '√': [
      [{ x: 18, y: 55 }, { x: 25, y: 52 }, { x: 32, y: 85 }, { x: 45, y: 15 }, { x: 82, y: 15 }]
    ],
    'β': [
      [{ x: 35, y: 88 }, { x: 35, y: 20 }],
      [{ x: 24, y: 50 }, { x: 62, y: 35 }, { x: 35, y: 50 }, { x: 66, y: 68 }, { x: 35, y: 82 }]
    ],
    'ε': [
      [{ x: 65, y: 30 }, { x: 42, y: 32 }, { x: 52, y: 50 }, { x: 38, y: 68 }, { x: 62, y: 70 }]
    ],
    'μ': [
      [{ x: 25, y: 48 }, { x: 25, y: 88 }],
      [{ x: 25, y: 58 }, { x: 44, y: 82 }, { x: 62, y: 48 }, { x: 62, y: 85 }]
    ],
    'σ': [
      [{ x: 68, y: 30 }, { x: 42, y: 30 }, { x: 32, y: 52 }, { x: 44, y: 78 }, { x: 68, y: 65 }, { x: 68, y: 48 }, { x: 42, y: 48 }]
    ],
    ' ': [] // Espacio vacío
  };

  const STORAGE_KEY = 'goodnotes_magica_handwriting_v1';
  let userHandwriting = {};

  // Inicializar cargando la caligrafía del usuario
  function init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        userHandwriting = JSON.parse(stored);
        console.log("Caligrafía del usuario cargada con éxito.");
      }
    } catch (e) {
      console.error("Error al cargar caligrafía:", e);
    }
  }

  // Guardar un carácter entrenado
  function saveCharacter(char, strokes) {
    if (!strokes || strokes.length === 0) return;
    
    // Normalizar trazos
    const normalized = normalizeStrokes(strokes);
    userHandwriting[char] = normalized;
    
    // Guardar en LocalStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userHandwriting));
      updateStats();
    } catch (e) {
      console.error("Error al guardar en localStorage:", e);
    }
  }

  // Borrar un carácter específico de la caligrafía entrenada
  function deleteCharacter(char) {
    if (userHandwriting[char]) {
      delete userHandwriting[char];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userHandwriting));
      updateStats();
    }
  }

  // Borrar todo el entrenamiento
  function clearAllTraining() {
    userHandwriting = {};
    localStorage.removeItem(STORAGE_KEY);
    updateStats();
  }

  // Obtener los trazos de un carácter (personalizados si existen, de lo contrario por defecto)
  function getCharacterStrokes(char) {
    // Si el usuario entrenó este carácter, lo devolvemos
    if (userHandwriting[char]) {
      return userHandwriting[char];
    }
    // Si no, devolvemos el valor por defecto si existe
    if (defaultStrokes[char]) {
      return defaultStrokes[char];
    }
    // Caso de mayúsculas/minúsculas no mapeadas: intentar fallback
    const lower = char.toLowerCase();
    if (userHandwriting[lower]) return userHandwriting[lower];
    if (defaultStrokes[lower]) return defaultStrokes[lower];

    // Fallback absoluto: una cajita vacía o guión
    return [[{ x: 25, y: 50 }, { x: 75, y: 50 }]];
  }

  // Comprobar si un carácter está personalizado
  function isTrained(char) {
    return !!userHandwriting[char];
  }

  // Obtener estadísticas de entrenamiento
  function getStats() {
    const trainedList = Object.keys(userHandwriting);
    const targetChars = ['0','1','2','3','4','5','6','7','8','9','x','y','z','a','b','+','-','*','/','='];
    const trainedTargets = targetChars.filter(c => trainedList.includes(c));

    return {
      totalTrained: trainedList.length,
      targetTrainedCount: trainedTargets.length,
      targetTotal: targetChars.length,
      isCustomActive: trainedList.length > 0
    };
  }

  // Actualizar estadísticas visuales en el modal de entrenamiento
  function updateStats() {
    const stats = getStats();
    const countEl = document.getElementById('stat-trained-count');
    const modeEl = document.getElementById('stat-current-mode');
    
    if (countEl) {
      countEl.innerText = `${stats.targetTrainedCount} / ${stats.targetTotal}`;
    }
    if (modeEl) {
      if (stats.isCustomActive) {
        modeEl.innerText = "Caligrafía del Usuario";
        modeEl.className = "text-green";
      } else {
        modeEl.innerText = "Caligrafía por Defecto";
        modeEl.className = "text-cyan";
      }
    }

    // Actualizar visualización en las cajitas del grid
    document.querySelectorAll('.training-box').forEach(box => {
      const char = box.dataset.char;
      if (isTrained(char)) {
        box.classList.add('trained');
      } else {
        box.classList.remove('trained');
      }
    });
  }

  // NORMALIZADOR VECTORIAL
  // Toma un array de trazos con puntos libres de pantalla y los escala
  // para que encajen exactamente centrados en una caja de 100x100.
  function normalizeStrokes(strokes) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    // 1. Encontrar los límites de la caja delimitadora del carácter
    strokes.forEach(stroke => {
      stroke.forEach(pt => {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      });
    });

    const width = maxX - minX;
    const height = maxY - minY;
    
    // Si no hay tamaño válido, devolver original
    if (width === 0 && height === 0) return strokes;

    // 2. Escalar preservando aspecto y centrar en 100x100
    const targetSize = 65; // Usamos 65% de la caja para dejar un margen del 17.5% alrededor
    const scale = Math.min(targetSize / (width || 1), targetSize / (height || 1));
    
    const dx = 50 - (minX + width / 2) * scale;
    const dy = 55 - (minY + height / 2) * scale; // Ligero ajuste hacia abajo para la línea base

    return strokes.map(stroke => {
      return stroke.map(pt => {
        return {
          x: Math.round(pt.x * scale + dx),
          y: Math.round(pt.y * scale + dy),
          p: pt.p !== undefined ? pt.p : 0.8 // Mantener presión si existe
        };
      });
    });
  }

  // MOTOR DE RENDERIZADO Y EXPRESIÓN DE CALIGRAFÍA VECTORIAL EN CANVAS
  // Dibuja una cadena de texto animada o estática en un canvas de dibujo
  // text: Texto a escribir
  // x, y: Coordenadas de inicio
  // size: Tamaño de la letra en px (ej. 30)
  // color: Color del lápiz
  // animate: Si es true, escribe secuencialmente con animación.
  // speedFactor: Velocidad de escritura (menor es más rápido)
  // onComplete: Callback al terminar de escribir
  function drawText(ctx, text, startX, startY, size = 30, color = '#0f172a', animate = true, speedFactor = 1.8, onComplete = null) {
    const charSpacing = size * 0.65;
    const lineSpacing = size * 1.5;
    let currentX = startX;
    let currentY = startY;
    let charIndex = 0;
    
    // Lista de caracteres con sus posiciones absolutas
    const layout = [];
    
    let isSuperscript = false;
    let isSubscript = false;
    
    // 1. Calcular el Layout (manejando saltos de línea \n, exponentes ^ y subíndices _)
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '\n') {
        currentX = startX;
        currentY += lineSpacing;
        continue;
      }
      
      // Control de formato superior/inferior
      if (char === '^') {
        isSuperscript = true;
        isSubscript = false;
        continue;
      }
      if (char === '_') {
        isSubscript = true;
        isSuperscript = false;
        continue;
      }
      
      let scaleFactor = 1.0;
      let shiftY = 0;
      
      if (isSuperscript) {
        scaleFactor = 0.6;
        shiftY = -size * 0.35;
        isSuperscript = false;
      } else if (isSubscript) {
        scaleFactor = 0.65;
        shiftY = size * 0.22;
        isSubscript = false;
      }
      
      const charSize = size * scaleFactor;
      
      layout.push({
        char: char,
        x: currentX,
        y: currentY + shiftY,
        size: charSize,
        strokes: getCharacterStrokes(char)
      });
      
      // Espaciado dinámico simple según escala
      if (char === ' ' || char === '\t') {
        currentX += charSpacing * scaleFactor * 0.8;
      } else {
        currentX += charSpacing * scaleFactor;
      }
    }

    if (layout.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    if (!animate) {
      // Dibujar todo estáticamente de inmediato
      layout.forEach(item => {
        drawSingleCharacterImmediate(ctx, item.strokes, item.x, item.y, item.size, color);
      });
      if (onComplete) onComplete();
      return;
    }

    // Dibujar con Animación
    let currentStrokeIndex = 0;
    let currentPointIndex = 0;
    let isDrawing = false;
    let animFrameId = null;

    function animateWriting() {
      if (charIndex >= layout.length) {
        if (onComplete) onComplete();
        return;
      }

      const item = layout[charIndex];
      const strokes = item.strokes;

      if (strokes.length === 0) {
        // Espacio en blanco, pasar al siguiente carácter
        charIndex++;
        animFrameId = requestAnimationFrame(animateWriting);
        return;
      }

      const stroke = strokes[currentStrokeIndex];
      
      if (!isDrawing) {
        isDrawing = true;
        currentPointIndex = 0;
      }

      // Parámetros de dibujo
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Dibujar segmento
      if (currentPointIndex < stroke.length - 1) {
        // Dibujamos un mini-segmento
        const p1 = stroke[currentPointIndex];
        const p2 = stroke[currentPointIndex + 1];

        // Mapear coordenadas 0-100 a la pantalla usando item.size dinámico
        const px1 = item.x + (p1.x - 50) * (item.size / 100);
        const py1 = item.y + (p1.y - 50) * (item.size / 100);
        const px2 = item.x + (p2.x - 50) * (item.size / 100);
        const py2 = item.y + (p2.y - 50) * (item.size / 100);

        // Modulación de grosor según presión de la caligrafía entrenada y escala de letra
        const pressure = p2.p || 0.8;
        ctx.lineWidth = Math.max(0.5, (item.size / 12) * pressure);

        ctx.beginPath();
        ctx.moveTo(px1, py1);
        ctx.lineTo(px2, py2);
        ctx.stroke();

        // Controlar la velocidad de puntos
        currentPointIndex++;
        
        // Simular velocidad humana de dibujo: dibujar varios puntos por frame o meter pequeños delays
        setTimeout(() => {
          animFrameId = requestAnimationFrame(animateWriting);
        }, 8 * speedFactor);
      } else {
        // Fin del trazo
        currentStrokeIndex++;
        isDrawing = false;

        if (currentStrokeIndex < strokes.length) {
          // Pasar al siguiente trazo del mismo carácter
          setTimeout(() => {
            animFrameId = requestAnimationFrame(animateWriting);
          }, 45 * speedFactor); // Pausa entre levantar el lápiz y volver a apoyarlo en la misma letra
        } else {
          // Fin del carácter, pasar al siguiente
          charIndex++;
          currentStrokeIndex = 0;
          setTimeout(() => {
            animFrameId = requestAnimationFrame(animateWriting);
          }, 35 * speedFactor); // Pausa breve entre letras
        }
      }
    }

    // Iniciar animación
    animateWriting();

    // Devolver objeto para poder cancelar la animación si se limpia la pantalla
    return {
      cancel: () => {
        if (animFrameId) cancelAnimationFrame(animFrameId);
      }
    };
  }

  // Dibuja un carácter instantáneamente
  function drawSingleCharacterImmediate(ctx, strokes, cx, cy, size, color) {
    if (!strokes || strokes.length === 0) return;
    
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokes.forEach(stroke => {
      if (stroke.length === 0) return;
      
      // Dibujar el trazo con curvas suaves Bezier o interpolación lineal
      ctx.beginPath();
      
      const p0 = stroke[0];
      const px0 = cx + (p0.x - 50) * (size / 100);
      const py0 = cy + (p0.y - 50) * (size / 100);
      ctx.moveTo(px0, py0);

      // Usar presión promedio para la línea completa
      const pressure = p0.p || 0.8;
      ctx.lineWidth = Math.max(0.5, (size / 12) * pressure);

      for (let i = 1; i < stroke.length; i++) {
        const p = stroke[i];
        const px = cx + (p.x - 50) * (size / 100);
        const py = cy + (p.y - 50) * (size / 100);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
  }

  // Inicializar al cargar
  init();

  return {
    init: init,
    saveCharacter: saveCharacter,
    deleteCharacter: deleteCharacter,
    clearAllTraining: clearAllTraining,
    getCharacterStrokes: getCharacterStrokes,
    isTrained: isTrained,
    getStats: getStats,
    updateStats: updateStats,
    drawText: drawText
  };
})();

// Registrar en el scope global
window.HandwritingManager = HandwritingManager;
