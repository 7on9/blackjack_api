import { ICard, TCardValue, TKind } from '../@types'
import { getRandomIntInclusive } from '../common/utils'

export const generateDeck = (): ICard[] => {
  const values: TCardValue[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A']
  const kinds: TKind[] = ['spade', 'club', 'diamond', 'heart']
  const cards: ICard[] = []
  for (let iValue = 0; iValue < values.length; iValue++) {
    const value = values[iValue]
    for (let iKind = 0; iKind < kinds.length; iKind++) {
      const kind = kinds[iKind]
      let card: ICard = {
        value,
        kind,
      }
      cards.push(card)
    }
  }
  return cards
}

export const shuffleArray = (array: any[], numberOfShuffle?: number): any[] => {
  const _numberOfShuffle = numberOfShuffle ? numberOfShuffle : 1
  for (let shuffle = 0; shuffle < _numberOfShuffle; shuffle++) {
    for (let i = 0; i < array.length; i++) {
      const posSwap = getRandomIntInclusive(0, array.length - 1)
      const temp = array[i]
      array[i] = array[posSwap]
      array[posSwap] = temp
    }
  }
  return array
}
