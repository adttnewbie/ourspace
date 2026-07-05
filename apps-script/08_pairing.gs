function withScriptLock(callback) {
  var lock = LockService.getScriptLock()
  lock.waitLock(10000)

  try {
    var result = callback()
    lock.releaseLock()
    return result
  } catch (error) {
    try {
      lock.releaseLock()
    } catch (releaseError) {
      console.error(releaseError)
    }

    throw error
  }
}

function normalizeNickname(value) {
  return String(value || '').trim().slice(0, 40)
}

function requireNickname(value) {
  var nickname = normalizeNickname(value)

  if (nickname.length < 2) {
    throw newAppError('BAD_REQUEST', 'Nickname minimal 2 karakter')
  }

  return nickname
}

function requirePairingSessionId(value) {
  var pairingSessionId = String(value || '').trim()

  if (!pairingSessionId) {
    throw newAppError('BAD_REQUEST', 'pairingSessionId is required')
  }

  return pairingSessionId
}

function findPairingSession(pairingSessionId) {
  return getSheetObjects('pairing_sessions').find(function (row) {
    return row.id === pairingSessionId
  })
}

function findReusablePairingSession(nickname) {
  return getSheetObjects('pairing_sessions').find(function (row) {
    if (row.status !== 'waiting') {
      return false
    }

    if (row.expiresAt && !isAfterNow(row.expiresAt)) {
      return false
    }

    return !row.firstNickname || row.firstNickname !== nickname
  })
}

function pairingStart(request) {
  requireCoupleNotPaired()

  return withScriptLock(function () {
    requireCoupleNotPaired()
    var nickname = requireNickname(request.payload.nickname)
    var reusableSession = findReusablePairingSession(nickname)

    if (reusableSession) {
      return {
        pairingSessionId: reusableSession.id,
        status: reusableSession.status,
        expiresAt: reusableSession.expiresAt || null,
      }
    }

    var timestamp = nowIso()
    var row = appendObjectRow('pairing_sessions', {
      id: newId('pair'),
      status: 'waiting',
      firstNickname: nickname,
      firstSignalAt: '',
      secondNickname: '',
      secondSignalAt: '',
      pairedAt: '',
      expiresAt: '',
      memberAId: '',
      memberBId: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    return {
      pairingSessionId: row.id,
      status: row.status,
      expiresAt: null,
    }
  })
}

function pairingSignal(request) {
  requireCoupleNotPaired()

  return withScriptLock(function () {
    requireCoupleNotPaired()
    var pairingSessionId = requirePairingSessionId(request.payload.pairingSessionId)
    var nickname = requireNickname(request.payload.nickname)
    var session = findPairingSession(pairingSessionId)

    if (!session) {
      throw newAppError('BAD_REQUEST', 'Pairing session tidak ditemukan')
    }

    return applyPairingSignal(session, nickname)
  })
}

function requireCoupleNotPaired() {
  if (getCoupleStatus().isPaired) {
    throw newAppError(
      'COUPLE_ALREADY_PAIRED',
      'OurSpace ini sudah terikat. Pairing cuma sekali.',
    )
  }
}

function pairingStatus(request) {
  return withScriptLock(function () {
    var pairingSessionId = requirePairingSessionId(request.payload.pairingSessionId)
    var session = findPairingSession(pairingSessionId)

    if (!session) {
      throw newAppError('BAD_REQUEST', 'Pairing session tidak ditemukan')
    }

    return getPairingSessionStatus(session)
  })
}

function applyPairingSignal(session, nickname) {
  if (session.status === 'paired') {
    throw newAppError('CONFLICT', 'Pairing session sudah dipakai')
  }

  if (session.status === 'expired') {
    throw newAppError('PAIRING_EXPIRED', 'Waktu pairing sudah habis')
  }

  if (session.expiresAt && !isAfterNow(session.expiresAt)) {
    expirePairingSession(session)
  }

  if (session.status === 'expired') {
    throw newAppError('PAIRING_EXPIRED', 'Waktu pairing sudah habis')
  }

  if (!session.firstSignalAt) {
    var firstSignalAt = nowIso()
    var expiresAt = addSecondsIso(firstSignalAt, getPairingWindowSeconds())
    var firstMember = createMember(session.firstNickname || nickname, 'device_a', firstSignalAt)

    updateObjectRow('pairing_sessions', session.rowNumber, {
      firstNickname: session.firstNickname || nickname,
      firstSignalAt: firstSignalAt,
      expiresAt: expiresAt,
      memberAId: firstMember.memberId,
      updatedAt: firstSignalAt,
    })

    return {
      pairingSessionId: session.id,
      status: 'waiting',
      expiresAt: expiresAt,
      memberId: firstMember.memberId,
      sessionToken: firstMember.sessionToken,
    }
  }

  if ((session.firstNickname || '') === nickname) {
    return {
      pairingSessionId: session.id,
      status: 'waiting',
      expiresAt: session.expiresAt,
    }
  }

  return completePairingSession(session, nickname)
}

function getPairingSessionStatus(session) {
  if (session.status === 'paired') {
    return getPairedResponse(session)
  }

  if (session.status === 'expired') {
    throw newAppError('PAIRING_EXPIRED', 'Waktu pairing sudah habis')
  }

  if (session.expiresAt && !isAfterNow(session.expiresAt)) {
    expirePairingSession(session)
    throw newAppError('PAIRING_EXPIRED', 'Waktu pairing sudah habis')
  }

  return {
    pairingSessionId: session.id,
    status: 'waiting',
    expiresAt: session.expiresAt || null,
  }
}

function expirePairingSession(session) {
  updateObjectRow('pairing_sessions', session.rowNumber, {
    status: 'expired',
    updatedAt: nowIso(),
  })

  if (session.memberAId) {
    softDeleteMember(session.memberAId)
  }

  session.status = 'expired'
}

function completePairingSession(session, secondNickname) {
  var pairedAt = nowIso()
  var firstMember = getMemberById(session.memberAId)
  var secondMember = createMember(secondNickname, 'device_b', pairedAt)

  markMemberPaired(session.memberAId, pairedAt)

  updateObjectRow('pairing_sessions', session.rowNumber, {
    status: 'paired',
    secondNickname: secondNickname,
    secondSignalAt: pairedAt,
    pairedAt: pairedAt,
    memberAId: session.memberAId,
    memberBId: secondMember.memberId,
    updatedAt: pairedAt,
  })

  var anniversaryDate = insertSettingIfMissing('anniversaryDate', pairedAt)

  return {
    status: 'paired',
    memberId: secondMember.memberId,
    sessionToken: secondMember.sessionToken,
    anniversaryDate: anniversaryDate,
    members: [
      {
        id: firstMember.id,
        nickname: firstMember.nickname,
      },
      {
        id: secondMember.memberId,
        nickname: secondNickname,
      },
    ],
  }
}
