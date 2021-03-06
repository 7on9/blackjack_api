import dotenv from 'dotenv'
dotenv.config()
import app from './app'
import cors from 'cors'
import GameSocket from './controllers/game/socket'

app.use(cors({}))

import http from 'http'
import { ICard } from './@types'
import { caculatePoint } from './services/game'
import { duel } from './services/player'
const server = http.createServer(app)

import { Server } from 'socket.io'
// const io = require('socket.io').listen(server)

const socketIO = new Server(server, { cors: { origin: '*' }})

GameSocket(socketIO)

const PORT = process.env.PORT || 2409

server.listen(PORT, () => {
  const deck: ICard[] = [
    {
      value: 'A',
      kind: 'club',
    },
    {
      value: 2,
      kind: 'club',
    },
    {
      value: 3,
      kind: 'club',
    },
    {
      value: 4,
      kind: 'club',
    },
    {
      value: 4,
      kind: 'club',
    },
  ]

  const deck2: ICard[] = [
    {
      value: 'A',
      kind: 'club',
    },
    {
      value: 9,
      kind: 'club',
    },
  ]

  console.log('deck value host', caculatePoint(deck, 'HOST'))
  console.log('deck value player', caculatePoint(deck2, 'PLAYER'))
  console.log('Player win', duel(deck, deck2))
  console.log(`Server listening on port ${PORT}`)
})
