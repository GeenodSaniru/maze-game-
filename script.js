/* Maze Escape Game - Core Logic */
(function () {
	'use strict';

	// Canvas and UI
	const canvas = document.getElementById('gameCanvas');
	const ctx = canvas.getContext('2d');
	const levelText = document.getElementById('levelText');
	const timerText = document.getElementById('timerText');
	const scoreText = document.getElementById('scoreText');
	const highScoreText = document.getElementById('highScoreText');
	const restartBtn = document.getElementById('restartBtn');
	const muteBtn = document.getElementById('muteBtn');
	const overlay = document.getElementById('overlay');
	const popupTitle = document.getElementById('popupTitle');
	const popupMessage = document.getElementById('popupMessage');
	const nextBtn = document.getElementById('nextBtn');
	const leaderboardList = document.getElementById('leaderboardList');
	const joystick = document.getElementById('joystick');
	const startMenu = document.getElementById('startMenu');
	const startGameBtn = document.getElementById('startGameBtn');
	const playerNameInput = document.getElementById('playerName');

	// Audio (WebAudio for SFX/BGM)
	let audioCtx = null;
	let bgmNode = null;
	let isMuted = false;
	// Restore mute preference
	try {
		isMuted = localStorage.getItem('maze_muted') === '1';
		muteBtn.setAttribute('aria-pressed', String(!isMuted));
		muteBtn.textContent = isMuted ? '🔇 Muted' : '🔊 Sound';
	} catch (_) {}

	function ensureAudio() {
		if (!audioCtx) {
			try {
				audioCtx = new (window.AudioContext || window.webkitAudioContext)();
			} catch (e) {
				console.warn('WebAudio not supported');
			}
		}
	}

	function playBeep({ freq = 440, duration = 0.07, type = 'sine', gain = 0.08 } = {}) {
		if (isMuted || !audioCtx) return;
		const osc = audioCtx.createOscillator();
		const g = audioCtx.createGain();
		osc.type = type;
		osc.frequency.value = freq;
		g.gain.value = gain;
		osc.connect(g).connect(audioCtx.destination);
		osc.start();
		osc.stop(audioCtx.currentTime + duration);
	}

	function playVictory() {
		if (isMuted || !audioCtx) return;
		// Simple arpeggio
		const notes = [523.25, 659.25, 783.99, 1046.5];
		notes.forEach((f, i) => {
			setTimeout(() => playBeep({ freq: f, duration: 0.12, type: 'triangle', gain: 0.12 }), i * 120);
		});
	}

	function playAlert() {
		if (isMuted || !audioCtx) return;
		playBeep({ freq: 220, duration: 0.15, type: 'square', gain: 0.12 });
		setTimeout(() => playBeep({ freq: 180, duration: 0.15, type: 'square', gain: 0.12 }), 100);
	}

	function startBgm() {
		if (isMuted || !audioCtx || bgmNode) return;
		// Simple bass + lead loop
		const tempo = 100; // bpm
		const beat = 60 / tempo;

		const master = audioCtx.createGain();
		master.gain.value = 0.06;
		master.connect(audioCtx.destination);

		const baseNow = audioCtx.currentTime + 0.05;
		for (let bar = 0; bar < 4; bar++) {
			for (let step = 0; step < 8; step++) {
				const t = baseNow + (bar * 8 + step) * (beat / 2);
				// Bass
				const bassFreqs = [110, 110, 110, 110, 98, 98, 110, 110];
				const bOsc = audioCtx.createOscillator();
				const bGain = audioCtx.createGain();
				bOsc.type = 'sawtooth';
				bOsc.frequency.value = bassFreqs[step];
				bGain.gain.setValueAtTime(0.0, t);
				bGain.gain.linearRampToValueAtTime(0.08, t + 0.01);
				bGain.gain.exponentialRampToValueAtTime(0.002, t + 0.25);
				bOsc.connect(bGain).connect(master);
				bOsc.start(t);
				bOsc.stop(t + 0.3);

				// Lead every other step
				if (step % 2 === 0) {
					const lead = audioCtx.createOscillator();
					const lGain = audioCtx.createGain();
					lead.type = 'triangle';
					const scale = [440, 494, 523, 587, 659, 698, 784];
					lead.frequency.value = scale[(bar + step) % scale.length];
					lGain.gain.setValueAtTime(0.0, t);
					lGain.gain.linearRampToValueAtTime(0.06, t + 0.01);
					lGain.gain.exponentialRampToValueAtTime(0.002, t + 0.25);
					lead.connect(lGain).connect(master);
					lead.start(t);
					lead.stop(t + 0.3);
				}
			}
		}

		// Dummy node to indicate bgm queued; will be nulled when we schedule next
		bgmNode = master;
		// Reschedule periodically
		setTimeout(() => { bgmNode = null; if (!isMuted) startBgm(); }, 4 * 8 * (beat / 2) * 1000);
	}

	function toggleMute() {
		isMuted = !isMuted;
		try { localStorage.setItem('maze_muted', isMuted ? '1' : '0'); } catch (_) {}
		muteBtn.setAttribute('aria-pressed', String(!isMuted));
		muteBtn.textContent = isMuted ? '🔇 Muted' : '🔊 Sound';
		if (!isMuted) {
			ensureAudio();
			startBgm();
		}
	}

	// Maze definitions: 0 empty, 1 wall
	// Start at (1,1) after border is applied; Exit at (cols-2, rows-2)
	const BASE_MAZES = [
		// Level 1 - Easy 15x11 (more open)
		{
			grid: [
				[0,0,0,0,1,0,0,0,0,0,0,1,0,0,0],
				[1,1,1,0,1,0,1,1,1,1,0,1,0,1,0],
				[0,0,1,0,0,0,0,0,0,1,0,0,0,1,0],
				[0,1,1,1,1,1,1,1,0,1,1,1,0,1,0],
				[0,1,0,0,0,0,0,1,0,0,0,1,0,0,0],
				[0,1,0,1,1,1,0,1,1,1,0,1,1,1,0],
				[0,0,0,1,0,0,0,0,0,1,0,0,0,1,0],
				[1,1,0,1,0,1,1,1,0,1,1,1,0,1,0],
				[0,0,0,0,0,0,0,1,0,0,0,0,0,1,0],
				[0,1,1,1,1,1,0,1,1,1,1,1,0,1,0],
				[0,0,0,0,0,0,0,0,0,1,0,0,0,0,0]
			],
			timeLimit: 60
		},
		// Level 2 - Medium 19x13 (tighter corridors)
		{
			grid: [
				[0,0,0,1,0,0,0,0,0,1,0,0,1,0,0,0,1,0,0],
				[1,1,0,1,0,1,1,1,0,1,0,0,1,0,1,0,1,1,0],
				[0,0,0,0,0,1,0,1,0,0,0,1,0,0,1,0,0,0,0],
				[0,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,1,1,0],
				[0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0],
				[0,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,0],
				[0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,1,0,0,0],
				[1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,0],
				[0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0],
				[0,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,0,1,0],
				[0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0],
				[1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,0,1,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
			],
			timeLimit: 45
		},
		// Level 3 - Hard 23x15 (dense labyrinth)
		{
			grid: [
				[0,0,0,1,0,0,0,0,1,0,0,0,1,0,0,1,0,0,0,0,1,0,0],
				[1,1,0,1,0,1,1,0,1,0,1,0,1,0,1,1,0,1,1,0,1,1,0],
				[0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0],
				[0,1,1,1,1,0,1,1,1,0,1,1,1,1,1,0,1,0,1,1,1,1,0],
				[0,1,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,1,0],
				[0,1,0,1,1,1,1,0,1,1,1,1,0,1,0,1,1,1,1,1,0,1,0],
				[0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
				[1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1],
				[0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
				[1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
			],
			timeLimit: 40
		},
		// Level 4 - Expert 25x15 (narrow passages, longer path)
		{
			grid: [
				[0,0,1,0,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0,1,0,0],
				[1,0,1,0,1,0,1,0,1,1,1,0,1,1,0,1,1,0,1,1,1,0,1,1,0],
				[1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0],
				[1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,1,1,1,1,1,0],
				[0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
				[0,1,1,1,1,1,1,0,1,1,1,1,0,1,0,1,1,1,1,1,0,1,1,1,0],
				[0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1,0],
				[1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0],
				[0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0],
				[1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
			],
			timeLimit: 35
		},
		// Level 5 - Master 27x17 (tightest maze, minimal time)
		{
			grid: [
				[0,0,1,0,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0],
				[1,0,1,0,1,0,1,0,1,1,1,0,1,1,0,1,1,0,1,1,1,0,1,1,1,1,0],
				[1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0],
				[1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,0],
				[0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0],
				[0,1,1,1,1,1,1,0,1,1,1,1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,0],
				[0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0],
				[1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1],
				[0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
				[1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
			],
			timeLimit: 30
		}
	];

	// Utility: apply outer border walls and add decoy branches
	function withBorder(grid) {
		const rows = grid.length;
		const cols = grid[0].length;
		const out = Array.from({ length: rows + 2 }, (_, y) =>
			Array.from({ length: cols + 2 }, (_, x) => (y === 0 || x === 0 || y === rows + 1 || x === cols + 1 ? 1 : grid[y - 1][x - 1]))
		);
		return out;
	}
	function addBranches(grid, openings = 12) {
		const rows = grid.length, cols = grid[0].length;
		let tries = 0, made = 0;
		while (made < openings && tries < openings * 20) {
			tries++;
			const x = 1 + Math.floor(Math.random() * (cols - 2));
			const y = 1 + Math.floor(Math.random() * (rows - 2));
			if (grid[y][x] === 1) {
				// Open walls that create branches (at least two neighboring corridors)
				const neighbors = [grid[y - 1][x], grid[y + 1][x], grid[y][x - 1], grid[y][x + 1]];
				const emptyCount = neighbors.filter((v) => v === 0).length;
				if (emptyCount >= 2 && emptyCount <= 3) {
					grid[y][x] = 0;
					made++;
				}
			}
		}
		return grid;
	}

	// Helper: BFS connectivity check between start and exit
	function isConnected(grid, start, exit) {
		const rows = grid.length, cols = grid[0].length;
		const q = [start];
		const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
		seen[start.cy][start.cx] = true;
		const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
		while (q.length) {
			const { cx, cy } = q.shift();
			if (cx === exit.cx && cy === exit.cy) return true;
			for (const [dx, dy] of dirs) {
				const nx = cx + dx, ny = cy + dy;
				if (nx>=0 && ny>=0 && nx<cols && ny<rows && !seen[ny][nx] && grid[ny][nx]===0) {
					seen[ny][nx] = true; q.push({ cx: nx, cy: ny });
				}
			}
		}
		return false;
	}

	// Densify: add extra walls (harder). Bias center if biasCenter=true
	function densifyMaze(grid, numWalls, biasCenter = false) {
		const rows = grid.length, cols = grid[0].length;
		const start = { cx: 1, cy: 1 };
		const exit = { cx: cols - 2, cy: rows - 2 };
		let placed = 0, attempts = 0;
		while (placed < numWalls && attempts < numWalls * 40) {
			attempts++;
			let x = 1 + Math.floor(Math.random() * (cols - 2));
			let y = 1 + Math.floor(Math.random() * (rows - 2));
			if (biasCenter) {
				const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
				// Pull samples toward center
				x = Math.min(cols - 2, Math.max(1, Math.round((x + cx) / 2)));
				y = Math.min(rows - 2, Math.max(1, Math.round((y + cy) / 2)));
			}
			if (grid[y][x] !== 0) continue;
			if ((x === start.cx && y === start.cy) || (x === exit.cx && y === exit.cy)) continue;
			// Temporarily place wall and verify connectivity remains
			grid[y][x] = 1;
			if (isConnected(grid, start, exit)) {
				placed++;
			} else {
				grid[y][x] = 0; // revert
			}
		}
		return grid;
	}

	const MAZES = BASE_MAZES.map((lvl, i) => {
		const bordered = withBorder(lvl.grid.map((row) => row.slice()));
		// More branches on later levels
		const extra = 6 + i * 6;
		let g = addBranches(bordered, extra);
		// Add extra blocking walls for higher levels while keeping solvable
		if (i >= 2 && i < 4) {
			g = densifyMaze(g, 20 + i * 6, false);
		}
		if (i >= 4) {
			g = densifyMaze(g, 60, true); // heavy center-biased walls for level 5
		}
		return { grid: g, timeLimit: lvl.timeLimit };
	});

	// Enemy difficulty per level
	const ENEMY_SPEED_BY_LEVEL = [30, 35, 45, 80, 130];
	const ENEMY_REPATH_MS_BY_LEVEL = [550, 500, 420, 240, 160];
	const ENEMY_GRACE_SECONDS_BY_LEVEL = [8, 6, 4, 2, 0];

	// Game state
	let currentLevelIndex = 0;
	let grid = MAZES[currentLevelIndex].grid;
	let rows = grid.length;
	let cols = grid[0].length;
	let tileSize = Math.floor(Math.min(canvas.width / cols, canvas.height / rows));
	let offsetX = Math.floor((canvas.width - cols * tileSize) / 2);
	let offsetY = Math.floor((canvas.height - rows * tileSize) / 2);

	const player = {
		x: offsetX + tileSize * 1.5,
		y: offsetY + tileSize * 1.5,
		radius: Math.max(6, Math.floor(tileSize * 0.28)),
		speed: 150,
		vx: 0,
		vy: 0
	};

	// Enemy (Pac-Man-like)
	const enemy = {
		cx: 0,
		cy: 0,
		radius: 0,
		speed: 120,
		repathMs: 220,
		lastPathAt: 0,
		path: [], // list of cells to follow
		mouthPhase: 0,
		chaseEnabledAt: 0, // timestamp (ms) when chasing is allowed
		lastMoveAt: 0 // timestamp (ms) of last movement
	};

	let exitCell = { cx: cols - 2, cy: rows - 2 };
	let timeLeft = MAZES[currentLevelIndex].timeLimit;
	let score = 0;
	let highScore = Number(localStorage.getItem('maze_high_score') || '0');
	let leaderboard = JSON.parse(localStorage.getItem('maze_leaderboard') || '[]');
	let lastTs = 0;
	let running = true;
	let lastAlertBeepSec = null;
	let playerName = 'Player';
	let gameStarted = false;

	function resizeMetrics() {
		grid = MAZES[currentLevelIndex].grid;
		rows = grid.length;
		cols = grid[0].length;
		tileSize = Math.floor(Math.min(canvas.width / cols, canvas.height / rows));
		offsetX = Math.floor((canvas.width - cols * tileSize) / 2);
		offsetY = Math.floor((canvas.height - rows * tileSize) / 2);
		player.radius = Math.max(6, Math.floor(tileSize * 0.28));
		enemy.radius = Math.max(6, Math.floor(tileSize * 0.3));
	}

	function resetPlayer() {
		player.x = offsetX + tileSize * 1.5;
		player.y = offsetY + tileSize * 1.5;
		player.vx = 0;
		player.vy = 0;
	}

	function spawnEnemy() {
		// spawn on a free cell far from player start
		const minManhattan = Math.floor((cols + rows) / 3);
		const start = { cx: 1, cy: 1 };
		const candidates = [
			{ cx: cols - 3, cy: rows - 3 },
			{ cx: Math.floor(cols / 2), cy: Math.floor(rows / 2) },
			{ cx: cols - 3, cy: 2 },
			{ cx: 2, cy: rows - 3 }
		];
		function ok(c){
			return grid[c.cy] && grid[c.cy][c.cx] === 0 && (Math.abs(c.cx - start.cx) + Math.abs(c.cy - start.cy)) >= minManhattan;
		}
		for (const c of candidates) {
			if (ok(c)) { enemy.cx = c.cx; enemy.cy = c.cy; enemy.path = []; return; }
		}
		// fallback scan for distant free tile
		for (let y = rows - 2; y >= 1; y--) {
			for (let x = cols - 2; x >= 1; x--) {
				if (grid[y][x] === 0 && (Math.abs(x - start.cx) + Math.abs(y - start.cy)) >= minManhattan) { enemy.cx = x; enemy.cy = y; enemy.path = []; return; }
			}
		}
		// ultimate fallback any free
		for (let y = rows - 2; y >= 1; y--) {
			for (let x = cols - 2; x >= 1; x--) {
				if (grid[y][x] === 0) { enemy.cx = x; enemy.cy = y; enemy.path = []; return; }
			}
		}
	}

	function loadLevel(index) {
		currentLevelIndex = Math.max(0, Math.min(MAZES.length - 1, index));
		resizeMetrics();
		exitCell = { cx: cols - 2, cy: rows - 2 };
		timeLeft = MAZES[currentLevelIndex].timeLimit;
		lastAlertBeepSec = null;
		levelText.textContent = String(currentLevelIndex + 1);
		resetPlayer();
		spawnEnemy();
		enemy.lastPathAt = 0;
		// Apply enemy difficulty for this level
		enemy.speed = ENEMY_SPEED_BY_LEVEL[currentLevelIndex] || ENEMY_SPEED_BY_LEVEL[ENEMY_SPEED_BY_LEVEL.length - 1];
		enemy.repathMs = ENEMY_REPATH_MS_BY_LEVEL[currentLevelIndex] || ENEMY_REPATH_MS_BY_LEVEL[ENEMY_REPATH_MS_BY_LEVEL.length - 1];
		// Set chase grace period
		enemy.chaseEnabledAt = performance.now() + (ENEMY_GRACE_SECONDS_BY_LEVEL[currentLevelIndex] || 0) * 1000;
	}

	function drawGrid() {
		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++) {
				const v = grid[y][x];
				const px = offsetX + x * tileSize;
				const py = offsetY + y * tileSize;
				if (v === 1) {
					const grd = ctx.createLinearGradient(px, py, px + tileSize, py + tileSize);
					grd.addColorStop(0, 'rgba(77,214,255,0.65)');
					grd.addColorStop(1, 'rgba(166,107,255,0.65)');
					ctx.fillStyle = grd;
					ctx.shadowColor = 'rgba(166,107,255,0.45)';
					ctx.shadowBlur = 12;
					ctx.fillRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
				}
			}
		}
		ctx.shadowBlur = 0;
	}

	function drawExit() {
		const px = offsetX + exitCell.cx * tileSize;
		const py = offsetY + exitCell.cy * tileSize;
		const grd = ctx.createLinearGradient(px, py, px + tileSize, py + tileSize);
		grd.addColorStop(0, 'rgba(82,255,168,0.8)');
		grd.addColorStop(1, 'rgba(82,255,168,0.2)');
		ctx.fillStyle = grd;
		ctx.shadowColor = 'rgba(82,255,168,0.7)';
		ctx.shadowBlur = 16;
		const pad = Math.sin(performance.now() / 300) * 2 + 4;
		ctx.fillRect(px + pad, py + pad, tileSize - pad * 2, tileSize - pad * 2);
		ctx.shadowBlur = 0;
	}

	function drawPlayer() {
		ctx.beginPath();
		ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
		const rad = ctx.createRadialGradient(player.x, player.y, 2, player.x, player.y, player.radius);
		rad.addColorStop(0, 'rgba(255,216,77,1)');
		rad.addColorStop(1, 'rgba(255,216,77,0.1)');
		ctx.fillStyle = rad;
		ctx.shadowColor = 'rgba(255,216,77,0.8)';
		ctx.shadowBlur = 18;
		ctx.fill();
		ctx.shadowBlur = 0;
	}

	function drawEnemy() {
		// Pac-Man-like wedge animation
		const ex = offsetX + (enemy.cx + 0.5) * tileSize;
		const ey = offsetY + (enemy.cy + 0.5) * tileSize;
		const r = Math.max(6, Math.floor(tileSize * 0.32));
		const t = performance.now() / 200;
		const mouth = (Math.sin(t) * 0.35 + 0.45) * Math.PI / 4; // open/close
		// Direction toward next path cell for heading
		let angle = 0;
		if (enemy.path && enemy.path.length > 0) {
			const next = enemy.path[0];
			const dx = next.cx - enemy.cx;
			const dy = next.cy - enemy.cy;
			if (Math.abs(dx) > Math.abs(dy)) angle = dx > 0 ? 0 : Math.PI;
			else angle = dy > 0 ? Math.PI / 2 : -Math.PI / 2;
		}
		ctx.save();
		ctx.translate(ex, ey);
		ctx.rotate(angle);
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.arc(0, 0, r, mouth, Math.PI * 2 - mouth, false);
		ctx.closePath();
		const fill = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
		fill.addColorStop(0, 'rgba(255,120,120,1)');
		fill.addColorStop(1, 'rgba(255,120,120,0.15)');
		ctx.fillStyle = fill;
		ctx.shadowColor = 'rgba(255,120,120,0.8)';
		ctx.shadowBlur = 16;
		ctx.fill();
		ctx.restore();
		ctx.shadowBlur = 0;
	}

	function clearCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); }

	function isWallCell(cx, cy) {
		if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return true;
		return grid[cy][cx] === 1;
	}
	function isWallAtPos(x, y) {
		const gx = Math.floor((x - offsetX) / tileSize);
		const gy = Math.floor((y - offsetY) / tileSize);
		return isWallCell(gx, gy);
	}

	function isAtExit() {
		const gx = Math.floor((player.x - offsetX) / tileSize);
		const gy = Math.floor((player.y - offsetY) / tileSize);
		return gx === exitCell.cx && gy === exitCell.cy;
	}

	// Pathfinding (BFS) from enemy to player cell; slight randomness to mimic unpredictability
	function bfsPath(start, goal) {
		const q = [start];
		const prev = new Map();
		const key = (c) => `${c.cx},${c.cy}`;
		prev.set(key(start), null);
		const deltas = [ {dx:1,dy:0}, {dx:-1,dy:0}, {dx:0,dy:1}, {dx:0,dy:-1} ];
		while (q.length) {
			const cur = q.shift();
			if (cur.cx === goal.cx && cur.cy === goal.cy) break;
			// shuffle neighbors slightly
			for (const d of deltas.sort(() => Math.random() - 0.5)) {
				const nx = cur.cx + d.dx, ny = cur.cy + d.dy;
				if (!isWallCell(nx, ny)) {
					const k = `${nx},${ny}`;
					if (!prev.has(k)) { prev.set(k, cur); q.push({ cx: nx, cy: ny }); }
				}
			}
		}
		// reconstruct
		const path = [];
		let curKey = key(goal);
		if (!prev.has(curKey)) return [];
		let cur = goal;
		while (cur) {
			path.push(cur);
			const p = prev.get(key(cur));
			cur = p;
		}
		path.reverse();
		// drop the first cell if it's the start
		if (path.length && path[0].cx === start.cx && path[0].cy === start.cy) path.shift();
		return path;
	}

	function enemyUpdate(dt, ts) {
		// Determine player's grid cell
		const pcx = Math.floor((player.x - offsetX) / tileSize);
		const pcy = Math.floor((player.y - offsetY) / tileSize);

		const chasing = ts >= enemy.chaseEnabledAt;
		if (chasing) {
			// Recompute path periodically to player
			if (ts - enemy.lastPathAt > enemy.repathMs) {
				enemy.path = bfsPath({ cx: enemy.cx, cy: enemy.cy }, { cx: pcx, cy: pcy });
				enemy.lastPathAt = ts;
			}
		} else {
			// Grace period: wander away from player
			if (ts - enemy.lastPathAt > enemy.repathMs) {
				// pick a random valid neighbor that increases distance from player
				const choices = [];
				const options = [ {dx:1,dy:0}, {dx:-1,dy:0}, {dx:0,dy:1}, {dx:0,dy:-1} ];
				const curDist = Math.abs(enemy.cx - pcx) + Math.abs(enemy.cy - pcy);
				for (const o of options) {
					const nx = enemy.cx + o.dx, ny = enemy.cy + o.dy;
					if (!isWallCell(nx, ny)) {
						const nd = Math.abs(nx - pcx) + Math.abs(ny - pcy);
						if (nd >= curDist) choices.push({ cx: nx, cy: ny });
					}
				}
				if (choices.length === 0) {
					for (const o of options) {
						const nx = enemy.cx + o.dx, ny = enemy.cy + o.dy;
						if (!isWallCell(nx, ny)) choices.push({ cx: nx, cy: ny });
					}
				}
				enemy.path = choices.length ? [choices[Math.floor(Math.random() * choices.length)]] : [];
				enemy.lastPathAt = ts;
			}
		}

		// Move step along path - only 1 block per second
		if (enemy.path && enemy.path.length > 0 && ts - enemy.lastMoveAt >= 1000) {
			const next = enemy.path[0];
			if (next.cx === enemy.cx && next.cy === enemy.cy) {
				enemy.path.shift();
			} else {
				enemy.cx = next.cx;
				enemy.cy = next.cy;
				enemy.path.shift();
				enemy.lastMoveAt = ts;
			}
		}
	}

	function checkEnemyCollision() {
		const ex = offsetX + (enemy.cx + 0.5) * tileSize;
		const ey = offsetY + (enemy.cy + 0.5) * tileSize;
		const dist = Math.hypot(player.x - ex, player.y - ey);
		if (dist < player.radius + Math.max(6, Math.floor(tileSize * 0.28))) {
			return true;
		}
		return false;
	}

	// Input handling (Arrow keys + WASD)
	const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, KeyW: false, KeyA: false, KeyS: false, KeyD: false };
	function handleKey(e, down) {
		const code = e.code || e.key;
		if (code in keys) {
			keys[code] = down;
			e.preventDefault();
			if (down) {
				ensureAudio();
				playBeep({ freq: 660, duration: 0.03, type: 'square', gain: 0.03 });
			}
		}
	}
	window.addEventListener('keydown', (e) => handleKey(e, true));
	window.addEventListener('keyup', (e) => handleKey(e, false));

	// Joystick (pointer events) with robust release handling
	const joyState = { up: false, down: false, left: false, right: false };
	function setJoy(dir, val) {
		joyState[dir] = val;
		if (val) {
			ensureAudio();
			playBeep({ freq: 640, duration: 0.03, type: 'square', gain: 0.03 });
		}
	}
	function onJoyDown(e) {
		const t = e.target;
		if (t.classList && t.classList.contains('joy-btn')) {
			const d = t.getAttribute('data-dir');
			if (d) setJoy(d, true);
			e.preventDefault();
		}
	}
	function onJoyUp(e) {
		const t = e.target;
		if (t && t.classList && t.classList.contains('joy-btn')) {
			const d = t.getAttribute('data-dir');
			if (d) setJoy(d, false);
			e.preventDefault();
		}
	}
	joystick.addEventListener('pointerdown', onJoyDown);
	joystick.addEventListener('pointerup', onJoyUp);
	joystick.addEventListener('pointercancel', () => { joyState.up = joyState.down = joyState.left = joyState.right = false; });
	joystick.addEventListener('pointerleave', () => { joyState.up = joyState.down = joyState.left = joyState.right = false; });
	window.addEventListener('pointerup', () => { joyState.up = joyState.down = joyState.left = joyState.right = false; });

	// Movement and update
	function update(dt) {
		if (!running) return;
		// Velocity from input
		const up = keys.ArrowUp || keys.KeyW || joyState.up;
		const down = keys.ArrowDown || keys.KeyS || joyState.down;
		const left = keys.ArrowLeft || keys.KeyA || joyState.left;
		const right = keys.ArrowRight || keys.KeyD || joyState.right;

		let vx = 0, vy = 0;
		if (up) vy -= 1;
		if (down) vy += 1;
		if (left) vx -= 1;
		if (right) vx += 1;
		if (vx !== 0 || vy !== 0) {
			const len = Math.hypot(vx, vy) || 1;
			vx = (vx / len) * player.speed;
			vy = (vy / len) * player.speed;
		} else { vx = vy = 0; }
		player.vx = vx; player.vy = vy;

		// Attempt move in small steps for collision robustness
		const steps = 4;
		const stepX = (player.vx * dt) / steps;
		const stepY = (player.vy * dt) / steps;
		for (let i = 0; i < steps; i++) {
			const nx = player.x + stepX;
			const ny = player.y + stepY;
			if (!isWallAtPos(nx, player.y)) player.x = nx;
			if (!isWallAtPos(player.x, ny)) player.y = ny;
		}
		player.x = Math.max(offsetX + player.radius, Math.min(offsetX + cols * tileSize - player.radius, player.x));
		player.y = Math.max(offsetY + player.radius, Math.min(offsetY + rows * tileSize - player.radius, player.y));

		// Enemy thinks and moves
		enemyUpdate(dt, performance.now());
		if (checkEnemyCollision()) {
			running = false;
			showPopup('Caught by the enemy 👾', `Game Over! Final Score: ${score}`);
			nextBtn.textContent = 'Back to Menu';
			updateHighScores(score);
			return;
		}

		// Timer
		const prev = Math.ceil(timeLeft);
		timeLeft -= dt;
		const nowSec = Math.ceil(timeLeft);
		if (timeLeft <= 10 && nowSec !== lastAlertBeepSec) {
			lastAlertBeepSec = nowSec;
			if (nowSec > 0) playAlert();
		}
		if (timeLeft <= 0) {
			timeLeft = 0;
			running = false;
			showPopup('Time Up ⏳', `Game Over! Final Score: ${score}`);
			nextBtn.textContent = 'Back to Menu';
			updateHighScores(score);
			return;
		}

		// Exit detection
		if (isAtExit()) {
			running = false;
			const bonus = Math.ceil(timeLeft) * 10 + (currentLevelIndex + 1) * 120;
			score += bonus;
			scoreText.textContent = String(score);
			playVictory();
			if (currentLevelIndex === MAZES.length - 1) {
				showPopup('You Escaped the Maze! 🎉', `Final Score: ${score}`);
				nextBtn.textContent = 'Play Again';
				updateHighScores(score);
			} else {
				showPopup('Level Cleared 🎉', `Bonus +${bonus}. Next Level ${currentLevelIndex + 2}.`);
				nextBtn.textContent = 'Next Level';
			}
		}
	}

	function render() {
		clearCanvas();
		drawGrid();
		drawExit();
		drawPlayer();
		drawEnemy();
	}

	function loop(ts) {
		const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
		lastTs = ts;
		update(dt);
		render();
		updateHud();
		requestAnimationFrame(loop);
	}

	function updateHud() {
		timerText.textContent = String(Math.ceil(timeLeft));
		scoreText.textContent = String(score);
		highScoreText.textContent = String(highScore);
	}

	// Overlay
	function showPopup(title, message) {
		popupTitle.textContent = title;
		popupMessage.textContent = message;
		overlay.classList.remove('hidden');
	}
	function hidePopup() {
		overlay.classList.add('hidden');
	}

	// Leaderboard
	function updateHighScores(finalScore) {
		highScore = Math.max(highScore, finalScore);
		localStorage.setItem('maze_high_score', String(highScore));

		leaderboard.push({ score: finalScore, ts: Date.now(), name: playerName });
		leaderboard.sort((a, b) => b.score - a.score);
		leaderboard = leaderboard.slice(0, 5);
		localStorage.setItem('maze_leaderboard', JSON.stringify(leaderboard));
		renderLeaderboard();
	}

	function renderLeaderboard() {
		leaderboardList.innerHTML = '';
		if (leaderboard.length === 0) {
			const li = document.createElement('li');
			li.textContent = 'No scores yet — be the first!';
			leaderboardList.appendChild(li);
			return;
		}
		leaderboard.forEach((entry, i) => {
			const li = document.createElement('li');
			const date = new Date(entry.ts);
			const name = entry.name || 'Anonymous';
			li.textContent = `#${i + 1} — ${name}: ${entry.score} pts (${date.toLocaleDateString()})`;
			leaderboardList.appendChild(li);
		});
	}

	// Controls
	restartBtn.addEventListener('click', () => {
		startGame(true);
	});
	muteBtn.addEventListener('click', () => {
		toggleMute();
	});
	nextBtn.addEventListener('click', () => {
		hidePopup();
		if (nextBtn.textContent === 'Back to Menu') {
			showStartMenu();
		} else if (currentLevelIndex === MAZES.length - 1) {
			startGame(true);
		} else {
			loadLevel(currentLevelIndex + 1);
			running = true;
		}
	});
	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) hidePopup();
	});

	// Resize handling to keep crisp drawing
	function handleResize() {
		// Keep canvas internal size synced to CSS size for crispness
		const rect = canvas.getBoundingClientRect();
		const dpr = Math.max(1, window.devicePixelRatio || 1);
		const w = Math.floor(rect.width * dpr);
		const h = Math.floor(rect.height * dpr);
		if (canvas.width !== w || canvas.height !== h) {
			canvas.width = w;
			canvas.height = h;
			resizeMetrics();
			resetPlayer();
		}
	}
	window.addEventListener('resize', handleResize);

	// Start/Restart
	function startGame(resetAll = false) {
		ensureAudio();
		startBgm();
		hidePopup();
		hideStartMenu();
		if (resetAll) {
			currentLevelIndex = 0;
			score = 0;
		}
		loadLevel(currentLevelIndex);
		lastTs = 0;
		running = true;
		gameStarted = true;
	}

	function showStartMenu() {
		startMenu.classList.remove('hidden');
		overlay.classList.add('hidden');
		gameStarted = false;
		running = false;
	}

	function hideStartMenu() {
		startMenu.classList.add('hidden');
	}

	// Start menu controls
	startGameBtn.addEventListener('click', () => {
		playerName = playerNameInput.value.trim() || 'Player';
		startGame(true);
	});

	playerNameInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') {
			playerName = playerNameInput.value.trim() || 'Player';
			startGame(true);
		}
	});

	// Init
	renderLeaderboard();
	highScoreText.textContent = String(highScore);
	handleResize();
	showStartMenu();
	requestAnimationFrame(loop);
})();
