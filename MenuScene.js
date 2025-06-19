export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        // Carrega apenas o background para o menu
        this.load.image('background', 'assets/background.png');
    }

    create() {
        // Adiciona o background
        const background = this.add.image(0, 0, 'background');
        background.setOrigin(0, 0);
        background.setDisplaySize(this.cameras.main.width, this.cameras.main.height);

        // Texto "Clicar para começar" na parte inferior
        const clickToStart = this.add.text(this.cameras.main.centerX, this.cameras.main.height - 100, 'Clicar para começar', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 3,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000',
                blur: 4,
                fill: true
            }
        });
        clickToStart.setOrigin(0.5);
        clickToStart.setInteractive();

        // Efeitos de hover no texto
        clickToStart.on('pointerover', () => {
            clickToStart.setStyle({ color: '#ff6b35' });
            this.game.canvas.style.cursor = 'pointer';
        });

        clickToStart.on('pointerout', () => {
            clickToStart.setStyle({ color: '#ffffff' });
            this.game.canvas.style.cursor = 'default';
        });

        // Clique em qualquer lugar da tela para iniciar o jogo
        this.input.on('pointerdown', () => {
            // Transição suave para a cena de loading
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('LoadingScene');
            });
        });

        // Adiciona um efeito de brilho no texto
        this.tweens.add({
            targets: clickToStart,
            alpha: 0.6,
            duration: 1500,
            yoyo: true,
            repeat: -1
        });
    }
} 