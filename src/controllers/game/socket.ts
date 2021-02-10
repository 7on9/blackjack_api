import { Server, Socket } from 'socket.io'
import { ICard, TPlayerStatus, TPlayerType, TGamePhase } from '../../@types'
import { IObjectProps } from '../../common/@types'
import { GAME, PLAYER, RESPONSE } from '../../constants'
import DeckServices from '../../services/game/deck'
import { generateDeck, shuffleArray } from '../../utils'

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

const clonePlayerWithPrivateCards = (player: IPlayer) => {
  let cards = player.cards.map(() => ({ value: null, kind: null }))
  return {
    ...player,
    cards,
  }
}

const clonePrivateDeck = (deck: ICard[]) => {
  return deck.map(() => ({ value: null, kind: null }))
}

const privateRoom = (room: IRoom) => {
  let deck = clonePrivateDeck(room.deck)
  let players = room.players.map((player) =>
    clonePlayerWithPrivateCards(player)
  )
  let host = clonePlayerWithPrivateCards(room.host)
  return {
    ...room,
    deck,
    players,
    host,
  }
}

export interface IPlayer {
  cards: ICard[]
  username: string
  status: TPlayerStatus | null
  role: TPlayerType
  color: string
  socketId: string
}

export interface IRoom {
  players: IPlayer[]
  host: IPlayer
  deck: ICard[]
  phase: TGamePhase
  message: string
  currentTurn: number
}

const ROOMS: IObjectProps<IRoom> = {}
let numberOfRoom = 0

