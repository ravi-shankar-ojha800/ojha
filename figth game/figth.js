/**
 * ==================================================================================
 * FIGTH ADVENTURE — DEFINTIVE 2D RETRO PLATFORMER ENGINE
 * ==================================================================================
 * Author: Elite Principal Game Systems Architect & Senior HTML5 Canvas Engineer
 * Architecture: Vanilla Modern JavaScript (ES6+ Class structure)
 * External Dependencies: 0% (Strictly Native Canvas API)
 * Rendering Principle: 100% Sprite-Slicing (No primitive fillRect/strokeRect/arc for entities)
 * Scaling System: 3x Crisp Pixelated Upscaling (image-rendering: pixelated)
 * ==================================================================================
 */

'use strict';

// ─── GLOBAL CONFIGURATION CONSTANTS ──────────────────────────────────────────
const ASSET_BASE = 'brackeys_platformer_assets/brackeys_platformer_assets/';
const TILE_SIZE  = 16;
const SCALE      = 3;
const SCALED_TILE = TILE_SIZE * SCALE; // 48px effective

const CANVAS_W = 800;
const CANVAS_H = 600;

const GRAVITY           = 0.5 * SCALE; // Scaled gravity vector
const TERMINAL_VELOCITY = 14 * SCALE;

const TILE = {
    AIR:      0,
    GRASS:    1,
    DIRT:     2,
    PLATFORM: 3,
    PIT:      4,
    FINISH:   9
};

const COLORS = {
    BG_SKY:      '#5c94fc',
    HUD_BG:      'rgba(10, 10, 20, 0.85)',
    HUD_BORDER:  '#ffd700',
    TEXT_GOLD:   '#ffd700',
    TEXT_WHITE:  '#ffffff',
    TEXT_RED:    '#ff4444',
    OVERCLOCK:   '#00ff88',
    STAR_TINT:   '#ffffff'
};

// ==================================================================================
// SECTION 1: MASTER ASSET PRELOADING LIFECYCLE MANAGER
// ==================================================================================
class AssetPipeline {
    constructor() {
        this.images = {};
        this.audio  = {};
        this.totalAssets  = 0;
        this.loadedAssets = 0;
        this.isReady = false;
    }

    async init(canvas, ctx, onComplete) {
        // Image asset sheet manifest
        const imageManifest = {
            world_tileset: 'sprites/world_tileset.png',
            platforms:     'sprites/platforms.png',
            knight:        'sprites/knight.png',
            slime_green:   'sprites/slime_green.png',
            slime_purple:  'sprites/slime_purple.png',
            coin:          'sprites/coin.png',
            fruit:         'sprites/fruit.png'
        };

        // Sound clip manifest
        const audioManifest = {
            bgMusic:   'music/time_for_adventure.mp3',
            coin:      'sounds/coin.wav',
            explosion: 'sounds/explosion.wav',
            hurt:      'sounds/hurt.wav',
            jump:      'sounds/jump.wav',
            powerUp:   'sounds/power_up.wav',
            tap:       'sounds/tap.wav'
        };

        const imgKeys   = Object.keys(imageManifest);
        const audioKeys = Object.keys(audioManifest);
        this.totalAssets = imgKeys.length + audioKeys.length + 2; // +2 custom TTF fonts

        // Load custom retro typography files
        try {
            const fontRegular = new FontFace('PixelOperator8', `url(${ASSET_BASE}fonts/PixelOperator8.ttf)`);
            const fontBold    = new FontFace('PixelOperator8-Bold', `url(${ASSET_BASE}fonts/PixelOperator8-Bold.ttf)`);

            const loadedRegular = await fontRegular.load();
            document.fonts.add(loadedRegular);
            this.loadedAssets++;
            this._drawLoadingBar(ctx, canvas);

            const loadedBold = await fontBold.load();
            document.fonts.add(loadedBold);
            this.loadedAssets++;
            this._drawLoadingBar(ctx, canvas);
        } catch (e) {
            console.warn('Retro fonts loading failed, using monospace fallbacks', e);
            this.loadedAssets += 2;
        }

        // Load image sprite sheets
        for (const key of imgKeys) {
            try {
                this.images[key] = await this._loadImage(ASSET_BASE + imageManifest[key]);
            } catch (e) {
                console.error(`Critial sprite load failure: ${key}`, e);
                this.images[key] = null;
            }
            this.loadedAssets++;
            this._drawLoadingBar(ctx, canvas);
        }

        // Load audio elements
        for (const key of audioKeys) {
            try {
                const audio = new Audio();
                audio.src = ASSET_BASE + audioManifest[key];
                audio.preload = 'auto';
                audio.load();
                this.audio[key] = audio;
            } catch (e) {
                console.warn(`Non-blocking sound load failure: ${key}`, e);
                this.audio[key] = null;
            }
            this.loadedAssets++;
            this._drawLoadingBar(ctx, canvas);
        }

        this.isReady = true;
        onComplete();
    }

    _loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload  = () => resolve(img);
            img.onerror = (e) => reject(e);
            img.src = src;
        });
    }

    _drawLoadingBar(ctx, canvas) {
        const progress = this.loadedAssets / this.totalAssets;
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = '#07070d';
        ctx.fillRect(0, 0, w, h);

        // Header Title
        ctx.fillStyle = COLORS.TEXT_GOLD;
        ctx.font = '24px PixelOperator8-Bold, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('FIGTH ADVENTURE', w / 2, h / 2 - 50);

        // Subtitle Status
        ctx.fillStyle = COLORS.TEXT_WHITE;
        ctx.font = '10px PixelOperator8, monospace';
        ctx.fillText('ASSEMBLING SPRITE SHEETS & SOUND CLIPS...', w / 2, h / 2 - 20);

        // Progress bar container outline
        const barW = 360;
        const barH = 24;
        const barX = (w - barW) / 2;
        const barY = h / 2 + 10;

        ctx.strokeStyle = COLORS.HUD_BORDER;
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);

        // Inner pixel segments
        const segmentW = 8;
        const segmentPad = 2;
        const innerW = barW - 4;
        const maxSegments = Math.floor(innerW / (segmentW + segmentPad));
        const activeSegments = Math.floor(maxSegments * progress);

        for (let i = 0; i < maxSegments; i++) {
            const sx = barX + 2 + i * (segmentW + segmentPad);
            ctx.fillStyle = i < activeSegments ? COLORS.TEXT_GOLD : '#141424';
            ctx.fillRect(sx, barY + 3, segmentW, barH - 6);
        }

        // Percentage Indicator
        ctx.fillStyle = COLORS.TEXT_WHITE;
        ctx.font = '10px PixelOperator8, monospace';
        ctx.fillText(`${Math.floor(progress * 100)}% COMPLETE`, w / 2, barY + barH + 25);
        ctx.textAlign = 'left';
    }

    playSound(key) {
        const sound = this.audio[key];
        if (!sound) return;
        try {
            const clone = sound.cloneNode();
            clone.volume = key === 'bgMusic' ? 0.35 : 0.65;
            clone.play().catch(() => {});
        } catch (e) {
            console.warn(`Sound playback failed: ${key}`, e);
        }
    }

    startMusic() {
        const music = this.audio.bgMusic;
        if (!music) return;
        try {
            music.loop = true;
            music.volume = 0.35;
            music.play().catch(() => {});
        } catch (e) {
            console.warn('Background music autoplay blocked, awaiting interaction', e);
        }
    }

    stopMusic() {
        const music = this.audio.bgMusic;
        if (music) {
            music.pause();
            music.currentTime = 0;
        }
    }
}

// ==================================================================================
// SECTION 2: THE 2D CAMERA SYSTEM
// ==================================================================================
class Camera {
    constructor(viewW, viewH) {
        this.x = 0;
        this.y = 0;
        this.viewW = viewW;
        this.viewH = viewH;
        this.lerpSpeed = 0.08;
    }

    update(targetX, targetY, worldW, worldH) {
        const targetCamX = targetX - this.viewW / 2;
        const targetCamY = targetY - this.viewH / 2;

        this.x += (targetCamX - this.x) * this.lerpSpeed;
        this.y += (targetCamY - this.y) * this.lerpSpeed;

        // Clamp inside level bounds
        this.x = Math.max(0, Math.min(this.x, worldW - this.viewW));
        this.y = Math.max(0, Math.min(this.y, worldH - this.viewH));
    }
}

