/*
  Title:
  BATTLE ROYAL!
  ©2020 Awais Khatab

  Target Browsers: DESKTOP & MOBILE/ Chrome, MS EDGE, Safari
  Module: CI328

  Copyright 2020, Awais Khatab, All rights reserved.
 */

'use strict';
const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const app = express();
const server = http.Server(app);
const io = socketIO(server);
const yargs = require('yargs').argv;
//FIELD BOUNDS
const FIELD_WIDTH = 1000, FIELD_HEIGHT = 1000; //1000 , 1000 PLAYER BOUNDS TODO

/**
 * GAME OBJECTS
 */
class GameObject{
    constructor(obj={}){
        this.id = Math.floor(Math.random()*1000000000);
        this.x = obj.x;
        this.y = obj.y;
        this.width = obj.width;
        this.height = obj.height;
        this.angle = obj.angle;
    }
    //COLLISION DETECTION
    move(distance){
        const oldX = this.x, oldY = this.y;
        
        this.x += distance * Math.cos(this.angle);
        this.y += distance * Math.sin(this.angle);
        //COLLISION DETECT
        let collision = false;
        try{
            //BOUNDS
            if(this.x < 0 || this.x + this.width >= FIELD_WIDTH || this.y < 0 || this.y + this.height >= FIELD_HEIGHT){
                collision = true;
            }
            if(this.intersectWalls()){
                collision = true;
            }
            if(collision){
                this.x = oldX; this.y = oldY;
            }
            return !collision;
        }catch{
            console.trace();
            console.log("Ref: Collision");
        }
    }
    intersect(obj){
        return (this.x <= obj.x + obj.width) &&
            (this.x + this.width >= obj.x) &&
            (this.y <= obj.y + obj.height) &&
            (this.y + this.height >= obj.y);
    }
    intersectWalls(){
        return Object.values(walls).some((wall) => this.intersect(wall));
    }
    toJSON(){
        return {id: this.id, x: this.x, y: this.y, width: this.width, height: this.height, angle: this.angle};
    }
}

/**
 *  PLAYER CLASS EXT @GAMEOBJECT
 */
class Player extends GameObject{
    constructor(obj={}){
        super(obj);
        this.socketId = obj.socketId;
        this.nickname = obj.nickname;
        this.width = 80;
        this.height = 80;
        this.health = this.maxHealth = 10;
        this.bullets = {};
        this.point = 0;
        this.movement = {};
        console.log("Player Joined: " + this.nickname);
        do{
            this.x = Math.random() * (FIELD_WIDTH - this.width);
            this.y = Math.random() * (FIELD_HEIGHT - this.height);
            this.angle = Math.random() * 2 * Math.PI;
        }while(this.intersectWalls());
    }

    //PLAYER SHOOTING
    shoot(){
        try{
            if(Object.keys(this.bullets).length >= 3){
                return;
            }
            const bullet = new Bullet({
                x: this.x + this.width/2,
                y: this.y + this.height/2,
                angle: this.angle,
                player: this,
            });
            bullet.move(this.width/2);
            this.bullets[bullet.id] = bullet;
            bullets[bullet.id] = bullet;
        }catch{
            console.trace();
            console.log("Object: Bullet");
        }
    }
    //DAMAGE LOGIC
    damage(){
        try{
            this.health --;
            if(this.health === 0){
                this.remove();
            }
        }catch{
            console.trace();
            console.log("Object: Damage");
        }
    }
    //REMOVE PLAYER TODO: Add Remove Player
    remove(){
        delete players[this.id];
        io.to(this.socketId).emit('dead');
        console.log("Player Died: " + this.nickname);
    }
    //TODO: Check assignments @JSON
    toJSON(){
        return Object.assign(super.toJSON(), {health: this.health, maxHealth: this.maxHealth, socketId: this.socketId, point: this.point, nickname: this.nickname});
    }
}

/**
 * BULLET CLASS
 */
