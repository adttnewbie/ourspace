function createMember(nickname, deviceLabel, pairedAt) {
  var memberId = newId('member')
  var sessionToken = newSessionToken()
  var timestamp = nowIso()

  appendObjectRow('members', {
    id: memberId,
    nickname: nickname,
    deviceLabel: deviceLabel,
    sessionTokenHash: hashSessionToken(sessionToken),
    pairedAt: pairedAt,
    lastSeenAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: '',
  })

  return {
    memberId: memberId,
    sessionToken: sessionToken,
  }
}

function softDeleteMember(memberId) {
  var member = getSheetObjects('members').find(function (row) {
    return row.id === memberId && !row.deletedAt
  })

  if (member) {
    updateObjectRow('members', member.rowNumber, {
      deletedAt: nowIso(),
      updatedAt: nowIso(),
    })
  }
}

function markMemberPaired(memberId, pairedAt) {
  var member = getSheetObjects('members').find(function (row) {
    return row.id === memberId && !row.deletedAt
  })

  if (member) {
    updateObjectRow('members', member.rowNumber, {
      pairedAt: pairedAt,
      updatedAt: pairedAt,
    })
  }
}

function getPairedResponse(session) {
  var memberA = getMemberById(session.memberAId)
  var memberB = getMemberById(session.memberBId)

  return {
    status: 'paired',
    anniversaryDate: session.pairedAt,
    members: [memberA, memberB].filter(Boolean),
  }
}

function getMemberById(memberId) {
  var member = getSheetObjects('members').find(function (row) {
    return row.id === memberId
  })

  if (!member) {
    return null
  }

  return {
    id: member.id,
    nickname: member.nickname,
  }
}