// ─── MOVING PLATFORMS (VERTICAL / HORIZONTAL) ──────────────────────────────
class MovingPlatform {
    constructor(col, row, widthTiles, axis, rangeMin, rangeMax, speed) {
        this.col = col;
        this.row = row;
        this.widthTiles = widthTiles;
        this.axis = axis; // 'x' or 'y'
        this.speed = speed * SCALE;
        this.direction = 1;

        this.x = col * SCALED_TILE;
        this.y = row * SCALED_TILE;
        this.width = widthTiles * SCALED_TILE;
        this.height = SCALED_TILE;

        this.minPos = rangeMin * SCALED_TILE;
        this.maxPos = rangeMax * SCALED_TILE;

        this.prevX = this.x;
        this.prevY = this.y;
    }

    update() {
        this.prevX = this.x;
        this.prevY = this.y;

        if (this.axis === 'x') {
            this.x += this.speed * this.direction;
            if (this.x <= this.minPos) {
                this.x = this.minPos;
                this.direction = 1;
            } else if (this.x >= this.maxPos) {
                this.x = this.maxPos;
                this.direction = -1;
            }
        } else {
            this.y += this.speed * this.direction;
            if (this.y <= this.minPos) {
                this.y = this.minPos;
                this.direction = 1;
            } else if (this.y >= this.maxPos) {
                this.y = this.maxPos;
                this.direction = -1;
            }
        }
    }

    get deltaX() { return this.x - this.prevX; }
    get deltaY() { return this.y - this.prevY; }

    draw(ctx, cam, assets) {
        const sheet = assets.images.platforms;
        if (!sheet) return;

        const dx = Math.round(this.x - cam.x);
        const dy = Math.round(this.y - cam.y);

        for (let i = 0; i < this.widthTiles; i++) {
            let sx = 16; // Middle tile segment of platforms.png
            if (i === 0) sx = 0; // Left cap segment
            if (i === this.widthTiles - 1) sx = 32; // Right cap segment

            ctx.drawImage(
                sheet,
                sx, 0, TILE_SIZE, TILE_SIZE,
                dx + i * SCALED_TILE, dy, SCALED_TILE, SCALED_TILE
            );
        }
    }
}

// ==================================================================================
// SECTION 3: THE PHYSICS CONTROLLER & KNIGHT SPRITE ANIMATION PARSER
// ==================================================================================
class Knight {
    constructor() {
        this.reset(1, 7);
    }

    reset(col, row) {
        this.x = col * SCALED_TILE;
        this.y = row * SCALED_TILE - 16 * SCALE;

        // Kinematic Hitbox Configuration (Centered on sprite, feels tight)
        this.width  = 13 * SCALE;
        this.height = 19 * SCALE;

        // Sprite draw offsets relative to physics hitbox center
        this.drawOffsetX = -9.5 * SCALE;
        this.drawOffsetY = -13 * SCALE;

        this.vx = 0;
        this.vy = 0;

        // Physics Tuning Constants
        this.ACCELERATION  = 0.45 * SCALE;
        this.FRICTION      = 0.76;
        this.MAX_SPEED     = 4.5 * SCALE;
        this.JUMP_FORCE    = -10.0 * SCALE;

        this.isGrounded    = false;
        this.jumpsLeft     = 2;
        this.facingRight   = true;

        this.animState     = 'idle';
        this.animFrame     = 0;
        this.animTimer     = 0;

        this.invulnTimer   = 0;
        this.overclockTimer = 0;
        this.isDead        = false;
    }

    update(dt, input, solidTiles, movingPlatforms) {
        if (this.isDead) return;

        // Tick Timers
        if (this.invulnTimer > 0) this.invulnTimer -= dt;
        if (this.overclockTimer > 0) this.overclockTimer -= dt;

        // Apply Overclock state multipliers
        const powerMult = this.overclockTimer > 0 ? 1.5 : 1.0;
        const currentMaxSpeed = this.MAX_SPEED * powerMult;

        // Horizontal Movement Input Processing
        let moveDir = 0;
        if (input.left)  moveDir -= 1;
        if (input.right) moveDir += 1;

        if (moveDir !== 0) {
            this.vx += moveDir * this.ACCELERATION;
            this.facingRight = moveDir > 0;
        } else {
            this.vx *= this.FRICTION;
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
        }

        // Clamp Horizontal Speed
        if (this.vx > currentMaxSpeed)  this.vx = currentMaxSpeed;
        if (this.vx < -currentMaxSpeed) this.vx = -currentMaxSpeed;

        // Gravity Accrual
        this.vy += GRAVITY;
        if (this.vy > TERMINAL_VELOCITY) this.vy = TERMINAL_VELOCITY;

        // One-Way Ledge Check (reduces jump capacity to 1 if falling off)
        if (!this.isGrounded && this.jumpsLeft === 2) {
            this.jumpsLeft = 1;
        }

        // Move horizontally and resolve solid wall tiles
        this.x += this.vx;
        this._resolveCollisionsX(solidTiles);

        // Move vertically and resolve solid ground / one-way platforms
        this.y += this.vy;
        this.isGrounded = false;
        this._resolveCollisionsY(solidTiles);

        // Resolve Moving Platform Collisions & Carry effect
        for (const platform of movingPlatforms) {
            const playerBottom = this.y + this.height;
            const prevPlayerBottom = playerBottom - this.vy;

            // Check if falling down onto the platform surface
            if (this.vy >= 0 &&
                prevPlayerBottom <= platform.y + 6 * SCALE &&
                this.x + this.width > platform.x &&
                this.x < platform.x + platform.width &&
                playerBottom >= platform.y &&
                playerBottom <= platform.y + 12 * SCALE) {

                this.y = platform.y - this.height;
                this.vy = 0;
                this.isGrounded = true;
                this.jumpsLeft = 2;

                // Carry kinematics
                this.x += platform.deltaX;
                this.y += platform.deltaY;
            }
        }

        // Compute animations based on velocity states
        this._updateAnimationState();
    }

    tryJump(assets) {
        if (this.isDead) return;
        const powerMult = this.overclockTimer > 0 ? 1.5 : 1.0;

        if (this.jumpsLeft > 0) {
            this.vy = this.JUMP_FORCE * powerMult;
            this.jumpsLeft--;
            this.isGrounded = false;
            assets.playSound('jump');
        }
    }

    applyKnockback(fromX) {
        this.vx = this.x + this.width / 2 < fromX ? -5 * SCALE : 5 * SCALE;
        this.vy = -4.5 * SCALE;
    }

    _resolveCollisionsX(tiles) {
        for (const t of tiles) {
            if (t.type === TILE.PLATFORM) continue; // One-way platforms do not block horizontally
            if (this._overlapsTile(t)) {
                if (this.vx > 0) {
                    this.x = t.x - this.width;
                } else if (this.vx < 0) {
                    this.x = t.x + t.w;
                }
                this.vx = 0;
            }
        }
    }

    _resolveCollisionsY(tiles) {
        for (const t of tiles) {
            if (t.type === TILE.PLATFORM) {
                // One-way platform logic: Only collide when moving down, and previous bottom was above top
                const prevBottom = this.y + this.height - this.vy;
                if (this.vy >= 0 && prevBottom <= t.y + 5 * SCALE && this._overlapsTile(t)) {
                    this.y = t.y - this.height;
                    this.vy = 0;
                    this.isGrounded = true;
                    this.jumpsLeft = 2;
                }
            } else {
                // Solid tile standard resolution
                if (this._overlapsTile(t)) {
                    if (this.vy > 0) {
                        this.y = t.y - this.height;
                        this.vy = 0;
                        this.isGrounded = true;
                        this.jumpsLeft = 2;
                    } else if (this.vy < 0) {
                        this.y = t.y + t.h;
                        this.vy = 0;
                    }
                }
            }
        }
    }

    _overlapsTile(t) {
        return this.x < t.x + t.w &&
               this.x + this.width > t.x &&
               this.y < t.y + t.h &&
               this.y + this.height > t.y;
    }

