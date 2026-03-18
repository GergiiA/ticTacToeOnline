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

async function submitCode(){
    if(getCookie("id")==null){
        getId();
    }
    var roomCode = Number(document.getElementById("roomCode").value);
    var roomPassword = document.getElementById("roomPass").value;

    if(roomCode===''){
        return;
    }
    if(roomPassword===''){
        return;
    }
    console.log(roomPassword);

    var params = new URLSearchParams({roomId: roomCode, password: roomPassword, playerOid: getCookie('id')});
    var r = await fetch('api/joinRoom?'+params.toString())

    if(r.ok){
        setCookie('roomId', roomCode)
        var myKey = await sha256(roomCode.toString()+roomPassword+getCookie('id'));
        setCookie('oSecret', myKey);
        setCookie('start', 'false');
        document.location.href = '/play';
    }
}
