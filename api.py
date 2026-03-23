import asyncio
import json
from fastapi import FastAPI, Query, HTTPException, WebSocket, WebSocketDisconnect
from typing import Annotated
import hashlib
import datetime
from fastapi_utils.tasks import repeat_every

api = FastAPI()



serverSecret = 'verySecretKey'
playerCount = 0


class Room:
    def __init__(self, id, roomPassword, playerXid):
        self.id = id
        self.timeCreated = datetime.datetime.now().timestamp()
        self.roomPassword = roomPassword

        self.playerXid=playerXid
        self.playerXKey = self.makePlayerKey(playerXid)
        self.playerOid = None
        self.playerOKey = None

        self.board = ['', '', '', '', '', '', '', '', '']
        self.xToMove = True

        self.winner = None
        self.gameDone = False
        self.ready = False

        self.XCon = None
        self.OCon = None

        self.moves = 0
        self.lastMoveTimeStamp = datetime.datetime.now().timestamp()

    def makePlayerKey(self, playerId):
        print(''.join([str(self.id), self.roomPassword, playerId]))
        return hashlib.sha256(''.join([str(self.id), self.roomPassword, playerId]).encode('utf-8')).hexdigest()
    def canPlayMove(self, sqNum):
        if not (0 <= sqNum <=8):
            return False
        if self.board[sqNum] !=  '':
            return False
        return True
    def play(self, sqNum):
        if not (0 <= sqNum <=8):
            return False
        if self.xToMove:
            self.board[sqNum] = 'X'
            self.xToMove = False
        else:
            self.board[sqNum] = 'O'
            self.xToMove = True
        self.moves += 1
        return True
    def checkWin(self):
        lines = [(0, 1, 2),
                 (3, 4, 5),
                 (6, 7, 8),
                 (0, 3, 6),
                 (1, 4, 7),
                 (2, 5, 8),
                 (0, 4, 8),
                 (2, 4, 6),]


        for a, b, c in lines:
            if self.board[a] == self.board[b] == self.board[c] == 'X':
                return 'X'

            elif self.board[a] == self.board[b] == self.board[c] == 'O':
                return 'O'

        possibleDraw = True
        for sq in self.board:
            if sq == '':
                possibleDraw = False

        if possibleDraw:
            return 'D'
        else:
            return None
    def processBoard(self):
        gameState = self.checkWin()
        #print(gameState)
        if gameState=='X':
            self.winner = 'X'
            self.gameDone = True
        elif gameState=='O':
            self.winner = 'O'
            self.gameDone = True
        elif gameState=='D':
            self.winner = None
            self.gameDone = True
        elif gameState==None:
            self.winner = None
            self.gameDone = False
    async def updateForBoth(self):

        if self.XCon:
            await self.XCon.send_json({
                "type": "update",
                "data": {
                    "board": self.board,
                    "xToMove": self.xToMove,
                    "winner": self.winner,
                    "gameDone": self.gameDone,
                    "ready": self.ready,
                    "lastMoveTimeStamp": self.lastMoveTimeStamp,
                }
            })
        if self.OCon:
            await self.OCon.send_json({
                "type": "update",
                "data": {
                    "board": self.board,
                    "xToMove": self.xToMove,
                    "winner": self.winner,
                    "gameDone": self.gameDone,
                    "ready": self.ready,
                    "lastMoveTimeStamp": self.lastMoveTimeStamp,
                }
            })
    async def setTimer(self):
        startMove = self.moves
        await asyncio.sleep(30)
        if startMove==self.moves:
            self.gameDone = True
            self.winner = "O" if self.xToMove else "X"
            await self.updateForBoth()
    def checkJoin(self, key: str, playerId: str, playingX: bool, con):
        if playingX:
            if playerId==self.playerXid and key==self.playerXKey and self.XCon is None:
                self.XCon = con
                return True
        else:
            if self.playerOid == None:
                predictedKey = self.makePlayerKey(playerId)
                if predictedKey==key:
                    self.playerOid = playerId
                    self.playerOKey = predictedKey
                    self.OCon = con
                    return True
        return False



rooms = []

@api.on_event("startup")
@repeat_every(seconds=60)
def cleaupRooms():
    toDelete = []
    global rooms
    for index, room in enumerate(rooms):
        if room.gameDone:
            toDelete.append(index)
    toDelete.reverse()
    for index in toDelete:
        del rooms[index]


@api.get("/")
async def root():
    return {"message": "Hello World"}

