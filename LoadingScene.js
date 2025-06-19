export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
  }

  preload() {
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
    const { width, height } = this.cameras.main;
    
    // Fade-in da tela de loading
    this.cameras.main.fadeIn(800, 0, 0, 0);

    // Texto "Carregando" base
    const loadingText = this.add.text(width/2, height/2 - 50, 'A carregar', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3
    });
    loadingText.setOrigin(0.5);

    // Texto dos pontos que vai animar
    const dotsText = this.add.text(width/2 + 120, height/2 - 50, '', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3
    });
    dotsText.setOrigin(0, 0.5);

    // Animação dos pontos
    let dots = '';
    let dotCount = 0;
    
    this.time.addEvent({
      delay: 500, // 500ms entre cada ponto
      callback: () => {
        dotCount = (dotCount + 1) % 4; // 0, 1, 2, 3, 0, 1, 2, 3...
        dots = '.'.repeat(dotCount);
        dotsText.setText(dots);
      },
      loop: true
    });

    // Após 3 segundos, faz fade-out e inicia PreloadScene
    this.time.delayedCall(3000, () => {
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