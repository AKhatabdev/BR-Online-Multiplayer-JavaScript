/*
  Title:
  BATTLE ROYAL!
  ©2020 Awais Khatab

  Target Browsers: DESKTOP & MOBILE/ Chrome, MS EDGE, Safari
  Module: CI328

  Copyright 2020, Awais Khatab, All rights reserved.
 */

'use strict';

const socket = io();
const canvas = $('#canvas-2d')[0];
const context = canvas.getContext('2d');
const playerImage = $('#player-image')[0];

//SoundFX
let musicBG2D;
musicBG2D = new soundBG2D("/static/soundFX/backgroundGameMusic.mp3");
//SOUND FUNCTION LOOP (FALSE)
function sound2D(src) {
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
function soundBG2D(src) {
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

//GAME START
function gameStart(){
    musicBG2D.play();
    socket.emit('game-start', {nickname: $("#nickname").val() });
    $("#start-screen").hide();
}
$("#start-button").on('click', gameStart);

/**
 * USER INPUT 'Controls'
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
const touches = {};
$('#canvas-2d').on('touchstart', (event)=>{
    socket.emit('shoot');
    movement.forward = true;
    Array.from(event.changedTouches).forEach((touch) => {
        touches[touch.identifier] = {pageX: touch.pageX, pageY: touch.pageY};
    });
    event.preventDefault();
    //DEBUG
    console.log('touches', touches, event.touches);
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


/**
 * 2D PLAYERS | WALLS | BULLETS
 */
socket.on('state', function(players, bullets, walls) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 10;
    context.beginPath();
    context.rect(0, 0, canvas.width, canvas.height);
    context.stroke();
    //PLAYER 2D Name | Health
    Object.values(players).forEach((player) => {
        context.save();
        context.font = '20px Bold Arial';
        context.fillStyle = 'black';
        context.fillText(player.nickname, player.x, player.y + player.height + 25);
        context.font = '10px Bold Arial';
        context.fillStyle = "gray";
        context.fillText('♥'.repeat(player.maxHealth), player.x, player.y + player.height + 10);
        context.fillStyle = "red";
        context.fillText('♥'.repeat(player.health), player.x, player.y + player.height + 10);
        context.translate(player.x + player.width/2, player.y + player.height/2);
        context.rotate(player.angle);
        context.drawImage(playerImage, 0, 0, playerImage.width, playerImage.height, -player.width/2, -player.height/2, player.width, player.height);
        context.restore();

        //2D Points
        if(player.socketId === socket.id){
            context.save();
            context.font = '30px Bold Arial';
            context.fillStyle = 'black';
            context.fillText(player.point + ' point', 20, 40);
            context.restore();
        }
    });
    //2D Bullets
    Object.values(bullets).forEach((bullet) => {
        context.beginPath();
        context.arc(bullet.x, bullet.y, bullet.width/2, 0, 2 * Math.PI);
        context.stroke();
    });
    //2D Walls
    Object.values(walls).forEach((wall) => {
        context.fillStyle = 'indianred';
        context.fillRect(wall.x, wall.y, wall.width, wall.height);
    });
});
//isDead
socket.on('dead', () => {
    musicBG.stop();
    $("#start-screen").show();
});