    overlaps(entity) {
        return this.x < entity.x + entity.width &&
               this.x + this.width > entity.x &&
               this.y < entity.y + entity.height &&
               this.y + this.height > entity.y;
    }

    _updateAnimationState() {
        let newState = 'idle';

        if (!this.isGrounded) {
            newState = 'air';
        } else if (Math.abs(this.vx) > 0.4) {
            newState = 'run';
        }

        if (newState !== this.animState) {
            this.animState = newState;
            this.animFrame = 0;
            this.animTimer = 0;
        }

        // Animation timing controls
        this.animTimer++;
        let speed = 8;
        let framesCount = 4;

        if (this.animState === 'idle') {
            speed = 8;
            framesCount = 4; // Idle frames 0-3
        } else if (this.animState === 'run') {
            speed = 4;
            framesCount = 16; // Run frames 0-15 spanning row 2 & 3
        } else if (this.animState === 'air') {
            speed = 999; // Manually controlled by Y velocity
            framesCount = 2;
        }

        if (this.animState === 'air') {
            // Frame 0 for jumping up, Frame 1 for falling down
            this.animFrame = this.vy < 0 ? 0 : 1;
        } else {
            if (this.animTimer >= speed) {
                this.animTimer = 0;
                this.animFrame = (this.animFrame + 1) % framesCount;
            }
        }
    }

    draw(ctx, cam, assets) {
        // Blinking invulnerability effect
        if (this.invulnTimer > 0 && Math.floor(this.invulnTimer / 60) % 2 === 0) return;

        const sheet = assets.images.knight;
        if (!sheet) return;

        const drawX = Math.round(this.x + this.drawOffsetX - cam.x);
        const drawY = Math.round(this.y + this.drawOffsetY - cam.y);
        const drawW = 32 * SCALE;
        const drawH = 32 * SCALE;

        // Parse animations from sprites/knight.png sheets
        let sx = 0;
        let sy = 0;

        if (this.animState === 'idle') {
            sx = this.animFrame * 32;
            sy = 0; // Row 0
        } else if (this.animState === 'run') {
            // Spans Row 2 (frames 0-7) and Row 3 (frames 8-15) in standard 256x256 knight sheet
            const actualFrame = this.animFrame;
            if (actualFrame < 8) {
                sx = actualFrame * 32;
                sy = 64; // Row 2
            } else {
                sx = (actualFrame - 8) * 32;
                sy = 96; // Row 3
            }
        } else if (this.animState === 'air') {
            // Uses Row 1 (Jump UP: col 0, Jump DOWN: col 1)
            sx = this.animFrame * 32;
            sy = 32; // Row 1
        }

        ctx.save();

        // Overclock Aura Blur
        if (this.overclockTimer > 0) {
            ctx.shadowColor = COLORS.OVERCLOCK;
            ctx.shadowBlur = 12;
            ctx.globalAlpha = 0.85 + 0.15 * Math.sin(Date.now() * 0.015);
        }

        // Draw flipped sprite mapping
        if (!this.facingRight) {
            ctx.translate(drawX + drawW, drawY);
            ctx.scale(-1, 1);
            ctx.drawImage(sheet, sx, sy, 32, 32, 0, 0, drawW, drawH);
        } else {
            ctx.drawImage(sheet, sx, sy, 32, 32, drawX, drawY, drawW, drawH);
        }

        ctx.restore();
    }
}

// ==================================================================================
// SECTION 4: AI THREAT PATROLLING SLIMES
// ==================================================================================
class Slime {
    constructor(col, row, type) {
        this.col = col;
        this.row = row;
        this.type = type; // 'green' or 'purple'

        this.x = col * SCALED_TILE;
        this.y = row * SCALED_TILE + (SCALED_TILE - 12 * SCALE); // Placed flush on floor

        // Patrolling Hitbox Configuration (24x24 asset sheet dimension scaled)
        this.width  = 16 * SCALE;
        this.height = 12 * SCALE;

        this.drawOffsetX = -4 * SCALE;
        this.drawOffsetY = -12 * SCALE;

        this.vx = (type === 'purple' ? 1.6 : 1.0) * SCALE;
        this.vy = 0;
        this.alive = true;

        this.animFrame = 0;
        this.animTimer = 0;
    }

    update(map) {
        if (!this.alive) return;

        // Apply Gravity
        this.vy += GRAVITY;
        if (this.vy > TERMINAL_VELOCITY) this.vy = TERMINAL_VELOCITY;

        // Perform horizontal pacing
        this.x += this.vx;

        // ─── LEDGE & WALL DETECTION AI ──────────────────────────────────────────
        // Compute coordinates ahead of current movement trajectory
        const checkDist = this.vx > 0 ? this.width + 2 * SCALE : -2 * SCALE;
        const aheadX = this.x + checkDist;

        const aheadCol = Math.floor(aheadX / SCALED_TILE);
        const bodyRow  = Math.floor((this.y + this.height / 2) / SCALED_TILE);
        const floorRow = Math.floor((this.y + this.height + 6 * SCALE) / SCALED_TILE);

        let reverseDirection = false;

        if (aheadCol < 0 || aheadCol >= map[0].length) {
            reverseDirection = true;
        } else {
            // Inspect ahead tile for wall collision
            if (bodyRow >= 0 && bodyRow < map.length) {
                const wallTile = map[bodyRow][aheadCol];
                if (wallTile === TILE.GRASS || wallTile === TILE.DIRT || wallTile === TILE.PLATFORM) {
                    reverseDirection = true;
                }
            }
            // Inspect floor ahead for pit ledge detection
            if (!reverseDirection && floorRow >= 0 && floorRow < map.length) {
                const floorTile = map[floorRow][aheadCol];
                if (floorTile === TILE.AIR || floorTile === TILE.PIT) {
                    reverseDirection = true;
                }
            }
        }

        if (reverseDirection) {
            this.vx *= -1;
            this.x += this.vx * 1.5; // Offset to avoid boundary getting stuck
        }

        // Apply vertical physics and resolve floor landing
        this.y += this.vy;
        this._resolveVertical(map);

        // Cycle animation frames
        this.animTimer++;
        if (this.animTimer >= 7) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4; // 4 frame crawl loop
        }
    }

    _resolveVertical(map) {
        const startCol = Math.floor(this.x / SCALED_TILE);
        const endCol   = Math.floor((this.x + this.width) / SCALED_TILE);
        const startRow = Math.floor(this.y / SCALED_TILE);
        const endRow   = Math.floor((this.y + this.height) / SCALED_TILE);

        for (let r = startRow; r <= endRow + 1; r++) {
            for (let c = startCol; c <= endCol; c++) {
                if (r < 0 || r >= map.length || c < 0 || c >= map[0].length) continue;
                const tile = map[r][c];
                if (tile === TILE.GRASS || tile === TILE.DIRT || tile === TILE.PLATFORM) {
                    const floorY = r * SCALED_TILE;
                    if (this.vy >= 0 && this.y + this.height >= floorY && this.y < floorY) {
                        this.y = floorY - this.height;
                        this.vy = 0;
                    }
                }
            }
        }
    }

    draw(ctx, cam, assets) {
        if (!this.alive) return;

        const sheetKey = this.type === 'green' ? 'slime_green' : 'slime_purple';
        const sheet = assets.images[sheetKey];
        if (!sheet) return;

        const drawX = Math.round(this.x + this.drawOffsetX - cam.x);
        const drawY = Math.round(this.y + this.drawOffsetY - cam.y);
        const drawW = 24 * SCALE;
        const drawH = 24 * SCALE;

        // Slime sheets are 96x72, containing 24x24 frames. Walk loop is Row 1 (Walk)
        const sx = this.animFrame * 24;
        const sy = 24; // Row 1 of sheet

        ctx.save();
        if (this.vx < 0) {
            ctx.translate(drawX + drawW, drawY);
            ctx.scale(-1, 1);
            ctx.drawImage(sheet, sx, sy, 24, 24, 0, 0, drawW, drawH);
        } else {
            ctx.drawImage(sheet, sx, sy, 24, 24, drawX, drawY, drawW, drawH);
        }
        ctx.restore();
    }
}

