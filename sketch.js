/*
 Pelota loca (neón):
 - Se mueve sola y rebota en los cuatro bordes de la pantalla.
 - En cada rebote emite un sonido, cambia de color y suelta destellos de ese color.
 - Al tocar el piso se deforma (squash & stretch) y vuelve a su forma redonda.
 - Si le pasas el cursor por encima, se aplasta como una mancha de pintura.
 - Del mouse salen partículas que viven 10 segundos.
 - La pelota tiene un halo neón sobre fondo negro.
*/

let posX, posY;
let velX, velY;
let radio = 25;

let huePelota = 0;       // tono actual de la pelota
let colorPelota;         // p5.Color derivado del tono
let deform = 0;          // deformación (0 = redonda, >0 aplastada, <0 estirada)
let deformVel = 0;       // velocidad de la deformación (física de resorte)

let destellos = [];      // chispas de cada rebote
let particulas = [];     // partículas del mouse (viven 10 s)
let mouseActivo = false; // ¿ya se movió el mouse alguna vez?

let osc, env;            // fuentes de sonido

let detenida = false;    // ¿el cursor está sobre la pelota?
let velXGuardada = 0;
let velYGuardada = 0;

let t = 0;               // tiempo para el vaivén impredecible

function setup(){
    createCanvas(windowWidth, windowHeight);
    posX = width / 2;
    posY = height / 3;
    velX = random(2, 5) * (random() < 0.5 ? -1 : 1);
    velY = 0;

    // HSB con alfa 0..100 para desvanecer y para el halo.
    colorMode(HSB, 360, 100, 100, 100);
    huePelota = random(360);
    colorPelota = color(huePelota, 85, 100);

    // Oscilador enrutado por una envolvente: así solo suena en los rebotes.
    osc = new p5.Oscillator('sine');
    env = new p5.Envelope(0.005, 0.06, 0.2, 0.2);   // attack, decay, sustain, release
    osc.disconnect();
    osc.connect(env);
    osc.start();            // se vuelve audible tras la primera interacción
}

function draw(){
    background(0);   // fondo negro para el look neón

    // ¿El cursor está encima de la pelota?
    let encima = dist(mouseX, mouseY, posX, posY) < radio;
    if (encima && !detenida){
        detenida = true;
        velXGuardada = velX;
        velYGuardada = velY;
        velX = 0;
        velY = 0;
    } else if (!encima && detenida){
        detenida = false;
        velX = velXGuardada;
        velY = velYGuardada;
    }

    // Deformación: resorte en el aire; mancha de pintura con el cursor encima.
    if (detenida){
        deform += (0.8 - deform) * 0.25;   // se aplasta y se queda plana
        deformVel = 0;
    } else {
        deformVel += -0.7 * deform;
        deformVel *= 0.55;
        deform += deformVel;
    }
    deform = constrain(deform, -0.12, 0.85);

    // Física
    if (!detenida){
        posX += velX;
        posY += velY;
        velY += 0.5;                                    // gravedad

        t += 0.01;
        velX += map(noise(t), 0, 1, -0.08, 0.08);       // vaivén horizontal

        // Borde izquierdo y derecho
        if (posX < radio){
            posX = radio;
            velX = abs(velX);
            rebotar();
        } else if (posX > width - radio){
            posX = width - radio;
            velX = -abs(velX);
            rebotar();
        }

        // Borde superior
        if (posY < radio){
            posY = radio;
            velY = abs(velY);
            rebotar();
        }

        // Borde inferior: se deforma y la energía cambia en cada choque
        if (posY > height - radio){
            posY = height - radio;
            deformVel += constrain(abs(velY) * 0.032, 0.14, 0.5); // impulso según el golpe
            velY = -random(10, 22);                     // a veces salta mucho, a veces poco
            velX += random(-1.5, 1.5);
            rebotar();
        }
    }

    // Partículas que salen del mouse
    crearParticulasMouse();
    dibujarParticulas();

    // Destellos de cada rebote
    dibujarDestellos();

    // Pelota con halo neón
    dibujarPelota();

    // Ayuda en pantalla
    fill(190, 25, 90);
    textSize(14);
    text('Mueve el mouse y haz clic para activar el sonido', 12, 22);
    if (detenida){
        text('Pelota detenida', 12, 42);
    }
}

