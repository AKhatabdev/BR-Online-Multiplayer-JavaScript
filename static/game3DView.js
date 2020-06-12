/*
  Title:
  BATTLE ROYAL!
  ©2020 Awais Khatab

  Target Browsers: DESKTOP & MOBILE/ Chrome, MS EDGE, Safari
  Module: CI328

  Copyright 2020, Awais Khatab, All rights reserved.
 */

const socket = io();
const canvas2d = $('#canvas-2d')[0];
const context = canvas2d.getContext('2d');
const canvas3d = $('#canvas-3d')[0];
const playerImage = $("#player-image")[0];
//const brickImage = $("#brick-image")[];

/**
 * RENDERER
 * @type {WebGLRenderer}
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas3d,
    antialias: true,
    physicallyCorrectLights: true
});
renderer.setClearColor('black');
renderer.shadowMap.enabled = true;

//TEXTURE LOAD
const floorTexture = new THREE.TextureLoader(). load("/static/assets/floorMapBlack.jpg");
const bulletTexture = new THREE.TextureLoader().load("/static/assets/bulletMapGold.jpg");

// SCENE/CAMERA
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 100, 1, 0.1, 3000 ); //TODO Adjust Render Distance *FIXED*

// FLOOR
const floorGeometry = new THREE.PlaneGeometry(1000, 1000, 1, 1); //FLOOR SIZE 1000 . 1000
const floorMaterial = new THREE.MeshLambertMaterial({map: floorTexture, reflectivity: 1.0}); //FLOOR COLOUR

//FLOOR MESH
const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
floorMesh.position.set(500, 0, 500); //FLOOR POS 500, 0 , 500
floorMesh.receiveShadow = true;
floorMesh.rotation.x = - Math.PI / 2;

//CAMERA POS START SCREEN
camera.position.set(100, 600, 500);
camera.lookAt(floorMesh.position);

// OBJECT MATERIALS
const bulletMaterial = new THREE.MeshLambertMaterial( {map: bulletTexture } ); //BULLET COLOUR
const wallMaterial = new THREE.MeshLambertMaterial( { color: 'tomato' } ); //WALL COLOUR
const playerTexture = new THREE.Texture(playerImage); playerTexture.needsUpdate = true;
const playerMaterial = new THREE.MeshLambertMaterial({map: playerTexture});
const textMaterial = new THREE.MeshLambertMaterial({ color: 'orangered', side: THREE.DoubleSide }); //0xf39800 MeshBasicMaterial
const nicknameMaterial = new THREE.MeshLambertMaterial({ color: 'white', side: THREE.DoubleSide });

// Light SOURCE
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(-100, 800, -100); //LIGHT POSITION
light.castShadow = true;
light.shadow.camera.left = -2000;
light.shadow.camera.right = 2000;
light.shadow.camera.top = 2000;
light.shadow.camera.bottom = -2000;
light.shadow.camera.far = 2000;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;

//Ambient
const ambient = new THREE.AmbientLight(0x808080);

//SCENE
scene.add(floorMesh);
scene.add(light);
scene.add(ambient);

//FONT LOADER
const loader = new THREE.FontLoader();
let font;
loader.load('/static/assets/fonts/helvetiker_bold.typeface.json', function(font_) {font = font_;});



//SOUND FX
let soundHit, musicBG, soundDeath;
//LOAD SOUNDS
soundHit = new sound("/static/soundFX/hit.mp3");
musicBG = new soundBG("/static/soundFX/backgroundGameMusic.mp3");
soundDeath = new sound('/static/soundFX/deathSound.mp3');
//SOUND FUNCTION LOOP (FALSE)
function sound(src) {
    this.sound = document.createElement("audio");
    this.sound.src = src;
    this.sound.setAttribute("preload", "auto");
    this.sound.setAttribute("controls", "none");
    this.sound.style.display = "none";
    document.body.appendChild(this.sound);
    this.play = function(){
        this.sound.play();
        console.log("Sound Played");
    };
    this.stop = function(){
        this.sound.pause();
    };
}
//BACKGROUND MUSIC FUNCTION LOOP(TRUE)
function soundBG(src) {
    this.sound = document.createElement("audio");
    this.sound.src = src;
    this.sound.setAttribute("preload", "auto");
    this.sound.setAttribute("controls", "none");
    this.sound.setAttribute("loop","true");
    this.sound.style.display = "none";
    document.body.appendChild(this.sound);
    this.play = function(){
        this.sound.play();
    };
    this.stop = function(){
        this.sound.pause();
    };
}

//GRID LINES
//////////////////////////////////////////////////////////
//scene.add(new THREE.CameraHelper(light.shadow.camera));
//scene.add(new THREE.AxisHelper(2000));
//scene.add(new THREE.DirectionalLightHelper(light, 20));
//////////////////////////////////////////////////////////

/**
 * ANIMATE
 */
