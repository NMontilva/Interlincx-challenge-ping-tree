process.env.NODE_ENV = 'test'

var test = require('ava')
var servertest = require('servertest')

var server = require('../lib/server')

const exampleTargetPost = JSON.stringify({
  id: '1',
  url: 'http://example.com',
  value: '0.50',
  maxAcceptsPerDay: '10',
  accept: {
    geoState: {
      $in: ['ca', 'ny']
    },
    hour: {
      $in: ['13', '14', '15']
    }
  }
})
const exampleTargetUpdate = JSON.stringify({
  id: '1',
  url: 'http://example.com',
  value: '0.75',
  maxAcceptsPerDay: '5',
  accept: {
    geoState: {
      $in: ['az', 'nj']
    },
    hour: {
      $in: ['16', '17', '18']
    }
  }
})
const exampleDecisionUrl = JSON.stringify(
  {
    geoState: 'nj',
    publisher: 'abc',
    timestamp: '2018-07-19T17:15:59.513Z'
  }
)
const exampleDecisionReject = JSON.stringify(
  {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: '2018-07-19T23:28:59.513Z'
  }
)
const statusCodes = {
  success: 200,
  serverError: 500,
  notFound: 404,
  unprocessableEntity: 422
}
const targetsRequestsUrls = {
  massTargetsUrl: '/api/targets',
  singleTargetUrl: '/api/target/1',
  routeTargetUrl: '/route'
}

test.serial.cb('healthcheck', function (t) {
  var url = '/health'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.serial.cb('postTargetCheck', function (t) {
  const { success } = statusCodes
  const { massTargetsUrl } = targetsRequestsUrls
  const req = servertest(server(), massTargetsUrl, { method: 'POST', encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, success, 'correct statusCode')
    t.is(res.body.message, 'A target has been successfully created', 'test target has been created')
    t.end()
  })
  req.write(exampleTargetPost)
  req.end()
})

test.serial.cb('getTargetsCheck', function (t) {
  const { success } = statusCodes
  const { massTargetsUrl } = targetsRequestsUrls
  servertest(server(), massTargetsUrl, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')
    console.log(JSON.stringify(res.body.data))
    t.is(res.statusCode, success, 'correct statusCode')
    t.is(typeof res.body.data, 'object', 'data is object')
    t.end()
  })
})

test.serial.cb('getTargetByIdCheck', function (t) {
  const { success } = statusCodes
  const { singleTargetUrl } = targetsRequestsUrls
  servertest(server(), singleTargetUrl, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')
    console.log(res.body.data)
    t.is(res.statusCode, success, 'correct statusCode')
    t.is(typeof res.body.data, 'object', 'data is object')
    t.end()
  })
})

test.serial.cb('updateTargetByIdCheck', function (t) {
  const { success } = statusCodes
  const { singleTargetUrl } = targetsRequestsUrls
  const req = servertest(server(), singleTargetUrl, { method: 'POST', encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, success, 'correct statusCode')
    t.is(res.body.message, 'Target 1 has been successfully updated', 'test target has been updated')
    t.end()
  })
  req.write(exampleTargetUpdate)
  req.end()
})

test.serial.cb('routeTargetCheck', function (t) {
  const { success } = statusCodes
  const { routeTargetUrl } = targetsRequestsUrls
  const req = servertest(server(), routeTargetUrl, { method: 'POST', encoding: 'url' }, function (err, res) {
    t.falsy(err, 'no error')
    console.log(res.body.toString())
    t.is(res.statusCode, success, 'correct statusCode')
    t.end()
  })
  req.write(exampleDecisionUrl)
  req.end()
})

test.serial.cb('routeTargetCheckReject', function (t) {
  const { unprocessableEntity } = statusCodes
  const { routeTargetUrl } = targetsRequestsUrls
  const req = servertest(server(), routeTargetUrl, { method: 'POST', encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')
    console.log(JSON.stringify(res.body))
    t.is(res.statusCode, unprocessableEntity, 'correct statusCode')
    t.end()
  })
  req.write(exampleDecisionReject)
  req.end()
})
