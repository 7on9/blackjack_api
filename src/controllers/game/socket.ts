import { Socket } from 'socket.io'
import { ICard, TPlayerStatus, TPlayerType } from '../../@types'
import { IObjectProps } from '../../common/@types'
import { GAME, PLAYER, RESPONSE } from '../../constants'
import { generateDeck } from '../../utils'

const MAX_PLAYER = 10
const COLORS = [
  '#FF0000',
  '#FFFF00',
  '#FF3399',
  '#000066',
  '#660099',
  '#99FF9F',
  '#66FFFF',
  '#FF6633',
  '#660000',
  '#000000',
]

export interface IPlayer {
  cards: ICard[]
  username: string
  status: TPlayerStatus | null
  role: TPlayerType
  color: string
}

export interface IRoom {
  players: IPlayer[]
  host: IPlayer
  deck: ICard[]
}

const ROOMS: IObjectProps<IRoom> = {}
let numberOfRoom = 0

const GameSocket = (io: Socket) => {
  try {
    io.on('connection', (socket) => {
      console.log('[CONNECT] user connected ' + socket.id)

      //creating the game
      socket.on(GAME.CREATE, async (username: string, color?: string) => {
        const idRoom = 1000 + numberOfRoom
        ROOMS[idRoom] = {
          deck: generateDeck(),
          host: {
            cards: [],
            username,
            status: null,
            role: 'HOST',
            color: color ? color : COLORS[0],
          },
          players: [],
        }
        socket.emit(GAME.CREATE, {
          status: RESPONSE.SUCCESS,
          code: 200,
          data: idRoom,
        })
        socket.join(`ROOM-${idRoom}`)
      })

      //player join game
      socket.on(PLAYER.JOIN, (idRoom: number, username: string) => {
        let room = ROOMS[idRoom]
        if (!room) {
          console.log(`[JOIN][FAIL] - Room ${idRoom} - not found`)
          socket.emit(PLAYER.JOIN, false, {
            status: RESPONSE.ERROR,
            code: 404,
            message: 'NOT_FOUND',
          })
        } else {
          if (room.players.length === MAX_PLAYER) {
            socket.emit(PLAYER.JOIN, {
              status: RESPONSE.ERROR,
              code: 400,
              message: 'FULL_ROOM',
            })
            return
          }
          if (username in room.players) {
            socket.emit(PLAYER.JOIN, {
              status: RESPONSE.ERROR,
              code: 400,
              message: 'DUPLICATE_USERNAME',
            })
          } else {
            ROOMS[idRoom].players.push({
              username,
              status: 'WAITING',
              cards: [],
              role: 'PLAYER',
              color: COLORS[room.players.length - 1],
            })
            socket.emit(PLAYER.JOIN, {
              status: RESPONSE.SUCCESS,
              code: 200,
              data: {
                username,
                status: 'WAITING',
                cards: [],
                role: 'PLAYER',
                color: COLORS[room.players.length - 1],
              },
            })
            io.to(`ROOM-${idRoom}`).emit(GAME.NEW_PLAYER, ROOMS[idRoom].players)
            console.log(
              `[JOIN][SUCCESS] - ${idRoom} - players: ${ROOMS[idRoom].players.length}`
            )
            socket.join(`ROOM-${idRoom}`)
          }
        }
      })

      // //starting the game
      // socket.on(GAME.BEGIN, idGame => {
      //   //emit to room game except sender
      //   console.log(`Game begin: ${idGame}`)
      //   io.to(idGame).emit(GAME.BEGIN)
      // })

      // //new question
      // socket.on(GAME.NEXT_QUESTION, (idGame, idQuestion) => {
      //   // socket.emit(gamesQuestions.get(idQuest)[idQuestion]);
      //   io.to(idGame).emit(GAME.NEW_QUESTION, idQuestion)
      //   //client create time begin new quest
      // })

      // //question timeout
      // socket.on(GAME.TIMEOUT, idGame => {
      //   //emit to room game except sender
      //   io.to(idGame).emit(GAME.TIMEOUT)
      //   // idQuestion
      // })

      // //answer
      // socket.on(GAME.ANSWER, async (idGame, idQuestion, answer) => {
      //   let scoreBoard
      //   let quest = await Quest.getQuestFromIdGame(idGame)
      //   let question = quest.questions[idQuestion]
      //   if (answer.time === GAME.TIMEOUT) {
      //     answer.time = question.duration
      //   }
      //   Quest.answer(idGame, answer.username, answer.idAnswer, answer.time, (err, idQuest) => {
      //     if (err) {
      //       console.log(err)
      //       socket.emit(GAME.ANSWER, false, gamesScoreBoards.get(idGame.toString()))
      //     } else {
      //       // let question = gamesQuestions.get(idQuest.toString())[idQuestion];
      //       let score =
      //         question.correct_id == answer.idAnswer
      //           ? question.correct_point
      //           : question.incorrect_point
      //       scoreBoard = gamesScoreBoards.get(idGame.toString())
      //       let i = scoreBoard.findIndex(player => {
      //         return player.username.toLowerCase() == answer.username.toLowerCase()
      //       })

      //       scoreBoard[i]['score'] += score
      //       scoreBoard[i]['time'] += answer.time

      //       gamesScoreBoards.set(idGame.toString(), scoreBoard)
      //       socket.emit(GAME.CORRECT_ANSWER, question.correct_id == answer.idAnswer)
      //       socket.to(idGame).emit(GAME.ANSWER, scoreBoard)
      //     }
      //   })
      //   //emit to room game except sender
      //   // io.in(idGame).emit(GAME.SCOREBOARD, scoreBoard);
      // })

      // //end game
      // socket.on(GAME.END, idGame => {
      //   //handler result
      //   let scoreBoard = gamesScoreBoards.get(idGame.toString())
      //   socket.to(idGame).emit(GAME.END, scoreBoard)
      //   Utility.endGame(idGame)
      //   console.log(`End game: ${idGame}`)
      //   let rooms = io.sockets.adapter.sids[idGame]
      //   for (let room in rooms) {
      //     socket.leave(room)
      //   }
      //   // io.sockets.clients(idGame).map(player => {
      //   //   player.leave(idGame)
      //   // })
      // })

      socket.on('disconnect', () => {
        console.log('client ' + socket.id + ' disconnected')
      })
    })
  } catch (error) {
    console.log(error)
  }
}

export default GameSocket
