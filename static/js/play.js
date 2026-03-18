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
async function handleSquareClick(number){
    //console.log(number);
    if(!gameReady){
        console.log("Game not Ready!");
        return}

    if(playingX === xToMove){
        var params = new URLSearchParams({"roomId": roomId, "confirmation" : key, "move" : number});

        var r = await fetch("/api/playMove?"+params.toString(), {method:"POST"});
        console.log('text:', await r.text());
        if(r.ok){
            console.log('played');
            updateState()
        }
    }
    else{
        console.log(playingX, xToMove);
    }

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
async function getBoardState(roomId){
    var r = await fetch('/api/getBoardState?roomId=' + roomId);
    if(r.ok){
        return await r.json();
    }
}
async function updateState(){
    var state = await getBoardState(roomId);
    boardState = state['board'];
    xToMove = state['xToMove'];
    winner = state['winner'];
    gameOver = state['gameDone'];
    ready = state['ready'];
    await drawBoard(boardState);
    await setTurnTitle(xToMove);
    if(ready){
        hidePreStartScreen()
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

var roomId = getCookie("roomId");
var selfId = getCookie("id");
var playingX;
var key;
if (getCookie('start') === 'true'){
    playingX = true;
    key = getCookie('xSecret');
}
else{
    playingX = false;
    key = getCookie('oSecret');
}
var xToMove=true
var boardState = ['', '', '', '', '', '', '', '', '', ]
var winner = false
var gameOver = false;
var gameReady = false;
document.getElementById('roomId').innerHTML = "room id: "+roomId;
showPreStartScreen();

async function gameLoop(){
    await updateState()
    console.log('ff')
    if(!gameOver){
        await setTimeout(gameLoop, 1000)
    }
    else{
        await showOverScreen(winner);
    }
}
gameLoop();
