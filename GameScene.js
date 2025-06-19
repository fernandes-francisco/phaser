import PreloadScene from './preload.js'
export default class GameScene extends Phaser.Scene {
            constructor() {
                super({ key: 'GameScene' });
                
                // Game state
                this.player = null;
                this.vehicles = [];
                this.npcs = [];
                this.policeCars = [];
                this.buildings = [];
                this.missions = [];
                this.bullets = [];
                this.muzzleFlashes = [];
                
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
                this.weapons = [
                    {name: "Pistol", damage: 25, ammo: 50, maxAmmo: 50, fireRate: 400, spread: 0.05, pelletsPerShot: 1},
                    {name: "SMG", damage: 15, ammo: 100, maxAmmo: 100, fireRate: 120, spread: 0.15, pelletsPerShot: 1, automatic: true},
                    {name: "Shotgun", damage: 35, ammo: 20, maxAmmo: 20, fireRate: 900, spread: 0.4, pelletsPerShot: 5}
                ];
                this.lastShotTime = 0;
                this.isAutoFiring = false;
                
                // Mission state
                this.currentMission = null;
                this.missionTarget = null;
                
                // UI elements
                this.gameUI = {};
                
                // Game world size - smaller for better city feel
                this.worldWidth = 1920;
                this.worldHeight = 1920;
            }

            create() {
                // Set world bounds
                this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
                
                // Create city environment
                this.createCity();
                
                // Create player
                this.createPlayer();
                
                // Create vehicles
                this.createVehicles();
                
                // Create NPCs
                this.createNPCs();
                
                // Setup controls
                this.setupControls();
                
                // Create UI
                this.createUI();
                
                // Setup camera
                this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
                this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
                this.cameras.main.setDeadzone(50, 50);
                
                // Initialize missions
                this.createMissions();
                
                // Game mechanics timers
                this.setupTimers();
            }

            createCity() {
                // Store map data for minimap and NPC pathfinding
                this.mapData = [];
                this.sidewalkAreas = [];
                this.roadAreas = [];
                this.intersectionAreas = [];
                this.placedObjects = []; // Track all placed objects to prevent overlap
                
                // Create a proper designed city layout
                this.createCityBlocks();
            }

            createCityBlocks() {
                // Create a proper city with designed street layout
                this.createProperStreets();
                this.createCityDistricts();
                this.createNaturalAreas();
            }

            createProperStreets() {
                const roadWidth = 50;
                
                // Main avenue (horizontal through center)
                this.createStreet(0, this.worldHeight/2 - roadWidth/2, this.worldWidth, roadWidth, true);
                
                // Main street (vertical through center)  
                this.createStreet(this.worldWidth/2 - roadWidth/2, 0, roadWidth, this.worldHeight, false);
                
                // FEWER secondary streets (reduce road density)
                // Secondary streets (horizontal) - much fewer
                for (let y = 400; y < this.worldHeight; y += 600) {
                    if (Math.abs(y - this.worldHeight/2) > 150) { // Skip near main avenue
                        this.createStreet(0, y, this.worldWidth, 35, true);
                    }
                }
                
                // Secondary streets (vertical) - much fewer
                for (let x = 400; x < this.worldWidth; x += 600) {
                    if (Math.abs(x - this.worldWidth/2) > 150) { // Skip near main street
                        this.createStreet(x, 0, 35, this.worldHeight, false);
                    }
                }
            }

            createStreet(x, y, width, height, isHorizontal) {
                // Street surface
                const street = this.add.rectangle(x, y, width, height, 0x333333);
                street.setOrigin(0, 0);
                this.roadAreas.push({x: x, y: y, width: width, height: height});
                
                // ALWAYS add center line for every road
                if (isHorizontal && width > height) {
                    // Horizontal road - dashed yellow center line
                    for (let i = x; i < x + width; i += 30) {
                        const lineSegment = this.add.rectangle(i, y + height/2 - 1, 15, 2, 0xffff00);
                        lineSegment.setOrigin(0, 0);
                    }
                } else if (!isHorizontal && height > width) {
                    // Vertical road - dashed yellow center line
                    for (let i = y; i < y + height; i += 30) {
                        const lineSegment = this.add.rectangle(x + width/2 - 1, i, 2, 15, 0xffff00);
                        lineSegment.setOrigin(0, 0);
                    }
                }
                
                // Create intersections where roads cross
                this.createIntersections(x, y, width, height, isHorizontal);
                
                // Sidewalks (but not in intersection areas)
                const sidewalkWidth = 15;
                if (isHorizontal) {
                    // Top and bottom sidewalks
                    this.createSidewalk(x, y - sidewalkWidth, width, sidewalkWidth);
                    this.createSidewalk(x, y + height, width, sidewalkWidth);
                } else {
                    // Left and right sidewalks  
                    this.createSidewalk(x - sidewalkWidth, y, sidewalkWidth, height);
                    this.createSidewalk(x + width, y, sidewalkWidth, height);
                }
            }

            createIntersections(x, y, width, height, isHorizontal) {
                // Find where this road intersects with other roads
                for (let otherRoad of this.roadAreas) {
                    if (this.roadsIntersect(x, y, width, height, otherRoad)) {
                        // Create intersection area
                        const intersectX = Math.max(x, otherRoad.x);
                        const intersectY = Math.max(y, otherRoad.y);
                        const intersectWidth = Math.min(x + width, otherRoad.x + otherRoad.width) - intersectX;
                        const intersectHeight = Math.min(y + height, otherRoad.y + otherRoad.height) - intersectY;
                        
                        if (intersectWidth > 30 && intersectHeight > 30) {
                            // Use simple intersection asset (just road color with center lines)
                            const intersection = this.add.sprite(
                                intersectX + intersectWidth/2, 
                                intersectY + intersectHeight/2, 
                                'intersection'
                            );
                            intersection.setOrigin(0.5, 0.5);
                            intersection.setDisplaySize(intersectWidth, intersectHeight);
                            
                            // Store intersection area to prevent sidewalks here
                            this.intersectionAreas = this.intersectionAreas || [];
                            this.intersectionAreas.push({
                                x: intersectX, 
                                y: intersectY, 
                                width: intersectWidth, 
                                height: intersectHeight
                            });
                        }
                    }
                }
            }

            roadsIntersect(x1, y1, w1, h1, road2) {
                return !(x1 + w1 < road2.x || road2.x + road2.width < x1 || 
                        y1 + h1 < road2.y || road2.y + road2.height < y1);
            }

            createSidewalk(x, y, width, height) {
                // Don't create sidewalk if it overlaps with an intersection
                if (this.intersectionAreas) {
                    for (let intersection of this.intersectionAreas) {
                        if (this.rectanglesOverlap(x, y, width, height, 
                                                 intersection.x, intersection.y, 
                                                 intersection.width, intersection.height)) {
                            return; // Skip this sidewalk
                        }
                    }
                }
                
                const sidewalk = this.add.rectangle(x, y, width, height, 0xcccccc);
                sidewalk.setOrigin(0, 0);
                this.sidewalkAreas.push({x: x, y: y, width: width, height: height});
            }

            rectanglesOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
                return !(x1 + w1 < x2 || x2 + w2 < x1 || y1 + h1 < y2 || y2 + h2 < y1);
            }

            createCityDistricts() {
                // Define city districts with specific building types
                const districts = [
                    // Downtown (center)
                    {x: this.worldWidth/2 - 200, y: this.worldHeight/2 - 200, width: 400, height: 400, type: 'downtown', density: 0.6},
                    // Residential areas
                    {x: 50, y: 50, width: 400, height: 400, type: 'residential', density: 0.3},
                    {x: this.worldWidth - 450, y: 50, width: 400, height: 400, type: 'residential', density: 0.3},
                    {x: 50, y: this.worldHeight - 450, width: 400, height: 400, type: 'residential', density: 0.3},
                    {x: this.worldWidth - 450, y: this.worldHeight - 450, width: 400, height: 400, type: 'residential', density: 0.3},
                    // Commercial strips
                    {x: 100, y: this.worldHeight/2 - 100, width: 300, height: 200, type: 'commercial', density: 0.4},
                    {x: this.worldWidth - 400, y: this.worldHeight/2 - 100, width: 300, height: 200, type: 'commercial', density: 0.4}
                ];
                
                districts.forEach(district => {
                    this.buildDistrict(district);
                });
            }

            buildDistrict(district) {
                const blockSize = 80;
                
                for (let x = district.x; x < district.x + district.width; x += blockSize + 30) {
                    for (let y = district.y; y < district.y + district.height; y += blockSize + 30) {
                        // UNIVERSAL ROAD AVOIDANCE - check multiple points to ensure nothing spawns on roads
                        if (this.isAreaOnRoad(x, y, blockSize, blockSize)) continue;
                        
                        if (Math.random() < district.density) {
                            let buildingType;
                            switch(district.type) {
                                case 'downtown':
                                    buildingType = Math.random() < 0.8 ? 'building_office' : 'building_commercial';
                                    break;
                                case 'residential':
                                    buildingType = Math.random() < 0.7 ? 'building_residential' : 'building_house';
                                    break;
                                case 'commercial':
                                    buildingType = 'building_commercial';
                                    break;
                            }
                            this.createProperBuilding(x, y, blockSize, buildingType);
                        }
                    }
                }
            }

            // Universal function to prevent ANYTHING from spawning on roads
            isAreaOnRoad(x, y, width, height) {
                // Check multiple points within the area to ensure no overlap with roads
                const checkPoints = [
                    {x: x, y: y}, // Top-left
                    {x: x + width, y: y}, // Top-right
                    {x: x, y: y + height}, // Bottom-left
                    {x: x + width, y: y + height}, // Bottom-right
                    {x: x + width/2, y: y + height/2}, // Center
                ];
                
                for (let point of checkPoints) {
                    if (this.isOnRoad(point.x, point.y)) {
                        return true;
                    }
                }
                return false;
            }

            isOnRoad(x, y) {
                for (let road of this.roadAreas) {
                    if (x >= road.x && x <= road.x + road.width && 
                        y >= road.y && y <= road.y + road.height) {
                        return true;
                    }
                }
                return false;
            }

            createNaturalAreas() {
                // Add trees along streets
                this.addStreetTrees();
                
                // Add grass areas
                this.addGrassAreas();
            }

            addStreetTrees() {
                // Trees placed carefully to avoid ALL roads
                for (let x = 80; x < this.worldWidth; x += 120) {
                    for (let y = 80; y < this.worldHeight; y += 120) {
                        // STRICT ROAD AVOIDANCE - check area around tree placement
                        if (!this.isAreaOnRoad(x - 15, y - 15, 30, 30)) {
                            if (Math.random() < 0.4) {
                                this.createTree(x, y);
                            }
                        }
                    }
                }
            }

            isNearSidewalk(x, y) {
                for (let sidewalk of this.sidewalkAreas) {
                    const distance = Math.min(
                        Math.abs(x - sidewalk.x),
                        Math.abs(x - (sidewalk.x + sidewalk.width)),
                        Math.abs(y - sidewalk.y),
                        Math.abs(y - (sidewalk.y + sidewalk.height))
                    );
                    if (distance < 30) return true;
                }
                return false;
            }

            createTree(x, y) {
                const treeSize = 25; // Approximate tree size for overlap checking
                
                // Check for overlap with existing objects
                if (this.checkObjectOverlap(x - treeSize/2, y - treeSize/2, treeSize, treeSize)) {
                    return; // Don't place tree if it overlaps
                }
                
                // Tree trunk
                const trunk = this.add.rectangle(x, y + 8, 8, 16, 0x8B4513);
                trunk.setOrigin(0.5, 1);
                
                // Tree crown
                const crown = this.add.circle(x, y, 12 + Math.random() * 8, 0x228B22);
                
                // Register this tree as a placed object
                this.placedObjects.push({x: x - treeSize/2, y: y - treeSize/2, width: treeSize, height: treeSize, type: 'tree'});
            }

            checkObjectOverlap(x, y, width, height) {
                for (let obj of this.placedObjects) {
                    if (this.rectanglesOverlap(x, y, width, height, obj.x, obj.y, obj.width, obj.height)) {
                        return true; // Overlap detected
                    }
                }
                return false; // No overlap
            }


            addGrassAreas() {
                // Add grass patches in empty areas with STRICT road avoidance
                for (let i = 0; i < 20; i++) {
                    const size = 80 + Math.random() * 60;
                    const x = Math.random() * (this.worldWidth - size - 50) + 25;
                    const y = Math.random() * (this.worldHeight - size - 50) + 25;
                    
                    // Use universal road avoidance
                    if (!this.isAreaOnRoad(x, y, size, size)) {
                        const grass = this.add.rectangle(x, y, size, size, 0x90EE90);
                        grass.setOrigin(0, 0);
                        grass.setAlpha(0.6);
                        
                        // Add some small details to grass areas
                        if (Math.random() < 0.5) {
                            const detailX = x + Math.random() * size;
                            const detailY = y + Math.random() * size;
                            const detail = this.add.circle(detailX, detailY, 3 + Math.random() * 4, 0x228B22);
                            detail.setAlpha(0.8);
                        }
                    }
                }
            }

            createProperBuilding(x, y, blockSize, buildingType) {
                // Check for overlap with existing objects
                if (this.checkObjectOverlap(x, y, blockSize, blockSize)) {
                    return; // Don't place building if it overlaps
                }
                
                const sidewalkWidth = 12;
                
                // Create sidewalk border
                this.createSidewalkBorder(x, y, blockSize, sidewalkWidth);
                
                // Create building in center with proper collision
                const buildingSize = blockSize - 2 * sidewalkWidth;
                const buildingX = x + blockSize/2;
                const buildingY = y + blockSize/2;
                
                const building = this.physics.add.sprite(buildingX, buildingY, buildingType);
                building.setOrigin(0.5, 0.5);
                building.setScale(0.6); // Make buildings smaller
                building.body.setImmovable(true);
                
                // Set collision box to match actual building size (not including transparent areas)
                let collisionWidth, collisionHeight, offsetX, offsetY;
                
                switch(buildingType) {
                    case 'building_office':
                        collisionWidth = 48;
                        collisionHeight = 48;
                        offsetX = 8;
                        offsetY = 8;
                        break;
                    case 'building_residential':
                        collisionWidth = 44;
                        collisionHeight = 44;
                        offsetX = 10;
                        offsetY = 10;
                        break;
                    case 'building_commercial':
                        collisionWidth = 52;
                        collisionHeight = 52;
                        offsetX = 6;
                        offsetY = 6;
                        break;
                    case 'building_house':
                        collisionWidth = 40;
                        collisionHeight = 36;
                        offsetX = 12;
                        offsetY = 16;
                        break;
                    case 'building_apartment':
                        collisionWidth = 32;
                        collisionHeight = 56;
                        offsetX = 16;
                        offsetY = 4;
                        break;
                    default:
                        collisionWidth = 50;
                        collisionHeight = 50;
                        offsetX = 7;
                        offsetY = 7;
                }
                
                building.body.setSize(collisionWidth, collisionHeight);
                building.body.setOffset(offsetX, offsetY);
                this.buildings.push(building);
                
                // Register this building as a placed object
                this.placedObjects.push({x: x, y: y, width: blockSize, height: blockSize, type: 'building'});
            }

            createSidewalkBorder(x, y, size, sidewalkWidth) {
                // Top sidewalk
                const sidewalkTop = this.add.rectangle(x, y, size, sidewalkWidth, 0xcccccc);
                sidewalkTop.setOrigin(0, 0);
                this.sidewalkAreas.push({x: x, y: y, width: size, height: sidewalkWidth});
                
                // Bottom sidewalk
                const sidewalkBottom = this.add.rectangle(x, y + size - sidewalkWidth, size, sidewalkWidth, 0xcccccc);
                sidewalkBottom.setOrigin(0, 0);
                this.sidewalkAreas.push({x: x, y: y + size - sidewalkWidth, width: size, height: sidewalkWidth});
                
                // Left sidewalk
                const sidewalkLeft = this.add.rectangle(x, y + sidewalkWidth, sidewalkWidth, size - 2 * sidewalkWidth, 0xcccccc);
                sidewalkLeft.setOrigin(0, 0);
                this.sidewalkAreas.push({x: x, y: y + sidewalkWidth, width: sidewalkWidth, height: size - 2 * sidewalkWidth});
                
                // Right sidewalk
                const sidewalkRight = this.add.rectangle(x + size - sidewalkWidth, y + sidewalkWidth, sidewalkWidth, size - 2 * sidewalkWidth, 0xcccccc);
                sidewalkRight.setOrigin(0, 0);
                this.sidewalkAreas.push({x: x + size - sidewalkWidth, y: y + sidewalkWidth, width: sidewalkWidth, height: size - 2 * sidewalkWidth});
            }

            createPlayer() {
                // Spawn player in a safe location in the new smaller world
                this.player = this.physics.add.sprite(960, 960, 'player');
                this.player.setCollideWorldBounds(true);
                this.player.setScale(0.07);
                // Properly sized collision box for player (32x32 sprite)
                this.player.body.setSize(22, 22);
                this.player.body.setOffset(5, 5); // Center the collision box
                this.player.body.setDrag(400);
                this.player.body.setMaxVelocity(180);
                
                // Player properties
                this.player.maxHealth = 100;
                this.player.money = 0;
            }

            createVehicles() {
                const vehicleConfigs = [
                    { type: 'car_red', maxSpeed: 280, acceleration: 250, health: 100 },
                    { type: 'truck_blue', maxSpeed: 200, acceleration: 180, health: 150 },
                    { type: 'car_police', maxSpeed: 300, acceleration: 280, health: 120 }
                ];
                
                // Spawn vehicles around the city
                for (let i = 0; i < 25; i++) {
                    let x, y;
                    do {
                        x = Phaser.Math.Between(100, this.worldWidth - 100);
                        y = Phaser.Math.Between(100, this.worldHeight - 100);
                    } while (Math.abs(x - 1200) < 200 && Math.abs(y - 1200) < 200); // Don't spawn near player
                    
                    const config = Phaser.Utils.Array.GetRandom(vehicleConfigs);
                    const vehicle = this.physics.add.sprite(x, y, config.type);
                    
                    vehicle.setScale(0.09);
                    // Properly sized collision box for vehicles (64x64 sprite)
                    vehicle.body.setSize(55, 35);
                    vehicle.body.setOffset(4.5, 14.5); // Center the collision box
                    vehicle.body.setDrag(150);
                    
                    // Align vehicles with roads (0, 90, 180, 270 degrees) - adjusted for RIGHT-facing sprites
                    const roadAlignedRotation = (Math.floor(Math.random() * 4) * Math.PI / 2);
                    vehicle.setRotation(roadAlignedRotation);
                    
                    // Vehicle properties
                    Object.assign(vehicle, config);
                    vehicle.currentHealth = config.health;
                    vehicle.isPlayerVehicle = false;
                    vehicle.lastDriver = null;
                    
                    this.vehicles.push(vehicle);
                }
            }

            createNPCs() {
                // Create pedestrians only on sidewalks
                for (let i = 0; i < 40; i++) {
                    if (this.sidewalkAreas.length === 0) continue;
                    
                    // Pick a random sidewalk area
                    const sidewalk = Phaser.Utils.Array.GetRandom(this.sidewalkAreas);
                    const x = sidewalk.x + Math.random() * sidewalk.width;
                    const y = sidewalk.y + Math.random() * sidewalk.height;
                    
                    const npc = this.physics.add.sprite(x, y, 'npc');
                    npc.setScale(0.07);
                    // Properly sized collision box for NPCs (32x32 sprite)
                    npc.body.setSize(20, 20);
                    npc.body.setOffset(6, 6); // Center the collision box
                    npc.setTint(Phaser.Math.Between(0x888888, 0xffffff));
                    
                    // NPC AI properties
                    npc.walkDirection = Math.random() * Math.PI * 2;
                    npc.walkSpeed = 30 + Math.random() * 20;
                    npc.changeDirectionTimer = 0;
                    npc.panicMode = false;
                    npc.panicTimer = 0;
                    npc.currentSidewalk = sidewalk;
                    
                    this.npcs.push(npc);
                }
            }

            // Helper function to check if position is on sidewalk
            isOnSidewalk(x, y) {
                return this.sidewalkAreas.some(sidewalk => 
                    x >= sidewalk.x && x <= sidewalk.x + sidewalk.width &&
                    y >= sidewalk.y && y <= sidewalk.y + sidewalk.height
                );
            }

            createMissions() {
                this.missions = [
                    {
                        id: 1,
                        name: "First Ride",
                        description: "Steal a vehicle and drive to the marked location",
                        target: { x: 1800, y: 800 },
                        reward: 500,
                        completed: false
                    },
                    {
                        id: 2,
                        name: "Escape the Heat",
                        description: "Lose a 3-star wanted level",
                        target: null,
                        reward: 1000,
                        completed: false
                    }
                ];
                
                this.currentMission = this.missions[0];
                this.createMissionMarker();
            }

            createMissionMarker() {
                if (this.currentMission && this.currentMission.target) {
                    if (this.missionTarget) {
                        this.missionTarget.destroy();
                    }
                    
                    this.missionTarget = this.add.circle(
                        this.currentMission.target.x, 
                        this.currentMission.target.y, 
                        30, 
                        0x00ff00
                    );
                    this.missionTarget.setAlpha(0.7);
                    
                    // Pulsing animation
                    this.tweens.add({
                        targets: this.missionTarget,
                        alpha: 0.3,
                        duration: 1000,
                        yoyo: true,
                        repeat: -1
                    });
                }
            }

            setupControls() {
                this.cursors = this.input.keyboard.createCursorKeys();
                this.wasdKeys = this.input.keyboard.addKeys('W,S,A,D,E,SPACE,R,ESC,Q,F,ONE,TWO,THREE,G');
                
                // Vehicle interaction
                this.wasdKeys.E.on('down', () => {
                    this.handleVehicleInteraction();
                });
                
                // Weapon controls
                this.wasdKeys.Q.on('down', () => {
                    this.switchWeapon();
                });
                
                this.wasdKeys.ONE.on('down', () => {
                    this.currentWeapon = 0;
                    this.updateUI();
                });
                
                this.wasdKeys.TWO.on('down', () => {
                    this.currentWeapon = 1;
                    this.updateUI();
                });
                
                this.wasdKeys.THREE.on('down', () => {
                    this.currentWeapon = 2;
                    this.updateUI();
                });
                
                // TESTE: Tecla G para Game Over (temporário)
                this.wasdKeys.G.on('down', () => {
                    this.scene.start('GameOverScene');
                });
                
                // Mouse shooting - hold for automatic fire
                this.input.on('pointerdown', (pointer) => {
                    if (!this.playerInVehicle) {
                        this.isAutoFiring = true;
                        this.autoFireTarget = { x: pointer.worldX, y: pointer.worldY };
                        this.shoot(pointer.worldX, pointer.worldY);
                    }
                });
                
                this.input.on('pointerup', () => {
                    this.isAutoFiring = false;
                });
                
                // F key shooting (alternative) - hold for automatic fire
                this.wasdKeys.F.on('down', () => {
                    if (!this.playerInVehicle) {
                        this.isAutoFiring = true;
                        this.shootForward();
                    }
                });
                
                this.wasdKeys.F.on('up', () => {
                    this.isAutoFiring = false;
                });
                
                // Cheat codes
                this.wasdKeys.R.on('down', () => {
                    this.wantedLevel = 0;
                    this.updateUI();
                });
            }

            switchWeapon() {
                this.currentWeapon = (this.currentWeapon + 1) % this.weapons.length;
                this.updateUI();
            }

            shoot(targetX, targetY) {
                const weapon = this.weapons[this.currentWeapon];
                const currentTime = this.time.now;
                
                // Check fire rate
                if (currentTime - this.lastShotTime < weapon.fireRate) return;
                
                // Check ammo
                if (weapon.ammo <= 0) return;
                
                // Decrease ammo
                weapon.ammo--;
                this.lastShotTime = currentTime;
                
                // Calculate shooting direction
                const playerX = this.player.x;
                const playerY = this.player.y;
                const baseAngle = Phaser.Math.Angle.Between(playerX, playerY, targetX, targetY);
                
                // Fire multiple pellets for realistic weapon behavior
                for (let i = 0; i < weapon.pelletsPerShot; i++) {
                    // Add random spread
                    const spreadAngle = baseAngle + (Math.random() - 0.5) * weapon.spread;
                    
                    // Create bullet with spread
                    this.createBullet(playerX, playerY, spreadAngle, weapon.damage);
                }
                
                // Create muzzle flash
                this.createMuzzleFlash(playerX, playerY);
                
                // Increase wanted level (only sometimes for gunfire to avoid constant crime)
                if (Math.random() < 0.3) { // 30% chance to increase wanted level
                    this.increaseCrime("Gunfire");
                }
                
                this.updateUI();
            }

            shootForward() {
                const weapon = this.weapons[this.currentWeapon];
                const currentTime = this.time.now;
                
                // Check fire rate
                if (currentTime - this.lastShotTime < weapon.fireRate) return;
                
                // Check ammo
                if (weapon.ammo <= 0) return;
                
                // Decrease ammo
                weapon.ammo--;
                this.lastShotTime = currentTime;
                
                // Shoot in the direction player is facing (up by default)
                const baseAngle = -Math.PI / 2;
                
                // Fire multiple pellets for realistic weapon behavior
                for (let i = 0; i < weapon.pelletsPerShot; i++) {
                    // Add random spread
                    const spreadAngle = baseAngle + (Math.random() - 0.5) * weapon.spread;
                    
                    // Create bullet with spread
                    this.createBullet(this.player.x, this.player.y, spreadAngle, weapon.damage);
                }
                
                // Create muzzle flash
                this.createMuzzleFlash(this.player.x, this.player.y);
                
                // Increase wanted level (only sometimes for gunfire to avoid constant crime)
                if (Math.random() < 0.3) { // 30% chance to increase wanted level
                    this.increaseCrime("Gunfire");
                }
                
                this.updateUI();
            }

            createBullet(x, y, angle, damage) {
                const bullet = this.physics.add.sprite(x, y, 'bullet');
                bullet.setScale(0.8);
                bullet.body.setSize(6, 6);
                bullet.damage = damage;
                bullet.startTime = this.time.now;
                
                // Set bullet velocity
                const bulletSpeed = 800;
                this.physics.velocityFromRotation(angle, bulletSpeed, bullet.body.velocity);
                
                this.bullets.push(bullet);
                
                // Remove bullet after 2 seconds
                this.time.delayedCall(2000, () => {
                    if (bullet && bullet.active) {
                        bullet.destroy();
                        const index = this.bullets.indexOf(bullet);
                        if (index > -1) this.bullets.splice(index, 1);
                    }
                });
            }

            createMuzzleFlash(x, y) {
                const flash = this.add.sprite(x, y, 'muzzle_flash');
                flash.setScale(0.5);
                flash.setDepth(100);
                this.muzzleFlashes.push(flash);
                
                // Remove flash after short time
                this.time.delayedCall(100, () => {
                    if (flash && flash.active) {
                        flash.destroy();
                        const index = this.muzzleFlashes.indexOf(flash);
                        if (index > -1) this.muzzleFlashes.splice(index, 1);
                    }
                });
            }

            setupTimers() {
                // Wanted level decay
                this.wantedLevelTimer = this.time.addEvent({
                    delay: 8000,
                    callback: this.decreaseWantedLevel,
                    callbackScope: this,
                    loop: true
                });

                // Police spawn timer
                this.policeSpawnTimer = this.time.addEvent({
                    delay: 4000,
                    callback: this.spawnPolice,
                    callbackScope: this,
                    loop: true
                });

                // NPC behavior timer
                this.npcUpdateTimer = this.time.addEvent({
                    delay: 100,
                    callback: this.updateNPCBehavior,
                    callbackScope: this,
                    loop: true
                });
            }

            createUI() {
                const { width, height } = this.sys.game.config;
                
                // Health bar background
                this.gameUI.healthBarBg = this.add.rectangle(60, 60, 220, 25, 0x660000);
                this.gameUI.healthBarBg.setOrigin(0, 0);
                this.gameUI.healthBarBg.setScrollFactor(0);
                this.gameUI.healthBarBg.setDepth(1000);
                
                // Health bar
                this.gameUI.healthBar = this.add.rectangle(62, 62, 216, 21, 0x00ff00);
                this.gameUI.healthBar.setOrigin(0, 0);
                this.gameUI.healthBar.setScrollFactor(0);
                this.gameUI.healthBar.setDepth(1001);
                
                // Health text
                this.gameUI.healthText = this.add.text(70, 67, 'HEALTH', {
                    fontSize: '14px',
                    color: '#ffffff',
                    fontWeight: 'bold'
                });
                this.gameUI.healthText.setScrollFactor(0);
                this.gameUI.healthText.setDepth(1002);
                
                // Wanted level stars
                this.gameUI.wantedStars = [];
                this.gameUI.wantedText = this.add.text(320, 67, 'WANTED:', {
                    fontSize: '14px',
                    color: '#ffffff',
                    fontWeight: 'bold'
                });
                this.gameUI.wantedText.setScrollFactor(0);
                this.gameUI.wantedText.setDepth(1002);
                
                for (let i = 0; i < 5; i++) {
                    const star = this.add.text(400 + i * 22, 60, '★', {
                        fontSize: '18px',
                        color: '#333333'
                    });
                    star.setScrollFactor(0);
                    star.setDepth(1002);
                    this.gameUI.wantedStars.push(star);
                }
                
                // Money display
                this.gameUI.moneyText = this.add.text(60, 100, '$0', {
                    fontSize: '16px',
                    color: '#00ff00',
                    fontWeight: 'bold'
                });
                this.gameUI.moneyText.setScrollFactor(0);
                this.gameUI.moneyText.setDepth(1002);
                
                // Speed/Vehicle info
                this.gameUI.speedText = this.add.text(60, 130, 'ON FOOT', {
                    fontSize: '14px',
                    color: '#ffffff'
                });
                this.gameUI.speedText.setScrollFactor(0);
                this.gameUI.speedText.setDepth(1002);
                
                // Mission info
                this.gameUI.missionText = this.add.text(60, 160, '', {
                    fontSize: '12px',
                    color: '#ffff00',
                    wordWrap: { width: 300 }
                });
                this.gameUI.missionText.setScrollFactor(0);
                this.gameUI.missionText.setDepth(1002);
                
                // Weapon info
                this.gameUI.weaponText = this.add.text(60, 190, '', {
                    fontSize: '14px',
                    color: '#00ff00'
                });
                this.gameUI.weaponText.setScrollFactor(0);
                this.gameUI.weaponText.setDepth(1002);
                
                // Controls info
                this.gameUI.controlsText = this.add.text(60, 220, 'WEAPONS: Q-Switch | F-Shoot | 1,2,3-Select | Mouse-Aim&Shoot | HOLD for auto-fire', {
                    fontSize: '10px',
                    color: '#cccccc'
                });
                this.gameUI.controlsText.setScrollFactor(0);
                this.gameUI.controlsText.setDepth(1002);
                
                // Minimap - positioned properly to avoid cutoff
                const minimapSize = 150;
                const minimapX = width - minimapSize - 10;
                const minimapY = minimapSize/2 + 10; // Center position to avoid top cutoff
                
                // Minimap background
                this.gameUI.minimapBg = this.add.rectangle(
                    minimapX, minimapY, minimapSize, minimapSize, 0x000000
                );
                this.gameUI.minimapBg.setScrollFactor(0);
                this.gameUI.minimapBg.setDepth(1000);
                this.gameUI.minimapBg.setAlpha(0.8);
                
                // Create minimap representation of the world
                this.createMinimapLayout(minimapX, minimapY, minimapSize);
                
                // Minimap border
                this.gameUI.minimapBorder = this.add.rectangle(
                    minimapX, minimapY, minimapSize, minimapSize
                );
                this.gameUI.minimapBorder.setScrollFactor(0);
                this.gameUI.minimapBorder.setDepth(1003);
                this.gameUI.minimapBorder.setStrokeStyle(2, 0xff6b35);
                
                // Minimap player dot
                this.gameUI.minimapPlayer = this.add.circle(minimapX, minimapY, 3, 0x00ff00);
                this.gameUI.minimapPlayer.setScrollFactor(0);
                this.gameUI.minimapPlayer.setDepth(1004);
            }

            createMinimapLayout(minimapX, minimapY, minimapSize) {
                const worldScale = minimapSize / Math.max(this.worldWidth, this.worldHeight);
                
                // Draw roads on minimap
                this.roadAreas.forEach(road => {
                    const minimapRoadX = minimapX - minimapSize/2 + (road.x * worldScale);
                    const minimapRoadY = minimapY - minimapSize/2 + (road.y * worldScale);
                    const minimapRoadWidth = road.width * worldScale;
                    const minimapRoadHeight = road.height * worldScale;
                    
                    const roadBlock = this.add.rectangle(
                        minimapRoadX + minimapRoadWidth/2,
                        minimapRoadY + minimapRoadHeight/2,
                        minimapRoadWidth, minimapRoadHeight, 0x444444
                    );
                    roadBlock.setScrollFactor(0);
                    roadBlock.setDepth(1001);
                });
                
                // Draw buildings on minimap (simplified)
                this.buildings.forEach(building => {
                    const minimapBuildingX = minimapX - minimapSize/2 + (building.x * worldScale);
                    const minimapBuildingY = minimapY - minimapSize/2 + (building.y * worldScale);
                    
                    const buildingDot = this.add.rectangle(
                        minimapBuildingX, minimapBuildingY, 2, 2, 0x888888
                    );
                    buildingDot.setScrollFactor(0);
                    buildingDot.setDepth(1001);
                });
            }

            handleVehicleInteraction() {
                if (this.playerInVehicle) {
                    this.exitVehicle();
                } else {
                    this.enterNearbyVehicle();
                }
            }

            enterNearbyVehicle() {
                let closestVehicle = null;
                let closestDistance = Infinity;
                
                for (let vehicle of this.vehicles) {
                    if (vehicle.isPlayerVehicle) continue;
                    
                    const distance = Phaser.Math.Distance.Between(
                        this.player.x, this.player.y,
                        vehicle.x, vehicle.y
                    );
                    
                    if (distance < 60 && distance < closestDistance) {
                        closestDistance = distance;
                        closestVehicle = vehicle;
                    }
                }
                
                if (closestVehicle) {
                    this.enterVehicle(closestVehicle);
                }
            }

            enterVehicle(vehicle) {
                this.playerInVehicle = true;
                this.currentVehicle = vehicle;
                this.player.setVisible(false);
                vehicle.isPlayerVehicle = true;
                
                // Crime for car theft - only if it's not already your vehicle
                if (!vehicle.isPlayerVehicle && !vehicle.lastDriver === 'player') {
                    this.increaseCrime("Car Theft");
                    vehicle.lastDriver = 'player';
                }
                
                // Camera follows vehicle
                this.cameras.main.startFollow(vehicle, true, 0.1, 0.1);
                
                // Show vehicle entered notification
                this.showNotification(`Entered ${vehicle.type.replace('_', ' ').toUpperCase()}!`);
            }

            exitVehicle() {
                if (this.currentVehicle) {
                    // Find safe exit position
                    const exitDistance = 45;
                    const exitAngle = this.currentVehicle.rotation + Math.PI / 2;
                    
                    this.player.setPosition(
                        this.currentVehicle.x + Math.cos(exitAngle) * exitDistance,
                        this.currentVehicle.y + Math.sin(exitAngle) * exitDistance
                    );
                    
                    this.player.setVisible(true);
                    this.currentVehicle.isPlayerVehicle = false;
                    this.currentVehicle = null;
                    this.playerInVehicle = false;
                    
                    // Camera follows player
                    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
                }
            }

            spawnPolice() {
                if (this.wantedLevel >= 2 && this.policeCars.length < this.wantedLevel) {
                    // Spawn police car at world edge
                    const spawnSide = Math.floor(Math.random() * 4);
                    let x, y;
                    
                    switch (spawnSide) {
                        case 0: // Top
                            x = Phaser.Math.Between(0, this.worldWidth);
                            y = 0;
                            break;
                        case 1: // Right
                            x = this.worldWidth;
                            y = Phaser.Math.Between(0, this.worldHeight);
                            break;
                        case 2: // Bottom
                            x = Phaser.Math.Between(0, this.worldWidth);
                            y = this.worldHeight;
                            break;
                        case 3: // Left
                            x = 0;
                            y = Phaser.Math.Between(0, this.worldHeight);
                            break;
                    }
                    
                    const policeCar = this.physics.add.sprite(x, y, 'car_police');
                    policeCar.setScale(0.05);
                    policeCar.body.setSize(50, 25);
                    policeCar.body.setDrag(100);
                    policeCar.isPolice = true;
                    policeCar.health = 120;
                    policeCar.maxSpeed = 320;
                    policeCar.chaseIntensity = this.wantedLevel;
                    
                    this.policeCars.push(policeCar);
                    this.vehicles.push(policeCar);
                }
            }

            increaseCrime(crimeType = "Unknown") {
                this.wantedLevel = Math.min(5, this.wantedLevel + 1);
                this.lastCrimeTime = this.time.now;
                this.updateUI();
                
                console.log(`Crime committed: ${crimeType} - Wanted Level: ${this.wantedLevel}`);
                
                // Make nearby NPCs panic
                this.makeNearbyNPCsPanic();
            }

            makeNearbyNPCsPanic() {
                const playerPos = this.playerInVehicle ? this.currentVehicle : this.player;
                
                this.npcs.forEach(npc => {
                    const distance = Phaser.Math.Distance.Between(
                        playerPos.x, playerPos.y,
                        npc.x, npc.y
                    );
                    
                    if (distance < 200) {
                        npc.panicMode = true;
                        npc.panicTimer = 5000; // 5 seconds of panic
                        
                        // Run away from player
                        const angle = Phaser.Math.Angle.Between(
                            playerPos.x, playerPos.y,
                            npc.x, npc.y
                        );
                        npc.walkDirection = angle;
                        npc.walkSpeed = 120; // Faster when panicking
                    }
                });
            }

            decreaseWantedLevel() {
                if (this.time.now - this.lastCrimeTime > 15000 && this.wantedLevel > 0) {
                    this.wantedLevel = Math.max(0, this.wantedLevel - 1);
                    this.updateUI();
                    
                    // Remove some police cars
                    if (this.policeCars.length > this.wantedLevel) {
                        const excessPolice = this.policeCars.splice(this.wantedLevel);
                        excessPolice.forEach(car => {
                            const index = this.vehicles.indexOf(car);
                            if (index > -1) this.vehicles.splice(index, 1);
                            car.destroy();
                        });
                    }
                }
            }

            updateNPCBehavior() {
                this.npcs.forEach(npc => {
                    // If NPC is on a road, move them to safety but don't freeze them
                    if (this.isOnRoad(npc.x, npc.y)) {
                        this.moveNPCToNearestSidewalk(npc);
                    }
                    
                    // Update panic state
                    if (npc.panicMode) {
                        npc.panicTimer -= 100;
                        if (npc.panicTimer <= 0) {
                            npc.panicMode = false;
                            npc.walkSpeed = 30 + Math.random() * 20;
                        }
                    }
                    
                    // Change direction occasionally
                    npc.changeDirectionTimer += 100;
                    if (npc.changeDirectionTimer > 2000 + Math.random() * 3000) {
                        npc.walkDirection = Math.random() * Math.PI * 2;
                        npc.changeDirectionTimer = 0;
                    }
                    
                    // Calculate next position
                    const speed = npc.panicMode ? npc.walkSpeed * 1.8 : npc.walkSpeed;
                    const nextX = npc.x + Math.cos(npc.walkDirection) * speed * 0.016;
                    const nextY = npc.y + Math.sin(npc.walkDirection) * speed * 0.016;
                    
                    // Check if next position is safe (not on road and not hitting buildings)
                    let canMove = true;
                    
                    // Don't move onto roads
                    if (this.isOnRoad(nextX, nextY)) {
                        canMove = false;
                    }
                    
                    // Don't move too close to buildings
                    for (let building of this.buildings) {
                        const distance = Phaser.Math.Distance.Between(nextX, nextY, building.x, building.y);
                        if (distance < 45) {
                            canMove = false;
                            break;
                        }
                    }
                    
                    if (canMove) {
                        // Move normally
                        npc.body.setVelocity(
                            Math.cos(npc.walkDirection) * speed,
                            Math.sin(npc.walkDirection) * speed
                        );
                    } else {
                        // Try a different direction
                        const alternatives = [
                            npc.walkDirection + Math.PI/4,
                            npc.walkDirection - Math.PI/4,
                            npc.walkDirection + Math.PI/2,
                            npc.walkDirection - Math.PI/2,
                            npc.walkDirection + Math.PI
                        ];
                        
                        let foundDirection = false;
                        for (let altDirection of alternatives) {
                            const altX = npc.x + Math.cos(altDirection) * speed * 0.016;
                            const altY = npc.y + Math.sin(altDirection) * speed * 0.016;
                            
                            if (!this.isOnRoad(altX, altY)) {
                                npc.walkDirection = altDirection;
                                npc.body.setVelocity(
                                    Math.cos(altDirection) * speed,
                                    Math.sin(altDirection) * speed
                                );
                                foundDirection = true;
                                break;
                            }
                        }
                        
                        if (!foundDirection) {
                            // If all directions blocked, move slowly in current direction
                            npc.body.setVelocity(
                                Math.cos(npc.walkDirection) * speed * 0.3,
                                Math.sin(npc.walkDirection) * speed * 0.3
                            );
                        }
                    }
                    
                    // Keep NPCs in bounds
                    if (npc.x < 50 || npc.x > this.worldWidth - 50 || 
                        npc.y < 50 || npc.y > this.worldHeight - 50) {
                        npc.walkDirection += Math.PI;
                    }
                });
            }

            moveNPCToNearestSidewalk(npc) {
                let nearestSidewalk = null;
                let minDistance = Infinity;
                
                // Find the nearest sidewalk
                for (let sidewalk of this.sidewalkAreas) {
                    const centerX = sidewalk.x + sidewalk.width / 2;
                    const centerY = sidewalk.y + sidewalk.height / 2;
                    const distance = Phaser.Math.Distance.Between(npc.x, npc.y, centerX, centerY);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestSidewalk = sidewalk;
                    }
                }
                
                if (nearestSidewalk) {
                    // Move NPC to center of nearest sidewalk immediately
                    npc.x = nearestSidewalk.x + nearestSidewalk.width / 2;
                    npc.y = nearestSidewalk.y + nearestSidewalk.height / 2;
                    npc.body.setVelocity(0, 0);
                    console.log("NPC rescued from road and moved to sidewalk!");
                }
            }

            findSafeWalkDirection(npc) {
                // Try to find a direction that stays on sidewalk and away from roads
                for (let attempts = 0; attempts < 16; attempts++) {
                    const testDirection = (attempts / 16) * Math.PI * 2; // Test evenly spaced directions
                    const testDistance = 50; // Look ahead distance
                    const testX = npc.x + Math.cos(testDirection) * testDistance;
                    const testY = npc.y + Math.sin(testDirection) * testDistance;
                    
                    if (this.isOnSidewalk(testX, testY) && !this.isOnRoad(testX, testY)) {
                        return testDirection;
                    }
                }
                
                // If no good direction found, just stop
                return npc.walkDirection;
            }

            showNotification(text, color = '#ffff00') {
                const notification = this.add.text(
                    this.sys.game.config.width / 2, 
                    200, 
                    text, 
                    {
                        fontSize: '18px',
                        color: color,
                        fontWeight: 'bold'
                    }
                );
                notification.setOrigin(0.5);
                notification.setScrollFactor(0);
                notification.setDepth(2000);
                
                // Fade out animation
                this.tweens.add({
                    targets: notification,
                    alpha: 0,
                    y: 150,
                    duration: 3000,
                    onComplete: () => notification.destroy()
                });
            }

            checkMissionProgress() {
                if (!this.currentMission || this.currentMission.completed) return;
                
                const playerPos = this.playerInVehicle ? this.currentVehicle : this.player;
                
                switch (this.currentMission.id) {
                    case 1: // First Ride
                        if (this.playerInVehicle && this.currentMission.target) {
                            const distance = Phaser.Math.Distance.Between(
                                playerPos.x, playerPos.y,
                                this.currentMission.target.x, this.currentMission.target.y
                            );
                            
                            if (distance < 80) {
                                this.completeMission();
                            }
                        }
                        break;
                        
                    case 2: // Escape the Heat
                        if (this.wantedLevel === 0) {
                            this.completeMission();
                        }
                        break;
                }
            }

            completeMission() {
                if (this.currentMission) {
                    this.currentMission.completed = true;
                    this.playerMoney += this.currentMission.reward;
                    
                    this.showNotification(
                        `MISSION COMPLETE! +$${this.currentMission.reward}`, 
                        '#00ff00'
                    );
                    
                    // Remove mission marker
                    if (this.missionTarget) {
                        this.missionTarget.destroy();
                        this.missionTarget = null;
                    }
                    
                    // Start next mission
                    const nextMission = this.missions.find(m => !m.completed);
                    if (nextMission) {
                        this.currentMission = nextMission;
                        this.createMissionMarker();
                    } else {
                        this.currentMission = null;
                        this.showNotification("ALL MISSIONS COMPLETE!", '#ff6b35');
                    }
                }
            }

            updateBullets() {
                // Handle bullet collisions
                this.bullets.forEach((bullet, bulletIndex) => {
                    if (!bullet || !bullet.active) return;
                    
                    // Check collision with NPCs
                    this.npcs.forEach((npc, npcIndex) => {
                        if (this.physics.overlap(bullet, npc)) {
                            // NPC hit
                            this.hitNPC(npc, bullet.damage);
                            this.npcs.splice(npcIndex, 1);
                            npc.destroy();
                            
                            // Remove bullet
                            bullet.destroy();
                            this.bullets.splice(bulletIndex, 1);
                            
                            // Crime for shooting civilian
                            this.increaseCrime("Shot Civilian");
                        }
                    });
                    
                    // Check collision with vehicles
                    this.vehicles.forEach((vehicle, vehicleIndex) => {
                        if (this.physics.overlap(bullet, vehicle) && vehicle !== this.currentVehicle) {
                            // Vehicle hit
                            this.hitVehicle(vehicle, bullet.damage);
                            
                            // Remove bullet
                            bullet.destroy();
                            this.bullets.splice(bulletIndex, 1);
                            
                            // Crime for property damage
                            this.increaseCrime("Property Damage");
                        }
                    });
                    
                    // Check collision with police
                    this.policeCars.forEach((policeCar, policeIndex) => {
                        if (this.physics.overlap(bullet, policeCar)) {
                            // Police hit
                            this.hitVehicle(policeCar, bullet.damage);
                            
                            // Remove bullet
                            bullet.destroy();
                            this.bullets.splice(bulletIndex, 1);
                            
                            // Major crime for shooting police
                            this.increaseCrime("Shot Police");
                            this.increaseCrime("Shot Police"); // Double crime
                        }
                    });
                    
                    // Check collision with buildings
                    this.buildings.forEach(building => {
                        if (this.physics.overlap(bullet, building)) {
                            // Remove bullet
                            bullet.destroy();
                            const index = this.bullets.indexOf(bullet);
                            if (index > -1) this.bullets.splice(index, 1);
                        }
                    });
                    
                    // Remove bullets that go out of bounds
                    if (bullet.x < 0 || bullet.x > this.worldWidth || 
                        bullet.y < 0 || bullet.y > this.worldHeight) {
                        bullet.destroy();
                        const index = this.bullets.indexOf(bullet);
                        if (index > -1) this.bullets.splice(index, 1);
                    }
                });
            }

            hitNPC(npc, damage) {
                // Create blood effect
                const blood = this.add.circle(npc.x, npc.y, 8, 0xff0000);
                this.time.delayedCall(2000, () => blood.destroy());
                
                // Award money for hit (criminal behavior)
                this.playerMoney += 10;
            }

            hitVehicle(vehicle, damage) {
                if (!vehicle.currentHealth) vehicle.currentHealth = vehicle.health || 100;
                
                vehicle.currentHealth -= damage;
                
                // Visual damage effect
                vehicle.setTint(0xff6666);
                this.time.delayedCall(200, () => {
                    if (vehicle.active) vehicle.clearTint();
                });
                
                // Destroy vehicle if health is too low
                if (vehicle.currentHealth <= 0) {
                    this.createExplosion(vehicle.x, vehicle.y);
                    
                    const vehicleIndex = this.vehicles.indexOf(vehicle);
                    if (vehicleIndex > -1) this.vehicles.splice(vehicleIndex, 1);
                    
                    const policeIndex = this.policeCars.indexOf(vehicle);
                    if (policeIndex > -1) this.policeCars.splice(policeIndex, 1);
                    
                    vehicle.destroy();
                }
            }

            createExplosion(x, y) {
                // Create explosion effect
                const explosion = this.add.circle(x, y, 30, 0xff4500);
                explosion.setAlpha(0.8);
                
                this.tweens.add({
                    targets: explosion,
                    scaleX: 2,
                    scaleY: 2,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => explosion.destroy()
                });
                
                // Damage nearby NPCs and vehicles
                const explosionRange = 100;
                
                this.npcs.forEach((npc, index) => {
                    const distance = Phaser.Math.Distance.Between(x, y, npc.x, npc.y);
                    if (distance < explosionRange) {
                        this.hitNPC(npc, 100);
                        this.npcs.splice(index, 1);
                        npc.destroy();
                    }
                });
                
                this.vehicles.forEach(vehicle => {
                    const distance = Phaser.Math.Distance.Between(x, y, vehicle.x, vehicle.y);
                    if (distance < explosionRange && vehicle !== this.currentVehicle) {
                        this.hitVehicle(vehicle, 50);
                    }
                });
            }

            updateUI() {
                // Update health bar
                const healthPercent = Math.max(0, this.playerHealth / 100);
                this.gameUI.healthBar.setScale(healthPercent, 1);
                
                // Health bar color based on health
                if (healthPercent > 0.6) {
                    this.gameUI.healthBar.setFillStyle(0x00ff00);
                } else if (healthPercent > 0.3) {
                    this.gameUI.healthBar.setFillStyle(0xffff00);
                } else {
                    this.gameUI.healthBar.setFillStyle(0xff0000);
                }
                
                // Update wanted stars
                for (let i = 0; i < 5; i++) {
                    if (i < this.wantedLevel) {
                        this.gameUI.wantedStars[i].setColor('#ff0000');
                    } else {
                        this.gameUI.wantedStars[i].setColor('#333333');
                    }
                }
                
                // Update money
                this.gameUI.moneyText.setText(`$${this.playerMoney}`);
                
                // Update speed/vehicle info
                const currentObject = this.playerInVehicle ? this.currentVehicle : this.player;
                const speed = Math.round(
                    Math.sqrt(currentObject.body.velocity.x ** 2 + currentObject.body.velocity.y ** 2)
                );
                
                if (this.playerInVehicle) {
                    this.gameUI.speedText.setText(`${this.currentVehicle.type.replace('_', ' ').toUpperCase()} - Speed: ${speed}`);
                } else {
                    this.gameUI.speedText.setText('ON FOOT');
                }
                
                // Update mission text
                if (this.currentMission && !this.currentMission.completed) {
                    this.gameUI.missionText.setText(`MISSION: ${this.currentMission.description}`);
                } else {
                    this.gameUI.missionText.setText('No active missions');
                }
                
                // Update weapon info
                const weapon = this.weapons[this.currentWeapon];
                this.gameUI.weaponText.setText(`${weapon.name}: ${weapon.ammo}/${weapon.maxAmmo}`);
                
                // Update minimap
                this.updateMinimap();
            }

            updateMinimap() {
                const minimapSize = 150;
                const worldScale = minimapSize / Math.max(this.worldWidth, this.worldHeight);
                const { width } = this.sys.game.config;
                
                const playerPos = this.playerInVehicle ? this.currentVehicle : this.player;
                
                // Update player position on minimap - fixed positioning
                this.gameUI.minimapPlayer.setPosition(
                    (width - minimapSize - 10) + (playerPos.x * worldScale) - minimapSize/2,
                    (minimapSize/2 + 10) + (playerPos.y * worldScale) - minimapSize/2
                );
            }

            update() {
                this.handleMovement();
                this.updatePolice();
                this.handleCollisions();
                this.updateBullets();
                this.handleAutomaticFire();
                this.checkMissionProgress();
                this.updateUI();
            }

            handleAutomaticFire() {
                if (this.isAutoFiring && !this.playerInVehicle) {
                    const weapon = this.weapons[this.currentWeapon];
                    
                    // Only automatic fire for weapons that support it (SMG)
                    if (weapon.automatic) {
                        if (this.autoFireTarget) {
                            this.shoot(this.autoFireTarget.x, this.autoFireTarget.y);
                        } else {
                            this.shootForward();
                        }
                    }
                }
            }

            handleMovement() {
                const currentObject = this.playerInVehicle ? this.currentVehicle : this.player;
                
                if (this.playerInVehicle) {
                    this.handleVehicleMovement(currentObject);
                } else {
                    this.handlePlayerMovement(currentObject);
                }
            }

            handlePlayerMovement(player) {
                const speed = 180;
                let velocityX = 0;
                let velocityY = 0;
                
                if (this.wasdKeys.W.isDown) velocityY = -speed;
                if (this.wasdKeys.S.isDown) velocityY = speed;
                if (this.wasdKeys.A.isDown) velocityX = -speed;
                if (this.wasdKeys.D.isDown) velocityX = speed;
                
                // Diagonal movement normalization
                if (velocityX !== 0 && velocityY !== 0) {
                    velocityX *= 0.707;
                    velocityY *= 0.707;
                }
                
                player.body.setVelocity(velocityX, velocityY);
                
                // Player rotation based on movement
                if (velocityX !== 0 || velocityY !== 0) {
                    player.rotation = Math.atan2(velocityY, velocityX) + Math.PI / 2;
                }
            }

            handleVehicleMovement(vehicle) {
                // Don't allow movement if vehicle is stunned from collision
                if (vehicle.collisionCooldown) {
                    vehicle.body.setVelocity(0, 0);
                    vehicle.body.setAcceleration(0, 0);
                    return;
                }
                
                const maxSpeed = vehicle.maxSpeed || 280;
                const acceleration = vehicle.acceleration || 300;
                const turnSpeed = 3.0;
                
                // Get current speed
                const currentSpeed = Math.sqrt(vehicle.body.velocity.x ** 2 + vehicle.body.velocity.y ** 2);
                
                // Simple and reliable car physics
                if (this.wasdKeys.W.isDown) {
                    // Accelerate forward (sprites face right, so rotation 0 = right)
                    this.physics.velocityFromRotation(
                        vehicle.rotation, 
                        acceleration, 
                        vehicle.body.acceleration
                    );
                } else if (this.wasdKeys.S.isDown) {
                    // Reverse
                    this.physics.velocityFromRotation(
                        vehicle.rotation, 
                        -acceleration * 0.7, 
                        vehicle.body.acceleration
                    );
                } else {
                    // Stop acceleration when no input
                    vehicle.body.setAcceleration(0);
                }
                
                // Turning (only when moving)
                if (currentSpeed > 20) {
                    const turnInfluence = Math.min(currentSpeed / 100, 1);
                    if (this.wasdKeys.A.isDown) {
                        vehicle.rotation -= turnSpeed * 0.02 * turnInfluence;
                    }
                    if (this.wasdKeys.D.isDown) {
                        vehicle.rotation += turnSpeed * 0.02 * turnInfluence;
                    }
                }
                
                // Handbrake
                if (this.wasdKeys.SPACE.isDown) {
                    vehicle.body.setDrag(800);
                } else {
                    vehicle.body.setDrag(150);
                }
                
                // Speed limit
                if (currentSpeed > maxSpeed) {
                    vehicle.body.velocity.normalize().scale(maxSpeed);
                }
            }

            updatePolice() {
                this.policeCars.forEach(policeCar => {
                    if (this.wantedLevel > 0) {
                        const target = this.playerInVehicle ? this.currentVehicle : this.player;
                        const distance = Phaser.Math.Distance.Between(
                            policeCar.x, policeCar.y,
                            target.x, target.y
                        );
                        
                        if (distance > 100) {
                            // Chase behavior - but check for buildings first
                            const angle = Phaser.Math.Angle.Between(
                                policeCar.x, policeCar.y,
                                target.x, target.y
                            );
                            
                            // Check if path to player is blocked by buildings
                            let canMoveToTarget = true;
                            const moveDistance = 60; // How far to check ahead
                            const checkX = policeCar.x + Math.cos(angle) * moveDistance;
                            const checkY = policeCar.y + Math.sin(angle) * moveDistance;
                            
                            // Check collision with buildings ahead
                            for (let building of this.buildings) {
                                const buildingDistance = Phaser.Math.Distance.Between(checkX, checkY, building.x, building.y);
                                if (buildingDistance < 50) { // If path is blocked
                                    canMoveToTarget = false;
                                    break;
                                }
                            }
                            
                            if (canMoveToTarget) {
                                // Move towards player
                                policeCar.rotation = angle + Math.PI/2;
                                const chaseSpeed = 200 + (policeCar.chaseIntensity * 40);
                                this.physics.velocityFromRotation(angle, chaseSpeed, policeCar.body.velocity);
                            } else {
                                // Find alternative path around buildings
                                const alternativeAngles = [angle + Math.PI/3, angle - Math.PI/3, angle + Math.PI/2, angle - Math.PI/2];
                                let foundPath = false;
                                
                                for (let altAngle of alternativeAngles) {
                                    const altCheckX = policeCar.x + Math.cos(altAngle) * moveDistance;
                                    const altCheckY = policeCar.y + Math.sin(altAngle) * moveDistance;
                                    
                                    let pathClear = true;
                                    for (let building of this.buildings) {
                                        const buildingDistance = Phaser.Math.Distance.Between(altCheckX, altCheckY, building.x, building.y);
                                        if (buildingDistance < 50) {
                                            pathClear = false;
                                            break;
                                        }
                                    }
                                    
                                    if (pathClear) {
                                        policeCar.rotation = altAngle + Math.PI/2;
                                        const chaseSpeed = 120; // Slower when navigating around obstacles
                                        this.physics.velocityFromRotation(altAngle, chaseSpeed, policeCar.body.velocity);
                                        foundPath = true;
                                        break;
                                    }
                                }
                                
                                if (!foundPath) {
                                    // Stop if completely blocked
                                    policeCar.body.setVelocity(0, 0);
                                }
                            }
                        } else {
                            // Ram behavior when close - but also check for buildings
                            const ramAngle = Phaser.Math.Angle.Between(
                                policeCar.x, policeCar.y,
                                target.x, target.y
                            );
                            this.physics.velocityFromRotation(ramAngle, 300, policeCar.body.velocity);
                        }
                    } else {
                        // Stop chasing when no wanted level
                        policeCar.body.setVelocity(0, 0);
                    }
                    
                    // Apply fair collision detection for police cars too!
                    this.handlePoliceCollisions(policeCar);
                });
            }

            handlePoliceCollisions(policeCar) {
                // Collision handling is now done with colliders in the create function.
                // This function is no longer needed for building collisions.
            }

            handleCollisions() {
                const currentObject = this.playerInVehicle ? this.currentVehicle : this.player;
                
                // Simple but effective collision detection using Phaser's built-in overlap
                
                // Player/Vehicle vs NPCs - Simple overlap detection
                this.npcs.forEach((npc, index) => {
                    if (this.physics.overlap(currentObject, npc)) {
                        // Push NPC away
                        const angle = Phaser.Math.Angle.Between(
                            currentObject.x, currentObject.y,
                            npc.x, npc.y
                        );
                        
                        const pushForce = this.playerInVehicle ? 300 : 80;
                        npc.body.setVelocity(
                            Math.cos(angle) * pushForce,
                            Math.sin(angle) * pushForce
                        );
                        
                        // Crime for hitting pedestrian (reduced frequency)
                        if (Math.random() < 0.3) { // Only 30% chance to increase wanted level
                            this.increaseCrime("Hit Pedestrian");
                        }
                        
                        // Remove NPC if hit by vehicle
                        if (this.playerInVehicle) {
                            this.createBloodEffect(npc.x, npc.y);
                            npc.destroy();
                            this.npcs.splice(index, 1);
                            this.playerMoney += 15;
                        }
                    }
                });
                
                // Vehicle vs Vehicle collisions - Simple overlap
                this.vehicles.forEach(vehicle => {
                    if (vehicle === currentObject || !vehicle.active) return;
                    
                    if (this.physics.overlap(currentObject, vehicle)) {
                        this.handleSimpleVehicleCollision(currentObject, vehicle);
                    }
                });
                
                // Police ramming player - Simple overlap
                this.policeCars.forEach(policeCar => {
                    if (!policeCar.active) return;
                    
                    if (this.physics.overlap(currentObject, policeCar)) {
                        this.handleSimpleVehicleCollision(currentObject, policeCar, true);
                    }
                });
            }

            handleSimpleVehicleCollision(vehicle1, vehicle2, isPolice = false) {
                // Calculate collision angle
                const angle = Phaser.Math.Angle.Between(
                    vehicle1.x, vehicle1.y,
                    vehicle2.x, vehicle2.y
                );
                
                // Get speeds before collision
                const speed1 = Math.sqrt(vehicle1.body.velocity.x ** 2 + vehicle1.body.velocity.y ** 2);
                const speed2 = Math.sqrt(vehicle2.body.velocity.x ** 2 + vehicle2.body.velocity.y ** 2);
                
                // STOP both vehicles immediately on collision
                vehicle1.body.setVelocity(0, 0);
                vehicle2.body.setVelocity(0, 0);
                vehicle1.body.setAcceleration(0, 0);
                vehicle2.body.setAcceleration(0, 0);
                
                // Separate vehicles slightly to prevent sticking
                const separationDistance = 5;
                vehicle1.x += Math.cos(angle + Math.PI) * separationDistance;
                vehicle1.y += Math.sin(angle + Math.PI) * separationDistance;
                vehicle2.x += Math.cos(angle) * separationDistance;
                vehicle2.y += Math.sin(angle) * separationDistance;
                
                // Damage vehicles based on collision speed
                if (speed1 + speed2 > 200) {
                    this.damageVehicle(vehicle1, Math.floor((speed1 + speed2) / 50));
                    this.damageVehicle(vehicle2, Math.floor((speed1 + speed2) / 50));
                }
                
                // Crime for ramming police
                if (isPolice && Math.random() < 0.5) {
                    this.increaseCrime("Rammed Police");
                }
                
                // Add brief "stunned" effect to prevent immediate movement
                vehicle1.collisionCooldown = true;
                vehicle2.collisionCooldown = true;
                
                this.time.delayedCall(500, () => {
                    vehicle1.collisionCooldown = false;
                    vehicle2.collisionCooldown = false;
                });
            }

            damageVehicle(vehicle, damage) {
                if (!vehicle.currentHealth) {
                    vehicle.currentHealth = vehicle.health || 100;
                }
                
                vehicle.currentHealth -= damage;
                
                // Visual damage effect
                vehicle.setTint(0xff6666);
                this.time.delayedCall(300, () => {
                    if (vehicle.active) vehicle.clearTint();
                });
                
                // Smoke effect for heavily damaged vehicles
                if (vehicle.currentHealth < 30) {
                    this.createSmokeEffect(vehicle.x, vehicle.y);
                }
                
                // Destroy vehicle if health too low
                if (vehicle.currentHealth <= 0) {
                    this.createExplosion(vehicle.x, vehicle.y);
                    
                    // Remove from arrays
                    const vehicleIndex = this.vehicles.indexOf(vehicle);
                    if (vehicleIndex > -1) this.vehicles.splice(vehicleIndex, 1);
                    
                    const policeIndex = this.policeCars.indexOf(vehicle);
                    if (policeIndex > -1) this.policeCars.splice(policeIndex, 1);
                    
                    // If player was in destroyed vehicle
                    if (vehicle === this.currentVehicle) {
                        this.exitVehicle();
                        this.damagePlayer(25);
                    }
                    
                    vehicle.destroy();
                }
            }

            damagePlayer(damage) {
                this.playerHealth = Math.max(0, this.playerHealth - damage);
                
                // Screen flash effect
                this.cameras.main.flash(200, 255, 0, 0, false);
                
                if (this.playerHealth <= 0) {
                    this.gameOver();
                }
            }

            createBloodEffect(x, y) {
                const blood = this.add.circle(x, y, 8, 0x8B0000);
                blood.setAlpha(0.8);
                
                // Splatter effect
                for (let i = 0; i < 5; i++) {
                    const splatter = this.add.circle(
                        x + (Math.random() - 0.5) * 30,
                        y + (Math.random() - 0.5) * 30,
                        2 + Math.random() * 3,
                        0x8B0000
                    );
                    splatter.setAlpha(0.6);
                    
                    this.time.delayedCall(5000, () => {
                        if (splatter.active) splatter.destroy();
                    });
                }
                
                this.time.delayedCall(5000, () => {
                    if (blood.active) blood.destroy();
                });
            }

            createSmokeEffect(x, y) {
                const smoke = this.add.circle(x, y + 10, 5, 0x555555);
                smoke.setAlpha(0.5);
                
                this.tweens.add({
                    targets: smoke,
                    y: y - 20,
                    alpha: 0,
                    scaleX: 1.5,
                    scaleY: 1.5,
                    duration: 1000,
                    onComplete: () => smoke.destroy()
                });
            }

            gameOver() {
                // Game over screen
                const gameOverText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 
                    'WASTED\n\nPress R to restart', {
                    fontSize: '32px',
                    color: '#ff0000',
                    align: 'center'
                });
                gameOverText.setOrigin(0.5);
                gameOverText.setScrollFactor(0);
                gameOverText.setDepth(2000);
                
                // Restart functionality
                this.wasdKeys.R.on('down', () => {
                    this.scene.restart();
                });
            }

            explodeVehicle(vehicle) {
                // Create explosion effect
                const explosion = this.add.circle(vehicle.x, vehicle.y, 50, 0xff4400);
                explosion.setAlpha(0.8);
                
                this.tweens.add({
                    targets: explosion,
                    scaleX: 3,
                    scaleY: 3,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => explosion.destroy()
                });
                
                // If player was in vehicle, exit and take damage
                if (vehicle === this.currentVehicle) {
                    this.exitVehicle();
                    this.playerHealth = Math.max(0, this.playerHealth - 50);
                }
                
                // Remove vehicle
                const index = this.vehicles.indexOf(vehicle);
                if (index > -1) this.vehicles.splice(index, 1);
                
                const policeIndex = this.policeCars.indexOf(vehicle);
                if (policeIndex > -1) this.policeCars.splice(policeIndex, 1);
                
                vehicle.destroy();
                
                this.showNotification("VEHICLE DESTROYED!", '#ff0000');
            }

            gameOver() {
                this.showNotification("WASTED!", '#ff0000');
                
                // Reset after delay
                this.time.delayedCall(3000, () => {
                    this.playerHealth = 100;
                    this.wantedLevel = 0;
                    this.playerMoney = Math.max(0, this.playerMoney - 500);
                    
                    // Reset player position
                    if (this.playerInVehicle) {
                        this.exitVehicle();
                    }
                    
                    this.player.setPosition(1200, 1200);
                    this.showNotification("Respawned at hospital - $500 fine", '#ffff00');
                });
            }
        }