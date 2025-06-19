
export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
  }

  preload() {
    // Carrega a imagem de fundo do loading
    this.load.image('bgLoading', 'assets/background.png');

    // Barra de progresso
    const { width, height } = this.cameras.main;
    const barWidth = width * 0.6;
    const barHeight = 20;
    this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.5).setScrollFactor(0);
    const progressBox = this.add.rectangle(width/2, height*0.8, barWidth, barHeight, 0x222222, 0.8);
    const progressBar = this.add.rectangle((width - barWidth)/2, height*0.8, 0, barHeight, 0xff6b35)
      .setOrigin(0, 0.5);

    this.load.on('progress', (value) => {
      progressBar.width = barWidth * value;
    });
  }

  create() {
    // Exibe a imagem de fundo
    const { width, height } = this.cameras.main;
    const bg = this.add.image(width/2, height/2, 'bgLoading')
      .setScrollFactor(0);
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    bg.setScale(Math.max(scaleX, scaleY));

    // Fade-in da tela de loading
    this.cameras.main.fadeIn(800, 0, 0, 0);

    // Após 4 segundos, faz fade-out e inicia PreloadScene
    this.time.delayedCall(4000, () => {
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        // Oculta o loading e exibe o container do jogo
        const loadingDiv = document.getElementById('loading');
        if (loadingDiv) loadingDiv.style.display = 'none';
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) gameContainer.style.display = 'flex';

        // Transição correta para PreloadScene
        this.scene.start('PreloadScene');
      });
    });
  }
}