const GameSocket = (io: Server) => {
  try {
    io.on('connection', (socket) => {
      console.log('[CONNECT] user connected ' + socket.id)

      //creating the game
      socket.on(GAME.CREATE, async (username: string, color?: string) => {
        console.log('[CREATE] ' + username + ' request create game.')
        const idRoom = 1000 + numberOfRoom
        let newRoom: IRoom = {
          deck: generateDeck(),
          host: {
            socketId: socket.id,
            cards: [],
            username,
            status: null,
            role: 'HOST',
            color: color ? color : COLORS[0],
          },
          currentTurn: 0,
          phase: 'WAITING_PLAYER',
          message: 'Đang đợi những người chơi khác...',
          players: [],
        }
        ROOMS[idRoom] = newRoom
        numberOfRoom++
        console.log('[CREATE][SUCCESS] ROOM-' + idRoom + ' host:' + username)
        socket.emit(GAME.CREATE, {
          status: RESPONSE.SUCCESS,
          code: 200,
          data: {
            room: privateRoom(newRoom),
            idRoom,
            thisPlayer: {
              socketId: socket.id,
              cards: [],
              username,
              status: null,
              role: 'HOST',
              color: color ? color : COLORS[0],
            },
          },
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
          if (
            room.players.findIndex((p) => p.username == username) >= 0 ||
            room.host.username == username
          ) {
            socket.emit(PLAYER.JOIN, {
              status: RESPONSE.ERROR,
              code: 400,
              message: 'DUPLICATE_USERNAME',
            })
          } else {
            let newPlayer: IPlayer = {
              username,
              status: 'WAITING',
              cards: [],
              role: 'PLAYER',
              socketId: socket.id,
              color: COLORS[room.players.length - 1],
            }

            ROOMS[idRoom].players.push(newPlayer)
            socket.emit(PLAYER.JOIN, {
              status: RESPONSE.SUCCESS,
              code: 200,
              data: {
                username,
                idRoom,
                room,
                thisPlayer: newPlayer,
              },
            })
            io.to(`ROOM-${idRoom}`).emit(GAME.NEW_PLAYER, {
              status: RESPONSE.SUCCESS,
              code: 200,
              data: {
                room,
              },
            })
            console.log(
              `[JOIN][SUCCESS] - ${idRoom} - players: ${ROOMS[idRoom].players.length}`
            )
            socket.join(`ROOM-${idRoom}`)
          }
        }
      })

      //starting the game
      socket.on(GAME.START, (idRoom: string) => {
        console.log(`Game begin: ${idRoom}`)
        let room = ROOMS[idRoom]
        room.phase = 'PREPARE'
        ROOMS[idRoom] = room
        io.to(`ROOM-${idRoom}`).emit(GAME.START, {
          status: RESPONSE.SUCCESS,
          code: 200,
          data: {
            room: privateRoom(room),
          },
        })
      })

      socket.on(PLAYER.SHUFFLE_DECK, (idRoom: string, username: string) => {
        console.log(`Shuffle deck: ${idRoom}`)
        let room = ROOMS[idRoom]
        room.deck = shuffleArray(room.deck)
        room.message = `${username} xáo bài.`
        ROOMS[idRoom] = room
        io.to(`ROOM-${idRoom}`).emit(PLAYER.SHUFFLE_DECK, {
          status: RESPONSE.SUCCESS,
          code: 200,
          data: {
            room: privateRoom(room),
          },
        })
      })

      socket.on(GAME.PHASE_DIVIDE_DECK, (idRoom: string) => {
        console.log(`Divide deck: ${idRoom}`)
        let room = ROOMS[idRoom]
        if (room.phase === 'PREPARE' || room.phase === 'WAITING_PLAYER') {
          room.phase = 'DIVIDE_CARDS'

          room.message = 'Đang chia bài'

          for (let round = 0; round < 2; round++) {
            for (let iPlayer = 0; iPlayer < room.players.length; iPlayer++) {
              let player = room.players[iPlayer]
              let { deck, card } = DeckServices.getCardFromDeck(
                room.deck,
                'top'
              )
              room.players[iPlayer].cards.push(card as ICard)
              room.deck = deck
              //emit to player that a new card has been draw
              io.to(player.socketId).emit(PLAYER.DRAW_CARD, {
                status: RESPONSE.SUCCESS,
                code: 200,
                data: {
                  thisPlayer: room.players[iPlayer],
                },
              })
            }

            let { deck, card } = DeckServices.getCardFromDeck(room.deck, 'top')
            room.host.cards.push(card as ICard)
            room.deck = deck
            //emit to player that a new card has been draw
            io.to(room.host.socketId).emit(PLAYER.DRAW_CARD, {
              status: RESPONSE.SUCCESS,
              code: 200,
              data: {
                thisPlayer: room.host,
              },
            })
          }

          room.message = 'Chia bài xong!'
          room.players[0].status = 'DRAW'
          ROOMS[idRoom] = room

          io.to(`ROOM-${idRoom}`).emit(GAME.START, {
            status: RESPONSE.SUCCESS,
            code: 200,
            data: {
              room: privateRoom(room),
            },
          })
        }
      })

      socket.on(PLAYER.HOLD, (idRoom: string, username: string) => {
        let room = ROOMS[idRoom]
        let iPlayer = room.players.findIndex((p) => p.username == username)
        let player = null
        if (iPlayer >= 0) {
          player = room.players[iPlayer]
          room.players[room.currentTurn].status = 'STAND'
          room.message = `${username} bốc xong`
          room.currentTurn++
          if (room.currentTurn < room.players.length) {
            room.players[room.currentTurn].status = 'DRAW'
          } else {
            room.host.status = 'DRAW'
            io.to(room.host.socketId).emit(PLAYER.HOLD, {
              status: RESPONSE.SUCCESS,
              code: 200,
              data: {
                thisPlayer: room.host,
              },
            })
          }

          ROOMS[idRoom] = room
          io.to(player.socketId).emit(PLAYER.HOLD, {
            status: RESPONSE.SUCCESS,
            code: 200,
            data: {
              thisPlayer: player,
            },
          })

          io.to(`ROOM-${idRoom}`).emit(GAME.START, {
            status: RESPONSE.SUCCESS,
            code: 200,
            data: {
              room: privateRoom(room),
            },
          })
        }
      })

      socket.on(PLAYER.DRAW_CARD, (idRoom: string, username: string) => {
        let room = ROOMS[idRoom]
        let iPlayer = room.players.findIndex((p) => p.username == username)
        let player = null
        if (iPlayer >= 0) {
          player = room.players[iPlayer]
        }
        if (player) {
          if (player.cards.length == 5) {
            room.players[room.currentTurn].status = 'STAND'
            room.message = `${username} bốc xong`
            room.currentTurn++
            if (room.currentTurn < room.players.length) {
              room.players[room.currentTurn].status = 'DRAW'
            } else {
              room.host.status = 'DRAW'
            }
            io.to(`ROOM-${idRoom}`).emit(GAME.START, {
              status: RESPONSE.SUCCESS,
              code: 200,
              data: {
                room: privateRoom(room),
              },
            })
          }
          let { deck, card } = DeckServices.getCardFromDeck(room.deck, 'bottom')
          player.cards.push(card as ICard)

          room.deck = deck
          room.players[iPlayer] = player
          ROOMS[idRoom] = room

          io.to(`ROOM-${idRoom}`).emit(GAME.START, {
            status: RESPONSE.SUCCESS,
            code: 200,
            data: {
              room: privateRoom(room),
            },
          })

          io.to(player.socketId).emit(PLAYER.DRAW_CARD, {
            code: 200,
            status: RESPONSE.SUCCESS,
            data: {
              thisPlayer: player,
            },
          })

          if (player.cards.length == 5) {
            room.players[room.currentTurn].status = 'STAND'
            room.message = `${username} bốc xong`
            room.currentTurn++
            if (room.currentTurn < room.players.length) {
              room.players[room.currentTurn].status = 'DRAW'
            } else {
              room.host.status = 'DRAW'
              io.to(room.host.socketId).emit(PLAYER.DRAW_CARD, {
                code: 200,
                status: RESPONSE.SUCCESS,
                data: {
                  thisPlayer: room.host,
                },
              })
            }
            io.to(`ROOM-${idRoom}`).emit(GAME.START, {
              status: RESPONSE.SUCCESS,
              code: 200,
              data: {
                room: privateRoom(room),
              },
            })
          }
        } else {
          if (room.host.username == username) {
            let player = room.host
            if (player.cards.length == 5) {
              room.message = `${username} bốc xong`
              room.host.status = 'STAND'
              ROOMS[idRoom] = room
              io.to(`ROOM-${idRoom}`).emit(GAME.START, {
                status: RESPONSE.SUCCESS,
                code: 200,
                data: {
                  room: privateRoom(room),
                },
              })

              io.to(room.host.socketId).emit(PLAYER.DRAW_CARD, {
                code: 200,
                status: RESPONSE.SUCCESS,
                data: {
                  thisPlayer: room.host,
                },
              })
            } else {
              let { deck, card } = DeckServices.getCardFromDeck(
                room.deck,
                'bottom'
              )
              player.cards.push(card as ICard)

              room.deck = deck
              room.host = player
              ROOMS[idRoom] = room

              io.to(`ROOM-${idRoom}`).emit(GAME.START, {
                status: RESPONSE.SUCCESS,
                code: 200,
                data: {
                  room: privateRoom(room),
                },
              })

              io.to(player.socketId).emit(PLAYER.DRAW_CARD, {
                code: 200,
                status: RESPONSE.SUCCESS,
                data: {
                  thisPlayer: player,
                },
              })
            }
          }
        }
      })
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