// Crea partículas en la posición del mouse (2 por frame).
function crearParticulasMouse(){
    if (!mouseActivo) return;

    for (let i = 0; i < 2; i++){
        particulas.push({
            x: mouseX + random(-4, 4),
            y: mouseY + random(-4, 4),
            vx: random(-1.2, 1.2),
            vy: random(-1.6, 0.4),
            nacimiento: millis(),
            vida: 10000,              // 10 segundos
            tam: random(3, 9),
            h: random(360)            // cada partícula con su propio tono neón
        });
    }

    // Límite de seguridad para no acumular demasiadas.
    if (particulas.length > 2200){
        particulas.splice(0, particulas.length - 2200);
    }
}

// Mueve y dibuja las partículas, desvaneciéndolas durante sus 10 segundos.
function dibujarParticulas(){
    blendMode(ADD);
    noStroke();
    let ahora = millis();

    for (let i = particulas.length - 1; i >= 0; i--){
        let p = particulas[i];
        let edad = (ahora - p.nacimiento) / p.vida;   // 0..1
        if (edad >= 1){                                // murió a los 10 s
            particulas.splice(i, 1);
            continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.995;
        p.vy *= 0.995;

        fill(p.h, 85, 100, (1 - edad) * 55);           // se desvanecen
        circle(p.x, p.y, p.tam);
    }
    blendMode(BLEND);
}

// Dibuja la pelota redonda, aplastada al chocar o estirada como mancha,
// con un halo de luz neón.
function dibujarPelota(){
    let escalaX = 1 + deform * 0.8;
    let escalaY = 1 - deform;
    let mancha = constrain((deform - 0.4) / 0.45, 0, 1);  // 0 = redonda, 1 = mancha

    push();
    translate(posX, posY + radio);   // base de la pelota
    scale(escalaX, escalaY);
    noStroke();

    // Halo neón: capas aditivas del color de la pelota.
    blendMode(ADD);
    for (let i = 10; i >= 1; i--){
        let d = radio * 2 * (1 + i * 0.22);
        fill(huePelota, 85, 100, 4);
        ellipse(0, -radio, d, d);
    }
    blendMode(BLEND);

    // Cuerpo de la pelota.
    fill(huePelota, 80, 100);
    if (mancha > 0.01){
        // Contorno irregular, como una mancha de pintura.
        beginShape();
        let pasos = 60;
        for (let i = 0; i < pasos; i++){
            let a = TWO_PI * i / pasos;
            let ruido = noise(cos(a) + 10, sin(a) + 10);
            let r = radio * (1 + mancha * map(ruido, 0, 1, -0.25, 0.4));
            vertex(cos(a) * r, -radio + sin(a) * r);
        }
        endShape(CLOSE);
    } else {
        ellipse(0, -radio, radio * 2, radio * 2);
    }

    // Núcleo brillante (efecto neón).
    fill(huePelota, 20, 100, 90);
    let nucleo = radio * 0.7;
    ellipse(0, -radio, nucleo * 2, nucleo * 2);

    pop();
}

// Crea un puñado de destellos del color indicado.
function crearDestellos(x, y, h){
    for (let i = 0; i < 16; i++){
        let ang = random(TWO_PI);
        let rapidez = random(2, 8);
        destellos.push({
            x: x, y: y,
            vx: cos(ang) * rapidez,
            vy: sin(ang) * rapidez,
            vida: 1,
            tam: random(4, 10),
            h: h
        });
    }
}

function dibujarDestellos(){
    blendMode(ADD);
    noStroke();
    for (let i = destellos.length - 1; i >= 0; i--){
        let d = destellos[i];
        d.x += d.vx;
        d.y += d.vy;
        d.vx *= 0.97;
        d.vy = d.vy * 0.97 + 0.15;   // caen un poco
        d.vida -= 0.03;
        if (d.vida <= 0){
            destellos.splice(i, 1);
            continue;
        }
        fill(d.h, 85, 100, d.vida * 100);
        circle(d.x, d.y, d.tam * d.vida);
    }
    blendMode(BLEND);
}

// Genera un "blip" corto, cambia el color y suelta destellos en cada choque.
function rebotar(){
    osc.freq(random(220, 700), 0.02);
    env.play();
    huePelota = random(360);
    colorPelota = color(huePelota, 85, 100);
    crearDestellos(posX, posY, huePelota);
}

// Los navegadores solo permiten audio después de una interacción del usuario.
function mousePressed(){
    mouseActivo = true;
    userStartAudio();
}

function mouseMoved(){
    mouseActivo = true;
}

function touchStarted(){
    mouseActivo = true;
    userStartAudio();
}

function keyPressed(){
    userStartAudio();
}

function windowResized(){
    resizeCanvas(windowWidth, windowHeight);
}
