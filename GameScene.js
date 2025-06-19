import PreloadScene from './preload.js'

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({
            key: 'GameScene'
        });

        // Game state
        this.player = null;
        this.vehicles = [];
        this.npcs = null; 
        this.policeCars = [];
        this.buildings = null;
        this.missions = [];
        this.bullets = null; 
        this.muzzleFlashes = [];
        this.buildingCenters = [];
        this.dynamicSprites = [];

        // MODIFIED: Removed sidewalkAreas
        this.roadAreas = [];
        this.grassAreas = [];
        this.intersectionAreas = [];

        // Controls
        this.cursors = null;
        this.wasdKeys = null;

        // Player state
        this.playerInVehicle = false;
        this.currentVehicle = null;
        this.wantedLevel = 0;
        this.playerHealth = 100;
        this.playerMoney = 0;
        this.lastCrimeTime = 0;

        // Weapon system
        this.currentWeapon = 0;
        this.weapons = [{
            name: "Pistol",
            damage: 25,
            ammo: 50,
            maxAmmo: 50,
            fireRate: 400,
            spread: 0.05,
            pelletsPerShot: 1
        }, {
            name: "SMG",
            damage: 15,
            ammo: 100,
            maxAmmo: 100,
            fireRate: 120,
            spread: 0.15,
            pelletsPerShot: 1,
            automatic: true
        }, {
            name: "Shotgun",
            damage: 35,
            ammo: 20,
            maxAmmo: 20,
            fireRate: 900,
            spread: 0.4,
            pelletsPerShot: 5
        }, ];
        this.lastShotTime = 0;
        this.isAutoFiring = false;

        // Mission state
        this.currentMission = null;
        this.missionTarget = null;

        // UI elements
        this.gameUI = {};

        // Game world size
        this.worldWidth = 1920;
        this.worldHeight = 1920;

        // Audio properties
        this.onFootMusic = null;
        this.inVehicleMusic = null;
    }

    create() {
        this.add.tileSprite(0, 0, this.worldWidth, this.worldHeight, 'grass').setOrigin(0, 0).setDepth(-1);

        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        this.bullets = this.physics.add.group();
        this.npcs = this.physics.add.group();

        this.createCity();
        this.createPlayer();
        this.createVehicles();
        this.createNPCs();
        this.setupControls();
        this.setupMusic(); 
        this.createUI();

        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setDeadzone(50, 50);

        this.createMissions();
        this.setupTimers();
        this.setupCollisions();
    }

    setupMusic() {
        this.onFootMusic = this.sound.add('sovietconnection', { loop: true, volume: 0.4 });
        this.inVehicleMusic = this.sound.add('danzakuduro', { loop: true, volume: 0.5 });
        
        this.onFootMusic.play();
    }

    // MODIFIED: Reduced collider sizes for all buildings
    setSpriteCollider(sprite, type) {
        switch (type) {
            case 'building_office': case 'building_apartment':
                // Original: 180x480
                sprite.body.setSize(160, 430).setOffset((sprite.width - 160) / 2, (sprite.height - 430) / 2);
                break;
            case 'building_commercial':
                // Original: 480x220
                sprite.body.setSize(430, 200).setOffset((sprite.width - 430) / 2, (sprite.height - 200) / 2);
                break;
            case 'building_residential': case 'building_house':
                // Original: 230x230
                sprite.body.setSize(200, 200).setOffset((sprite.width - 200) / 2, (sprite.height - 200) / 2);
                break;
            case 'car_red': case 'car_police': case 'truck_blue':
                sprite.body.setSize(sprite.displayWidth * 0.9, sprite.displayHeight * 0.85);
                break;
            case 'player':
                sprite.body.setSize(sprite.displayWidth * 0.8, sprite.displayHeight * 0.8);
                break;
            case 'npc':
                sprite.body.setSize(sprite.displayWidth * 0.5, sprite.displayHeight * 0.8);
                break;
            default: console.warn(`Collider not set for type: ${type}.`); break;
        }
    }

    createCity() {
        // MODIFIED: Removed sidewalkAreas
        this.roadAreas = [];
        this.grassAreas = [];
        this.intersectionAreas = [];
        this.buildingCenters = [];
        this.buildings = this.physics.add.staticGroup();
        this.createCityBlocks();
    }

    createCityBlocks() {
        this.createProperStreets();
        this.buildInMedians();
        this.createCityDistricts();
    }

    createProperStreets() {
        const secondaryRoadWidth = 35;
        for (let y = 300; y < this.worldHeight; y += 450) {
            if (Math.abs(y - this.worldHeight / 2) > 300) { 
                this.createStreet(0, y, this.worldWidth, secondaryRoadWidth, true);
            }
        }
        for (let x = 300; x < this.worldWidth; x += 450) {
            if (Math.abs(x - this.worldWidth / 2) > 300) { 
                this.createStreet(x, 0, secondaryRoadWidth, this.worldHeight, false);
            }
        }
        
        const mainRoadWidth = 40;
        const medianWidth = 400;

        const topRoadY = this.worldHeight / 2 - medianWidth / 2 - mainRoadWidth;
        const bottomRoadY = this.worldHeight / 2 + medianWidth / 2;
        this.createStreet(0, topRoadY, this.worldWidth, mainRoadWidth, true);
        this.createStreet(0, bottomRoadY, this.worldWidth, mainRoadWidth, true);
        const horizontalMedian = new Phaser.Geom.Rectangle(0, topRoadY + mainRoadWidth, this.worldWidth, medianWidth);
        this.grassAreas.push(horizontalMedian);

        const leftRoadX = this.worldWidth / 2 - medianWidth / 2 - mainRoadWidth;
        const rightRoadX = this.worldWidth / 2 + medianWidth / 2;
        this.createStreet(leftRoadX, 0, mainRoadWidth, this.worldHeight, false);
        this.createStreet(rightRoadX, 0, mainRoadWidth, this.worldHeight, false);
        const verticalMedian = new Phaser.Geom.Rectangle(leftRoadX + mainRoadWidth, 0, medianWidth, this.worldHeight);
        this.grassAreas.push(verticalMedian);
    }

    createStreet(x, y, width, height, isHorizontal) {
        this.add.tileSprite(x, y, width, height, 'road').setOrigin(0, 0).setDepth(0);
        this.roadAreas.push(new Phaser.Geom.Rectangle(x, y, width, height));
        if (isHorizontal) {
            for (let i = x; i < x + width; i += 30) {
                this.add.rectangle(i, y + height / 2 - 1, 15, 2, 0xffff00).setOrigin(0, 0).setDepth(1);
            }
        } else {
            for (let i = y; i < y + height; i += 30) {
                this.add.rectangle(x + width / 2 - 1, i, 2, 15, 0xffff00).setOrigin(0, 0).setDepth(1);
            }
        }
        this.createIntersections();
        // REMOVED: No longer creating sidewalks for streets
        // this.createSidewalksForStreet(x, y, width, height, isHorizontal);
    }

    createIntersections() {
        this.intersectionAreas = []; 
        for (let i = 0; i < this.roadAreas.length; i++) {
            for (let j = i + 1; j < this.roadAreas.length; j++) {
                const intersection = Phaser.Geom.Rectangle.Intersection(this.roadAreas[i], this.roadAreas[j]);
                if (intersection.width > 0 && intersection.height > 0) {
                    this.intersectionAreas.push(intersection);
                    this.add.sprite(intersection.centerX, intersection.centerY, 'intersection').setDisplaySize(intersection.width, intersection.height).setDepth(1);
                }
            }
        }
    }

    // REMOVED: Sidewalk functions are no longer needed
    // createSidewalksForStreet(...)
    // createSidewalk(...)

    buildInMedians() {
        this.grassAreas.forEach(median => {
            const step = 75;
            for (let x = median.x + step / 2; x < median.right; x += step) {
                for (let y = median.y + step / 2; y < median.bottom; y += step) {
                    if (Math.random() < 1.0) {
                        const bType = Phaser.Utils.Array.GetRandom(['building_office', 'building_commercial', 'building_apartment']);
                        this.createProperBuilding(x, y, bType);
                    }
                }
            }
        });
    }

    createCityDistricts() {
        const districts = [{ x: 50, y: 50, width: 400, height: 400, type: 'residential', density: 1.0 }, { x: this.worldWidth - 450, y: 50, width: 400, height: 400, type: 'residential', density: 1.0 }, { x: 50, y: this.worldHeight - 450, width: 400, height: 400, type: 'residential', density: 1.0 }, { x: this.worldWidth - 450, y: this.worldHeight - 450, width: 400, height: 400, type: 'residential', density: 1.0 }, { x: 100, y: this.worldHeight / 2 - 150, width: 300, height: 300, type: 'commercial', density: 1.0 }, { x: this.worldWidth - 400, y: this.worldHeight / 2 - 150, width: 300, height: 300, type: 'commercial', density: 1.0 }, ];
        districts.forEach(d => this.buildDistrict(d));
    }

    buildDistrict(district) {
        const blockSize = 80;
        const spacing = 5;
        for (let x = district.x; x < district.x + district.width; x += blockSize + spacing) {
            for (let y = district.y; y < district.y + district.height; y += blockSize + spacing) {
                if (this.isAreaOnRoad(new Phaser.Geom.Rectangle(x, y, blockSize, blockSize))) continue;
                if (Math.random() < district.density) {
                    let bType;
                    switch (district.type) {
                        case 'residential': bType = Phaser.Utils.Array.GetRandom(['building_residential', 'building_house']); break;
                        case 'commercial': bType = 'building_commercial'; break;
                        default: bType = 'building_residential';
                    }
                    this.createProperBuilding(x + blockSize / 2, y + blockSize / 2, bType);
                }
            }
        }
    }

    isAreaOnRoad(rect) {
        for (let r of this.roadAreas) {
            if (Phaser.Geom.Intersects.RectangleToRectangle(rect, r)) return true;
        }
        return false;
    }
    
    // REMOVED: No longer needed
    // isAreaOnSidewalk(...)

    isInIntersection(x, y) {
        for (let i of this.intersectionAreas) {
            if (i.contains(x,y)) return true;
        }
        return false;
    }

    createProperBuilding(x, y, buildingType) {
        const minSpawnDistance = 150;
        for (const center of this.buildingCenters) {
            if (Phaser.Math.Distance.Between(x, y, center.x, center.y) < minSpawnDistance) {
                return;
            }
        }
        const buildingCheckSize = 100;
        const buildingCheckMargin = 25;
        const checkRect = new Phaser.Geom.Rectangle(x - buildingCheckSize / 2 - buildingCheckMargin, y - buildingCheckSize / 2 - buildingCheckMargin, buildingCheckSize + buildingCheckMargin * 2, buildingCheckSize + buildingCheckMargin * 2);
        if (this.isAreaOnRoad(checkRect)) {
            return;
        }
        const building = this.buildings.create(x, y, buildingType);
        building.setOrigin(0.5, 0.5).setScale(0.2);
        this.setSpriteCollider(building, buildingType);
        building.setImmovable(true).refreshBody();
        building.setDepth(y);
        this.buildingCenters.push({ x: x, y: y });
    }

    createPlayer() {
        this.player = this.physics.add.sprite(960, 960, 'player');
        this.player.setCollideWorldBounds(true).setScale(0.07);
        this.setSpriteCollider(this.player, 'player');
        this.player.body.setDrag(400).setMaxVelocity(180);
        this.player.maxHealth = 100;
        this.player.money = 0;
        this.dynamicSprites.push(this.player);
    }

    createVehicles() {
        const vehicleCount = 15;
        const configs = [{ type: 'car_red', maxSpeed: 280, acceleration: 250, health: 100 }, { type: 'truck_blue', maxSpeed: 200, acceleration: 180, health: 150 }, ];
        for (let i = 0; i < vehicleCount; i++) {
            let x, y, a = 0;
            const checkRect = new Phaser.Geom.Rectangle(0, 0, 60, 30);
            do {
                x = Phaser.Math.Between(100, this.worldWidth - 100);
                y = Phaser.Math.Between(100, this.worldHeight - 100);
                checkRect.setPosition(x - 30, y - 15);
                a++;
            } while (((Math.abs(x - this.player.x) < 200 && Math.abs(y - this.player.y) < 200) || this.isAreaOnRoad(checkRect)) && a < 100);
            if (a >= 100) continue;
            const config = Phaser.Utils.Array.GetRandom(configs);
            const vehicle = this.physics.add.sprite(x, y, config.type);
            vehicle.setScale(0.09);
            this.setSpriteCollider(vehicle, config.type);
            vehicle.body.setDrag(150);
            vehicle.setRotation((Math.floor(Math.random() * 4) * Math.PI / 2));
            Object.assign(vehicle, config, { currentHealth: config.health, isPlayerVehicle: false, lastDriver: null });
            vehicle.refreshBody();
            this.vehicles.push(vehicle);
            this.dynamicSprites.push(vehicle);
        }
    }

    // MODIFIED: Reworked NPC generation to prevent clumping
    createNPCs() {
        const walkableAreas = this.grassAreas;
        if (walkableAreas.length === 0) return;
        const npcCount = 80;
        const minNpcDistance = 30; // Min distance between NPCs
        const maxRetries = 20;     // Prevent infinite loops

        for (let i = 0; i < npcCount; i++) {
            let validPosition = false;
            let x, y;
            let retries = 0;

            while (!validPosition && retries < maxRetries) {
                const spawnArea = Phaser.Utils.Array.GetRandom(walkableAreas);
                x = Phaser.Math.Between(spawnArea.left, spawnArea.right);
                y = Phaser.Math.Between(spawnArea.top, spawnArea.bottom);
                
                validPosition = true; // Assume true until a check fails

                // Check 1: Distance from player
                if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 300) {
                    validPosition = false;
                    retries++;
                    continue;
                }

                // Check 2: Distance from other NPCs
                for (const existingNpc of this.npcs.children.entries) {
                    if (Phaser.Math.Distance.Between(x, y, existingNpc.x, existingNpc.y) < minNpcDistance) {
                        validPosition = false;
                        break; // Exit inner for-loop
                    }
                }
                
                if (!validPosition) {
                    retries++;
                }
            }

            if (validPosition) {
                const npc = this.physics.add.sprite(x, y, 'npc');
                npc.setScale(0.05);
                this.setSpriteCollider(npc, 'npc');
                npc.setTint(Phaser.Math.Between(0x888888, 0xffffff));
                Object.assign(npc, { walkDirection: Math.random() * Math.PI * 2, walkSpeed: 30 + Math.random() * 20, changeDirectionTimer: 0, panicMode: false, panicTimer: 0 });
                this.npcs.add(npc);
                this.dynamicSprites.push(npc);
            } else {
                console.warn(`Could not find a valid position for NPC #${i} after ${maxRetries} retries.`);
            }
        }
    }

    updateDepthSorting() {
        this.dynamicSprites.forEach(sprite => {
            if (sprite.active) {
                sprite.setDepth(sprite.y);
            }
        });
        this.dynamicSprites = this.dynamicSprites.filter(sprite => sprite.active);
    }
    
    createMissions() {
        this.missions = [{ id: 1, name: "First Ride", description: "Steal a vehicle and drive to the marked location", target: { x: 1800, y: 800 }, reward: 500, completed: false }, { id: 2, name: "Escape the Heat", description: "Lose a 3-star wanted level", target: null, reward: 1000, completed: false }, ];
        this.currentMission = this.missions[0];
        this.createMissionMarker();
    }

    createMissionMarker() {
        if (this.currentMission && this.currentMission.target) {
            if (this.missionTarget) this.missionTarget.destroy();
            this.missionTarget = this.add.circle(this.currentMission.target.x, this.currentMission.target.y, 30, 0x00ff00).setAlpha(0.7);
            this.tweens.add({ targets: this.missionTarget, alpha: 0.3, duration: 1000, yoyo: true, repeat: -1 });
        }
    }

    setupControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasdKeys = this.input.keyboard.addKeys('W,S,A,D,E,SPACE,R,ESC,Q,F,ONE,TWO,THREE');
        this.wasdKeys.E.on('down', () => this.handleVehicleInteraction());
        this.wasdKeys.Q.on('down', () => this.switchWeapon());
        this.wasdKeys.ONE.on('down', () => { this.currentWeapon = 0; this.updateUI(); });
        this.wasdKeys.TWO.on('down', () => { this.currentWeapon = 1; this.updateUI(); });
        this.wasdKeys.THREE.on('down', () => { this.currentWeapon = 2; this.updateUI(); });
        this.input.on('pointerdown', p => { if (!this.playerInVehicle) { this.isAutoFiring = true; this.autoFireTarget = { x: p.worldX, y: p.worldY }; this.shoot(p.worldX, p.worldY); } });
        this.input.on('pointerup', () => { this.isAutoFiring = false; });
        this.wasdKeys.F.on('down', () => { if (!this.playerInVehicle) { this.isAutoFiring = true; this.shootForward(); } });
        this.wasdKeys.F.on('up', () => { this.isAutoFiring = false; });
        this.wasdKeys.R.on('down', () => { this.wantedLevel = 0; this.updateUI(); });
    }

    switchWeapon() { this.currentWeapon = (this.currentWeapon + 1) % this.weapons.length; this.updateUI(); }
    
    shoot(targetX, targetY) {
        const w = this.weapons[this.currentWeapon];
        const t = this.time.now;
        if (t - this.lastShotTime < w.fireRate || w.ammo <= 0) return;
        w.ammo--;
        this.lastShotTime = t;
        const a = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);
        for (let i = 0; i < w.pelletsPerShot; i++) {
            this.createBullet(this.player.x, this.player.y, a + (Math.random() - 0.5) * w.spread, w.damage);
        }
        this.createMuzzleFlash(this.player.x, this.player.y);
        if (Math.random() < 0.3) this.increaseCrime("Gunfire");
        this.updateUI();
    }

    shootForward() {
        const w = this.weapons[this.currentWeapon];
        const t = this.time.now;
        if (t - this.lastShotTime < w.fireRate || w.ammo <= 0) return;
        w.ammo--;
        this.lastShotTime = t;
        const a = this.player.rotation - Math.PI / 2;
        for (let i = 0; i < w.pelletsPerShot; i++) {
            this.createBullet(this.player.x, this.player.y, a + (Math.random() - 0.5) * w.spread, w.damage);
        }
        this.createMuzzleFlash(this.player.x, this.player.y);
        if (Math.random() < 0.3) this.increaseCrime("Gunfire");
        this.updateUI();
    }

    createBullet(x, y, angle, damage) {
        const b = this.physics.add.sprite(x, y, 'bullet').setScale(0.8);
        b.body.setSize(6, 6);
        b.damage = damage;
        b.setDepth(2500); 
        this.bullets.add(b);
        this.physics.velocityFromRotation(angle, 800, b.body.velocity);
        this.time.delayedCall(2000, () => { if (b.active) b.destroy(); });
    }

    createMuzzleFlash(x, y) {
        const f = this.add.sprite(x, y, 'muzzle_flash').setScale(0.5).setDepth(2600);
        this.muzzleFlashes.push(f);
        this.time.delayedCall(100, () => { if (f.active) f.destroy(); });
    }

    setupTimers() {
        this.time.addEvent({ delay: 8000, callback: this.decreaseWantedLevel, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 4000, callback: this.spawnPolice, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 100, callback: this.updateNPCBehavior, callbackScope: this, loop: true });
    }

    createUI() {
        const { width } = this.sys.game.config;
        const d = 3000;
        this.gameUI.healthBarBg = this.add.rectangle(60, 60, 220, 25, 0x660000).setOrigin(0, 0).setScrollFactor(0).setDepth(d);
        this.gameUI.healthBar = this.add.rectangle(62, 62, 216, 21, 0x00ff00).setOrigin(0, 0).setScrollFactor(0).setDepth(d + 1);
        this.gameUI.healthText = this.add.text(70, 67, 'HEALTH', { fontSize: '14px', color: '#ffffff', fontWeight: 'bold' }).setScrollFactor(0).setDepth(d + 2);
        this.gameUI.wantedStars = [];
        this.gameUI.wantedText = this.add.text(320, 67, 'WANTED:', { fontSize: '14px', color: '#ffffff', fontWeight: 'bold' }).setScrollFactor(0).setDepth(d + 2);
        for (let i = 0; i < 5; i++) { this.gameUI.wantedStars.push(this.add.text(400 + i * 22, 60, '★', { fontSize: '18px', color: '#333333' }).setScrollFactor(0).setDepth(d + 2)); }
        this.gameUI.moneyText = this.add.text(60, 100, '$0', { fontSize: '16px', color: '#00ff00', fontWeight: 'bold' }).setScrollFactor(0).setDepth(d + 2);
        this.gameUI.speedText = this.add.text(60, 130, 'ON FOOT', { fontSize: '14px', color: '#ffffff' }).setScrollFactor(0).setDepth(d + 2);
        this.gameUI.missionText = this.add.text(60, 160, '', { fontSize: '12px', color: '#ffff00', wordWrap: { width: 300 } }).setScrollFactor(0).setDepth(d + 2);
        this.gameUI.weaponText = this.add.text(60, 190, '', { fontSize: '14px', color: '#00ff00' }).setScrollFactor(0).setDepth(d + 2);
        this.gameUI.controlsText = this.add.text(60, 220, 'WEAPONS: Q-Switch|F-Shoot|1,2,3|Mouse-Aim&Shoot', { fontSize: '10px', color: '#cccccc' }).setScrollFactor(0).setDepth(d + 2);
        const mS = 150; const mX = width - mS - 10; const mY = mS / 2 + 10;
        this.gameUI.minimapBg = this.add.rectangle(mX, mY, mS, mS, 0x000000).setScrollFactor(0).setDepth(d).setAlpha(0.8);
        this.createMinimapLayout(mX, mY, mS);
        this.gameUI.minimapBorder = this.add.rectangle(mX, mY, mS, mS).setScrollFactor(0).setDepth(d + 3).setStrokeStyle(2, 0xff6b35);
        this.gameUI.minimapPlayer = this.add.circle(mX, mY, 3, 0x00ff00).setScrollFactor(0).setDepth(d + 4);
    }

    createMinimapLayout(mX, mY, mS) {
        const wS = mS / Math.max(this.worldWidth, this.worldHeight);
        this.roadAreas.forEach(r => { this.add.rectangle(mX - mS / 2 + (r.x * wS) + (r.width * wS) / 2, mY - mS / 2 + (r.y * wS) + (r.height * wS) / 2, r.width * wS, r.height * wS, 0x444444).setScrollFactor(0).setDepth(3001); });
        this.buildings.children.each(b => { this.add.rectangle(mX - mS / 2 + (b.x * wS), mY - mS / 2 + (b.y * wS), 2, 2, 0x888888).setScrollFactor(0).setDepth(3001); });
    }

    handleVehicleInteraction() { if (this.playerInVehicle) this.exitVehicle(); else this.enterNearbyVehicle(); }
    enterNearbyVehicle() { let cV = null, cD = Infinity; for (let v of this.vehicles) { if (v.isPlayerVehicle) continue; const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, v.x, v.y); if (d < 60 && d < cD) { cD = d; cV = v; } } if (cV) this.enterVehicle(cV); }
    
    enterVehicle(v) { 
        this.playerInVehicle = true; 
        this.currentVehicle = v; 
        this.player.setVisible(false); 
        v.isPlayerVehicle = true; 
        if (v.lastDriver !== 'player') { this.increaseCrime("Car Theft"); v.lastDriver = 'player'; } 
        this.cameras.main.startFollow(v, true, 0.1, 0.1); 
        this.showNotification(`Entered ${v.type.replace('_', ' ').toUpperCase()}!`); 
        
        if (this.onFootMusic.isPlaying) this.onFootMusic.stop();
        if (!this.inVehicleMusic.isPlaying) this.inVehicleMusic.play();
    }
    
    exitVehicle() { 
        if (this.currentVehicle) { 
            const eD = 45; 
            let eX = this.currentVehicle.x + Math.cos(this.currentVehicle.rotation + Math.PI / 2) * eD; 
            let eY = this.currentVehicle.y + Math.sin(this.currentVehicle.rotation + Math.PI / 2) * eD; 
            let a = 0; 
            while ((this.isAreaOnRoad(new Phaser.Geom.Rectangle(eX - 10, eY - 10, 20, 20))) && a < 10) { 
                const nA = this.currentVehicle.rotation + (Math.random() * Math.PI) - (Math.PI / 2); 
                eX = this.currentVehicle.x + Math.cos(nA) * eD; 
                eY = this.currentVehicle.y + Math.sin(nA) * eD; a++; 
            } 
            this.player.setPosition(eX, eY); 
            this.player.setVisible(true); 
            this.currentVehicle.isPlayerVehicle = false; 
            this.currentVehicle = null; 
            this.playerInVehicle = false; 
            this.cameras.main.startFollow(this.player, true, 0.1, 0.1); 

            if (this.inVehicleMusic.isPlaying) this.inVehicleMusic.stop();
            if (!this.onFootMusic.isPlaying) this.onFootMusic.play();
        } 
    }
    
    spawnPolice() {
        if (this.wantedLevel >= 2 && this.policeCars.length < this.wantedLevel) {
            const sS = Math.floor(Math.random() * 4);
            let x, y, a = 0, sF = false;
            while (!sF && a < 50) {
                switch (sS) {
                    case 0: x = Phaser.Math.Between(0, this.worldWidth); y = 0; break;
                    case 1: x = this.worldWidth; y = Phaser.Math.Between(0, this.worldHeight); break;
                    case 2: x = Phaser.Math.Between(0, this.worldWidth); y = this.worldHeight; break;
                    case 3: x = 0; y = Phaser.Math.Between(0, this.worldHeight); break;
                }
                if (this.isAreaOnRoad(new Phaser.Geom.Rectangle(x,y,1,1))) sF = true;
                a++;
            }
            if (!sF) return;
            const pC = this.physics.add.sprite(x, y, 'car_police');
            pC.setScale(0.09);
            this.setSpriteCollider(pC, 'car_police');
            pC.body.setDrag(100);
            Object.assign(pC, { isPolice: true, health: 120, maxSpeed: 320, chaseIntensity: this.wantedLevel });
            pC.refreshBody();
            this.policeCars.push(pC);
            this.vehicles.push(pC);
            this.dynamicSprites.push(pC);
        }
    }

    increaseCrime(cT = "Unknown") { this.wantedLevel = Math.min(5, this.wantedLevel + 1); this.lastCrimeTime = this.time.now; this.updateUI(); this.makeNearbyNPCsPanic(); }
    makeNearbyNPCsPanic() { const pP = this.playerInVehicle ? this.currentVehicle : this.player; this.npcs.children.each(n => { if (n.active && Phaser.Math.Distance.Between(pP.x, pP.y, n.x, n.y) < 200) { n.panicMode = true; n.panicTimer = 5000; n.walkDirection = Phaser.Math.Angle.Between(pP.x, pP.y, n.x, n.y); n.walkSpeed = 120; } }); }
    decreaseWantedLevel() { if (this.time.now - this.lastCrimeTime > 15000 && this.wantedLevel > 0) { this.wantedLevel--; this.updateUI(); if (this.policeCars.length > this.wantedLevel) { for (let i = 0; i < this.policeCars.length - this.wantedLevel; i++) { const c = this.policeCars.pop(); const ix = this.vehicles.indexOf(c); if (ix > -1) this.vehicles.splice(ix, 1); if (c.active) c.destroy(); } } } }
    
    updateNPCBehavior() {
        this.npcs.children.each(n => {
            if (!n.active) return;
            
            // If an NPC is on a road or intersection for any reason, rescue them
            if (this.isAreaOnRoad(n.getBounds()) || this.isInIntersection(n.x, n.y)) {
                this.teleportNPCToSafety(n);
                return;
            }

            const nextX = n.x + Math.cos(n.walkDirection) * n.walkSpeed * 0.016;
            const nextY = n.y + Math.sin(n.walkDirection) * n.walkSpeed * 0.016;
            
            // MODIFIED: Check against roads and intersections before moving (sidewalk check removed)
            const nextPosRect = new Phaser.Geom.Rectangle(nextX -1, nextY -1, 2, 2);
            if (this.isAreaOnRoad(nextPosRect) || this.isInIntersection(nextX, nextY)) {
                n.walkDirection = Math.random() * Math.PI * 2; 
                n.body.setVelocity(0,0);
                return;
            }

            if (n.panicMode) {
                n.panicTimer -= 100;
                if (n.panicTimer <= 0) { n.panicMode = false; n.walkSpeed = 30 + Math.random() * 20; }
            }
            n.changeDirectionTimer += 100;
            if (n.changeDirectionTimer > 3000) { n.walkDirection = Math.random() * Math.PI * 2; n.changeDirectionTimer = 0; }
            const s = n.panicMode ? 120 : n.walkSpeed;
            n.body.setVelocity(Math.cos(n.walkDirection) * s, Math.sin(n.walkDirection) * s);
            
            if (n.x < 50 || n.x > this.worldWidth - 50 || n.y < 50 || n.y > this.worldHeight - 50) {
                n.walkDirection += Math.PI;
            }
        });
    }

    teleportNPCToSafety(npc) {
        const walkableAreas = this.grassAreas;
        if(walkableAreas.length === 0) return;

        let nearestArea = null;
        let minDistance = Infinity;

        walkableAreas.forEach(area => {
            const distance = Phaser.Math.Distance.Between(npc.x, npc.y, area.centerX, area.centerY);
            if (distance < minDistance) {
                minDistance = distance;
                nearestArea = area;
            }
        });

        if (nearestArea) {
            npc.x = nearestArea.centerX;
            npc.y = nearestArea.centerY;
            npc.body.setVelocity(0,0);
        }
    }

    showNotification(t, c = '#ffff00') {
        const n = this.add.text(this.sys.game.config.width / 2, 200, t, { fontSize: '18px', color: c, fontWeight: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(4000);
        this.tweens.add({ targets: n, alpha: 0, y: 150, duration: 3000, onComplete: () => n.destroy() });
    }

    checkMissionProgress() {
        if (!this.currentMission || this.currentMission.completed) return;
        const pP = this.playerInVehicle ? this.currentVehicle : this.player;
        switch (this.currentMission.id) {
            case 1: if (this.playerInVehicle && this.currentMission.target && Phaser.Math.Distance.Between(pP.x, pP.y, this.currentMission.target.x, this.currentMission.target.y) < 80) this.completeMission(); break;
            case 2: if (this.wantedLevel === 0) this.completeMission(); break;
        }
    }

    completeMission() {
        if (this.currentMission) {
            this.currentMission.completed = true;
            this.playerMoney += this.currentMission.reward;
            this.showNotification(`MISSION COMPLETE! +$${this.currentMission.reward}`, '#00ff00');
            if (this.missionTarget) { this.missionTarget.destroy(); this.missionTarget = null; }
            const nM = this.missions.find(m => !m.completed);
            if (nM) { this.currentMission = nM; this.createMissionMarker(); }
            else { this.currentMission = null; this.showNotification("ALL MISSIONS COMPLETE!", '#ff6b35'); }
            this.updateUI();
        }
    }
    
    setupCollisions() {
        this.physics.add.collider(this.player, this.buildings);
        this.physics.add.collider(this.vehicles, this.buildings, this.handleVehicleBuildingCollision, null, this);
        this.physics.add.collider(this.player, this.vehicles, (p, v) => { if (!this.playerInVehicle) this.handlePlayerVehicleCollision(p, v); });
        this.physics.add.collider(this.vehicles, this.vehicles, (v1, v2) => this.handleSimpleVehicleCollision(v1, v2, v1.isPolice || v2.isPolice));
        this.physics.add.collider(this.bullets, this.buildings, (b) => { if (b.active) b.destroy(); });
        this.physics.add.collider(this.npcs, this.buildings);
        this.physics.add.overlap(this.bullets, this.npcs, (bullet, npc) => { if (bullet.active && npc.active) { this.hitNPC(npc, bullet.damage); bullet.destroy(); } });
        this.physics.add.overlap(this.bullets, this.vehicles, (b, v) => { if (b.active && v.active && v !== this.currentVehicle) { this.hitVehicle(v, b.damage); b.destroy(); if (v.isPolice) { this.increaseCrime("Shot Police"); this.increaseCrime("Shot Police"); } else { this.increaseCrime("Property Damage"); } } });
        this.physics.add.overlap(this.player, this.npcs, (p, n) => { if (!this.playerInVehicle && n.active) this.handlePlayerNPCOverlap(p, n); });
        this.physics.add.overlap(this.vehicles, this.npcs, (v, n) => { if (v === this.currentVehicle && n.active) this.handleVehicleNPCOverlap(v, n); });
    }

    handleVehicleBuildingCollision(vehicle, building) {
        if (vehicle !== this.currentVehicle) {
            this.damageVehicle(vehicle, 10);
            return;
        }
        const speed = vehicle.body.velocity.length();
        if (speed > 80) {
            const damage = Math.min(25, Math.floor(speed / 15));
            this.damagePlayer(damage);
            this.damageVehicle(vehicle, damage * 2);
            this.cameras.main.shake(100, 0.005);
        }
    }

    handlePlayerNPCOverlap(p, n) { const a = Phaser.Math.Angle.Between(p.x, p.y, n.x, n.y); n.body.setVelocity(Math.cos(a) * 80, Math.sin(a) * 80); if (Math.random() < 0.1) this.increaseCrime("Hit Pedestrian"); }
    handleVehicleNPCOverlap(v, n) { const s = v.body.velocity.length(); if (s > 50 && Math.random() < 0.2) { this.createBloodEffect(n.x, n.y); if(n.active) n.destroy(); this.playerMoney += 15; this.increaseCrime("Ran over Civilian"); } else { const a = Phaser.Math.Angle.Between(v.x, v.y, n.x, n.y); n.body.setVelocity(Math.cos(a) * 150, Math.sin(a) * 150); } }
    handlePlayerVehicleCollision(p, v) { const s = v.body.velocity.length(); if (s > 50) this.damagePlayer(Math.floor(s / 20)); else if (s > 0) this.damagePlayer(1); const a = Phaser.Math.Angle.Between(v.x, v.y, p.x, p.y); p.body.setVelocity(Math.cos(a) * 200, Math.sin(a) * 200); if (!v.isPlayerVehicle && Math.random() < 0.1) this.increaseCrime("Hit Pedestrian"); }
    
    hitNPC(n, d) { 
      this.createBloodEffect(n.x, n.y); 
      this.playerMoney += 10; 
      this.updateUI(); 
      if (n.active) n.destroy(); 
    }
    
    damageVehicle(v, d) {
        if (!v || !v.active || v.isExploding) return;
        if (!v.currentHealth) v.currentHealth = v.health || 100;
        v.currentHealth -= d;
        v.setTint(0xff6666);
        this.time.delayedCall(300, () => { if (v.active) v.clearTint(); });
        if (v.currentHealth < 30 && !v.isSmoking) {
            v.isSmoking = true;
            v.smokeEvent = this.time.addEvent({ delay: 200, callback: () => this.createSmokeEffect(v.x, v.y), loop: true, callbackScope: this });
        }
        if (v.currentHealth <= 0) this.explodeVehicle(v);
    }
    
    hitVehicle(v, d) { this.damageVehicle(v, d); }

    createExplosion(x, y) {
        const e = this.add.circle(x, y, 30, 0xff4500).setAlpha(0.8);
        this.tweens.add({ targets: e, scaleX: 2, scaleY: 2, alpha: 0, duration: 500, onComplete: () => e.destroy() });
        this.npcs.children.each(n => { if (n.active && Phaser.Math.Distance.Between(x, y, n.x, n.y) < 100) this.hitNPC(n, 100); });
        this.vehicles.forEach(v => { if (v.active && v !== this.currentVehicle && Phaser.Math.Distance.Between(x, y, v.x, v.y) < 100) this.hitVehicle(v, 50); });
    }

    updateUI() { const hP = Math.max(0, this.playerHealth / this.player.maxHealth); this.gameUI.healthBar.setScale(hP, 1); if (hP > 0.6) this.gameUI.healthBar.setFillStyle(0x00ff00); else if (hP > 0.3) this.gameUI.healthBar.setFillStyle(0xffff00); else this.gameUI.healthBar.setFillStyle(0xff0000); for (let i = 0; i < 5; i++) { this.gameUI.wantedStars[i].setColor(i < this.wantedLevel ? '#ff0000' : '#333333'); } this.gameUI.moneyText.setText(`$${this.playerMoney}`); const cO = this.playerInVehicle ? this.currentVehicle : this.player; const s = Math.round(cO.body.velocity.length()); this.gameUI.speedText.setText(this.playerInVehicle ? `${this.currentVehicle.type.replace('_', ' ').toUpperCase()} - Speed: ${s}` : 'ON FOOT'); this.gameUI.missionText.setText(this.currentMission && !this.currentMission.completed ? `MISSION: ${this.currentMission.description}` : 'No active missions'); const w = this.weapons[this.currentWeapon]; this.gameUI.weaponText.setText(`${w.name}: ${w.ammo}/${w.maxAmmo}`); this.updateMinimap(); }
    updateMinimap() { const mS = 150; const wS = mS / Math.max(this.worldWidth, this.worldHeight); const { width } = this.sys.game.config; const pP = this.playerInVehicle ? this.currentVehicle : this.player; this.gameUI.minimapPlayer.setPosition((width - mS - 10) + (pP.x * wS) - mS / 2, (mS / 2 + 10) + (pP.y * wS) - mS / 2); }
    update() { this.handleMovement(); this.updatePolice(); this.handleAutomaticFire(); this.checkMissionProgress(); this.updateUI(); this.updateDepthSorting(); }
    handleAutomaticFire() { if (this.isAutoFiring && !this.playerInVehicle) { const w = this.weapons[this.currentWeapon]; if (w.automatic) { if (this.autoFireTarget) this.shoot(this.autoFireTarget.x, this.autoFireTarget.y); else this.shootForward(); } } }
    handleMovement() { if (this.playerInVehicle) this.handleVehicleMovement(this.currentVehicle); else this.handlePlayerMovement(this.player); }
    handlePlayerMovement(p) { let vX = 0, vY = 0; const s = 180; if (this.wasdKeys.W.isDown) vY = -s; if (this.wasdKeys.S.isDown) vY = s; if (this.wasdKeys.A.isDown) vX = -s; if (this.wasdKeys.D.isDown) vX = s; if (vX !== 0 && vY !== 0) { vX *= 0.707; vY *= 0.707; } p.body.setVelocity(vX, vY); if (vX !== 0 || vY !== 0) p.rotation = Math.atan2(vY, vX) + Math.PI / 2; }
    handleVehicleMovement(v) { if (v.collisionCooldown) { v.body.setVelocity(0, 0).setAcceleration(0, 0); return; } const mS = v.maxSpeed || 280, a = v.acceleration || 300, tS = 3.0; const cS = v.body.velocity.length(); if (this.wasdKeys.W.isDown) this.physics.velocityFromRotation(v.rotation, a, v.body.acceleration); else if (this.wasdKeys.S.isDown) this.physics.velocityFromRotation(v.rotation, -a * 0.7, v.body.acceleration); else v.body.setAcceleration(0); if (cS > 20) { const tI = Math.min(cS / 100, 1); if (this.wasdKeys.A.isDown) v.rotation -= tS * 0.02 * tI; if (this.wasdKeys.D.isDown) v.rotation += tS * 0.02 * tI; } v.body.setDrag(this.wasdKeys.SPACE.isDown ? 800 : 150); if (cS > mS) v.body.velocity.normalize().scale(mS); }
    
    updatePolice() {
        this.policeCars.forEach(pC => {
            if (!pC.active) return;
            if (this.wantedLevel > 0) {
                const t = this.playerInVehicle ? this.currentVehicle : this.player;
                const a = Phaser.Math.Angle.Between(pC.x, pC.y, t.x, t.y);
                const d = Phaser.Math.Distance.Between(pC.x, pC.y, t.x, t.y);
                this.physics.velocityFromRotation(a, d > 100 ? 200 + (this.wantedLevel * 40) : 300, pC.body.velocity);
                pC.rotation = a;
            } else {
                pC.body.setVelocity(0, 0);
            }
        });
    }

    handleSimpleVehicleCollision(v1, v2, iP) {
        const a = Phaser.Math.Angle.Between(v1.x, v1.y, v2.x, v2.y);
        const tS = v1.body.velocity.length() + v2.body.velocity.length();
        const bF = Math.min(tS * 0.5, 200);
        v1.body.setVelocity(Math.cos(a + Math.PI) * bF, Math.sin(a + Math.PI) * bF);
        v2.body.setVelocity(Math.cos(a) * bF, Math.sin(a) * bF);
        if (tS > 100) {
            this.damageVehicle(v1, Math.floor(tS / 50));
            this.damageVehicle(v2, Math.floor(tS / 50));
            if (v1 === this.currentVehicle || v2 === this.currentVehicle) this.damagePlayer(Math.floor(tS / 100));
        }
        if (iP && Math.random() < 0.5) this.increaseCrime("Rammed Police");
        v1.collisionCooldown = true;
        v2.collisionCooldown = true;
        this.time.delayedCall(500, () => { if (v1.active) v1.collisionCooldown = false; if (v2.active) v2.collisionCooldown = false; });
    }

    damagePlayer(d) {
        this.playerHealth = Math.max(0, this.playerHealth - d);
        this.cameras.main.flash(200, 255, 0, 0, false);
        if (this.playerHealth <= 0) this.gameOver();
        this.updateUI();
    }

    createBloodEffect(x, y) {
        const b = this.add.circle(x, y, 8, 0x8B0000).setAlpha(0.8).setDepth(1);
        for (let i = 0; i < 5; i++) {
            const s = this.add.circle(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30, 2 + Math.random() * 3, 0x8B0000).setAlpha(0.6).setDepth(1);
            this.time.delayedCall(5000, () => { if (s.active) s.destroy(); });
        }
        this.time.delayedCall(5000, () => { if (b.active) b.destroy(); });
    }

    createSmokeEffect(x, y) {
        const s = this.add.circle(x, y, 5, 0x555555).setAlpha(0.5);
        this.tweens.add({ targets: s, y: y - 20, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 1000, onComplete: () => s.destroy() });
    }

    explodeVehicle(v) {
        if (!v || v.isExploding) return;
        v.isExploding = true;
        
        this.createExplosion(v.x, v.y);
        
        if (v === this.currentVehicle) { this.exitVehicle(); this.damagePlayer(50); }
        const vI = this.vehicles.indexOf(v); if (vI > -1) this.vehicles.splice(vI, 1);
        const pI = this.policeCars.indexOf(v); if (pI > -1) this.policeCars.splice(pI, 1);
        if (v.isSmoking && v.smokeEvent) { v.smokeEvent.remove(false); v.isSmoking = false; }
        
        this.showNotification("VEHICLE DESTROYED!", '#ff0000');
        
        this.time.delayedCall(100, () => {
             if (v.active) v.destroy();
        });
    }

    gameOver() {
        this.showNotification("WASTED!", '#ff0000');
        this.sound.stopAll();

        this.time.delayedCall(3000, () => {
            this.playerHealth = 100;
            this.wantedLevel = 0;
            this.playerMoney = Math.max(0, this.playerMoney - 500);

            if (this.playerInVehicle) {
                this.exitVehicle(); 
            } else {
                if (!this.onFootMusic.isPlaying) this.onFootMusic.play();
            }

            this.player.setPosition(960, 960).body.setVelocity(0, 0);
            this.player.setVisible(true);
            this.policeCars.forEach(c => { const i = this.vehicles.indexOf(c); if (i > -1) this.vehicles.splice(i, 1); if (c.active) c.destroy(); });
            this.policeCars = [];
            this.weapons.forEach(w => { w.ammo = w.maxAmmo; });
            this.currentWeapon = 0;
            this.updateUI();
            this.showNotification("Respawned at hospital - $500 fine", '#ffff00');
        });
    }
}