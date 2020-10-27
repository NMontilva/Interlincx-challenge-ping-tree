const targetHash = '!targets'
const statusCodes = {
  success: 200,
  serverError: 500,
  notFound: 404,
  unprocessableEntity: 422
}
const standardResponse = {
  message: '',
  data: null
}

const getTargets = (res, redis) => {
  const { serverError, notFound, success } = statusCodes
  const response = {
    ...standardResponse
  }
  redis.hgetall(targetHash, function (err, result) {
    if (err) {
      response.message = 'An error has ocurred'
      console.error(err)
      res.writeHead(serverError, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(response))
    }
    if (!result) {
      response.message = 'No targets found'
      res.writeHead(notFound, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(response))
    }
    response.data = Object.values(result).map(item => JSON.parse(item))
    res.writeHead(success, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify(response))
  })
}

const postTarget = (res, targetData, redis) => {
  const { serverError, notFound, unprocessableEntity, success } = statusCodes
  const response = {
    ...standardResponse
  }
  const stringifiedTargetData = JSON.stringify(targetData)
  redis.hget(targetHash, targetData.id, function (err, result) {
    if (err) {
      response.message = 'An error has ocurred'
      console.error(err)
      res.writeHead(serverError, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(response))
    }
    if (result) {
      response.message = 'A target with that ID already exists'
      res.writeHead(unprocessableEntity, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(response))
    }
    redis.hset(targetHash, targetData.id, stringifiedTargetData, function (err) {
      if (err) {
        response.message = 'An error has ocurred'
        console.error(err)
        res.writeHead(serverError, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify(response))
      }
    })
    redis.hget(targetHash, targetData.id, function (err, result) {
      if (err) {
        response.message = 'An error has ocurred'
        console.error(err)
        res.writeHead(serverError, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify(response))
      }
      const headStatus = !result ? notFound : success
      response.data = !result ? null : JSON.parse(result)
      response.message = !result ? 'No targets found' : 'A target has been successfully created'
      res.writeHead(headStatus, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(response))
    })
  })
}

const getTargetById = (res, targetId, redis) => {
  const { serverError, notFound, success } = statusCodes
  const response = {
    ...standardResponse
  }
  redis.hget(targetHash, targetId, function (err, result) {
    if (err) {
      response.message = 'An error has ocurred'
      console.error(err)
      res.writeHead(serverError, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(response))
    }
    const headStatus = !result ? notFound : success
    response.message = !result ? 'No targets found' : ''
    response.data = !result ? null : JSON.parse(result)
    res.writeHead(headStatus, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify(response))
  })
}

const updateTargetById = (res, targetObject, redis) => {
  const { targetId, targetData } = targetObject
  const { serverError, notFound, success } = statusCodes
  const response = {
    ...standardResponse
  }
  if (!targetId || !targetData) {
    response.message = 'An error has ocurred'
    console.error('targetId or targetData not set')
    res.writeHead(serverError, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify(response))
  }
  const stringifiedTargetData = JSON.stringify(targetData)
  redis.hget(targetHash, targetId, function (err, result) {
    if (err) {
      response.message = 'An error has ocurred'
      console.error(err)
      res.writeHead(serverError, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(response))
    }
    if (!result) {
      response.message = 'No targets found'
      res.writeHead(notFound, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(response))
    }
    redis.hset(targetHash, targetId, stringifiedTargetData, function (err) {
      if (err) {
        response.message = 'An error has ocurred'
        console.error(err)
        res.writeHead(serverError, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify(response))
      }
    })
    redis.hget(targetHash, targetId, function (err, result) {
      if (err) {
        response.message = 'An error has ocurred'
        console.error(err)
        res.writeHead(serverError, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify(response))
      }
      const headStatus = !result ? notFound : success
      response.data = !result ? null : JSON.parse(result)
      response.message = !result ? 'No targets found' : `Target ${targetId} has been successfully updated`
      res.writeHead(headStatus, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(response))
    })
  })
}

const routeTarget = (res, decisionData, redis) => {
  const { serverError, unprocessableEntity, success } = statusCodes
  const response = {
    ...standardResponse
  }
  redis.hgetall(targetHash, function (err, result) {
    if (err) {
      response.message = 'An error has ocurred'
      console.error(err)
      res.writeHead(serverError, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(response))
    }
    const foundTarget = filterTargets(result, decisionData)
    if (!foundTarget) {
      response.decision = 'reject'
      res.writeHead(unprocessableEntity, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(response))
    }
    foundTarget.maxAcceptsPerDay--
    const stringifiedTargetData = JSON.stringify(foundTarget)
    redis.hset(targetHash, foundTarget.id, stringifiedTargetData, function (err) {
      if (err) {
        response.message = 'An error has ocurred'
        console.error(err)
        res.writeHead(serverError, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify(response))
      }
    })
    res.writeHead(success)
    return res.end(foundTarget.url)
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
