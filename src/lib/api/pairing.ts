import { apiRequest } from './client'

export function startPairing(nickname: string) {
  return apiRequest('pairing.start', { nickname })
}

export function signalPairing(pairingSessionId: string, nickname: string) {
  return apiRequest('pairing.signal', {
    pairingSessionId,
    nickname,
  })
}

export function getPairingStatus(pairingSessionId: string) {
  return apiRequest('pairing.status', { pairingSessionId })
}