function animate() {
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
}
animate();

/**
 * GAME START
 */
function gameStart(){
    musicBG.play();
    const nickname = $("#nickname").val();
    socket.emit('game-start', {nickname: nickname});
    $("#start-screen").hide();
}
$("#start-button").on('click', gameStart);

/**
 * PLAYER INPUT
 * @type {{}}
 */
let movement = {};
$(document).on('keydown keyup', (event) => {
    const KeyToCommand = {
        'ArrowUp': 'forward',
        'ArrowDown': 'back',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
    };
    const command = KeyToCommand[event.key];
    if(command){
        if(event.type === 'keydown'){
            movement[command] = true;
        }else{ /* keyup */
            movement[command] = false;
        }
        socket.emit('movement', movement);
    }
    if(event.key === ' ' && event.type === 'keydown'){
        socket.emit('shoot');
    }
});

//TOUCH SUPPORT
const touches = {};
$('#canvas-2d').on('touchstart', (event)=>{
    socket.emit('shoot');
    movement.forward = true;
    socket.emit('movement', movement);
    Array.from(event.changedTouches).forEach((touch) => {
        touches[touch.identifier] = {pageX: touch.pageX, pageY: touch.pageY};
    });
    event.preventDefault();
});
$('#canvas-2d').on('touchmove', (event)=>{
    movement.right = false;
    movement.left = false;
    Array.from(event.touches).forEach((touch) => {
        const startTouch = touches[touch.identifier];
        movement.right |= touch.pageX - startTouch.pageX > 30;
        movement.left |= touch.pageX - startTouch.pageX < -30;
    });
    socket.emit('movement', movement);
    event.preventDefault();
});
$('#canvas-2d').on('touchend', (event)=>{
    Array.from(event.changedTouches).forEach((touch) => {
        delete touches[touch.identifier];
    });
    if(Object.keys(touches).length === 0){
        movement = {};
        socket.emit('movement', movement);
    }
    event.preventDefault();
});

