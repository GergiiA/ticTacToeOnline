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

function joinRoom(){
    if(getCookie("id")!=null){
        getId();
    }
    document.location.href = "/roomCode/";
}

function createRoom(){
    if(getCookie("id")==null){
        getId();
    }
    document.location.href = "/createRoom/";
}

