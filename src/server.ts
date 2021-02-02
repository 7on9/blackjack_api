import dotenv from 'dotenv'
dotenv.config()
import app from './app'
// import cors from 'cors'
// import socket from './socket'

// app.use(cors({}))

import http from 'http'
import { ICard } from './@types'
import { caculatePoint } from './services/game'
const server = http.createServer(app)

// const io = require('socket.io').listen(server)

// socket(io)
// io.origins()

const PORT = process.env.PORT || 2409

server.listen(PORT, () => {
  const deck: ICard[] = [
    {
      value: 3,
      kind: 'clubs',
    },
    {
      value: 'A',
      kind: 'clubs',
    },
    {
      value: 'A',
      kind: 'clubs',
    },
  ]
  console.log('deck value host', caculatePoint(deck, 'HOST'))
  console.log('deck value player', caculatePoint(deck, 'PLAYER'))
  console.log(`Server listening on port ${PORT}`)
})
