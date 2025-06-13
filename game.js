const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const SUPABASE_URL = 'https://sjjnwfeocowrjyyqcpsr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqam53ZmVvY293cmp5eXFjcHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NDAxMTYsImV4cCI6MjA2NDMxNjExNn0.Z_UAkHQLovomPmIZfI28QZgZdRnJnk-bugHP1Jl9NZM';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const playerName = localStorage.getItem("playerName") || "Anonymous";

const playerImg = new Image(); playerImg.src = "assets/player.png";
const bgImg = new Image(); bgImg.src = "assets/background.png";
const flyImg = new Image(); flyImg.src = "assets/fly.png";
const bombImg = new Image(); bombImg.src = "assets/bomb.png";
const clownImg = new Image(); clownImg.src = "assets/clown.png";
const gameOverImg = new Image(); gameOverImg.src = "assets/gameover.png";

const jumpSound = new Audio("assets/jump.wav");
const hitSound = new Audio("assets/hit.wav");
const gameoverSound = new Audio("assets/gameover.wav");

let player = { x: 50, y: 300, width: 80, height: 80, vy: 0, gravity: 0.6, jump: -18, jumpCount: 0, rotation: 0, rotationSpeed: 0, onGround: true };
let obstacles = [], keys = {}, lives = 5, score = 0, gameOver = false, gameOverSoundPlayed = false;
let gameStartTime = Date.now();
let joystickDirection = null; // Neuer Joystick-Status

// Joystick Setup (nipple.js)
const joystick = nipplejs.create({
    zone: document.getElementById('joystickZone'),
    mode: 'static',
    position: { left: '75px', bottom: '75px' },
    color: 'white',
    size: 120
});

joystick.on('dir', function (evt, data) {
    if (!gameOver) joystickDirection = data.direction.angle; // Richtung merken
});

joystick.on('end', function() {
    joystickDirection = null; // Beim Loslassen
});

function jump() {
    if (!gameOver && player.jumpCount < 2) {
        player.vy = player.jump;
        player.jumpCount++;
        player.rotationSpeed = Math.PI / 10;
        player.onGround = false;
        jumpSound.play().catch(() => {});
    }
}

window.addEventListener("keydown", e => {
    if (gameOver && e.code === "Enter") resetGame();
    else keys[e.code] = true;
});
window.addEventListener("keyup", e => keys[e.code] = false);
canvas.addEventListener("click", () => { if (gameOver) resetGame(); });

function goBack() {
    window.location.href = "https://www.monktard.io";
}

function spawnObstacle() {
    const type = Math.floor(Math.random() * 3);
    let o = { x: canvas.width, width: 40, height: 40, speed: 2, type: type };
    o.y = (type === 0) ? Math.random() * 200 + 50 : canvas.height - o.height;
    obstacles.push(o);
}

function draw() {
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(player.x + player.width/2, player.y + player.height/2);
    ctx.rotate(player.rotation);
    ctx.drawImage(playerImg, -player.width/2, -player.height/2, player.width, player.height);
    ctx.restore();

    obstacles.forEach(o => {
        let img = [flyImg, bombImg, clownImg][o.type];
        ctx.drawImage(img, o.x, o.y, o.width, o.height);
    });

    ctx.fillStyle = "white";
    ctx.font = "16px monospace";
    ctx.fillText("Lives: " + lives, 10, 20);
    ctx.fillText("Score: " + score, canvas.width - 100, 20);

    if (gameOver && gameOverImg.complete) {
        ctx.drawImage(gameOverImg, canvas.width/2 - 150, canvas.height/2 - 100, 300, 200);
        ctx.fillStyle = "white";
        ctx.font = "20px monospace";
        ctx.fillText("Press Enter or Click to Restart", canvas.width/2 - 140, canvas.height/2 + 120);
    }
}

function update() {
    if (!gameOver) {
        const speed = 4;
        // Tastatur-Steuerung
        if (keys["ArrowLeft"] && player.x > 0) player.x -= speed;
        if (keys["ArrowRight"] && player.x + player.width < canvas.width) player.x += speed;

        // Joystick-Steuerung
        if (joystickDirection === 'left' && player.x > 0) player.x -= speed;
        if (joystickDirection === 'right' && player.x + player.width < canvas.width) player.x += speed;

        // Jump (Tastatur)
        if ((keys["Space"] || keys["ArrowUp"]) && player.jumpCount < 2) {
            player.vy = player.jump; player.jumpCount++;
            player.rotationSpeed = Math.PI/10;
            player.onGround = false;
            jumpSound.play().catch(() => {});
            keys["Space"] = false;
        }

        // Gravity & Rotation
        player.vy += player.gravity;
        player.y += player.vy;
        if (player.y < 50) { player.y = 50; player.vy = 0; }
        if (player.y + player.height >= canvas.height) {
            player.y = canvas.height - player.height;
            player.vy = 0; player.jumpCount = 0;
            player.rotation = 0; player.rotationSpeed = 0; player.onGround = true;
        } else player.rotation += player.rotationSpeed;

        // Obstacles
        for (let i = obstacles.length-1; i >= 0; i--) {
            let o = obstacles[i]; o.x -= o.speed;
            if (o.x + o.width < 0) obstacles.splice(i, 1);
            if (collision(player, o)) {
                hitSound.play(); lives--; obstacles.splice(i,1);
                if (lives <= 0) { gameOver = true;
                    if (!gameOverSoundPlayed) {
                        gameoverSound.play(); gameOverSoundPlayed = true; endGame();
                    } return;
                }
            }
        }
        if (Date.now() - gameStartTime > 3000) if (Math.random() < 0.01) spawnObstacle();
        score++;
    }
}

function collision(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function gameLoop() { ctx.clearRect(0,0,canvas.width,canvas.height); update(); draw(); requestAnimationFrame(gameLoop); }

function resetGame() {
    Object.assign(player, {x:50,y:300,vy:0,jumpCount:0,rotation:0,rotationSpeed:0,onGround:true});
    obstacles = []; lives = 5; score = 0; gameOver = false; gameOverSoundPlayed = false;
    gameStartTime = Date.now();
    const c = document.getElementById("highscoreList"); if(c) c.style.display = 'none';
    document.getElementById("backButton").style.display = "none";
}

function endGame() {
    submitHighscore(playerName, score);
    showHighscores();
    document.getElementById("backButton").style.display = "block";
}

async function submitHighscore(name, score) {
    const { error } = await _supabase.from("highscores").insert([{ name, score }]);
    if (error) console.error("Fehler beim Senden:", error);
}
async function fetchHighscores() {
    const { data, error } = await _supabase.from("highscores").select("*").order("score",{ascending:false}).limit(10);
    if (error) { console.error("Fehler beim Abrufen:", error); return []; }
    return data;
}
async function showHighscores() {
    const scores = await fetchHighscores();
    const container = document.getElementById("highscoreList");
    if (!container) return;
    container.innerHTML = "<h2>Top 10 Highscores</h2>" + scores.map((s,i)=>`<div>${i+1}. ${s.name} – ${s.score}</div>`).join("");
    container.style.display = 'block';
}

gameLoop();
