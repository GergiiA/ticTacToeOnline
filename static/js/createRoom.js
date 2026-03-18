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

async function createRoom(){
    if(getCookie("id")==null){
        getId();
    }
    var roomPassword = document.getElementById("password").value;

    var params = new URLSearchParams({roomPassword: roomPassword, creatorId: getCookie('id')});

    var r = await fetch("/api/create_room?"+params.toString());

    if(r.ok){
        var j = await r.json()
        var roomId = j['roomId'];
        setCookie('roomId', roomId);

        var xSecret = await sha256(roomId.toString()+roomPassword+getCookie('id'));
        setCookie('xSecret', xSecret);
        setCookie('start', 'true');


        document.location.href = '/play';
    }
}