const Meshes = [];
socket.on('state', (players, bullets, walls) => {
    Object.values(Meshes).forEach((mesh) => {mesh.used = false;});
    
    // Players
    Object.values(players).forEach((player) => {
        let playerMesh = Meshes[player.id];
        try{
            if(!playerMesh){
                console.log('create player mesh');
                playerMesh = new THREE.Group();
                playerMesh.castShadow = true;
                Meshes[player.id] = playerMesh;
                scene.add(playerMesh);
            }
        }catch{
            console.trace();
            console.log("Object: Create Player Mesh");
        }
        playerMesh.used = true;
        playerMesh.position.set(player.x + player.width/2, player.width/2, player.y + player.height/2);
		playerMesh.rotation.y = - player.angle;
        //PLAYER BODY
		try{
            if(!playerMesh.getObjectByName('body')){
                console.log('create body mesh');
                mesh = new THREE.Mesh(new THREE.BoxGeometry(player.width, player.width, player.height), playerMaterial);
                mesh.castShadow = true;
                mesh.name = 'body';
                playerMesh.add(mesh);
            }
        }catch{
            console.trace();
            console.log("Object: Player Body");
        }

        //PLAYER NAME
        if(font){
            if(!playerMesh.getObjectByName('nickname')){
                console.log('create nickname mesh');
                mesh = new THREE.Mesh(
                    new THREE.TextGeometry(player.nickname,
                        {
                            font: font,
                            size: 10,
                            height: 1,
                            curveSegments: 1,
                            bevelEnabled: true,
                            bevelSize: 1,
                            bevelThickness: 2,
                            bevelOffset: 0,
                            bevelSegements: 1,
                            castShadow: true
                        }),
                        nicknameMaterial,
                );
                mesh.name = 'nickname';
                playerMesh.add(mesh);

                mesh.position.set(-10, 70, 16);
                mesh.rotation.y = Math.PI/2;
            }
            {
                //HEALTH MESH
                let mesh = playerMesh.getObjectByName('health');
                try{
                    if(mesh && mesh.health !== player.health){
                        playerMesh.remove(mesh);
                        mesh.geometry.dispose();
                        mesh = null;
                        soundHit.play();
                    }
                }catch{
                    console.trace();
                    console.log("Object: Health Remove and Sound HIT");
                }
                try{
                    if(!mesh){
                        console.log('create health mesh');
                        mesh = new THREE.Mesh(
                            new THREE.TextGeometry('X'.repeat(player.health),
                                {
                                    //TODO: Adjust size
                                    font: font,
                                    size: 10,
                                    height: 1,
                                    curveSegments: 1,
                                    bevelEnabled: true,
                                    bevelSize: 1,
                                    bevelThickness: 2,
                                    bevelOffset: 0,
                                    bevelSegements: 1,
                                    castShadow: true
                                }),
                            textMaterial,
                        );
                        mesh.name = 'health';
                        mesh.health = player.health;
                        playerMesh.add(mesh);
                    }
                }catch{
                    console.trace();
                    console.log("Object: Health Mesh");
                }
                mesh.position.set(0, 50, 50);
                mesh.rotation.y = Math.PI/2;
            }
        }

        //PLAYER CAMERA
        if(player.socketId === socket.id){
            //Player Camera Pos
			camera.position.set(
			    player.x + player.width/2 - 150 * Math.cos(player.angle),
			    200,
                player.y + player.height/2 - 150 * Math.sin(player.angle)
            );
			camera.rotation.set(0, - player.angle - Math.PI/2, 0);
			
			// Canvas SCORE
            context.clearRect(0, 0, canvas2d.width, canvas2d.height);
            context.font = '30px Bold Helvetica';
            context.fillStyle = 'white';
            context.fillText('SCORE: ' + player.point, 40, 60);
        }
    });
    
    // Bullets
    Object.values(bullets).forEach((bullet) => {
        let mesh = Meshes[bullet.id];
        try{
            if(!mesh){
                mesh = new THREE.Mesh(new THREE.SphereGeometry(bullet.width, bullet.width, bullet.height), bulletMaterial);
                mesh.castShadow = true;
                Meshes[bullet.id] = mesh;
                // Meshes.push(mesh);
                scene.add(mesh);
            }
            mesh.used = true;
            mesh.position.set(bullet.x + bullet.width/2, 80, bullet.y + bullet.height/2);
        }catch{
            console.trace();
            console.log("Object: Bullet");
        }
    });
    
    // Walls
    Object.values(walls).forEach((wall) => {
        let mesh = Meshes[wall.id];
        try{
            if(!mesh){
                mesh = new THREE.Mesh(new THREE.BoxGeometry(wall.width, 125, wall.height), wallMaterial);
                mesh.castShadow = true;
                Meshes.push(mesh);
                Meshes[wall.id] = mesh;
                scene.add(mesh);
            }
            mesh.used = true;
            mesh.position.set(wall.x + wall.width/2, 50, wall.y + wall.height/2);
        }catch{
            console.trace();
            console.log("Object: Bullet");
        }
});

    // DISPOSE UNUSED MESHES
    Object.keys(Meshes).forEach((key) => {
        const mesh = Meshes[key];
        if(!mesh.used){
            console.log('removing mesh', key);
            scene.remove(mesh);
            mesh.traverse((mesh2) => {
                if(mesh2.geometry){
                    mesh2.geometry.dispose();
                }
            });
            delete Meshes[key];
        }
    });
});

socket.on('dead', () => {
    soundDeath.play();
    musicBG.stop();
    $("#start-screen").show();
});
