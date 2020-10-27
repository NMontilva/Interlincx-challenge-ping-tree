var URL = require('url')
var http = require('http')
var cuid = require('cuid')
var Corsify = require('corsify')
var sendJson = require('send-data/json')
var ReqLogger = require('req-logger')
var healthPoint = require('healthpoint')
var HttpHashRouter = require('http-hash-router')

var redis = require('./redis')
var version = require('../package.json').version
var { getTargets, postTarget, getTargetById, updateTargetById, routeTarget } = require('./targets')

var router = HttpHashRouter()
var logger = ReqLogger({ version: version })
var health = healthPoint({ version: version }, redis.healthCheck)
var cors = Corsify({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, accept, content-type'
})

router.set('/favicon.ico', empty)
router.set('/api/targets', massTargetsHandler)
router.set('/api/target/:id', singleTargetHandler)
router.set('/route', routeHandler)

module.exports = function createServer () {
  return http.createServer(cors(handler))
}

function handler (req, res) {
  if (req.url === '/health') return health(req, res)
  req.id = cuid()
  logger(req, res, { requestId: req.id }, function (info) {
    info.authEmail = (req.auth || {}).email
    console.log(info)
  })
  router(req, res, { query: getQuery(req.url) }, onError.bind(null, req, res))
}

function onError (req, res, err) {
  if (!err) return

  res.statusCode = err.statusCode || 500
  logError(req, res, err)

  sendJson(req, res, {
    error: err.message || http.STATUS_CODES[res.statusCode]
  })
}

function logError (req, res, err) {
  if (process.env.NODE_ENV === 'test') return

  var logType = res.statusCode >= 500 ? 'error' : 'warn'

  console[logType]({
    err: err,
    requestId: req.id,
    statusCode: res.statusCode
  }, err.message)
}

function empty (req, res) {
  res.writeHead(204)
  res.end()
}

function getQuery (url) {
  return URL.parse(url, true).query // eslint-disable-line
}

function massTargetsHandler (req, res) {
  if (req.method === 'GET') {
    return getTargets(res, redis)
  }
  if (req.method === 'POST') {
    let rawData = ''
    let parsedData = ''
    req.on('data', chunk => {
      rawData += chunk
    })
    req.on('end', () => {
      parsedData = JSON.parse(rawData)
      return postTarget(res, parsedData, redis)
    })
  }
}

function singleTargetHandler (req, res) {
  const targetId = req.url.substr(req.url.length - 1)
  if (req.method === 'GET') {
    return getTargetById(res, targetId, redis)
  }
  if (req.method === 'POST') {
    let rawData = ''
    req.on('data', chunk => {
      rawData += chunk
    })
    req.on('end', () => {
      const targetObject = {
        targetId,
        targetData: rawData ? JSON.parse(rawData) : null
      }
      return updateTargetById(res, targetObject, redis)
    })
  }
}

function routeHandler (req, res) {
  if (req.method === 'POST') {
    let rawData = ''
    let parsedData = ''
    req.on('data', chunk => {
      rawData += chunk
    })
    req.on('end', () => {
      parsedData = JSON.parse(rawData)
      return routeTarget(res, parsedData, redis)
    })
  }
}
