import { ICard } from '../../@types'
import { getRandomIntInclusive } from '../../common/utils'
import { generateDeck } from '../../utils'

export type TDeckPosition = 'top' | 'bottom' | 'random' | number

const newDeck = (): ICard[] => generateDeck()

const getCardFromDeck = (deck: ICard[], from: TDeckPosition) => {
  let card: ICard | undefined
  if (from === 'random') {
    from = getRandomIntInclusive(0, deck.length - 1)
  }

  if (typeof from === 'number') {
    deck.splice(from, 1)
  }

  if (from === 'bottom') {
    card = deck.shift()
  } else {
    card = deck.pop()
  }

  return {
    deck,
    card,
  }
}

export default {
  newDeck,
  getCardFromDeck,

}
