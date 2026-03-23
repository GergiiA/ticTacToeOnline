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
    //console.log(r.status, r.statusText);
    var data = await r.json()
    setCookie("id", data['personalId']);
    return data['personalId'];
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
        await getId();
    }
    var roomCode = Number(document.getElementById("roomCode").value);
    var roomPassword = document.getElementById("roomPass").value;

    if(roomCode===''){
        return;
    }
    if(roomPassword===''){
        return;
    }

    setCookie('roomId', roomCode)
    var myKey = await sha256(roomCode.toString()+roomPassword.toString()+getCookie('id'));
    console.log(roomCode, roomPassword, getCookie('id'), myKey);
    setCookie('key', myKey);
    setCookie('start', 'false');
    document.location.href = '/play';

}
