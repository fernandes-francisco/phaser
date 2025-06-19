export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create() {
        // Fundo preto
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 1)
            .setOrigin(0, 0);

        // Texto em vermelho (personalizável)
        const gameOverText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 100, 'Já Te Fod#!$%', {
            fontSize: '64px',
            fontFamily: 'Arial',
            color: '#ff0000',
            stroke: '#000',
            strokeThickness: 4,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000',
                blur: 4,
                fill: true
            }
        });
        gameOverText.setOrigin(0.5);

        // Efeito de brilho no texto
        this.tweens.add({
            targets: gameOverText,
            alpha: 0.7,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // Botão "Reiniciar Jogo"
        const restartButton = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 100, 'Carregar para Voltar', {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 2
        });
        restartButton.setOrigin(0.5);
        restartButton.setInteractive();

        // Efeitos de hover no botão Reiniciar
        restartButton.on('pointerover', () => {
            restartButton.setStyle({ color: '#ff6b35' });
            this.game.canvas.style.cursor = 'pointer';
        });

        restartButton.on('pointerout', () => {
            restartButton.setStyle({ color: '#ffffff' });
            this.game.canvas.style.cursor = 'default';
        });

        // Clique no botão Reiniciar - Recarrega todo o jogo
        restartButton.on('pointerdown', () => {
            // Muda o texto para "Carregar..."
            restartButton.setText('Carregar...');
            restartButton.setStyle({ color: '#ff6b35' });
            
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                // Recarrega completamente a página
                window.location.reload();
            });
        });

        // Fade-in da cena
        this.cameras.main.fadeIn(1000, 0, 0, 0);
    }
} 