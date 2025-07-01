// Estas variables globales se asumen disponibles en el entorno de Canvas,
// aunque no se usan directamente en este sketch.


let phoneScreenImg; // Variable para almacenar la imagen de la pantalla del celular
let counter = 0; // Contador de toques
let MAX_TOUCHES = Math.floor(Math.random() * 70) + 15; // Número máximo de toques antes de la "muerte"
let glitches = []; // Array para almacenar los glitches individuales
let isDead = false; // Estado de la aplicación: ¿el celular ha "muerto"?
let finalImage; // Variable para almacenar la imagen final de "muerte"
let imagenglitchImg; // NUEVA VARIABLE: Variable para almacenar la imagen que se usará para los glitches

let currentMessage = "Toca la pantalla para iniciar el ciclo..."; // Mensaje que se mostrará en el canvas

// NUEVAS VARIABLES PARA EL AUDIO
let osc; // El objeto oscilador de p5.sound
let noise; // Objeto de ruido de p5.sound
let isAudioStarted = false; // Bandera para controlar si el audio ya ha iniciado

// VARIABLES PARA EL REINICIO AUTOMÁTICO
// deathTime ya no es estrictamente necesario para el setTimeout, pero se mantiene si se usa para otra cosa.
// let deathTime = 0;
const restartDelay = 2 * 60 * 1000; // 2 minutos en milisegundos (2 * 60 segundos * 1000 ms/seg)
let restartTimeoutId; // Para almacenar el ID del timeout y poder cancelarlo si fuera necesario

