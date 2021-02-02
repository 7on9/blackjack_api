import { ICard, TDeckValueStatus, TPlayerType, IDeckValue } from '../../@types'

const VALUES_OF_ACE = [1, 10, 11]
const VALUES_OF_2_ACES = [2, 11, 12, 20, 21]

export const isDoubleAce = (cards: ICard[]): boolean => {
  if (cards.length != 2) {
    return false
  } else {
    if (cards[0].value === 'A' && cards[1].value === 'A') {
      return true
    }
  }
  return false
}

export const isBlackJack = (cards: ICard[]): boolean => {
  if (cards.length != 2) {
    return false
  } else {
    if (cards[0].value === 'A' || cards[1].value === 'A') {
      const otherCard = cards[0].value === 'A' ? 1 : 0
      switch (cards[otherCard].value) {
        case 10:
        case 'J':
        case 'Q':
        case 'K':
          return true
        default:
          return false
      }
    }
  }
  return false
}

export const caculatePoint = (
  cards: ICard[],
  playerType: TPlayerType = 'PLAYER'
): IDeckValue => {
  if (isDoubleAce(cards)) {
    return {
      status: 'DOUBLE_ACE',
      value: 21,
    }
  }

  if (isBlackJack(cards)) {
    return {
      status: 'BLACK_JACK',
      value: 21,
    }
  }

  let numberOfAce = 0
  let value = 0

  for (let index = 0; index < cards.length; index++) {
    const card = cards[index]
    switch (card.value) {
      case 10:
      case 'J':
      case 'Q':
      case 'K':
        value += 10
        break
      case 'A':
        numberOfAce++
        break
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
        value += card.value
        break
    }
  }

  if (numberOfAce) {
    if (cards.length >= 4) {
      value += numberOfAce
    } else {
      let arrValueOfAce = numberOfAce == 1 ? VALUES_OF_ACE : VALUES_OF_2_ACES
      let valueToReachBlackJack = Math.abs(21 - value)
      let valueOfAce = 0
      for (let iValueOfAce = 0; iValueOfAce < arrValueOfAce.length; iValueOfAce++) {
        const aceValue = arrValueOfAce[iValueOfAce];
        if (aceValue + value <= 21 && valueToReachBlackJack > 21 - (aceValue + value)) {
          valueOfAce = aceValue
          valueToReachBlackJack = 21 - (aceValue + value)
        }
      }
      value += valueOfAce
      // value += Math.abs(21 - (value + 10)) > Math.abs(21 - value + 11) ? 11 : 10
    }
  }

  let status: TDeckValueStatus = 'NOT_ENOUGHT_POINT'
  if (value > 21) {
    status = value >= 28 ? playerType === 'PLAYER' ? 'DEATH_FLAG' : 'OVER_POINT' : 'OVER_POINT'
  } else {
    if (cards.length == 5) {
      return {
        status: 'FIVE_STARS',
        value,
      }
    }
    if (playerType === 'HOST') {
      if (value < 15) {
        status = 'NOT_ENOUGHT_POINT'
      } else {
        status = 'ENOUGHT_POINT'
      }
    } else {
      if (value < 16) {
        status = 'NOT_ENOUGHT_POINT'
      } else {
        status = 'ENOUGHT_POINT'
      }
    }
  }

  return {
    status,
    value,
  }
}
