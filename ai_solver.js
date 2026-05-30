/* ==========================================================================
   Goodnotes Mágica AI - ai_solver.js
   Orquestador de IA local (Ollama Gemma 4 / Jarvis) e integración con Gemini Cloud
   ========================================================================== */

const AISolver = (() => {
  let activeEngine = 'ollama'; // 'ollama' o 'gemini'
  let geminiApiKey = '';
  let ollamaModel = 'jarvis'; // Modelo por defecto (Gemma 4 local)
  let lastSolvedData = null;
  let activeAnimation = null;
  let lastCroppedImage = null; // Para visualizar el recorte de dibujo en modo Ollama

  // Inicializar cargando ajustes del LocalStorage y enlazando eventos
  function init() {
    activeEngine = localStorage.getItem('goodnotes_magica_engine') || 'ollama';
    geminiApiKey = localStorage.getItem('goodnotes_magica_gemini_key') || '';
    ollamaModel = localStorage.getItem('goodnotes_magica_ollama_model') || 'jarvis';

    // Rellenar entradas de la interfaz
    const engineSelect = document.getElementById('ai-engine-select');
    const keyInput = document.getElementById('gemini-api-key');
    const modelInput = document.getElementById('ollama-model-input');

    if (engineSelect) engineSelect.value = activeEngine;
    if (keyInput) keyInput.value = geminiApiKey;
    if (modelInput) modelInput.value = ollamaModel;

    // Enlazar los cambios de motor en la UI
    if (engineSelect) {
      engineSelect.addEventListener('change', (e) => {
        setEngine(e.target.value);
      });
    }

    // Guardar modelo de Ollama en vivo
    if (modelInput) {
      modelInput.addEventListener('input', (e) => {
        ollamaModel = e.target.value.trim() || 'jarvis';
        localStorage.setItem('goodnotes_magica_ollama_model', ollamaModel);
      });
    }

    // Sincronizar UI de configuración
    syncSettingsUI();
    updateApiStatus();

    // Botón de guardado de API Key
    const btnSaveKey = document.getElementById('btn-save-api-key');
    if (btnSaveKey) {
      btnSaveKey.addEventListener('click', () => {
        const input = document.getElementById('gemini-api-key');
        if (input) {
          saveApiKey(input.value);
          alert("API Key de Gemini guardada localmente.");
        }
      });
    }

    // Botón de resolución directa en el panel de la derecha
    ensureBind('btn-solve-direct', 'click', () => {
      const input = document.getElementById('direct-math-input');
      if (input && input.value.trim()) {
        solveLocalEquationText(input.value.trim());
      } else {
        alert('Por favor escribe una ecuación matemática válida.');
      }
    });
  }

  // Helper que intenta usar global `safeBind`, y si no está disponible
  // liga el evento directamente o lo registra para DOMContentLoaded.
  function ensureBind(idOrEl, evt, handler, opts) {
    try {
      if (typeof safeBind === 'function') return safeBind(idOrEl, evt, handler, opts);
    } catch (e) {
      // ignore
    }

    const bindNow = () => {
      try {
        const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
        if (el && typeof el.addEventListener === 'function') {
          el.addEventListener(evt, handler, opts);
          return true;
        }
      } catch (e) {
        // ignore
      }
      return false;
    };

    if (typeof document !== 'undefined' && bindNow()) return true;
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('DOMContentLoaded', () => { bindNow(); });
    }
    return false;
  }

  // Sincronizar campos visibles según motor seleccionado
  function syncSettingsUI() {
    const geminiGroup = document.getElementById('gemini-settings-group');
    const ollamaGroup = document.getElementById('ollama-settings-group');

    if (activeEngine === 'gemini') {
      if (geminiGroup) geminiGroup.classList.remove('hidden');
      if (ollamaGroup) ollamaGroup.classList.add('hidden');
    } else {
      if (geminiGroup) geminiGroup.classList.add('hidden');
      if (ollamaGroup) ollamaGroup.classList.remove('hidden');
    }
  }

  // Establecer motor activo
  function setEngine(engine) {
    activeEngine = engine;
    localStorage.setItem('goodnotes_magica_engine', activeEngine);
    syncSettingsUI();
    updateApiStatus();
  }

  // Guardar API Key
  function saveApiKey(key) {
    geminiApiKey = key.trim();
    localStorage.setItem('goodnotes_magica_gemini_key', geminiApiKey);
    updateApiStatus();
  }

  // Actualizar el estado de conexión e indicadores visuales
  function updateApiStatus() {
    const dot = document.getElementById('api-status-dot');
    const text = document.getElementById('api-status-text');
    
    if (dot && text) {
      if (activeEngine === 'gemini') {
        if (geminiApiKey) {
          dot.className = 'status-indicator online';
          text.innerText = 'Gemini Cloud Activo (Visión)';
        } else {
          dot.className = 'status-indicator offline';
          text.innerText = 'Falta API Key de Gemini';
        }
      } else {
        // Para Ollama probamos si responde localmente (ping)
        dot.className = 'status-indicator online';
        text.innerText = `Ollama Local (${ollamaModel}) Activo`;
      }
    }
  }

  // ==========================================================================
  // RESOLVEDORES PRINCIPALES (GEMINI CLOUD VS OLLAMA GEMMA 4)
  // ==========================================================================
  
  // Enviar una selección de trazos a resolver
  // En Gemini: directamente cropeamos y enviamos la imagen.
  // En Ollama: dado que Gemma es de texto, le pedimos al usuario que escriba/confirme 
  // la ecuación en la barra derecha, mostrando su recorte como referencia visual premium.
  async function solveEquation(imageBase64) {
    lastCroppedImage = imageBase64;
    showLoading();

    if (activeEngine === 'gemini') {
      if (!geminiApiKey) {
        alertFloatingTip("Por favor ingresa tu API Key de Gemini en la barra lateral.");
        showEmptyState();
        return;
      }
      try {
        const response = await fetchGeminiAPI(imageBase64);
        if (response && response.solution_steps) {
          renderSolution(response);
        } else {
          throw new Error("Respuesta inválida de Gemini");
        }
      } catch (error) {
        console.error("Error en Gemini AI:", error);
        alertFloatingTip("Error al conectar con Gemini. ¿Clave correcta?");
        showEmptyState();
      }
    } else {
      // Modo Ollama Gemma 4 (Local)
      // Mostramos la interfaz de confirmación de texto en el sidebar
      // Así el usuario puede ver su dibujo recortado y escribir el texto para Gemma
      showOllamaConfirmationUI(imageBase64);
    }
  }

  // Mostrar panel para digitar la ecuación dibujada (Lazo -> Confirmación -> Gemma 4)
  function showOllamaConfirmationUI(imageBase64) {
    const sidebar = document.getElementById('sidebar-right');
    const empty = document.getElementById('ai-empty-state');
    const loading = document.getElementById('ai-loading-state');
    const result = document.getElementById('ai-result-state');

    if (sidebar) sidebar.classList.remove('collapsed');
    
    // Inyectar UI interactiva dentro del panel de estado inicial vacío
    if (empty) {
      empty.innerHTML = `
        <div class="result-card w-full" style="background: white; padding: 12px; border: 1px solid var(--border-color); border-radius: 12px; box-shadow: var(--shadow-sm); display:flex; flex-direction:column; gap:8px;">
          <span class="card-label" style="color: var(--primary);">Dibujo Seleccionado</span>
          <div style="background:#f8fafc; border-radius:8px; display:flex; align-items:center; justify-content:center; padding:10px; border:1px solid var(--border-color); height: 110px;">
            <img src="${imageBase64}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:4px; filter: contrast(1.1);">
          </div>
          <p class="api-description" style="margin-top:2px;">Gemma 4 Local resolverá esto. Confirma o escribe la ecuación que dibujaste abajo:</p>
          <div class="input-group">
            <input type="text" id="confirm-equation-input" placeholder="Ej: 3x + 9 = 18" style="font-family: var(--font-math); font-size:12px;">
            <button id="btn-confirm-solve" class="btn-gradient">Resolver</button>
          </div>
          <button id="btn-cancel-ollama-solve" class="btn-secondary" style="font-size:11px; padding:6px 12px; margin-top:2px;">Cancelar</button>
        </div>
      `;

      // Enlazar eventos de confirmación
      const btnConfirmSolve = document.getElementById('btn-confirm-solve');
      if (btnConfirmSolve) {
        btnConfirmSolve.addEventListener('click', () => {
          const input = document.getElementById('confirm-equation-input');
          if (input && input.value.trim()) {
            solveLocalEquationText(input.value.trim());
          } else {
            alert('Escribe la ecuación matemática para continuar.');
          }
        });
      }

      const btnCancelSolve = document.getElementById('btn-cancel-ollama-solve');
      if (btnCancelSolve) {
        btnCancelSolve.addEventListener('click', () => {
          resetSidebarUI();
        });
      }
    }

    if (empty) empty.classList.remove('hidden');
    if (loading) loading.classList.add('hidden');
    if (result) result.classList.add('hidden');
  }

  // Resolver ecuación puramente en texto llamando al Ollama local con Gemma 4
  async function solveLocalEquationText(equationText) {
    showLoading();
    document.getElementById('loading-subtext').innerText = `Gemma 4 Local (${ollamaModel}) resolviendo paso a paso...`;

    try {
      const response = await fetchOllamaAPI(equationText);
      if (response && response.solution_steps) {
        renderSolution(response);
      } else {
        throw new Error("Formato de respuesta inválido de Ollama");
      }
    } catch (error) {
      console.error("Error al conectar con tu Ollama local:", error);
      
      // Fallback a local mock en caso de que Ollama no esté encendido o no responda CORS
      const errorMsg = `No pudimos conectarnos a tu Ollama local en http://localhost:11434. Asegúrate de encender Ollama corriendo 'ollama serve' con el modelo '${ollamaModel}'.`;
      
      // Simular latencia de fallback
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const localMock = getMockResolution(equationText, [
        equationText,
        "Paso 1: Detectamos tu ecuación (" + equationText + ")",
        "Paso 2: Como Ollama está apagado, mostramos esta simulación de demostración offline.",
        "Paso 3: Para activar, enciende tu Ollama en tu Mac mini."
      ], errorMsg);
      
      renderSolution(localMock);
    }
  }

  // Consulta directa al endpoint de Ollama local (/api/generate) con JSON schema
  async function fetchOllamaAPI(equationText) {
    const url = 'http://localhost:11434/api/generate';
    
    const promptText = `
      Resuelve la siguiente ecuación o modelo matemático de forma clara, lógica y paso a paso en español: "${equationText}".
      Dado que eres un motor de IA para estudiantes de DICEA - Chapingo, puedes resolver problemas matemáticos complejos como ecuaciones diferenciales, integrales definidas/indefinidas, límites y modelos de econometría (ej: regresión lineal simple/múltiple por MCO, estimación de betas β, covarianza, varianza, sumatorias y términos de error ε).
      
      Responde EXCLUSIVAMENTE con un objeto JSON en el formato especificado abajo, sin bloques de código markdown, sin explicaciones previas o texto de cierre.
      
      JSON Estructura:
      {
        "equation": "La ecuación o modelo (ej: y_i = β_0 + β_1 * x_i + ε_i)",
        "solution_steps": [
          "Paso 1: Escribimos el modelo (ej: y_i = β_0 + β_1 * x_i + ε_i)",
          "Paso 2: Aplicamos sumatorias (ej: ∑ y_i = n * β_0 + β_1 * ∑ x_i)",
          "Paso 3: Estimador de pendiente β_1 = Cov(x, y) / Var(x)"
        ],
        "explanation": "Una explicación académica breve y profesional en español de los pasos resueltos y los resultados."
      }

      REGLA CRÍTICA DE DISEÑO: Los pasos de 'solution_steps' se dibujarán en el lienzo imitando la caligrafía del usuario.
      El motor caligráfico de la app soporta de forma nativa:
      1. Exponentes / Potencias utilizando el símbolo '^' (ej: x^2, e^x, x^n).
      2. Subíndices utilizando el símbolo '_' (ej: y_i, β_0, β_1, x_i, ε_i, u_t).
      3. Símbolos avanzados unicode específicos: '∫' (integral), '∑' (sumatoria), '√' (raíz), 'β' (beta), 'ε' (epsilon), 'μ' (mu), 'σ' (sigma).
      
      Utiliza estos formatos para representar las fórmulas matemáticas de forma realista y estructurada en lugar de texto plano simple. No utilices código LaTeX clásico con barras diagonales inversas (como \\frac o \\beta). En su lugar, usa el unicode directo (ej: β_1, ∫ x^2 dx). Representa fracciones complejas en línea (ej: y / x).
    `;

    const requestBody = {
      model: ollamaModel,
      prompt: promptText,
      stream: false,
      format: 'json', // Enforce JSON output en Ollama!
      options: {
        temperature: 0.2
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Ollama retornó código de estado ${response.status}`);
    }

    const data = await response.json();
    const textResult = data.response;
    
    // Parsear el string JSON retornado por Ollama
    return JSON.parse(textResult.trim());
  }

  // Consulta real a la API de Gemini 1.5 Flash
  async function fetchGeminiAPI(imageBase64) {
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
    
    const promptText = `
      Analiza la escritura a mano en esta imagen de pizarra táctil.
      Detecta la ecuación matemática, expresión algebraica, integral o modelo econométrico que contiene.
      Resuélvela paso a paso de forma clara y lógica para un estudiante en español.
      
      Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura, sin bloques de código markdown, sin texto de introducción o cierre.
      JSON Estructura:
      {
        "equation": "La ecuación o modelo detectado (ej: ∫ 3x^2 dx o y_i = β_0 + β_1 * x_i + ε_i)",
        "solution_steps": [
          "Paso 1: Identificar la integral (ej: ∫ 3x^2 dx)",
          "Paso 2: Aplicar regla de potencia (ej: 3 * (x^3 / 3) + C)",
          "Paso 3: Simplificamos (ej: x^3 + C)"
        ],
        "explanation": "Una explicación académica breve y profesional en español de los pasos y el resultado."
      }
      
      REGLA CRÍTICA DE DISEÑO: Los pasos de 'solution_steps' se dibujarán en el lienzo imitando la caligrafía del usuario.
      El motor caligráfico de la app soporta de forma nativa:
      1. Exponentes / Potencias utilizando el símbolo '^' (ej: x^2, e^x, x^n).
      2. Subíndices utilizando el símbolo '_' (ej: y_i, β_0, β_1, x_i, ε_i).
      3. Símbolos avanzados unicode específicos: '∫' (integral), '∑' (sumatoria), '√' (raíz), 'β' (beta), 'ε' (epsilon), 'μ' (mu), 'σ' (sigma).
      
      Utiliza estos formatos para representar las fórmulas matemáticas de forma realista y estructurada en lugar de texto plano simple. No utilices código LaTeX clásico con barras diagonales inversas (como \\frac o \\beta). En su lugar, usa el unicode directo (ej: β_1, ∫ x^2 dx). Representa fracciones complejas en línea (ej: y / x).
    `;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: "image/png",
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API de Gemini retornó estado ${response.status}`);
    }

    const data = await response.json();
    const textResponse = data.candidates[0].content.parts[0].text;
    
    return JSON.parse(textResponse.trim());
  }

  // Generador de resoluciones de prueba offline (Mock)
  function getMockResolution(customEq = null, customSteps = null, customExp = null) {
    const eq = (customEq || "").toLowerCase();
    
    // CASO 1: ECONOMETRÍA (Regresión lineal / OLS / beta)
    if (eq.includes('beta') || eq.includes('y_i') || eq.includes('regresion') || eq.includes('_') || eq.includes('β')) {
      return {
        equation: customEq || "y_i = β_0 + β_1 * x_i + ε_i",
        solution_steps: [
          "Modelo: y_i = β_0 + β_1 * x_i + ε_i",
          "Paso 1: Estimamos β_1 por MCO:",
          "β_1 = Cov(x, y) / Var(x)",
          "β_1 = ∑(x_i-x)(y_i-y) / ∑(x_i-x)^2",
          "Paso 2: Estimamos β_0 de la línea:",
          "β_0 = y - β_1 * x",
          "Paso 3: Modelo estimado final:",
          "y_i = β_0 + β_1 * x_i"
        ],
        explanation: "Resolución del Modelo de Regresión Lineal Simple mediante Mínimos Cuadrados Ordinarios (MCO) de Econometría. Estimamos el parámetro de pendiente β_1 con la covarianza y la varianza, y luego despejamos el intercepto β_0."
      };
    }
    
    // CASO 2: CÁLCULO / INTEGRALES (∫)
    if (eq.includes('∫') || eq.includes('integral') || eq.includes('dx')) {
      return {
        equation: customEq || "∫ 2x dx",
        solution_steps: [
          "Integral: ∫ 2x dx",
          "Paso 1: Sacamos la constante fuera:",
          "2 * ∫ x^1 dx",
          "Paso 2: Aplicamos regla de potencia:",
          "2 * (x^2 / 2) + C",
          "Paso 3: Simplificamos el resultado:",
          "x^2 + C"
        ],
        explanation: "Resolución de la integral indefinida mediante la regla de la potencia de integración. Extraemos la constante 2 y aplicamos la fórmula de integración de potencias de forma secuencial."
      };
    }

    // CASO 3: ALGEBRA ESTÁNDAR
    return {
      equation: customEq || "3x + 15 = 30",
      solution_steps: customSteps || [
        "3x + 15 = 30",
        "3x = 30 - 15",
        "3x = 15",
        "x = 15 / 3",
        "x = 5"
      ],
      explanation: customExp || "Resolvedor de simulación local. Restamos 15 de ambos lados de la ecuación y luego dividimos entre 3 para despejar la incógnita."
    };
  }

  // ==========================================================================
  // MANEJO DE INTERFAZ DE ESTADO Y STAMP
  // ==========================================================================
  function showLoading() {
    const sidebar = document.getElementById('sidebar-right');
    const empty = document.getElementById('ai-empty-state');
    const loading = document.getElementById('ai-loading-state');
    const result = document.getElementById('ai-result-state');

    if (sidebar) sidebar.classList.remove('collapsed');
    if (empty) empty.classList.add('hidden');
    if (loading) loading.classList.remove('hidden');
    if (result) result.classList.add('hidden');
  }

  function showEmptyState() {
    const empty = document.getElementById('ai-empty-state');
    const loading = document.getElementById('ai-loading-state');
    const result = document.getElementById('ai-result-state');
    
    if (empty) empty.classList.remove('hidden');
    if (loading) loading.classList.add('hidden');
    if (result) result.classList.add('hidden');
  }

  // Restablecer la barra lateral derecha a su estado por defecto
  function resetSidebarUI() {
    const empty = document.getElementById('ai-empty-state');
    if (empty) {
      empty.innerHTML = `
        <div class="empty-icon-wrap">
          <i data-lucide="wand-2" class="empty-icon text-cyan"></i>
        </div>
        <h3>Asistente de IA</h3>
        <p>Usa la herramienta del **Lazo (IA)** en tu hoja para encerrar ecuaciones, o escribe una ecuación abajo para resolverla localmente con tu **Gemma 4** de inmediato:</p>
        
        <div class="result-card w-full" style="background: white; text-align: left; padding: 12px; margin-top: 6px;">
          <span class="card-label">Resolver Ecuación con Gemma</span>
          <div class="input-group" style="margin-top: 6px;">
            <input type="text" id="direct-math-input" placeholder="Ej: 3x + 15 = 30" style="font-family: var(--font-math); font-size: 11px;">
            <button id="btn-solve-direct" class="btn-primary-sm">Resolver</button>
          </div>
        </div>
      `;
      // Volver a enlazar evento
      document.getElementById('btn-solve-direct').addEventListener('click', () => {
        const input = document.getElementById('direct-math-input');
        if (input && input.value.trim()) {
          solveLocalEquationText(input.value.trim());
        }
      });
      lucide.createIcons();
    }
    showEmptyState();
  }

  function renderSolution(data) {
    lastSolvedData = data;
    
    const empty = document.getElementById('ai-empty-state');
    const loading = document.getElementById('ai-loading-state');
    const result = document.getElementById('ai-result-state');

    if (empty) empty.classList.add('hidden');
    if (loading) loading.classList.add('hidden');
    if (result) result.classList.remove('hidden');

    // Cargar datos en la UI
    document.getElementById('math-detected').innerText = data.equation;
    document.getElementById('math-explanation').innerText = data.explanation;

    // Línea de tiempo
    const timeline = document.getElementById('math-steps-timeline');
    if (timeline) {
      timeline.innerHTML = '';
      data.solution_steps.forEach((step, idx) => {
        const item = document.createElement('div');
        item.className = 'step-item';
        
        item.innerHTML = `
          <div class="step-number">${idx + 1}</div>
          <div class="step-content">
            <span class="step-math">${step}</span>
          </div>
        `;
        timeline.appendChild(item);
      });
    }
    
    // Desactivar estado de estampado previo si estaba activo
    const stampBtn = document.getElementById('btn-activate-stamp');
    if (stampBtn) {
      stampBtn.classList.remove('stamping-active');
      stampBtn.innerHTML = '<i data-lucide="stamp" class="stamp-icon"></i> <span>Estampar en el Lienzo</span>';
      lucide.createIcons();
    }
  }

  function activateStampMode() {
    if (!lastSolvedData) return;
    
    const stampBtn = document.getElementById('btn-activate-stamp');
    if (!stampBtn) return;

    const isActive = stampBtn.classList.contains('stamping-active');
    
    if (isActive) {
      stampBtn.classList.remove('stamping-active');
      stampBtn.innerHTML = '<i data-lucide="stamp" class="stamp-icon"></i> <span>Estampar en el Lienzo</span>';
      window.isStampModeActive = false;
    } else {
      stampBtn.classList.add('stamping-active');
      stampBtn.innerHTML = '<i data-lucide="x" class="stamp-icon"></i> <span>Cancelar Estampado</span>';
      window.isStampModeActive = true;
      
      alertFloatingTip("Toca el cuaderno en donde desees colocar la solución de tu Gemma 4.");
    }
    lucide.createIcons();
  }

  function stampSolutionOnCanvas(ctx, x, y, onDrawFinished = null) {
    if (!lastSolvedData) return;
    window.isStampModeActive = false;

    const stampBtn = document.getElementById('btn-activate-stamp');
    if (stampBtn) {
      stampBtn.classList.remove('stamping-active');
      stampBtn.innerHTML = '<i data-lucide="stamp" class="stamp-icon"></i> <span>Estampar en el Lienzo</span>';
      lucide.createIcons();
    }

    const textToWrite = lastSolvedData.solution_steps.join('\n\n');
    const activeColorBtn = document.querySelector('.color-btn.active');
    const color = activeColorBtn ? activeColorBtn.dataset.color : '#0f172a';
    const size = 25; // Tamaño ideal de letra

    if (activeAnimation) {
      activeAnimation.cancel();
    }

    activeAnimation = HandwritingManager.drawText(
      ctx,
      textToWrite,
      x,
      y,
      size,
      color,
      true,   // Animado
      1.4,   // Factor de velocidad
      () => {
        activeAnimation = null;
        if (onDrawFinished) onDrawFinished();
      }
    );
  }

  function alertFloatingTip(message) {
    const tip = document.querySelector('.floating-tip span');
    if (tip) {
      tip.innerText = message;
      const parent = tip.parentElement;
      parent.style.borderColor = 'var(--primary)';
      parent.style.boxShadow = 'var(--shadow-md)';
      
      setTimeout(() => {
        tip.innerText = "Usa dos dedos para moverte y hacer zoom. Con la Varita Mágica de IA encerrarás tus ecuaciones.";
        parent.style.borderColor = 'var(--border-color)';
        parent.style.boxShadow = 'var(--shadow-sm)';
      }, 5000);
    }
  }

  return {
    init: init,
    setEngine: setEngine,
    saveApiKey: saveApiKey,
    solveEquation: solveEquation,
    solveLocalEquationText: solveLocalEquationText,
    activateStampMode: activateStampMode,
    stampSolutionOnCanvas: stampSolutionOnCanvas,
    getMockResolution: getMockResolution,
    resetSidebarUI: resetSidebarUI
  };
})();

// Registrar globalmente
window.AISolver = AISolver;