// ==================================================================================
// SECTION 5: COLLECTIBLES & POWERUPS
// ==================================================================================
class Collectible {
    constructor(col, row, type) {
        this.col = col;
        this.row = row;
        this.type = type; // 'coin' or 'fruit'

        this.x = col * SCALED_TILE + (SCALED_TILE - 14 * SCALE) / 2;
        this.y = row * SCALED_TILE + (SCALED_TILE - 14 * SCALE) / 2;
        this.width = 14 * SCALE;
        this.height = 14 * SCALE;

        this.collected = false;

        this.animFrame = 0;
        this.animTimer = 0;

        // Unique float phase offsets to prevent synchronous bobbing
        this.baseY = this.y;
        this.bobPhase = Math.random() * Math.PI * 2;

        // Asserts static fruit varieties so items don't shift shapes midgame
        this.fruitVariety = Math.floor(Math.random() * 16);
    }

    update(dt) {
        if (this.collected) return;

        this.bobPhase += 0.05;
        this.y = this.baseY + Math.sin(this.bobPhase) * 3;

        this.animTimer++;
        if (this.type === 'coin') {
            if (this.animTimer >= 5) {
                this.animTimer = 0;
                this.animFrame = (this.animFrame + 1) % 12; // 12-frame loop of coin.png
            }
        }
    }

    draw(ctx, cam, assets) {
        if (this.collected) return;

        const drawX = Math.round(this.x - cam.x);
        const drawY = Math.round(this.y - cam.y);

        if (this.type === 'coin') {
            const sheet = assets.images.coin;
            if (sheet) {
                ctx.drawImage(
                    sheet,
                    this.animFrame * 16, 0, 16, 16,
                    drawX, drawY, SCALED_TILE, SCALED_TILE
                );
            }
        } else {
            const sheet = assets.images.fruit;
            if (sheet) {
                // Slices a static fruit shape (out of 16 styles in a 4x4 layout of 64x64)
                const col = this.fruitVariety % 4;
                const row = Math.floor(this.fruitVariety / 4);

                ctx.drawImage(
                    sheet,
                    col * 16, row * 16, 16, 16,
                    drawX, drawY, SCALED_TILE, SCALED_TILE
                );
            }
        }
    }
}

// ==================================================================================
// SECTION 5 (CONT): SPRITE-SLICED PARTICLE ARCHITECTURE
// ==================================================================================
class Particle {
    constructor(x, y, image, sx, sy, sw, sh, life = 30) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 5 * SCALE;
        this.vy = (Math.random() - 0.5) * 5 * SCALE - 1 * SCALE;
        this.image = image;
        this.sx = sx;
        this.sy = sy;
        this.sw = sw;
        this.sh = sh;
        this.life = life;
        this.maxLife = life;
        this.size = (2 + Math.random() * 3) * SCALE;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15 * SCALE; // Gravity influence
        this.life--;
    }

    draw(ctx, cam) {
        if (this.life <= 0 || !this.image) return;
        const alpha = this.life / this.maxLife;

        ctx.save();
        ctx.globalAlpha = alpha;
        const dx = Math.round(this.x - cam.x);
        const dy = Math.round(this.y - cam.y);

        ctx.drawImage(
            this.image,
            this.sx, this.sy, this.sw, this.sh,
            dx, dy, this.size, this.size
        );
        ctx.restore();
    }
}

// ==================================================================================
// SECTION 6: RETRO STATE SYSTEM LAYOUTS & USER INPUTS
// ==================================================================================
class InputManager {
    constructor() {
        this.keys = {};
        this.left = false;
        this.right = false;
        this.jump = false;
        this.jumpPressed = false;
        this._prevKeysState = {};

        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault(); // Lock browser scrolling mechanics
            }
            this.keys[e.key] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

    update() {
        this.left  = !!(this.keys['ArrowLeft']  || this.keys['a'] || this.keys['A']);
        this.right = !!(this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']);

        const jumpKey = !!(this.keys[' '] || this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']);
        this.jumpPressed = jumpKey && !this.jump;
        this.jump = jumpKey;
    }

    isKeyJustPressed(key) {
        const isDown = !!this.keys[key];
        if (isDown && !this._prevKeysState[key]) {
            this._prevKeysState[key] = true;
            return true;
        }
        if (!isDown) {
            this._prevKeysState[key] = false;
        }
        return false;
    }

    reset() {
        this._prevKeysState = {};
    }
}

// ==================================================================================
// SECTION 2 (CONT): THE 2D GRID-TILEMAP & AUTO-TILING RENDERER
// ==================================================================================
class TilemapRenderer {
    constructor() {
        // Tile coordinate slices for world_tileset.png
        this.tileCoords = {
            leftEdge:   { sx: 0,  sy: 0  },
            centerGrass: { sx: 16, sy: 0  },
            rightEdge:  { sx: 32, sy: 0  },
            leftDirt:    { sx: 0,  sy: 16 },
            centerDirt:  { sx: 16, sy: 16 },
            rightDirt:   { sx: 32, sy: 16 }
        };

        // Static platform segment coordinates from platforms.png
        this.platCoords = {
            left:   { sx: 0,  sy: 0 },
            middle: { sx: 16, sy: 0 },
            right:  { sx: 32, sy: 0 }
        };
    }

    draw(ctx, cam, map, assets) {
        const tileset  = assets.images.world_tileset;
        const platforms = assets.images.platforms;

        const startCol = Math.max(0, Math.floor(cam.x / SCALED_TILE) - 1);
        const endCol   = Math.min(map[0].length, Math.ceil((cam.x + cam.viewW) / SCALED_TILE) + 1);
        const startRow = Math.max(0, Math.floor(cam.y / SCALED_TILE) - 1);
        const endRow   = Math.min(map.length, Math.ceil((cam.y + cam.viewH) / SCALED_TILE) + 1);

        for (let r = startRow; r < endRow; r++) {
            for (let c = startCol; c < endCol; c++) {
                const tile = map[r][c];
                if (tile === TILE.AIR || tile === TILE.PIT) continue;

                const drawX = Math.round(c * SCALED_TILE - cam.x);
                const drawY = Math.round(r * SCALED_TILE - cam.y);

                if (tile === TILE.FINISH) {
                    this._drawFinishPole(ctx, cam, c, r, tileset);
                    continue;
                }

                if (tile === TILE.PLATFORM) {
                    // One-way Platform Rendering logic (determining caps)
                    const leftSame  = c > 0 && map[r][c - 1] === TILE.PLATFORM;
                    const rightSame = c < map[0].length - 1 && map[r][c + 1] === TILE.PLATFORM;

                    let piece = 'middle';
                    if (!leftSame && rightSame) piece = 'left';
                    else if (leftSame && !rightSame) piece = 'right';
                    else if (!leftSame && !rightSame) piece = 'middle'; // Single floating piece

                    if (platforms) {
                        const coord = this.platCoords[piece];
                        ctx.drawImage(
                            platforms,
                            coord.sx, coord.sy, TILE_SIZE, TILE_SIZE,
                            drawX, drawY, SCALED_TILE, SCALED_TILE
                        );
                    }
                } else if (tile === TILE.GRASS || tile === TILE.DIRT) {
                    if (tileset) {
                        // ─── AUTO-TILING PIPELINE ────────────────────────────────
                        const isLeftSolid  = c > 0 && (map[r][c - 1] === TILE.GRASS || map[r][c - 1] === TILE.DIRT);
                        const isRightSolid = c < map[0].length - 1 && (map[r][c + 1] === TILE.GRASS || map[r][c + 1] === TILE.DIRT);

                        let tileConfig = this.tileCoords.centerGrass;

                        if (tile === TILE.GRASS) {
                            if (!isLeftSolid && isRightSolid) {
                                tileConfig = this.tileCoords.leftEdge;
                            } else if (isLeftSolid && !isRightSolid) {
                                tileConfig = this.tileCoords.rightEdge;
                            } else {
                                tileConfig = this.tileCoords.centerGrass;
                            }
                        } else {
                            // Dirt underneath
                            if (!isLeftSolid && isRightSolid) {
                                tileConfig = this.tileCoords.leftDirt;
                            } else if (isLeftSolid && !isRightSolid) {
                                tileConfig = this.tileCoords.rightDirt;
                            } else {
                                tileConfig = this.tileCoords.centerDirt;
                            }
                        }

                        ctx.drawImage(
                            tileset,
                            tileConfig.sx, tileConfig.sy, TILE_SIZE, TILE_SIZE,
                            drawX, drawY, SCALED_TILE, SCALED_TILE
                        );
                    }
                }
            }
        }
    }

    _drawFinishPole(ctx, cam, col, row, tileset) {
        if (!tileset) return;
        const drawX = Math.round(col * SCALED_TILE - cam.x);
        const drawY = Math.round(row * SCALED_TILE - cam.y);

        // Slice ornamental wooden sign/marker from tileset (column 6, row 0)
        ctx.drawImage(
            tileset,
            96, 0, TILE_SIZE, TILE_SIZE,
            drawX, drawY, SCALED_TILE, SCALED_TILE
        );

        // Draw pulsing beacon indicator
        const wave = 0.4 + 0.3 * Math.sin(Date.now() * 0.006);
        ctx.save();
        ctx.globalAlpha = wave;
        ctx.shadowColor = COLORS.OVERCLOCK;
        ctx.shadowBlur = 15;
        // Drawing a flag beacon overlay using a glowing segment
        ctx.drawImage(
            tileset,
            112, 0, TILE_SIZE, TILE_SIZE,
            drawX, drawY, SCALED_TILE, SCALED_TILE
        );
        ctx.restore();
    }

    getSolidTilesNear(map, entityX, entityY, entityW, entityH) {
        const tiles = [];
        const startCol = Math.max(0, Math.floor(entityX / SCALED_TILE) - 1);
        const endCol   = Math.min(map[0].length - 1, Math.floor((entityX + entityW) / SCALED_TILE) + 1);
        const startRow = Math.max(0, Math.floor(entityY / SCALED_TILE) - 1);
        const endRow   = Math.min(map.length - 1, Math.floor((entityY + entityH) / SCALED_TILE) + 1);

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const t = map[r][c];
                if (t === TILE.GRASS || t === TILE.DIRT || t === TILE.PLATFORM) {
                    tiles.push({
                        x: c * SCALED_TILE,
                        y: r * SCALED_TILE,
                        w: SCALED_TILE,
                        h: SCALED_TILE,
                        type: t
                    });
                }
            }
        }
        return tiles;
    }
}

