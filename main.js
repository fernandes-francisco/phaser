import LoadingScene from './LoadingScene.js';
import GameScene from './GameScene.js';
import PreloadScene from './preload.js'
const config = {
        type: Phaser.AUTO,
        width: Math.min(window.innerWidth * 0.85, 1200),
        height: Math.min(window.innerHeight * 0.65, 800),
        parent: 'game-canvas',
        backgroundColor: '#1a4a1a',
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false
            }
        },
        scene: [LoadingScene, PreloadScene, GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

        // Initialize game
const game = new Phaser.Game(config);

        // Handle window resize
window.addEventListener('resize', () => {
    const newWidth = Math.min(window.innerWidth * 0.85, 1200);
    const newHeight = Math.min(window.innerHeight * 0.65, 800);
    game.scale.resize(newWidth, newHeight);
});

        // Prevent context menu on right click
document.addEventListener('contextmenu', e => e.preventDefault());