@api.get("/create_room")
async def create_room(roomPassword: Annotated[str, Query(maxLength=20)], creatorId: Annotated[str, Query(min=1)]):
    for room in rooms:
        if room.playerXid == creatorId and room.gameDone == False:
            raise HTTPException(status_code=400, detail="You can have only 1 room at a time")
    room = Room(id=len(rooms), roomPassword=roomPassword, playerXid=creatorId)
    rooms.append(room)

    return {'roomId': room.id}

@api.get("/getId")
async def get_room():
    global playerCount
    playerCount+=1
    return {'personalId': hashlib.sha256(str(playerCount).encode()).hexdigest()}

@api.post('/playMove')
async def play_move(roomId: int, confirmation: str, move: int):
    room = rooms[roomId]
    if roomId > len(rooms)-1:
        raise HTTPException(status_code=400, detail="Room ID out of range")

    if room.xToMove:
        if room.playerXKey != confirmation:
            raise HTTPException(status_code=401, detail="Invalid confirmation")
    else:
        if room.playerOKey != confirmation:
            #print(room.playerOKey, confirmation, room.playerXKey)
            raise HTTPException(status_code=401, detail="Invalid confirmation")

    if not room.ready:
        raise HTTPException(status_code=401, detail="Room is not ready")

    if room.canPlayMove(move):
        room.play(move)
    else:
        raise HTTPException(status_code=403, detail="Invalid move")

    room.processBoard()

    return {'played': True}

@api.get('/getBoardState')
async def get_board_state(roomId: int):
    if roomId > len(rooms)-1:
        raise HTTPException(status_code=400, detail="Room ID out of range")
    room = rooms[roomId]
    return {
        'board': room.board,
        'xToMove': room.xToMove,
        'winner': room.winner,
        'gameDone': room.gameDone,
        'ready': room.ready,
    }

@api.get('/joinRoom')
async def join_room(roomId: int, password: str, playerOid: str,):
    global rooms
    if roomId > len(rooms)-1:
        raise HTTPException(status_code=400, detail="Room ID out of range")

    room = rooms[roomId]

    if room.playerOid != None:
        raise HTTPException(status_code=401, detail="Already taken")

    if room.roomPassword != password:
        raise HTTPException(status_code=401, detail="Invalid password")

    room.playerOid = playerOid
    room.playerOKey = room.makePlayerKey(playerOid)

    room.ready = True

    return {}

@api.websocket('/roomWS')
async def ws_room(websocket: WebSocket):
    await websocket.accept()

    data = await websocket.receive_json()

    roomId, key, playerId, playingX = data['roomId'], data['key'], data['playerId'], data['playingX']
    playingX = True if data['playingX']=="true" else False
    if roomId > len(rooms)-1:
        await websocket.close(1002, "Room ID out of range")
        return

    room = rooms[roomId]


    print('1', key, playerId, playingX)
    join = room.checkJoin(key, playerId, playingX, websocket)
    print('2', join, playingX, room.makePlayerKey(playerId), room.id, room.roomPassword, playerId)

    if not join:
        await websocket.close(1002, "Invalid key")
        return

    if room.XCon and room.OCon:
        room.ready = True

    await room.updateForBoth()
    while not room.ready:
        await asyncio.sleep(1)
    print('init done')



    if playingX:
        c=room.XCon
    else:
        c=room.OCon
    await c.send_json({'type': 'error', 'message': 'init'})
    #await c.send_json({'type': 'error', 'msg': 'init'})

    await room.updateForBoth()

    asyncio.create_task(room.setTimer())
    room.lastMoveTimeStamp = datetime.datetime.now().timestamp()

    await room.updateForBoth()

    try:
        while True:
            data = await websocket.receive_json()
            if data["type"]=="move" and room.ready and playingX==room.xToMove:
                key = data['key']
                if playingX:
                    if key != room.playerXKey:
                        await websocket.send_json({
                            "type": "error",
                            "msg": "Invalid key",
                        })
                        continue
                else:
                    if key != room.playerOKey:
                        await websocket.send_json({
                            "type": "error",
                            "msg": "Invalid key",
                        })
                        continue

                move = data['move']

                if room.canPlayMove(move):
                    room.play(move)
                    room.processBoard()
                    asyncio.create_task(room.setTimer())
                    room.lastMoveTimeStamp = datetime.datetime.now().timestamp()
                    await room.updateForBoth()




    except WebSocketDisconnect:
        await websocket.close()
