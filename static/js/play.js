function setCookie(name, value){
    document.cookie = name + "=" + value + ";path=/";
}
function getCookie(name){
    let all = document.cookie.split(';');
    for (let pair = 0; pair < all.length; pair++) {
        cname = all[pair].split('=')[0];
        if (cname.toString().replaceAll(' ', '') === name.toString()) {
            return all[pair].split('=')[1];
        }
    }
    return null;
}
async function getId(){
    var r = await fetch("/api/getId")
        .then(res => res.json())
    setCookie("id", r['personalId']);
}
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

function setTimer(){
    var lastMoveTS = Number(getCookie("lastMoveTS"));
    var now = Date.now()/1000;
    var diff = Math.round(lastMoveTS +30 - now);
    document.getElementById("timer").innerHTML = diff;
    //console.log(diff, now, lastMoveTS);

    setTimeout(setTimer, 1000);

}

function drawBoard(boardState){
    var board = document.getElementById("Board");
    board.innerHTML = '';

    for(let i = 0; i < 3; i++){
        var row = '<div class="Row">'
        for(let j = 0; j < 3; j++){
            row += createSquare(boardState[i*3 + j], i*3 + j)
        }
        row += '</div>'
        board.innerHTML += row
    }
}
function createSquare(value, number){
    return  `<div class="Square" id="${number}" onclick="handleSquareClick(${number})"><h1>${value}</h1></div>`

}
function handleSquareClick(number) {
    sendSquare(number, webSocket);
}
function sendSquare(number, webSocket) {
    webSocket.send(JSON.stringify({
        "type": "move",
        "key": key,
        "move": number
    }))
}
function setTurnTitle(xToPlay){
    var title = document.getElementById("turn");
    if(xToPlay){
        title.innerHTML = 'X to play';
    }
    else{
        title.innerHTML = 'O to play';
    }
}
function showOverScreen(winner){
    document.getElementById('overlay').style.display = 'flex';
    document.getElementById('gameOver').style.display = 'flex';
    var endText;
    if(winner==='X'){
        endText = 'X won!';
    }
    else if(winner==='O'){
        endText = 'O won!';
    }
    else{
        endText = "It's a draw!";
    }
    document.getElementById('resultText').innerHTML = endText;
}
function showPreStartScreen(){
    document.getElementById('overlay').style.display = 'flex';
    document.getElementById('preStart').style.display = 'flex';
}
function hidePreStartScreen(){
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('preStart').style.display = 'none';
    gameReady = true;
}
function updateGame(data){
    var board = data["board"];
    var xToMove = data["xToMove"];
    var winner = data["winner"];
    var gameOver = data["gameDone"];
    var roomReady = data["ready"];
    var lastMoveTS = data["lastMoveTimeStamp"];

    setCookie("lastMoveTS", lastMoveTS);

    drawBoard(board);
    setTurnTitle(xToMove);

    if(roomReady){
        hidePreStartScreen()
        timerInterval  = setInterval(setTimer, 1000);
    }
    else{
        showPreStartScreen();
    }
    if(gameOver){
        showOverScreen(winner);
        clearInterval(timerInterval);
    }
}

var roomId = Number(getCookie("roomId"));
var key = getCookie("key");
var id = getCookie("id");
var playingX = getCookie("start");

var webSocket = new WebSocket('ws://' + window.location.hostname + ':' + window.location.port + '/api/roomWS');
webSocket.onopen = function(){
    initialData = {
        "roomId": roomId,
        "key": key,
        "playerId": id,
        "playingX": playingX,
    }
    console.log(initialData);
    webSocket.send(JSON.stringify(initialData))
}
webSocket.onmessage = function(e){
    var data = JSON.parse(e.data);
    console.log(data, data["type"]);

    if (data["type"]==="error"){
        console.log(data["msg"])
    }
    else if (data["type"]==="update"){
        var gameData = data["data"];
        //console.log(gameData);
        updateGame(gameData);
    }
}
var timerInterval;
document.getElementById("roomId").innerHTML = roomId;
setCookie("lastMoveTS", Date.now());