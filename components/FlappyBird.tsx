"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Obstacle {
  id: number;
  x: number;
  topHeight: number;
  bottomHeight: number;
  gap: number;
  imageIndex: number;
  passed: boolean;
}

const GRAVITY = 0.3;
const JUMP_STRENGTH = -6;
const OBSTACLE_SPEED = 2;
const OBSTACLE_SPACING = 450;
const OBSTACLE_WIDTH = 60;
const PLAYER_SIZE = 50;
const GAP_SIZE = 200;

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"start" | "playing" | "gameover">(
    "start"
  );
  const [score, setScore] = useState(0);
  const [showJumpscare, setShowJumpscare] = useState(false);
  const scoreRef = useRef(0);
  const playerYRef = useRef(250);
  const playerVelocityRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const obstacleIdRef = useRef(0);
  const gameStartTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playerImageRef = useRef<HTMLImageElement | null>(null);
  const playerPixelDataRef = useRef<ImageData | null>(null);
  const obstacleImagesRef = useRef<HTMLImageElement[]>([]);
  const obstaclePixelDataRef = useRef<(ImageData | null)[]>([]);
  const posterImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Helper function to get pixel data from an image (defined before useEffect)
  const getImagePixelDataHelper = (img: HTMLImageElement): ImageData | null => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, img.width, img.height);
    } catch (e) {
      return null;
    }
  };

  // Load images
  useEffect(() => {
    let loadedCount = 0;
    const totalImages = 7; // player + 4 obstacles + poster + background

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalImages) {
        setImagesLoaded(true);
      }
    };

    const playerImg = new Image();
    playerImg.src = "/player.png";
    playerImageRef.current = playerImg;
    playerImg.onload = () => {
      const pixelData = getImagePixelDataHelper(playerImg);
      playerPixelDataRef.current = pixelData;
      checkAllLoaded();
    };
    playerImg.onerror = () => checkAllLoaded();
    if (playerImg.complete) {
      const pixelData = getImagePixelDataHelper(playerImg);
      playerPixelDataRef.current = pixelData;
      checkAllLoaded();
    }

    const obs1 = new Image();
    obs1.src = "/obs_1.png";
    const obs2 = new Image();
    obs2.src = "/obs_2.png";
    const obs3 = new Image();
    obs3.src = "/obs_3.png";
    const obs4 = new Image();
    obs4.src = "/obs_4.png";
    obstacleImagesRef.current = [obs1, obs2, obs3, obs4];

    // Initialize pixel data array
    obstaclePixelDataRef.current = [null, null, null, null];

    // Cache pixel data for obstacle images when they load
    const loadPixelData = (img: HTMLImageElement, index: number) => {
      const handleLoad = () => {
        const pixelData = getImagePixelDataHelper(img);
        obstaclePixelDataRef.current[index] = pixelData;
        checkAllLoaded();
      };

      if (img.complete) {
        const pixelData = getImagePixelDataHelper(img);
        obstaclePixelDataRef.current[index] = pixelData;
        checkAllLoaded();
      } else {
        img.onload = handleLoad;
        img.onerror = () => checkAllLoaded();
      }
    };

    [obs1, obs2, obs3, obs4].forEach((img, index) => {
      loadPixelData(img, index);
    });

    const posterImg = new Image();
    posterImg.src = "/modi_poster.png";
    posterImageRef.current = posterImg;
    posterImg.onload = () => {
      console.log("Modi poster loaded successfully");
      checkAllLoaded();
    };
    posterImg.onerror = (e) => {
      console.error("Failed to load modi poster:", e);
      checkAllLoaded();
    };
    if (posterImg.complete) {
      console.log("Modi poster already complete");
      checkAllLoaded();
    }

    const backgroundImg = new Image();
    backgroundImg.src = "/background.png";
    backgroundImageRef.current = backgroundImg;
    backgroundImg.onload = () => checkAllLoaded();
    backgroundImg.onerror = () => checkAllLoaded();
    if (backgroundImg.complete) {
      checkAllLoaded();
    }

    // Load background music
    const audio = new Audio("/background_music.mp3");
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;
  }, []);

  const resetGame = useCallback(() => {
    playerYRef.current = 250;
    playerVelocityRef.current = 0;
    obstaclesRef.current = [];
    obstacleIdRef.current = 0;
    scoreRef.current = 0;
    gameStartTimeRef.current = 0;
    lastFrameTimeRef.current = 0;
    setScore(0);
    setShowJumpscare(false);
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    gameStartTimeRef.current = Date.now();
    lastFrameTimeRef.current = Date.now();
    setGameState("playing");
    if (audioRef.current) {
      audioRef.current.play().catch((err: Error) => {
        console.log("Audio play failed:", err);
      });
    }
  }, [resetGame]);

  const jump = useCallback(() => {
    if (gameState === "playing") {
      playerVelocityRef.current = JUMP_STRENGTH;
    } else if (gameState === "start") {
      startGame();
    }
  }, [gameState, startGame]);

  // Helper function to get pixel data from an image
  const getImagePixelData = useCallback(
    (img: HTMLImageElement): ImageData | null => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height);
      } catch (e) {
        return null;
      }
    },
    []
  );

  // Helper function to check if a pixel is transparent
  const isPixelTransparent = useCallback(
    (imageData: ImageData, x: number, y: number): boolean => {
      if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) {
        return true; // Out of bounds is considered transparent
      }
      const index = (y * imageData.width + x) * 4;
      return imageData.data[index + 3] < 128; // Alpha channel < 128 means transparent
    },
    []
  );

  // Helper function to check pixel collision between player and obstacle
  const checkPixelCollision = useCallback(
    (
      playerX: number,
      playerY: number,
      obstacleX: number,
      obstacleY: number,
      obstacleHeight: number,
      obstacleImageIndex: number
    ): boolean => {
      // First do bounding box check for performance
      if (
        playerX + PLAYER_SIZE <= obstacleX ||
        playerX >= obstacleX + OBSTACLE_WIDTH ||
        playerY + PLAYER_SIZE <= obstacleY ||
        playerY >= obstacleY + obstacleHeight
      ) {
        return false; // No collision
      }

      // Get cached pixel data
      const obstaclePixelData =
        obstaclePixelDataRef.current[obstacleImageIndex];
      const playerPixelData = playerPixelDataRef.current;
      const obstacleImage = obstacleImagesRef.current[obstacleImageIndex];

      // If pixel data not ready, use bounding box collision as fallback
      if (!obstaclePixelData || !obstacleImage?.complete) {
        return true; // Collision detected using bounding box
      }

      // Sample pixels for collision (check every few pixels for performance)
      const sampleRate = 1; // Check every pixel for accuracy
      let collisionFound = false;

      for (let py = 0; py < PLAYER_SIZE && !collisionFound; py += sampleRate) {
        for (
          let px = 0;
          px < PLAYER_SIZE && !collisionFound;
          px += sampleRate
        ) {
          const playerPixelX = playerX + px;
          const playerPixelY = playerY + py;

          // Check if player pixel is within obstacle bounds
          if (
            playerPixelX >= obstacleX &&
            playerPixelX < obstacleX + OBSTACLE_WIDTH &&
            playerPixelY >= obstacleY &&
            playerPixelY < obstacleY + obstacleHeight
          ) {
            // Convert player pixel to player image coordinates
            let playerImgX = Math.floor(
              (px / PLAYER_SIZE) * (playerPixelData?.width || PLAYER_SIZE)
            );
            let playerImgY = Math.floor(
              (py / PLAYER_SIZE) * (playerPixelData?.height || PLAYER_SIZE)
            );

            // Check if player pixel is not transparent
            let playerSolid = true;
            if (playerPixelData) {
              playerSolid = !isPixelTransparent(
                playerPixelData,
                playerImgX,
                playerImgY
              );
            }

            // Convert to obstacle image coordinates
            const relativeX = (playerPixelX - obstacleX) / OBSTACLE_WIDTH;
            const relativeY = (playerPixelY - obstacleY) / obstacleHeight;
            const obsImgX = Math.floor(relativeX * obstaclePixelData.width);
            const obsImgY = Math.floor(relativeY * obstaclePixelData.height);

            // Check if obstacle pixel is not transparent
            const obstacleSolid = !isPixelTransparent(
              obstaclePixelData,
              obsImgX,
              obsImgY
            );

            // Collision occurs when both pixels are solid
            if (playerSolid && obstacleSolid) {
              collisionFound = true;
            }
          }
        }
      }

      return collisionFound;
    },
    [isPixelTransparent]
  );

  const checkCollision = useCallback(
    (playerX: number, playerY: number): boolean => {
      const canvas = canvasRef.current;
      if (!canvas) return false;

      // Grace period: no collision for first 1.5 seconds
      const timeSinceStart = Date.now() - gameStartTimeRef.current;
      if (timeSinceStart < 1500) {
        return false;
      }

      // More forgiving boundary check with margin
      if (playerY < -10 || playerY + PLAYER_SIZE > canvas.height + 10) {
        return true;
      }

      // More forgiving hitbox - reduce player collision box by 20%
      const hitboxMargin = PLAYER_SIZE * 0.2;
      const adjustedPlayerX = playerX + hitboxMargin;
      const adjustedPlayerY = playerY + hitboxMargin;
      const adjustedPlayerSize = PLAYER_SIZE - (hitboxMargin * 2);

      // Check obstacle collisions with more forgiving detection
      for (const obstacle of obstaclesRef.current) {
        const obstacleImage = obstacleImagesRef.current[obstacle.imageIndex];

        if (obstacleImage?.complete) {
          // Check if player is horizontally overlapping with obstacle
          if (
            adjustedPlayerX + adjustedPlayerSize > obstacle.x &&
            adjustedPlayerX < obstacle.x + OBSTACLE_WIDTH
          ) {
            // Check collision with top obstacle (with 5px grace margin)
            if (adjustedPlayerY < obstacle.topHeight - 5) {
              return true;
            }

            // Check collision with bottom obstacle (with 5px grace margin)
            const bottomY = obstacle.topHeight + GAP_SIZE;
            if (adjustedPlayerY + adjustedPlayerSize > bottomY + 5) {
              return true;
            }
          }
        }
      }

      return false;
    },
    [checkPixelCollision]
  );

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== "playing") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Don't run game loop during jumpscare
    if (showJumpscare) return;

    // Calculate delta time for frame rate independence
    const currentTime = Date.now();
    const deltaTime = lastFrameTimeRef.current === 0 
      ? 16.67 // First frame assumes 60fps
      : Math.min(currentTime - lastFrameTimeRef.current, 50); // Cap at 50ms to prevent huge jumps
    lastFrameTimeRef.current = currentTime;
    
    // Normalize to 60fps (16.67ms per frame)
    const timeScale = deltaTime / 16.67;

    // Update player with time scaling
    playerVelocityRef.current += GRAVITY * timeScale;
    playerYRef.current += playerVelocityRef.current * timeScale;

    // Create new obstacles
    const lastObstacle = obstaclesRef.current[obstaclesRef.current.length - 1];
    if (!lastObstacle || lastObstacle.x < canvas.width - OBSTACLE_SPACING) {
      const gapStart = Math.random() * (canvas.height - GAP_SIZE - 100) + 50;
      obstaclesRef.current.push({
        id: obstacleIdRef.current++,
        x: canvas.width,
        topHeight: gapStart,
        bottomHeight: canvas.height - gapStart - GAP_SIZE,
        gap: GAP_SIZE,
        imageIndex: Math.floor(Math.random() * 4),
        passed: false,
      });
    }

    // Update obstacles with time scaling
    obstaclesRef.current = obstaclesRef.current
      .map((obs: Obstacle) => ({ ...obs, x: obs.x - (OBSTACLE_SPEED * timeScale) }))
      .filter((obs: Obstacle) => obs.x + OBSTACLE_WIDTH > 0);

    // Check score
    obstaclesRef.current.forEach((obs: Obstacle) => {
      if (
        !obs.passed &&
        obs.x + OBSTACLE_WIDTH < canvas.width / 2 - PLAYER_SIZE / 2
      ) {
        obs.passed = true;
        scoreRef.current += 1;
        setScore(scoreRef.current);
      }
    });

    // Check collision
    if (
      checkCollision(canvas.width / 2 - PLAYER_SIZE / 2, playerYRef.current)
    ) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setShowJumpscare(true);
      setGameState("gameover");
      return;
    }

    // Draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image
    if (backgroundImageRef.current?.complete) {
      // Draw background image to fill the canvas
      ctx.drawImage(
        backgroundImageRef.current,
        0,
        0,
        canvas.width,
        canvas.height
      );
    } else {
      // Fallback dark gradient if image not loaded
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#1a1a2e");
      gradient.addColorStop(1, "#0f0f1e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw obstacles
    obstacleImagesRef.current.forEach(
      (img: HTMLImageElement, imgIdx: number) => {
        obstaclesRef.current.forEach((obs: Obstacle) => {
          if (obs.imageIndex === imgIdx && img.complete) {
            // Top obstacle
            const topHeight = obs.topHeight;
            ctx.drawImage(img, obs.x, 0, OBSTACLE_WIDTH, topHeight);

            // Bottom obstacle
            const bottomY = obs.topHeight + obs.gap;
            const bottomHeight = obs.bottomHeight;
            ctx.drawImage(img, obs.x, bottomY, OBSTACLE_WIDTH, bottomHeight);
          }
        });
      }
    );

    // Draw player
    if (playerImageRef.current?.complete) {
      const playerX = canvas.width / 2 - PLAYER_SIZE / 2;
      ctx.drawImage(
        playerImageRef.current,
        playerX,
        playerYRef.current,
        PLAYER_SIZE,
        PLAYER_SIZE
      );
    }

    // Draw score (use ref to get latest value)
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.strokeText(`Score: ${scoreRef.current}`, canvas.width / 2, 50);
    ctx.fillText(`Score: ${scoreRef.current}`, canvas.width / 2, 50);

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, checkCollision]);

  useEffect(() => {
    if (gameState === "playing" && !showJumpscare) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, gameLoop, showJumpscare]);

  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (gameState === "gameover" && !showJumpscare) {
        // Allow restart with Space or Enter when game is over
        if (
          e.code === "Space" ||
          e.key === " " ||
          e.code === "Enter" ||
          e.key === "Enter"
        ) {
          e.preventDefault();
          startGame();
        }
      } else if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        jump();
      }
    },
    [jump, gameState, showJumpscare, startGame]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (gameState === "gameover" && !showJumpscare) {
        // Check if click is on restart button
        const buttonX = canvas.width / 2 - 100;
        const buttonY = canvas.height / 2 + 20;
        const buttonWidth = 200;
        const buttonHeight = 60;

        if (
          x >= buttonX &&
          x <= buttonX + buttonWidth &&
          y >= buttonY &&
          y <= buttonY + buttonHeight
        ) {
          e.preventDefault();
          e.stopPropagation();
          startGame();
          return;
        }
        // Also allow clicking anywhere on gameover screen to restart (except during jumpscare)
        e.preventDefault();
        e.stopPropagation();
        startGame();
      } else if (gameState === "start") {
        jump();
      } else if (gameState === "playing") {
        jump();
      }
    },
    [jump, gameState, showJumpscare, startGame]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  const renderStartScreen = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image (full screen with slight opacity)
    if (backgroundImageRef.current?.complete) {
      ctx.globalAlpha = 0.3;
      ctx.drawImage(
        backgroundImageRef.current,
        0,
        0,
        canvas.width,
        canvas.height
      );
      ctx.globalAlpha = 1.0;
    } else {
      // Fallback dark background
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw semi-transparent overlay for better contrast
    ctx.fillStyle = "rgba(10, 10, 10, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title at the top
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;
    ctx.strokeText("Flappy Modi", canvas.width / 2, 80);
    ctx.fillText("Flappy Modi", canvas.width / 2, 80);

    // Draw poster in the center (better positioned)
    if (posterImageRef.current?.complete) {
      const posterSize = 220;
      const x = canvas.width / 2 - posterSize / 2;
      const y = canvas.height / 2 - posterSize / 2 - 40;

      // Draw shadow for poster
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10;

      ctx.drawImage(posterImageRef.current, x, y, posterSize, posterSize);

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Draw play button below poster
    const buttonX = canvas.width / 2 - 100;
    const buttonY = canvas.height / 2 + 140;
    const buttonWidth = 200;
    const buttonHeight = 60;

    // Cool button background with cyan to purple gradient
    const gradient = ctx.createLinearGradient(
      buttonX,
      buttonY,
      buttonX + buttonWidth,
      buttonY + buttonHeight
    );
    gradient.addColorStop(0, "#00f5ff");
    gradient.addColorStop(0.5, "#7b2ff7");
    gradient.addColorStop(1, "#ff006e");
    ctx.fillStyle = gradient;

    if (ctx.roundRect) {
      ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    } else {
      ctx.beginPath();
      ctx.moveTo(buttonX + 10, buttonY);
      ctx.lineTo(buttonX + buttonWidth - 10, buttonY);
      ctx.quadraticCurveTo(
        buttonX + buttonWidth,
        buttonY,
        buttonX + buttonWidth,
        buttonY + 10
      );
      ctx.lineTo(buttonX + buttonWidth, buttonY + buttonHeight - 10);
      ctx.quadraticCurveTo(
        buttonX + buttonWidth,
        buttonY + buttonHeight,
        buttonX + buttonWidth - 10,
        buttonY + buttonHeight
      );
      ctx.lineTo(buttonX + 10, buttonY + buttonHeight);
      ctx.quadraticCurveTo(
        buttonX,
        buttonY + buttonHeight,
        buttonX,
        buttonY + buttonHeight - 10
      );
      ctx.lineTo(buttonX, buttonY + 10);
      ctx.quadraticCurveTo(buttonX, buttonY, buttonX + 10, buttonY);
      ctx.closePath();
    }
    ctx.fill();

    // Button border with glow effect
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 15;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    if (ctx.roundRect) {
      ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    } else {
      ctx.beginPath();
      ctx.moveTo(buttonX + 10, buttonY);
      ctx.lineTo(buttonX + buttonWidth - 10, buttonY);
      ctx.quadraticCurveTo(
        buttonX + buttonWidth,
        buttonY,
        buttonX + buttonWidth,
        buttonY + 10
      );
      ctx.lineTo(buttonX + buttonWidth, buttonY + buttonHeight - 10);
      ctx.quadraticCurveTo(
        buttonX + buttonWidth,
        buttonY + buttonHeight,
        buttonX + buttonWidth - 10,
        buttonY + buttonHeight
      );
      ctx.lineTo(buttonX + 10, buttonY + buttonHeight);
      ctx.quadraticCurveTo(
        buttonX,
        buttonY + buttonHeight,
        buttonX,
        buttonY + buttonHeight - 10
      );
      ctx.lineTo(buttonX, buttonY + 10);
      ctx.quadraticCurveTo(buttonX, buttonY, buttonX + 10, buttonY);
      ctx.closePath();
    }
    ctx.stroke();

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Button text
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeText("PLAY", canvas.width / 2, buttonY + 40);
    ctx.fillText("PLAY", canvas.width / 2, buttonY + 40);

    // Instructions
    ctx.fillStyle = "#FFF";
    ctx.font = "18px Arial";
    ctx.fillText(
      "Press SPACE or Click to Play",
      canvas.width / 2,
      buttonY + 90
    );

    // Credits at the bottom
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 20px Arial";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeText("Built by Ansh", canvas.width / 2, canvas.height - 30);
    ctx.fillText("Built by Ansh", canvas.width / 2, canvas.height - 30);
  };

  const renderGameOver = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Show jumpscare if needed
    if (showJumpscare) {
      console.log("Showing jumpscare!", {
        hasPosterRef: !!posterImageRef.current,
        isComplete: posterImageRef.current?.complete,
        src: posterImageRef.current?.src,
        width: posterImageRef.current?.width,
        height: posterImageRef.current?.height,
        naturalWidth: posterImageRef.current?.naturalWidth,
        naturalHeight: posterImageRef.current?.naturalHeight,
      });

      // Fill background with bright color first for visibility
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Show modi poster as jumpscare - fill the screen
      if (posterImageRef.current) {
        try {
          // Reset any transformations
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalAlpha = 1.0;

          // Draw the poster to fill the entire canvas
          ctx.drawImage(
            posterImageRef.current,
            0,
            0,
            canvas.width,
            canvas.height
          );
          console.log("Drew modi poster successfully");

          // Draw a red border to confirm canvas is being drawn
          ctx.strokeStyle = "#FF0000";
          ctx.lineWidth = 10;
          ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
        } catch (e) {
          console.error("Failed to draw modi poster:", e);
          // Fallback if poster can't be drawn
          ctx.fillStyle = "#FF0000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "#FFF";
          ctx.font = "bold 48px Arial";
          ctx.textAlign = "center";
          ctx.fillText("GAME OVER!", canvas.width / 2, canvas.height / 2);
        }
      } else {
        console.log("No poster ref available");
        // Fallback if poster not loaded - show red screen with text
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#FFF";
        ctx.font = "bold 48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER!", canvas.width / 2, canvas.height / 2);
      }
      return;
    }

    // Draw background first
    if (backgroundImageRef.current?.complete) {
      ctx.drawImage(
        backgroundImageRef.current,
        0,
        0,
        canvas.width,
        canvas.height
      );
    } else {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw semi-transparent dark overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw game over text
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;
    ctx.strokeText("Game Over!", canvas.width / 2, canvas.height / 2 - 100);
    ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2 - 100);

    ctx.font = "32px Arial";
    ctx.strokeText(
      `Final Score: ${score}`,
      canvas.width / 2,
      canvas.height / 2 - 30
    );
    ctx.fillText(
      `Final Score: ${score}`,
      canvas.width / 2,
      canvas.height / 2 - 30
    );

    // Draw restart button
    const buttonX = canvas.width / 2 - 100;
    const buttonY = canvas.height / 2 + 20;
    const buttonWidth = 200;
    const buttonHeight = 60;

    ctx.fillStyle = "#1a1a1a";
    if (ctx.roundRect) {
      ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    } else {
      ctx.beginPath();
      ctx.moveTo(buttonX + 10, buttonY);
      ctx.lineTo(buttonX + buttonWidth - 10, buttonY);
      ctx.quadraticCurveTo(
        buttonX + buttonWidth,
        buttonY,
        buttonX + buttonWidth,
        buttonY + 10
      );
      ctx.lineTo(buttonX + buttonWidth, buttonY + buttonHeight - 10);
      ctx.quadraticCurveTo(
        buttonX + buttonWidth,
        buttonY + buttonHeight,
        buttonX + buttonWidth - 10,
        buttonY + buttonHeight
      );
      ctx.lineTo(buttonX + 10, buttonY + buttonHeight);
      ctx.quadraticCurveTo(
        buttonX,
        buttonY + buttonHeight,
        buttonX,
        buttonY + buttonHeight - 10
      );
      ctx.lineTo(buttonX, buttonY + 10);
      ctx.quadraticCurveTo(buttonX, buttonY, buttonX + 10, buttonY);
      ctx.closePath();
    }
    ctx.fill();

    ctx.strokeStyle = "#FF9800";
    ctx.lineWidth = 3;
    if (ctx.roundRect) {
      ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    } else {
      ctx.beginPath();
      ctx.moveTo(buttonX + 10, buttonY);
      ctx.lineTo(buttonX + buttonWidth - 10, buttonY);
      ctx.quadraticCurveTo(
        buttonX + buttonWidth,
        buttonY,
        buttonX + buttonWidth,
        buttonY + 10
      );
      ctx.lineTo(buttonX + buttonWidth, buttonY + buttonHeight - 10);
      ctx.quadraticCurveTo(
        buttonX + buttonWidth,
        buttonY + buttonHeight,
        buttonX + buttonWidth - 10,
        buttonY + buttonHeight
      );
      ctx.lineTo(buttonX + 10, buttonY + buttonHeight);
      ctx.quadraticCurveTo(
        buttonX,
        buttonY + buttonHeight,
        buttonX,
        buttonY + buttonHeight - 10
      );
      ctx.lineTo(buttonX, buttonY + 10);
      ctx.quadraticCurveTo(buttonX, buttonY, buttonX + 10, buttonY);
      ctx.closePath();
    }
    ctx.stroke();

    ctx.fillStyle = "#FFF";
    ctx.font = "bold 28px Arial";
    ctx.fillText("Restart", canvas.width / 2, buttonY + 40);
  };

  // Handle jumpscare timing
  useEffect(() => {
    if (showJumpscare) {
      const timer = setTimeout(() => {
        setShowJumpscare(false);
      }, 1000); // Show jumpscare for 1 second
      return () => clearTimeout(timer);
    }
  }, [showJumpscare]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (gameState === "start") {
      renderStartScreen();
    } else if (gameState === "gameover") {
      renderGameOver();
    }
  }, [gameState, score, showJumpscare, imagesLoaded]);

  // Separate effect to continuously render jumpscare
  useEffect(() => {
    if (showJumpscare && gameState === "gameover") {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Continuously render jumpscare to prevent it from being cleared
      const renderInterval = setInterval(() => {
        renderGameOver();
      }, 16); // ~60fps

      return () => clearInterval(renderInterval);
    }
  }, [showJumpscare, gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      canvas.width = Math.min(window.innerWidth, 800);
      canvas.height = Math.min(window.innerHeight, 600);

      if (gameState === "start") {
        renderStartScreen();
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [gameState, imagesLoaded]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseDown={(e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
          if (gameState === "playing") {
            e.preventDefault();
            jump();
          }
        }}
        className="border-4 border-black rounded-lg shadow-2xl cursor-pointer"
        style={{ maxWidth: "100%", height: "auto" }}
      />
      <style jsx>{`
        canvas {
          background: #0a0a0a;
        }
      `}</style>
    </div>
  );
}