// ==================================================================================
// SECTION 6 (CONT): HEADS-UP DISPLAY (HUD) LAYER
// ==================================================================================
class HUD {
    draw(ctx, score, fruitsCount, timer, hp, maxHp, level, overclockActive, assets) {
        const hudH = 54;

        // Static translucent HUD overlay bar
        ctx.fillStyle = COLORS.HUD_BG;
        ctx.fillRect(0, 0, CANVAS_W, hudH);

        // Retro gold bottom border frame
        ctx.strokeStyle = COLORS.HUD_BORDER;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, hudH);
        ctx.lineTo(CANVAS_W, hudH);
        ctx.stroke();

        ctx.font = '14px PixelOperator8-Bold, monospace';
        ctx.textBaseline = 'middle';
        const labelY = hudH / 2;

        // 1. Current Score
        ctx.fillStyle = COLORS.TEXT_GOLD;
        ctx.fillText(`SCORE: ${score}`, 20, labelY);

        // 2. Fruit powerup count
        ctx.fillStyle = COLORS.TEXT_WHITE;
        ctx.fillText(`FRUITS: ${fruitsCount}`, 200, labelY);

        // 3. Countdown timer with red pulsing near limit
        if (timer <= 15) {
            const pulseAlpha = 0.7 + 0.3 * Math.sin(Date.now() * 0.015);
            ctx.fillStyle = `rgba(255, 68, 68, ${pulseAlpha})`;
        } else {
            ctx.fillStyle = COLORS.TEXT_GOLD;
        }
        ctx.fillText(`TIME: ${Math.ceil(timer)}s`, 380, labelY);

        // 4. Current Level
        ctx.fillStyle = COLORS.TEXT_WHITE;
        ctx.fillText(`LV ${level}`, 530, labelY);

        // 5. HP Hearts (100% sprite sliced from fruit cherries!)
        const heartStartX = 620;
        const heartSize = 16 * SCALE; // 48px
        const heartGap = 24 * SCALE;  // 72px spacing

        for (let i = 0; i < maxHp; i++) {
            const hx = heartStartX + i * (heartSize + 6);
            const hy = labelY - heartSize / 2;

            ctx.save();
            // Display empty hearts by applying high transparency
            if (i >= hp) {
                ctx.globalAlpha = 0.25;
            } else {
                ctx.globalAlpha = 1.0;
            }

            const fruitSheet = assets.images.fruit;
            if (fruitSheet) {
                // Slice cherry icon (col 0, row 0 of fruit.png)
                ctx.drawImage(
                    fruitSheet,
                    0, 0, 16, 16,
                    hx, hy, heartSize, heartSize
                );
            }
            ctx.restore();
        }

        // 6. Overclock status display
        if (overclockActive) {
            ctx.fillStyle = COLORS.OVERCLOCK;
            ctx.font = '10px PixelOperator8-Bold, monospace';
            const blink = Math.sin(Date.now() * 0.01) > 0;
            if (blink) {
                ctx.fillText('⚡ OVERCLOCK ACTIVE ⚡', 20, hudH + 20);
            }
        }
    }
}

