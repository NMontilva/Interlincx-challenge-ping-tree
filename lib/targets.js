const targetHash = '!targets'
const standardResponse = {
  message: '',
  error: false,
  data: null
}

const getTargets = (redis, cb) => {
  const response = {
    ...standardResponse
  }
  redis.hgetall(targetHash, function (err, result) {
    if (err) {
      response.error = true
      response.message = 'An error has ocurred'
      console.error(err)
      return cb(response)
    }
    if (!result) {
      response.message = 'No targets found'
      return cb(response)
    }
    response.data = Object.values(result).map(item => JSON.parse(item))
    return cb(response)
  })
}

const postTarget = (targetData, redis, cb) => {
  const response = {
    ...standardResponse
  }
  const stringifiedTargetData = JSON.stringify(targetData)
  redis.hget(targetHash, targetData.id, function (err, result) {
    if (err) {
      response.error = true
      response.message = 'An error has ocurred'
      console.error(err)
      return cb(response)
    }
    if (result) {
      response.error = true
      response.message = 'A target with that ID already exists'
      return cb(response)
    }
    redis.hset(targetHash, targetData.id, stringifiedTargetData, function (err) {
      if (err) {
        response.error = true
        response.message = 'An error has ocurred'
        console.error(err)
        return cb(response)
      }
    })
    redis.hget(targetHash, targetData.id, function (err, result) {
      if (err) {
        response.error = true
        response.message = 'An error has ocurred'
        console.error(err)
        return cb(response)
      }
      response.message = result ? 'A target has been successfully created' : 'No targets found'
      response.data = result ? JSON.parse(result) : null
      return cb(response)
    })
  })
}

const getTargetById = (targetId, redis, cb) => {
  const response = {
    ...standardResponse
  }
  redis.hget(targetHash, targetId, function (err, result) {
    if (err) {
      response.message = 'An error has ocurred'
      response.error = true
      console.error(err)
      return cb(response)
    }
    response.message = result ? '' : 'No targets found'
    response.data = result ? JSON.parse(result) : null
    return cb(response)
  })
}

const updateTargetById = (targetObject, redis, cb) => {
  const { targetId, targetData } = targetObject
  const response = {
    ...standardResponse
  }
  if (!targetId || !targetData) {
    response.error = true
    response.message = 'An error has ocurred - targetId or targetData not set'
    console.error('targetId or targetData not set')
    return cb(response)
  }
  const stringifiedTargetData = JSON.stringify(targetData)
  redis.hget(targetHash, targetId, function (err, result) {
    if (err) {
      response.error = true
      response.message = 'An error has ocurred'
      console.error(err)
      return cb(response)
    }
    if (!result) {
      response.error = false
      response.message = 'No targets found'
      return cb(response)
    }
    redis.hset(targetHash, targetId, stringifiedTargetData, function (err) {
      if (err) {
        response.error = true
        response.message = 'An error has ocurred'
        console.error(err)
        return cb(response)
      }
    })
    redis.hget(targetHash, targetId, function (err, result) {
      if (err) {
        response.error = true
        response.message = 'An error has ocurred'
        console.error(err)
        return cb(response)
      }
      response.data = result ? JSON.parse(result) : null
      response.message = result ? `Target ${targetId} has been successfully updated` : 'No targets found'
      return cb(response)
    })
  })
}

const routeTarget = (decisionData, redis, cb) => {
  const response = {
    ...standardResponse
  }
  redis.hgetall(targetHash, function (err, result) {
    if (err) {
      response.error = true
      response.message = 'An error has ocurred'
      console.error(err)
      return cb(response)
    }
    const foundTarget = filterTargets(result, decisionData)
    if (!foundTarget) {
      response.error = true
      response.decision = 'reject'
      return cb(response)
    }
    foundTarget.maxAcceptsPerDay--
    const stringifiedTargetData = JSON.stringify(foundTarget)
    redis.hset(targetHash, foundTarget.id, stringifiedTargetData, function (err) {
      if (err) {
        response.error = true
        response.message = 'An error has ocurred'
        console.error(err)
        return cb(response)
      }
    })
    response.data = foundTarget.url
    return cb(response)
  })
}

module.exports = {
  getTargets,
  postTarget,
  getTargetById,
  updateTargetById,
  routeTarget
}

function filterTargets (targetsRaw, decisionData) {
  let { geoState: decisionGeoState, timestamp: decisionTimestamp } = decisionData
  const parsedTargets = Object.values(targetsRaw).map(item => JSON.parse(item))
  decisionTimestamp = new Date(decisionTimestamp).getUTCHours().toString()

  const filterGeoStateTargets = parsedTargets.filter(item => item.accept.geoState.$in.includes(decisionGeoState))
  if (!filterGeoStateTargets.length) { return null }
  const filterTimeStampTargets = filterGeoStateTargets.filter(item => item.accept.hour.$in.includes(decisionTimestamp))
  if (!filterTimeStampTargets.length) { return null }
  const foundTarget = filterTimeStampTargets.reduce((targetA, targetB) => targetA.maxAcceptsPerDay > targetB.maxAcceptsPerDay ? targetA : targetB)
  if (!foundTarget.maxAcceptsPerDay) { return null }

  return foundTarget
}