// La función 'sketch' contiene el código p5.js y se pasa a la instancia de p5.
const sketch = (p) => {
    // p.preload se ejecuta antes de que inicie el sketch.
    // Es el lugar ideal para cargar assets como imágenes.
    p.preload = () => {
        // Se carga tu propia imagen 'smartphone_screen.PNG'.
        // Asegúrate de haber subido la imagen al editor de p5.js primero.
        phoneScreenImg = p.loadImage('smartphone_screen.png');
        // Carga la nueva imagen 'cargafinal.png' que se mostrará al final.
        finalImage = p.loadImage('cargafinal.png');
        // Carga la imagen 'imagenglitch.png' para usarla en los glitches.
        imagenglitchImg = p.loadImage('imagenglitch.png'); // Carga la imagen de glitch
    };

    // p.setup se ejecuta una vez al inicio del sketch, después de p.preload.
    // Aquí se configura el canvas y las condiciones iniciales.
    p.setup = () => {
        // Ajusta el tamaño del canvas para que simule un celular y sea responsivo.
        p.createCanvas(p.windowWidth, p.windowHeight);
        // Crea el canvas. No se necesita .parent() en el editor web.

        p.noStroke(); // No dibujar bordes para las formas (glitches, contador).
        p.pixelDensity(1); // Asegura que los píxeles se dibujen uno a uno en pantallas de alta densidad.
        p.textAlign(p.CENTER, p.CENTER); // Configura la alineación de texto por defecto.

        // Configuración del oscilador de audio
        // Usaremos una onda cuadrada para un sonido más "digital" y áspero.
        osc = new p5.Oscillator('square'); // Cambiado a onda cuadrada
        osc.amp(0); // Inicializa el volumen a 0
        osc.freq(440); // Frecuencia inicial (A4)
        osc.start(); // Inicia el oscilador, pero no será audible hasta que el volumen sea > 0

        // Configuración del generador de ruido
        noise = new p5.Noise('white'); // Crea un generador de ruido blanco
        noise.amp(0); // Inicializa el volumen a 0
        noise.start(); // Inicia el ruido, pero no será audible hasta que el volumen sea > 0
    };

    // p.draw se ejecuta continuamente, creando el bucle de animación.
    p.draw = () => {
        if (isDead) {
            // Si el celular está "muerto", la pantalla se reemplaza por 'cargafinal.png'.
            // La imagen se dibuja cubriendo todo el canvas.
            p.image(finalImage, 0, 0, p.width, p.height);

            // Detener el audio cuando el dispositivo está "muerto"
            if (osc.isStarted) osc.stop(); // Solo detener si ya está reproduciendo
            if (noise.isStarted) noise.stop(); // Solo detener si ya está reproduciendo
            isAudioStarted = false; // Resetea la bandera para evitar intentos de detener un audio ya parado

            // IMPORTANTE: p.noLoop() se ha eliminado de aquí para permitir que draw siga mostrando la imagen final
            // y para que el setTimeout programado en touchStarted pueda ejecutarse.
            return; // Sale de la función draw, no dibuja más nada de lo "normal" del juego.
        }

        // Dibuja la imagen de la pantalla del celular como fondo.
        p.image(phoneScreenImg, 0, 0, p.width, p.height);

        // Dibuja todos los glitches acumulados.
        for (let i = 0; i < glitches.length; i++) {
            let g = glitches[i];

            // Mover el glitch
            g.x += g.vx;
            g.y += g.vy;

            // Envolver el glitch si sale de los límites del canvas
            if (g.x > p.width) g.x = -g.w;
            if (g.x + g.w < 0) g.x = p.width;
            if (g.y > p.height) g.y = -g.h;
            if (g.y + g.h < 0) g.y = p.height;


            if (g.type === 'color') {
                p.fill(g.color); // Establece el color del glitch (ya incluye la transparencia).
                p.rect(g.x, g.y, g.w, g.h); // Dibuja el rectángulo del glitch.
            } else if (g.type === 'image') {
                // Dibuja una porción aleatoria de la imagen de glitch con transparencia
                p.tint(255, g.alpha); // Aplica la transparencia al glitch de imagen
                p.image(imagenglitchImg, g.x, g.y, g.w, g.h, g.sx, g.sy, g.sw, g.sh);
                p.noTint(); // Elimina el tint para no afectar otros elementos
            }
        }

        // Dibuja el contador en el centro de la pantalla.
        p.fill(255); // Color blanco para el contador.
        p.textSize(p.width * 0.1); // Tamaño de texto responsivo.
        p.text(counter, p.width / 2, p.height / 2); // Muestra el valor actual del contador.

        // Dibuja el mensaje de estado en la parte inferior del canvas.
        p.fill(255); // Color blanco para el mensaje.
        p.textSize(p.width * 0.03); // Tamaño de texto responsivo para el mensaje.
        p.text(currentMessage, p.width / 2, p.height * 0.9); // Posiciona el mensaje.
    };

    // p.touchStarted se ejecuta cuando se detecta un toque o clic en la pantalla.
    p.touchStarted = () => {
        // Asegura que el contexto de audio se inicie con la primera interacción del usuario
        // Y SOLO si el dispositivo NO está muerto.
        if (!isDead && !isAudioStarted) {
            p.userStartAudio();
            // Asegura que los osciladores estén iniciados cuando el audio global lo esté.
            // Esto es importante si fueron detenidos con .stop() en algún momento.
            osc.start();
            noise.start();
            isAudioStarted = true;
        }

        if (isDead) {
            return false; // Si el celular ya está "muerto", no hay interacción.
        }

        // Incrementar el contador si no ha llegado al máximo.
        if (counter < MAX_TOUCHES) {
            counter++;

            // --- INICIO DE MODIFICACIONES DE AUDIO PARA SONIDO TIPO IKEDA ---
            // El volumen del oscilador será muy bajo al principio y aumentará ligeramente
            // para una sensación de "zumbido" subyacente.
            let oscVol = p.map(counter, 0, MAX_TOUCHES, 0.05, 0.2);
            osc.amp(oscVol, 0.1);

            // La frecuencia del oscilador será alta y más errática
            // para sonidos agudos y chirriantes.
            let oscFreq = p.map(counter, 0, MAX_TOUCHES, 800, p.random(2000, 5000)); // Rango de frecuencia más alto y aleatorio
            osc.freq(oscFreq, 0.05); // Transición más rápida para cambios abruptos

            // El volumen del ruido aumentará significativamente con el contador
            // para simular la degradación y el "glitch"
            let noiseVol = p.map(counter, 0, MAX_TOUCHES, 0.05, 0.7); // Ruido más prominente hacia el final
            noise.amp(noiseVol, 0.1);

            // Añadir un breve "pulso" o "click" al tocar para enfatizar el "glitch"
            // Esto se hace con un ataque muy rápido y decaimiento del volumen del ruido.
            noise.amp(noiseVol + 0.3, 0.01); // Pico de volumen instantáneo del ruido
            noise.amp(noiseVol, 0.15, p.frameCount + 1); // Vuelve al volumen normal del ruido

            // También podemos añadir un breve y agudo "sweep" de frecuencia al oscilador
            // para un efecto de "chirrido" o "rasguño"
            osc.freq(p.random(6000, 8000), 0.01); // Sube a una frecuencia muy alta
            osc.freq(oscFreq, 0.15, p.frameCount + 1); // Vuelve a su frecuencia mapeada

            // --- FIN DE MODIFICACIONES DE AUDIO ---


            // Generar un número de glitches basado en el progreso del contador.
            // Aumentado para una aparición con progresión (menos denso al inicio)
            const numNewGlitches = p.floor(p.map(counter, 0, MAX_TOUCHES, 1, 30)); // Comienza con 1, aumenta a 30

            for (let i = 0; i < numNewGlitches; i++) {
                // Decide aleatoriamente si será un glitch de color o de imagen (40% de probabilidad de imagen)
                let glitchType = p.random() < 0.40 ? 'image' : 'color'; // Aumentada la probabilidad de imagen

                // Velocidad aleatoria para el movimiento del glitch, mapeada al contador
                let maxSpeed = 5; // Velocidad máxima de movimiento
                let currentSpeed = p.map(counter, 0, MAX_TOUCHES, 0.5, maxSpeed); // Velocidad de 0.5 a maxSpeed
                let vx = p.random(-currentSpeed, currentSpeed); // Velocidad en X
                let vy = p.random(-currentSpeed, currentSpeed); // Velocidad en Y

                if (glitchType === 'color') {
                    // Glitch de color: Genera colores aleatorios brillantes
                    let glitchColor = p.color(
                        p.random(255), // Componente Rojo
                        p.random(255), // Componente Verde
                        p.random(255), // Componente Azul
                        p.random(150, 255) // Componente Alfa (transparencia) - Más brillante y visible
                    );

                    let gx = p.random(p.width);
                    let gy = p.random(p.height);
                    let gw, gh;

                    // Decidir si el glitch es una línea horizontal, vertical o un rectángulo más grande
                    let shapeType = p.random();
                    if (shapeType < 0.35) { // 35% de probabilidad de línea horizontal
                        gw = p.random(p.width * 0.3, p.width); // Muy ancho
                        gh = p.random(1, 8); // Muy delgado
                    } else if (shapeType < 0.70) { // 35% de probabilidad de línea vertical
                        gw = p.random(1, 8); // Muy delgado
                        gh = p.random(p.height * 0.3, p.height); // Muy alto
                    } else { // 30% de probabilidad de rectángulo más "normal" y visible
                        gw = p.random(p.width * 0.1, p.width * 0.6); // Rango más amplio para rectángulos
                        gh = p.random(p.height * 0.05, p.height * 0.2); // Rango más amplio para rectángulos
                    }
                    glitches.push({ type: 'color', x: gx, y: gy, w: gw, h: gh, color: glitchColor, vx: vx, vy: vy });
                } else {
                    // Glitch de imagen
                    // Selecciona una porción aleatoria de la imagen de glitch
                    // Aumenta el rango para que se vean pedazos más grandes de la imagen
                    let sx = p.random(imagenglitchImg.width / 2); // Inicia el muestreo desde la mitad de la imagen
                    let sy = p.random(imagenglitchImg.height / 2); // para asegurar que no siempre sean bordes
                    let sw = p.random(imagenglitchImg.width / 5, imagenglitchImg.width / 1.5); // Ancho de la porción de la imagen fuente
                    let sh = p.random(imagenglitchImg.height / 5, imagenglitchImg.height / 1.5); // Alto de la porción de la imagen fuente

                    // Define la posición y tamaño donde se dibujará en el canvas
                    let dx = p.random(p.width);
                    let dy = p.random(p.height);
                    let dw, dh;

                    // Decidir si el glitch de imagen es una línea horizontal, vertical o un rectángulo más grande
                    let imageShapeType = p.random();
                    if (imageShapeType < 0.35) { // 35% de probabilidad de línea horizontal
                        dw = p.random(p.width * 0.3, p.width); // Muy ancho
                        dh = p.random(5, 15); // Muy delgado
                    } else if (imageShapeType < 0.70) { // 35% de probabilidad de línea vertical
                        dw = p.random(5, 15); // Muy delgado
                        dh = p.random(p.height * 0.3, p.height); // Muy alto
                    } else { // 30% de probabilidad de rectángulo más "normal" y visible
                        dw = p.random(p.width * 0.1, p.width * 0.6); // Rango más amplio para rectángulos
                        dh = p.random(p.height * 0.05, p.height * 0.2); // Rango más amplio para rectángulos
                    }
                    // Añade la transparencia al objeto glitch para usarla en p.tint()
                    let alpha = p.random(150, 255);
                    glitches.push({ type: 'image', x: dx, y: dy, w: dw, h: dh, sx: sx, sy: sy, sw: sw, sh: sh, alpha: alpha, vx: vx, vy: vy });
                }
            }

            // Limitar el número total de glitches para evitar sobrecarga de rendimiento.
            // Esto asegura que el array de glitches no crezca indefinidamente.
            const maxGlitchesToKeep = 500; // Se mantiene en 500 como en tu código original.
            if (glitches.length > maxGlitchesToKeep) {
                glitches.splice(0, glitches.length - maxGlitchesToKeep); // Elimina los glitches más antiguos.
            }

            // Actualizar el mensaje de estado.
            if (counter === 0) {
                currentMessage = "Toca la pantalla para iniciar el ciclo...";
            } else if (counter < MAX_TOUCHES * 0.3) {
                currentMessage = `Integridad del sistema: ${counter}% - Todo parece estable, por ahora.`;
            } else if (counter < MAX_TOUCHES * 0.7) {
                currentMessage = `Integridad del sistema: ${counter}% - Se detectan anomalías.`;
            } else if (counter < MAX_TOUCHES) {
                currentMessage = `Integridad del sistema: ${counter}% - ¡Deterioro crítico!`;
            }

            // Si el contador llega al máximo, el celular "muere".
            if (counter >= MAX_TOUCHES) {
                isDead = true;
                currentMessage = "El dispositivo ha cumplido su ciclo."; // Este mensaje será reemplazado por la imagen en draw
                // Detiene el audio inmediatamente en el momento de la muerte
                if (isAudioStarted) {
                    osc.stop();
                    noise.stop();
                    isAudioStarted = false; // Resetea la bandera
                }
                // Programa el reinicio después del delay
                restartTimeoutId = setTimeout(resetSketch, restartDelay);
            }
        }
        return false; // Evita el comportamiento predeterminado del navegador para eventos táctiles (como el scroll).
    };

    // p.windowResized se ejecuta automáticamente cuando la ventana del navegador cambia de tamaño.
    p.windowResized = () => {
        // Recalcula el tamaño del canvas para mantener la proporción de celular y la responsividad.
        p.resizeCanvas(p.windowWidth, p.windowHeight);

        // Si el sketch estaba detenido (muerto), se asegura que el bucle esté activo para mostrar la imagen final.
        if (isDead) {
            p.loop();
        }
    };

    // Función para reiniciar el sketch a su estado inicial
    function resetSketch() {
        console.log("Reiniciando sketch..."); // Mensaje para depuración
        counter = 0;
        MAX_TOUCHES = Math.floor(Math.random() * 70) + 15; // Re-randomiza el número máximo de toques
        glitches = [];
        isDead = false;
        currentMessage = "Toca la pantalla para iniciar el ciclo...";
        isAudioStarted = false; // Asegúrate de que el audio se reinicie correctamente

        // Reinicia los osciladores si es necesario.
        osc.amp(0);
        noise.amp(0);

        p.loop(); // Reanuda el bucle draw() si se detuvo por alguna razón inesperada
        // Limpia cualquier timeout pendiente para evitar múltiples reinicios si se toca antes de que termine el delay.
        clearTimeout(restartTimeoutId);
    }
};

// Crea una nueva instancia de p5.js y pasa el objeto 'sketch' a ella.
// Esto inicializa y ejecuta tu sketch de p5.js.
new p5(sketch);