class Bullet extends GameObject{
    constructor(obj){
        super(obj);
        this.width = 20; //BULLET SIZE
        this.height = 20;
        this.player = obj.player;
    }
    remove(){
        try{
            delete this.player.bullets[this.id];
            delete bullets[this.id];
        }catch {
            console.trace();
            console.log("Object: Bullet Remove");
        }
    }
}

/**
 * AI BOT CLASS
 * TODO: Add follow Nearest Players Function for more AI like BOT - Research
 */
class BotPlayer extends Player{
    constructor(obj){
        super(obj);
        this.timer = setInterval(() => {
            try {
                if(! this.move(4)){
                    this.angle = Math.random() * Math.PI * 2;
                }
            }catch{
                console.trace();
                console.log("Object: BotPlayer");            }
            try {
                if(Math.random()<0.03){
                    this.shoot();
                }
            }catch{
                console.trace();
                console.log("Error Object: BotPlayer");            }
        }, 1000/60);
    }
    remove(){
        super.remove();
        clearInterval(this.timer);
        setTimeout(() => {
            const bot = new BotPlayer({nickname: this.nickname});
            players[bot.id] = bot;
        }, 3000);
    }
}


/**
 * WALL CLASS
 */
class Wall extends GameObject{
}

let players = {};
let bullets = {};
let walls = {};

//WALL POS/SIZE
for(let i = 0; i < 6; i++){
    const wall = new Wall({
            x: Math.random() * FIELD_WIDTH,
            y: Math.random() * FIELD_HEIGHT,
            width: Math.round(Math.random() *(400 - 100)),
            height: 50,
    });
    walls[wall.id] = wall;
}

//SPAWN BOT
const bot = new BotPlayer({nickname: 'bot'});
players[bot.id] = bot;

//SOCKET IO
io.on('connection', function(socket) {
    let player = null;
    socket.on('game-start', (config) => {
        player = new Player({
            socketId: socket.id,
            nickname: config.nickname,
        });
        players[player.id] = player;
    });
    //Player MoV if NOT Dead
    socket.on('movement', function(movement) {
        if(!player || player.health===0){return;}
        player.movement = movement;
    });
    //PLAYER SHOOT if NOT Dead
    socket.on('shoot', function(){
        if(!player || player.health===0){return;}
        player.shoot();
    });
    //ON DISCONNECT REMOVE PLAYER
    socket.on('disconnect', () => {
        if(!player){return;}
        delete players[player.id];
        player = null;
    });
});

//INTERVAL
setInterval(() => {
    Object.values(players).forEach((player) => {
        const movement = player.movement;
        if(movement.forward){
            player.move(10);
        }
        if(movement.back){
            player.move(-10);
        }
        if(movement.left){
            player.angle -= 0.1;
        }
        if(movement.right){
            player.angle += 0.1;
        }
    });
    //BULLET LOGIC RENDER IN DISTANCE
    Object.values(bullets).forEach((bullet) =>{
        try{
            if(! bullet.move(15)){
                bullet.remove();
                return;
            }
        }catch{
            console.trace();
            console.log("Object: Bullet");
        }
        //BULLET PLAYER HIT
        Object.values(players).forEach((player) => {
           if(bullet.intersect(player)){
               try{
                   if(player !== bullet.player){
                       player.damage();
                       bullet.remove();
                       bullet.player.point += 10;
                       console.log("HIT: " + player.nickname);
                   }
               }catch{
                   console.trace();
                   console.log("Object: Bullet");
               }
           }
        });
    });
    //SOCKET > CLIENTS
    io.sockets.emit('state', players, bullets, walls);
}, 1000/60); //60FPS

app.use('/static', express.static(__dirname + '/static'));
//Todo: Error Fixed*
app.get('/', (request, response) => {
    try{
        response.sendFile(path.join(__dirname, '/static/loadingScreen.html'));
    }catch{
        console.trace();
        console.log("Request, Response .html");
    }
});

//PORT = 3000
const port = parseInt(yargs.port) || 3000;
server.listen(port, () => {
  console.log(`Server: Activated - Port: ${port}`);
});
