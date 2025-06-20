export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    this.load.image('player', 'assets/player.png');
    this.load.image('car_red', 'assets/car_red.png');
    this.load.image('car_police', 'assets/car_police.png');
    this.load.image('truck_blue', 'assets/truck_blue.png');
    this.load.image('building_office', 'assets/building_office_new.png');
    this.load.image('building_residential', 'assets/building_residential_new.png');
    this.load.image('building_commercial', 'assets/building_commercial_new.png');
    this.load.image('building_house', 'assets/building_residential_new.png');
    this.load.image('building_apartment', 'assets/building_apartment_new.png');
    this.load.image('grass', 'assets/grass.png');
    this.load.image('sidewalk', 'assets/sidewalk.png');
    this.load.image('road', 'assets/road.png');
    this.load.image('npc', 'assets/npc.png');
    this.load.audio('danzakuduro', 'assets/Don Omar - Danza Kuduro (Lyrics) ft. Lucenzo.mp3');
    this.load.audio('sovietconnection', 'assets/Don Omar - Danza Kuduro (Lyrics) ft. Lucenzo.mp3');
    //this.load.audio('sovietconnection', 'assets/GTA IV - Soviet Connection (New mixed Intro).mp3');
  }

  create() {
    // Generate procedural sprites for those without image files
    this.generateProceduralTextures();

    // Start main game scene
    this.scene.start('GameScene');
  }

  generateProceduralTextures() {
    const graphics = this.add.graphics();

    // Bullet sprite (keep intact)
    graphics.fillStyle(0xffff00);
    graphics.fillCircle(4, 4, 3);
    graphics.generateTexture('bullet', 8, 8);
    graphics.clear();

    // Muzzle flash sprite (keep intact)
    graphics.fillStyle(0xffa500);
    graphics.fillCircle(8, 8, 6);
    graphics.fillStyle(0xff4500);
    graphics.fillCircle(8, 8, 4);
    graphics.generateTexture('muzzle_flash', 16, 16);
    graphics.clear();

    // Simple intersection asset (keep intact)
    graphics.fillStyle(0x333333);
    graphics.fillRect(0, 0, 64, 64);
    graphics.fillStyle(0xffff00);
    // Horizontal center line
    graphics.fillRect(0, 30, 64, 4);
    // Vertical center line  
    graphics.fillRect(30, 0, 4, 64);
    graphics.generateTexture('intersection', 64, 64);
    graphics.clear();

    graphics.destroy();
  }
}
