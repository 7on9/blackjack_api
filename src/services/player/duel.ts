import { ICard, TDeckValueStatus, TPlayerType } from "../../@types";
import { caculatePoint } from "../game";

const getStatusValue = (status: TDeckValueStatus) => {
  switch (status) {
    case 'DEATH_FLAG': return -1000
    case 'NOT_ENOUGHT_POINT': return -100
    case 'OVER_POINT': return -10
    case 'ENOUGHT_POINT': return 0
    case 'BLACK_JACK': return 10
    case 'FIVE_STARS': return 100
    case 'DOUBLE_ACE': return 1000
  }
}

/**
 * 
 * @param hostDeck Host's deck
 * @param playerDeck Player's deck
 * @returns -1: First deck (host) win | 0: Draw | 1: Second deck (player) win
 */
export const duel = (hostDeck: ICard[], playerDeck: ICard[]): -1 | 0 | 1 => {
  const hostDeckPoint = caculatePoint(hostDeck, 'HOST')
  const playerDeckPoint = caculatePoint(playerDeck, 'PLAYER')
  const hostStatusValue = getStatusValue(hostDeckPoint.status)
  const playerStatusValue = getStatusValue(playerDeckPoint.status)

  if (hostDeckPoint.status === playerDeckPoint.status) {
    
    if (hostDeckPoint.status !== 'ENOUGHT_POINT') return 0
    
    if (hostDeckPoint.status === 'ENOUGHT_POINT') {
    
      if (hostDeckPoint.value === playerDeckPoint.value) {
        return 0
      }
      return hostDeckPoint.value > playerDeckPoint.value ? -1 : 1
    }
  }

  if (hostStatusValue > playerStatusValue) return -1
  if (hostStatusValue < playerStatusValue) return 1
  return 0
}