# Maze Escape Game 🎮

An interactive web-based maze escape game built with HTML, CSS, and JavaScript featuring neon visuals, intelligent AI enemies, and progressive difficulty.

## 🎯 Game Features

- **5 Progressive Levels** - Each level gets harder with tighter mazes and less time
- **Intelligent Enemy AI** - Pac-Man style enemy that chases the player with pathfinding
- **Neon Visual Theme** - Glowing walls, player, and exit with modern CSS effects
- **Multiple Controls** - Arrow keys, WASD, or on-screen joystick for mobile
- **Scoring System** - Time-based scoring with bonus points for quick completion
- **Leaderboard** - Top 5 scores saved locally with player names
- **Sound Effects** - WebAudio-based SFX and background music with mute option
- **Responsive Design** - Works on desktop and mobile devices

## 🎮 How to Play

1. **Objective**: Navigate from the start (top-left) to the exit (bottom-right)
2. **Avoid the Enemy**: The red enemy will chase you - don't let it catch you!
3. **Beat the Timer**: Each level has a countdown timer
4. **Score Points**: Earn points for remaining time and level completion bonuses

## 🕹️ Controls

- **Desktop**: Arrow Keys or WASD
- **Mobile**: On-screen joystick (appears automatically on touch devices)

## 🚀 Getting Started

### Option 1: Play Online
Simply open `index.html` in your web browser.

### Option 2: Local Server (Recommended)
```bash
# Navigate to the project directory
cd "maze game"

# Start a local server
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

## 🏗️ Project Structure

```
maze-game/
├── index.html          # Main HTML structure
├── styles.css          # Neon-themed CSS styling
├── script.js           # Game logic and mechanics
└── README.md           # This file
```

## 🎨 Technical Features

- **Canvas Rendering** - Smooth 60fps game loop
- **Pathfinding AI** - BFS algorithm for enemy movement
- **Collision Detection** - Precise player-wall and player-enemy collision
- **Local Storage** - Persistent high scores and settings
- **WebAudio API** - Synthesized sound effects and music
- **Responsive Canvas** - Adapts to different screen sizes

## 🏆 Scoring System

- **Time Bonus**: 10 points per second remaining
- **Level Bonus**: 120 points × level number
- **Total Score**: Time bonus + Level bonus

## 🎵 Audio

- Movement sound effects
- Victory fanfare
- Timer alerts
- Background music loop
- Mute/unmute toggle

## 📱 Mobile Support

- Touch-friendly joystick controls
- Responsive layout
- Optimized for mobile browsers

## 🔧 Customization

The game is easily customizable:

- **Enemy Speed**: Edit `ENEMY_SPEED_BY_LEVEL` array in `script.js`
- **Time Limits**: Modify `timeLimit` in maze definitions
- **Maze Layouts**: Update the `MAZES` array with new grid patterns
- **Visual Theme**: Adjust CSS variables in `styles.css`

## 🎯 Game Difficulty

- **Level 1**: Easy maze, 60 seconds, slow enemy
- **Level 2**: Medium maze, 45 seconds, slightly faster enemy
- **Level 3**: Hard maze, 40 seconds, moderate enemy speed
- **Level 4**: Expert maze, 35 seconds, fast enemy
- **Level 5**: Master maze, 30 seconds, very fast enemy

## 🏅 Leaderboard

The game tracks your top 5 scores locally, including:
- Player name
- Final score
- Date achieved

## 🛠️ Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers

## 📄 License

This project is open source and available under the MIT License.

---

**Enjoy escaping the maze!** 🎮✨
