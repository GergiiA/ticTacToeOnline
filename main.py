import os
from fastapi import FastAPI
from starlette.responses import HTMLResponse
from starlette.staticfiles import StaticFiles, FileResponse

from api import api

app = FastAPI()
app.mount('/api', api)
app.mount('/static', StaticFiles(directory='static'))
app.mount('/ads.txt', FileResponse('ads.txt'))

templates = {}
for filename in os.listdir('templates'):
    templates[filename]=open('templates/'+filename).read()

@app.get('/', response_class=HTMLResponse)
async def root():
    return templates['main.html']

@app.get('/play', response_class=HTMLResponse)
async def play():
    return templates['play.html']

@app.get('/roomCode', response_class=HTMLResponse)
async def joinRoom():
    return templates['joinRoom.html']

@app.get('/createRoom', response_class=HTMLResponse)
async def createRoom():
    return templates['createRoom.html']#open('templates/createRoom.html').read()