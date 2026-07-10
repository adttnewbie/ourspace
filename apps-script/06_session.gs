function validateSession(request) {
  if (!request.memberId || !request.sessionToken) {
    throw newAppError('SESSION_INVALID', 'Session is required')
  }

  var tokenHash = hashSessionToken(request.sessionToken)
  var member = getSheetObjects('members').find(function (row) {
    return (
      row.id === request.memberId &&
      row.sessionTokenHash === tokenHash &&
      !row.deletedAt
    )
  })

  if (!member) {
    throw newAppError('SESSION_INVALID', 'Invalid session')
  }

  if (shouldRefreshLastSeen(member.lastSeenAt)) {
    updateObjectRow('members', member.rowNumber, {
      lastSeenAt: nowIso(),
    })
  }

  return {
    memberId: member.id,
    nickname: member.nickname,
  }
}

function shouldRefreshLastSeen(lastSeenAt) {
  var timestamp = new Date(lastSeenAt).getTime()

  return !Number.isFinite(timestamp) || Date.now() - timestamp >= 600000
}

function getSessionResume(request) {
  var session = validateSession(request)

  return {
    member: {
      id: session.memberId,
      nickname: session.nickname,
    },
    members: listActiveMembers(),
    anniversaryDate: getSetting('anniversaryDate'),
  }
}

function recoverSession(request) {
  var nickname = requireNickname(request.payload.nickname)
  var recoveryDate = requireRecoveryDate(request.payload.anniversaryDate)
  var anniversaryDate = getSetting('anniversaryDate')

  if (!anniversaryDate || isoDateInJakarta(anniversaryDate) !== recoveryDate) {
    throwRecoveryFailed()
  }

  var member = getSheetObjects('members').find(function (row) {
    return (
      !row.deletedAt &&
      normalizeNickname(row.nickname).toLowerCase() === nickname.toLowerCase()
    )
  })

  if (!member) {
    throwRecoveryFailed()
  }

  var sessionToken = newSessionToken()
  var timestamp = nowIso()

  updateObjectRow('members', member.rowNumber, {
    sessionTokenHash: hashSessionToken(sessionToken),
    lastSeenAt: timestamp,
    updatedAt: timestamp,
  })

  return {
    memberId: member.id,
    sessionToken: sessionToken,
    member: {
      id: member.id,
      nickname: member.nickname,
    },
    members: listActiveMembers(),
    anniversaryDate: anniversaryDate,
  }
}

function requireRecoveryDate(value) {
  var date = String(value || '').trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw newAppError('BAD_REQUEST', 'anniversaryDate wajib format YYYY-MM-DD')
  }

  return date
}

function isoDateInJakarta(value) {
  return Utilities.formatDate(new Date(value), 'Asia/Jakarta', 'yyyy-MM-dd')
}

function throwRecoveryFailed() {
  throw newAppError('RECOVERY_FAILED', 'Nama atau tanggal jadiannya belum cocok.')
}

function listActiveMembers() {
  return getSheetObjects('members')
    .filter(function (row) {
      return !row.deletedAt
    })
    .map(function (row) {
      return {
        id: row.id,
        nickname: row.nickname,
      }
    })
}

function getCoupleStatus() {
  var isPaired = Boolean(getSetting('anniversaryDate')) && listActiveMembers().length >= 2

  return {
    isPaired: isPaired,
  }
}

function resetCouple(request) {
  validateSession(request)

  return withScriptLock(function () {
    var timestamp = nowIso()
    var membersReset = resetActiveMembers(timestamp)
    var pairingSessionsExpired = expirePairingSessionsForReset(timestamp)

    upsertSetting('anniversaryDate', '')

    return {
      reset: true,
      isPaired: false,
      membersReset: membersReset,
      pairingSessionsExpired: pairingSessionsExpired,
    }
  })
}

function resetActiveMembers(timestamp) {
  var count = 0

  getSheetObjects('members').forEach(function (member) {
    if (member.deletedAt) {
      return
    }

    updateObjectRow('members', member.rowNumber, {
      sessionTokenHash: '',
      deletedAt: timestamp,
      updatedAt: timestamp,
      lastSeenAt: timestamp,
    })
    count += 1
  })

  return count
}

function expirePairingSessionsForReset(timestamp) {
  var count = 0

  getSheetObjects('pairing_sessions').forEach(function (session) {
    if (session.status === 'expired') {
      return
    }

    updateObjectRow('pairing_sessions', session.rowNumber, {
      status: 'expired',
      expiresAt: timestamp,
      updatedAt: timestamp,
    })
    count += 1
  })

  return count
}