// ==================================================================================
// SECTION 2 (CONT): RETRO PARALLAX SCROLLING BACKGROUND
// ==================================================================================
class BackgroundRenderer {
    constructor() {
        this.stars = [];
        for (let i = 0; i < 45; i++) {
            this.stars.push({
                x: Math.random() * CANVAS_W * 4,
                y: Math.random() * CANVAS_H * 0.5,
                size: (1 + Math.random() * 2) * SCALE,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    draw(ctx, cam, assets) {
        // Deep Space sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        gradient.addColorStop(0, '#090918');
        gradient.addColorStop(0.3, '#141434');
        gradient.addColorStop(0.6, '#28285c');
        gradient.addColorStop(0.9, '#4a4478');
        gradient.addColorStop(1.0, '#7c608c');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // 100% Sprite-sliced twinkling stars (read from coin.png reflection highlight)
        const coinSheet = assets.images.coin;
        if (coinSheet) {
            for (const star of this.stars) {
                star.phase += 0.025;
                const starAlpha = 0.35 + 0.65 * Math.abs(Math.sin(star.phase));

                const sx = star.x - cam.x * 0.15; // Parallax drift
                const sy = star.y - cam.y * 0.08;

                ctx.save();
                ctx.globalAlpha = starAlpha;
                // Slice a 2x2 white/yellow pixel highlight from the center of coin frame 0
                ctx.drawImage(
                    coinSheet,
                    7, 7, 2, 2,
                    sx % (CANVAS_W + 50) - 25, sy, star.size, star.size
                );
                ctx.restore();
            }
        }

        // Draw parallax vector hills
        this._drawParallaxHills(ctx, cam);
    }

    _drawParallaxHills(ctx, cam) {
        const hillColorFar  = 'rgba(28, 22, 54, 0.75)';
        const hillColorNear = 'rgba(15, 12, 34, 0.9)';

        // Far layer
        ctx.fillStyle = hillColorFar;
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_H);
        for (let x = 0; x <= CANVAS_W; x += 5) {
            const worldX = x + cam.x * 0.12;
            const y = CANVAS_H - 140 + Math.sin(worldX * 0.0025) * 60 + Math.sin(worldX * 0.006) * 20;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(CANVAS_W, CANVAS_H);
        ctx.closePath();
        ctx.fill();

        // Near layer
        ctx.fillStyle = hillColorNear;
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_H);
        for (let x = 0; x <= CANVAS_W; x += 5) {
            const worldX = x + cam.x * 0.28;
            const y = CANVAS_H - 90 + Math.sin(worldX * 0.004) * 45 + Math.sin(worldX * 0.009) * 15;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(CANVAS_W, CANVAS_H);
        ctx.closePath();
        ctx.fill();
    }
}

// ==================================================================================
// SECTION 6 (CONT): INTERACTION MENUS & OVERLAY STATE SCREENS
// ==================================================================================
class ScreenRenderer {
    constructor() {
        this.pulse = 0;
    }

    drawSplash(ctx) {
        this.pulse += 0.04;

        // Space Theme Gradient
        const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        grad.addColorStop(0, '#050510');
        grad.addColorStop(1, '#101026');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Retro frame line
        ctx.strokeStyle = COLORS.HUD_BORDER;
        ctx.lineWidth = 3;
        ctx.strokeRect(25, 25, CANVAS_W - 50, CANVAS_H - 50);

        ctx.strokeStyle = 'rgba(255, 215, 0, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(32, 32, CANVAS_W - 64, CANVAS_H - 64);

        ctx.textAlign = 'center';

        // Glowing Drop Shadow Title
        ctx.fillStyle = '#020208';
        ctx.font = 'bold 54px PixelOperator8-Bold, monospace';
        ctx.fillText('FIGTH', CANVAS_W / 2 + 4, CANVAS_H / 2 - 76);
        ctx.fillStyle = COLORS.TEXT_GOLD;
        ctx.fillText('FIGTH', CANVAS_W / 2, CANVAS_H / 2 - 80);

        ctx.fillStyle = '#8f8fce';
        ctx.font = 'bold 22px PixelOperator8-Bold, monospace';
        ctx.fillText('ADVENTURE', CANVAS_W / 2, CANVAS_H / 2 - 46);

        // Horizontal Rule
        ctx.strokeStyle = COLORS.HUD_BORDER;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(CANVAS_W / 2 - 140, CANVAS_H / 2 - 30);
        ctx.lineTo(CANVAS_W / 2 + 140, CANVAS_H / 2 - 30);
        ctx.stroke();

        // Pulsing Space Prompt
        const alpha = 0.5 + 0.5 * Math.sin(this.pulse * 2.0);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = COLORS.TEXT_WHITE;
        ctx.font = 'bold 16px PixelOperator8-Bold, monospace';
        ctx.fillText('PRESS SPACEBAR TO START', CANVAS_W / 2, CANVAS_H / 2 + 30);
        ctx.restore();

        // Informative Controls Table
        ctx.fillStyle = '#7a7aaf';
        ctx.font = '11px PixelOperator8, monospace';
        ctx.fillText('A / D  or  ARROW KEYS  —  MOVE HORIZONTALLY', CANVAS_W / 2, CANVAS_H / 2 + 90);
        ctx.fillText('W  or  SPACEBAR  —  JUMP / DOUBLE JUMP', CANVAS_W / 2, CANVAS_H / 2 + 112);
        ctx.fillText('STOMP ON SLIMES TO ELIMINATE THEM', CANVAS_W / 2, CANVAS_H / 2 + 134);
        ctx.fillText('COLLECT COINS & SPECIAL OVERCLOCK FRUITS', CANVAS_W / 2, CANVAS_H / 2 + 156);

        // Footer Metadata
        ctx.fillStyle = '#48486b';
        ctx.font = '10px PixelOperator8, monospace';
        ctx.fillText('ENGINE V1.2  —  100% PURE CANVAS SPRITES  —  ES6 CLASSES', CANVAS_W / 2, CANVAS_H - 45);

        ctx.textAlign = 'left';
    }

    drawGameOver(ctx, score) {
        // Deep Crimson dark vignette overlay
        ctx.fillStyle = 'rgba(16, 2, 2, 0.94)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.textAlign = 'center';

        // Draw pixel skull pattern
        this._drawSkullIcon(ctx, CANVAS_W / 2 - 36, CANVAS_H / 2 - 130, 6);

        ctx.fillStyle = COLORS.TEXT_RED;
        ctx.font = 'bold 50px PixelOperator8-Bold, monospace';
        ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 + 10);

        ctx.fillStyle = COLORS.TEXT_GOLD;
        ctx.font = 'bold 20px PixelOperator8-Bold, monospace';
        ctx.fillText(`SCORE ACCUMULATED: ${score}`, CANVAS_W / 2, CANVAS_H / 2 + 65);

        const flash = Math.sin(Date.now() * 0.007) > 0;
        ctx.fillStyle = flash ? COLORS.TEXT_WHITE : '#777788';
        ctx.font = '14px PixelOperator8, monospace';
        ctx.fillText("PRESS 'R' KEY TO RESTART PROTOCOL", CANVAS_W / 2, CANVAS_H / 2 + 125);

        ctx.textAlign = 'left';
    }

    drawVictory(ctx, level, score, timeBonus) {
        ctx.fillStyle = 'rgba(2, 10, 16, 0.94)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.textAlign = 'center';

        // Draw pixel star icon
        this._drawStarIcon(ctx, CANVAS_W / 2 - 30, CANVAS_H / 2 - 130, 6);

        ctx.fillStyle = COLORS.TEXT_GOLD;
        ctx.font = 'bold 40px PixelOperator8-Bold, monospace';
        ctx.fillText(`STAGE ${level}`, CANVAS_W / 2, CANVAS_H / 2 + 10);

        ctx.fillStyle = COLORS.OVERCLOCK;
        ctx.font = 'bold 26px PixelOperator8-Bold, monospace';
        ctx.fillText('SECURED SUCCESSFULLY!', CANVAS_W / 2, CANVAS_H / 2 + 50);

        ctx.fillStyle = COLORS.TEXT_WHITE;
        ctx.font = '14px PixelOperator8, monospace';
        ctx.fillText(`TOTAL SCORE: ${score}`, CANVAS_W / 2, CANVAS_H / 2 + 95);
        ctx.fillText(`REMAINING TIME BONUS: +${timeBonus}`, CANVAS_W / 2, CANVAS_H / 2 + 120);

        const blink = Math.sin(Date.now() * 0.006) > 0;
        ctx.fillStyle = blink ? COLORS.TEXT_GOLD : COLORS.TEXT_WHITE;
        ctx.font = 'bold 15px PixelOperator8-Bold, monospace';
        if (level === 1) {
            ctx.fillText('PRESS SPACEBAR FOR LEVEL 2 CHALLENGE', CANVAS_W / 2, CANVAS_H / 2 + 175);
        } else {
            ctx.fillText('VICTORY COMPLETE! PRESS SPACE TO RESTART', CANVAS_W / 2, CANVAS_H / 2 + 175);
        }

        ctx.textAlign = 'left';
    }

    _drawSkullIcon(ctx, x, y, s) {
        ctx.fillStyle = COLORS.TEXT_RED;
        const skullGrid = [
            [0,0,1,1,1,1,1,1,1,1,0,0],
            [0,1,1,1,1,1,1,1,1,1,1,0],
            [1,1,0,0,1,1,1,1,0,0,1,1],
            [1,1,0,0,1,1,1,1,0,0,1,1],
            [1,1,1,1,1,1,1,1,1,1,1,1],
            [0,1,1,0,1,1,1,1,0,1,1,0],
            [0,0,1,1,0,1,1,0,1,1,0,0]
        ];
        for (let r = 0; r < skullGrid.length; r++) {
            for (let c = 0; c < skullGrid[r].length; c++) {
                if (skullGrid[r][c]) ctx.fillRect(x + c * s, y + r * s, s, s);
            }
        }
    }

    _drawStarIcon(ctx, x, y, s) {
        ctx.fillStyle = COLORS.TEXT_GOLD;
        const starGrid = [
            [0,0,0,0,1,1,0,0,0,0],
            [0,0,0,1,1,1,1,0,0,0],
            [1,1,1,1,1,1,1,1,1,1],
            [0,1,1,1,1,1,1,1,1,0],
            [0,0,1,1,1,1,1,1,0,0],
            [0,1,1,1,0,0,1,1,1,0],
            [1,1,1,0,0,0,0,1,1,1],
            [1,1,0,0,0,0,0,0,1,1]
        ];
        for (let r = 0; r < starGrid.length; r++) {
            for (let c = 0; c < starGrid[r].length; c++) {
                if (starGrid[r][c]) ctx.fillRect(x + c * s, y + r * s, s, s);
            }
        }
    }
}

// ==================================================================================
// SECTION 2 (CONT): HIGH-DENSITY LEVEL LAYOUT BLUEPRINTS
// ==================================================================================
class LevelData {
    static getLevel(number) {
        if (number === 1) return LevelData.level1();
        return LevelData.level2();
    }

    static level1() {
        // Level 1 Layout (50 columns × 13 rows) — "The Training Grounds"
        const map = [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 0
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 1
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 2
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 3
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 4
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,0,0,0], // row 5
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 6
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 7
            [0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 8
            [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,9], // row 9
            [2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,2,2,2,2,2,2,2,2,2,2,4,4,4,4,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,2,2,2], // row 10
            [2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,2,2,2,2,2,2,2,2,2,2,4,4,4,4,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,2,2,2], // row 11
            [2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,2,2,2,2,2,2,2,2,2,2,4,4,4,4,2,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,2,2,2]  // row 12
        ];

        // Level 1 Spawns
        const coins = [
            { col: 4, row: 8 }, { col: 5, row: 8 }, { col: 6, row: 8 },
            { col: 13, row: 7 }, { col: 14, row: 7 },
            { col: 18, row: 6 }, { col: 19, row: 6 }, { col: 20, row: 6 },
            { col: 32, row: 5 }, { col: 33, row: 5 },
            { col: 44, row: 4 }, { col: 45, row: 4 }
        ];

        const fruits = [
            { col: 19, row: 5 },
            { col: 33, row: 4 }
        ];

        const slimes = [
            { col: 7,  row: 8, type: 'green' },
            { col: 22, row: 8, type: 'green' },
            { col: 35, row: 8, type: 'purple' }
        ];

        const movingPlatforms = [];
        const playerStart = { col: 1, row: 7 };
        const timeLimit = 60; // 60s countdown

        return { map, coins, fruits, slimes, movingPlatforms, playerStart, timeLimit };
    }

    static level2() {
        // Level 2 Layout (60 columns × 15 rows) — "The Sky High Platform Challenge"
        const map = [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 0
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 1
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 2
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0], // row 3
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 4
            [0,0,0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 5
            [0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 6
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 7
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 8
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 9
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 10
            [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,9], // row 11
            [2,2,2,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,2,2,2], // row 12
            [2,2,2,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,2,2,2], // row 13
            [2,2,2,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,2,2,2]  // row 14
        ];

        // Level 2 Spawns
        const coins = [
            { col: 4, row: 5 }, { col: 5, row: 5 },
            { col: 9, row: 4 }, { col: 10, row: 4 },
            { col: 19, row: 3 }, { col: 20, row: 3 },
            { col: 31, row: 2 }, { col: 32, row: 2 },
            { col: 42, row: 1 }, { col: 43, row: 1 },
            { col: 50, row: 0 }, { col: 51, row: 0 },
            { col: 53, row: 2 }, { col: 54, row: 2 }
        ];

        const fruits = [
            { col: 9,  row: 3 },
            { col: 31, row: 1 },
            { col: 50, row: -1 }
        ];

        const slimes = [
            { col: 9,  row: 4, type: 'green' },
            { col: 19, row: 3, type: 'purple' },
            { col: 31, row: 2, type: 'green' },
            { col: 43, row: 1, type: 'purple' }
        ];

        // Dynamic Moving Platforms (Horizontal & Vertical segments)
        const movingPlatforms = [
            new MovingPlatform(11, 10, 3, 'x', 11, 17, 1.2), // Slow bridge lift
            new MovingPlatform(24, 7, 2, 'y', 4, 10, 1.0),   // Elevator shaft
            new MovingPlatform(36, 6, 3, 'x', 34, 41, 1.5),  // Fast lateral step
            new MovingPlatform(46, 8, 2, 'y', 3, 9, 1.3)     // Vertical climber lift
        ];

        const playerStart = { col: 1, row: 9 };
        const timeLimit = 90; // 90s countdown

        return { map, coins, fruits, slimes, movingPlatforms, playerStart, timeLimit };
    }
}

// ==================================================================================
// SECTION 10: MASTER GAME ENGINE & LIFECYCLE
// ==================================================================================
class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Force image smoothing parameters off for perfect retro display
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;

        // Instantiate subsystems
        this.assets   = new AssetPipeline();
        this.input    = new InputManager();
        this.camera   = new Camera(CANVAS_W, CANVAS_H);
        this.tilemap  = new TilemapRenderer();
        this.hud      = new HUD();
        this.bg       = new BackgroundRenderer();
        this.screens  = new ScreenRenderer();

        // Instantiate entities
        this.knight          = new Knight();
        this.enemies         = [];
        this.items           = [];
        this.particles       = [];
        this.movingPlatforms = [];

        // Engine State variables
        this.state = 'LOADING'; // LOADING | SPLASH | PLAYING | VICTORY | GAMEOVER
        this.score = 0;
        this.fruitsCollected = 0;
        this.hp = 3;
        this.maxHp = 3;
        this.currentLevel = 1;
        this.levelTimer = 60;
        this.timeBonus = 0;
        this.map = [];
        this.worldW = 0;
        this.worldH = 0;
        this.musicActive = false;

        // Loop tracker metrics
        this.lastTime = 0;
        this.dt = 16.67;

        // Boot Pipeline
        this.assets.init(this.canvas, this.ctx, () => {
            this.state = 'SPLASH';
            this.input.reset();
        });

        // Initialize user click listener to bypass browser audio autoplay restrictions
        this.canvas.addEventListener('click', () => {
            if (this.state === 'SPLASH' && !this.musicActive) {
                this.assets.playSound('tap');
                this.assets.startMusic();
                this.musicActive = true;
            }
        });

        // Launch Game Loop
        requestAnimationFrame((t) => this._loop(t));
    }

    _loop(timestamp) {
        // Compute delta time
        this.dt = timestamp - this.lastTime || 16.67;
        if (this.dt > 60) this.dt = 60; // Hard clamp to avoid collision tunnel physics errors on hiccups
        this.lastTime = timestamp;

        this.input.update();
        this._processStateInput();
        this._update();
        this._draw();

        requestAnimationFrame((t) => this._loop(t));
    }

    _processStateInput() {
        if (this.state === 'SPLASH') {
            if (this.input.isKeyJustPressed(' ')) {
                this.assets.playSound('tap');
                if (!this.musicActive) {
                    this.assets.startMusic();
                    this.musicActive = true;
                }
                this._startLevel(1);
                this.state = 'PLAYING';
            }
        }
        else if (this.state === 'GAMEOVER') {
            if (this.input.isKeyJustPressed('r') || this.input.isKeyJustPressed('R')) {
                this.assets.playSound('tap');
                this._restartEntireGame();
            }
        }
        else if (this.state === 'VICTORY') {
            if (this.input.isKeyJustPressed(' ')) {
                this.assets.playSound('tap');
                if (this.currentLevel === 1) {
                    this.currentLevel = 2;
                    this._startLevel(2);
                    this.state = 'PLAYING';
                } else {
                    this._restartEntireGame();
                }
            }
        }
        else if (this.state === 'PLAYING') {
            if (this.input.jumpPressed) {
                this.knight.tryJump(this.assets);
            }
        }
    }

    _startLevel(num) {
        const level = LevelData.getLevel(num);
        this.map = level.map.map(r => [...r]);
        this.worldW = level.map[0].length * SCALED_TILE;
        this.worldH = level.map.length * SCALED_TILE;

        // Reset player kinematics
        this.knight.reset(level.playerStart.col, level.playerStart.row);

        // Spawn Items
        this.items = [];
        for (const coin of level.coins) {
            this.items.push(new Collectible(coin.col, coin.row, 'coin'));
        }
        for (const fruit of level.fruits) {
            this.items.push(new Collectible(fruit.col, fruit.row, 'fruit'));
        }

        // Spawn Enemies
        this.enemies = [];
        for (const s of level.slimes) {
            this.enemies.push(new Slime(s.col, s.row, s.type));
        }

        // Load Platforms
        this.movingPlatforms = level.movingPlatforms;

        // Initialize Level Timers
        this.levelTimer = level.timeLimit;
        this.timerAccumulator = 0;

        this.particles = [];
        this.input.reset();

        // Snap camera directly to start position
        this.camera.x = this.knight.x - CANVAS_W / 2;
        this.camera.y = this.knight.y - CANVAS_H / 2;
    }

    _restartEntireGame() {
        this.score = 0;
        this.fruitsCollected = 0;
        this.hp = 3;
        this.currentLevel = 1;
        this._startLevel(1);
        this.state = 'PLAYING';
    }

    _update() {
        if (this.state !== 'PLAYING') return;

        const dtMs = this.dt;

        // Process active gameplay countdown
        this.timerAccumulator += dtMs;
        if (this.timerAccumulator >= 1000) {
            this.timerAccumulator -= 1000;
            this.levelTimer--;
            if (this.levelTimer <= 0) {
                this.levelTimer = 0;
                this.assets.playSound('hurt');
                this.state = 'GAMEOVER';
                return;
            }
        }

        // Update Moving Platforms
        for (const platform of this.movingPlatforms) {
            platform.update();
        }

        // Collect solid tiles in viewport vicinity
        const solidTiles = this.tilemap.getSolidTilesNear(
            this.map,
            this.knight.x - SCALED_TILE,
            this.knight.y - SCALED_TILE,
            this.knight.width + SCALED_TILE * 2,
            this.knight.height + SCALED_TILE * 2
        );

        // Update Player mechanics
        this.knight.update(dtMs, this.input, solidTiles, this.movingPlatforms);

        // Track Camera Lerp positions
        this.camera.update(
            this.knight.x + this.knight.width / 2,
            this.knight.y + this.knight.height / 2,
            this.worldW, this.worldH
        );

        // Pit bottomless drop death check
        if (this.knight.y > this.worldH + 80) {
            this.hp--;
            this.assets.playSound('hurt');
            this._spawnExplosionParticles(
                this.knight.x + this.knight.width / 2,
                this.worldH - 10,
                '#ff3333', 12
            );

            if (this.hp <= 0) {
                this.state = 'GAMEOVER';
                return;
            }

            // Respawn Knight at startup coordinates
            const level = LevelData.getLevel(this.currentLevel);
            this.knight.reset(level.playerStart.col, level.playerStart.row);
            this.knight.invulnTimer = 1500;
        }

        // Process Collectibles collision checks
        for (const item of this.items) {
            item.update(dtMs);
            if (!item.collected && this.knight.overlaps(item)) {
                item.collected = true;

                if (item.type === 'coin') {
                    this.score += 100;
                    this.assets.playSound('coin');
                    this._spawnSliceParticles(
                        item.x + item.width / 2,
                        item.y + item.height / 2,
                        this.assets.images.coin,
                        7, 7, 3, 3, // coin center gold shine
                        6
                    );
                } else {
                    this.fruitsCollected++;
                    this.score += 400;
                    this.knight.overclockTimer = 5000; // 5 seconds overclock
                    this.assets.playSound('powerUp');
                    this._spawnSliceParticles(
                        item.x + item.width / 2,
                        item.y + item.height / 2,
                        this.assets.images.fruit,
                        8, 8, 3, 3, // green power leaf
                        12
                    );
                }
            }
        }

        // Update Enemy patrolling AI & combat resolutions
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (!enemy.alive) continue;

            enemy.update(this.map);

            if (this.knight.overlaps(enemy)) {
                // Determine collision direction: stomp vs lateral damage
                const playerBottom = this.knight.y + this.knight.height;
                const prevPlayerBottom = playerBottom - this.knight.vy;
                const stompThresh = enemy.y + enemy.height * 0.35;

                if (this.knight.vy > 0 && prevPlayerBottom <= stompThresh) {
                    // STOMP SLAY EXECUTION
                    enemy.alive = false;
                    this.score += 300;
                    this.knight.vy = -7.5 * SCALE; // High spring bounce
                    this.assets.playSound('explosion');

                    const enemySheetKey = enemy.type === 'green' ? 'slime_green' : 'slime_purple';
                    this._spawnSliceParticles(
                        enemy.x + enemy.width / 2,
                        enemy.y + enemy.height / 2,
                        this.assets.images[enemySheetKey],
                        12, 36, 4, 4, // slime splat cells
                        14
                    );
                } else {
                    // LATERAL HIT RECEIVED
                    if (this.knight.invulnTimer <= 0) {
                        this.hp--;
                        this.assets.playSound('hurt');

                        this.knight.invulnTimer = 1500; // 1.5s invincibility
                        this.knight.applyKnockback(enemy.x + enemy.width / 2);

                        // Spawn damage splat particles from cherry fruit sheet
                        this._spawnSliceParticles(
                            this.knight.x + this.knight.width / 2,
                            this.knight.y + this.knight.height / 2,
                            this.assets.images.fruit,
                            2, 2, 4, 4, // red cherry pulp
                            8
                        );

                        if (this.hp <= 0) {
                            this.state = 'GAMEOVER';
                            return;
                        }
                    }
                }
            }
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Check for Flag Destination Clear
        const playerCol = Math.floor((this.knight.x + this.knight.width / 2) / SCALED_TILE);
        const playerRow = Math.floor((this.knight.y + this.knight.height / 2) / SCALED_TILE);

        if (playerRow >= 0 && playerRow < this.map.length &&
            playerCol >= 0 && playerCol < this.map[0].length &&
            this.map[playerRow][playerCol] === TILE.FINISH) {

            this.timeBonus = Math.ceil(this.levelTimer) * 10;
            this.score += this.timeBonus;
            this.state = 'VICTORY';
            this.assets.playSound('powerUp');
        }
    }

    _spawnSliceParticles(x, y, image, sx, sy, sw, sh, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, image, sx, sy, sw, sh));
        }
    }

    _spawnExplosionParticles(x, y, colorStr, count) {
        // Fallback vector particle in case image is missing
        const fruitImg = this.assets.images.fruit;
        if (fruitImg) {
            this._spawnSliceParticles(x, y, fruitImg, 0, 0, 4, 4, count);
        }
    }

    _draw() {
        // Wipe canvas
        this.ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Keep image smoothing off every tick (critical browser bypass)
        this.ctx.imageSmoothingEnabled = false;

        if (this.state === 'LOADING') return; // Handled directly by preloader
        if (this.state === 'SPLASH') {
            this.screens.drawSplash(this.ctx);
            return;
        }

        // 1. Draw Space Parallax Background
        this.bg.draw(this.ctx, this.camera, this.assets);

        // 2. Draw Auto-Tiled Terrain Ground & Signposts
        this.tilemap.draw(this.ctx, this.camera, this.map, this.assets);

        // 3. Draw Moving Platforms
        for (const platform of this.movingPlatforms) {
            platform.draw(this.ctx, this.camera, this.assets);
        }

        // 4. Draw Coins & Fruits (Bobbing)
        for (const item of this.items) {
            item.draw(this.ctx, this.camera, this.assets);
        }

        // 5. Draw Patrolling Slimes
        for (const enemy of this.enemies) {
            enemy.draw(this.ctx, this.camera, this.assets);
        }

        // 6. Draw Knight Player
        this.knight.draw(this.ctx, this.camera, this.assets);

        // 7. Draw Twinkling Particles
        for (const p of this.particles) {
            p.draw(this.ctx, this.camera);
        }

        // 8. Draw Heads-up Display
        this.hud.draw(
            this.ctx,
            this.score,
            this.fruitsCollected,
            this.levelTimer,
            this.hp,
            this.maxHp,
            this.currentLevel,
            this.knight.overclockTimer > 0,
            this.assets
        );

        // 9. Draw State Screens
        if (this.state === 'GAMEOVER') {
            this.screens.drawGameOver(this.ctx, this.score);
            if (window.parent && window.parent !== window && !this._scoreSubmitted) {
                this._scoreSubmitted = true;
                window.parent.postMessage({ type: 'OJHA_SCORE_SUBMIT', gameId: 'figth', gameTitle: 'PIXA JUMPER', score: this.score, level: this.currentLevel || 1, won: false }, '*');
            }
        } else if (this.state === 'VICTORY') {
            this.screens.drawVictory(this.ctx, this.currentLevel, this.score, this.timeBonus);
            if (window.parent && window.parent !== window && !this._scoreSubmitted) {
                this._scoreSubmitted = true;
                window.parent.postMessage({ type: 'OJHA_SCORE_SUBMIT', gameId: 'figth', gameTitle: 'PIXA JUMPER', score: this.score, level: this.currentLevel || 1, won: true }, '*');
            }
        }
    }
}

// ─── RUN ENTIRE SIMULATION ON PAGE LOAD ──────────────────────────────────────
window.addEventListener('load', () => {
    new GameEngine();
});