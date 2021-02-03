
const GAME = require('./common/constant/event').GAME
const STATUS = require('./common/constant/event').STATUS
const ERROR = require('./common/constant/event').ERROR
let user = require('./controllers/user')
let Quest = require('./controllers/quest')
let Utility = require('./common/utility')

let gamesScoreBoards = new Map()
let gamesQuestions = new Map()

const GameSocket = io => {
  try {
    io.on('connection', socket => {
      console.log('user connected ' + socket.id)

      //creating the game
      socket.on(GAME.START, async (gameCode, idQuest) => {
        let idGame = Utility.getIdGame(gameCode)
        let questions = await Quest.getAllQuestionsOfQuest(idQuest)
        questions = questions.questions
        gamesQuestions.set(idQuest.toString(), questions)
        gamesScoreBoards.set(idGame.toString(), [])
        socket.emit(GAME.START, STATUS.SUCCESS, questions)
        socket.join(idGame)
      })

      //player join game
      socket.on(GAME.JOIN, (gameCode, username, token) => {
        let idGame = Utility.getIdGame(gameCode)
        if (idGame == null) {
          console.log(`Join - ${idGame} - not found`)
          socket.emit(GAME.JOIN, false, ERROR.WRONG_CODE)
        } else {
          let scoreBoard = gamesScoreBoards.get(idGame.toString())
          if (username in scoreBoard) {
            socket.emit(GAME.JOIN, false, ERROR.DUPLICATE)
          } else {
            Quest.joinQuest(idGame, username, token, (err, res) => {
              if (err) {
                console.log(err)
                socket.emit(GAME.JOIN, false, err)
              } else {
                scoreBoard.push({
                  username,
                  score: 0,
                  time: 0,
                })
                socket.emit(GAME.JOIN, true, username, idGame)
                gamesScoreBoards.set(idGame.toString(), scoreBoard)
                io.to(idGame).emit(GAME.NEW_PLAYER, {
                  player: { username, score: 0, time: 0 },
                })
                console.log(`Game join - ${gameCode} - player: ${scoreBoard.length}`)
                socket.join(idGame)
              }
            })
          }
        }
      })

      //starting the game
      socket.on(GAME.BEGIN, idGame => {
        //emit to room game except sender
        console.log(`Game begin: ${idGame}`)
        io.to(idGame).emit(GAME.BEGIN)
      })

      //new question
      socket.on(GAME.NEXT_QUESTION, (idGame, idQuestion) => {
        // socket.emit(gamesQuestions.get(idQuest)[idQuestion]);
        io.to(idGame).emit(GAME.NEW_QUESTION, idQuestion)
        //client create time begin new quest
      })

      //question timeout
      socket.on(GAME.TIMEOUT, idGame => {
        //emit to room game except sender
        io.to(idGame).emit(GAME.TIMEOUT)
        // idQuestion
      })

      //answer
      socket.on(GAME.ANSWER, async (idGame, idQuestion, answer) => {
        let scoreBoard
        let quest = await Quest.getQuestFromIdGame(idGame)
        let question = quest.questions[idQuestion]
        if (answer.time === GAME.TIMEOUT) {
          answer.time = question.duration
        }
        Quest.answer(idGame, answer.username, answer.idAnswer, answer.time, (err, idQuest) => {
          if (err) {
            console.log(err)
            socket.emit(GAME.ANSWER, false, gamesScoreBoards.get(idGame.toString()))
          } else {
            // let question = gamesQuestions.get(idQuest.toString())[idQuestion];
            let score =
              question.correct_id == answer.idAnswer
                ? question.correct_point
                : question.incorrect_point
            scoreBoard = gamesScoreBoards.get(idGame.toString())
            let i = scoreBoard.findIndex(player => {
              return player.username.toLowerCase() == answer.username.toLowerCase()
            })

            scoreBoard[i]['score'] += score
            scoreBoard[i]['time'] += answer.time

            gamesScoreBoards.set(idGame.toString(), scoreBoard)
            socket.emit(GAME.CORRECT_ANSWER, question.correct_id == answer.idAnswer)
            socket.to(idGame).emit(GAME.ANSWER, scoreBoard)
          }
        })
        //emit to room game except sender
        // io.in(idGame).emit(GAME.SCOREBOARD, scoreBoard);
      })

      //end game
      socket.on(GAME.END, idGame => {
        //handler result
        let scoreBoard = gamesScoreBoards.get(idGame.toString())
        socket.to(idGame).emit(GAME.END, scoreBoard)
        Utility.endGame(idGame)
        console.log(`End game: ${idGame}`)
        let rooms = io.sockets.adapter.sids[idGame]
        for (let room in rooms) {
          socket.leave(room)
        }
        // io.sockets.clients(idGame).map(player => {
        //   player.leave(idGame)
        // })
      })

      socket.on('disconnect', () => {
        console.log('client ' + socket.id + ' disconnected')
      })
    })
  } catch (error) {
    console.log(error)
  }
}

export default GameSocket