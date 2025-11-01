# Flappy Modi - Flappy Bird Game

A Flappy Bird game built with Next.js featuring Narendra Modi as the player character.

## Features

- 🎮 Classic Flappy Bird gameplay
- 🖼️ Custom player sprite (player.png)
- 🚧 Multiple obstacle variations (obs_1.png through obs_4.png)
- 🎵 Background music during gameplay
- 🎯 Start screen with Modi poster
- 📱 Responsive design

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the game.

## How to Play

1. When you open the page, you'll see a start screen with Modi's poster and a "PLAY" button
2. Click the play button or press SPACE to start the game
3. Use SPACE or click to make the player jump/flap
4. Navigate through obstacles without hitting them
5. Each obstacle you pass gives you a point
6. When you hit an obstacle or the ground/ceiling, the game ends
7. Click "Restart" to play again

## Assets

The game uses the following assets (should be in the `public` folder):
- `player.png` - Player character sprite
- `obs_1.png`, `obs_2.png`, `obs_3.png`, `obs_4.png` - Obstacle variations
- `modi_poster.png` - Poster shown on start screen
- `background_music.mp3` - Background music (plays during gameplay)

## Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
FlappyModi/
├── app/
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Main page
│   └── globals.css    # Global styles
├── components/
│   └── FlappyBird.tsx  # Main game component
├── public/
│   ├── player.png
│   ├── obs_1.png
│   ├── obs_2.png
│   ├── obs_3.png
│   ├── obs_4.png
│   ├── modi_poster.png
│   └── background_music.mp3
├── package.json
├── next.config.js
└── tsconfig.json
```

## Technologies Used

- Next.js 14
- React 18
- TypeScript
- HTML5 Canvas API

## License

This is a fun project for educational purposes.

# flappymodi
