import * as fastify from 'fastify'
import * as path from 'path'
import config from './config'
import resolver from './reolver'
import * as util from './util'
import chalk from 'chalk'
import * as http from 'http'

export default class Mockingbird {
  private app: fastify.FastifyInstance

  constructor () {
    this.app = fastify()
  }

  private setup () {
    console.clear()
    console.log(chalk.bgBlueBright(' Start '))
    if (config.verbose) console.log('Mock api routes')
    const files = resolver(config.srcDir)
    files.forEach((filepath) => {
      this.register(filepath)
    })
  }

  private register (filepath: string) {
    let url = util.processFilename(filepath)
    url = path.join(url).replace(path.join(config.srcDir), '')
    url = path.join(config.baseUrl, url)

    const modulePath = path.resolve(__dirname, '../', filepath)
    delete require.cache[modulePath]
    const mockObject = require(modulePath)

    const option = {
      method: 'GET',
      url,
      handler (request: any, reply: any) {
        reply.send({ message: 'not implemented yet' })
      },
      ...mockObject
    }

    if (config.verbose) console.log(`  - ${util.leftPad(option.method, 7)} ${option.url}`)

    this.app.route(option)
  }

  stop (cb: any) {
    this.app.close(() => {
      cb()
    })
  }

  reset () {
    this.app = fastify()
  }

  start () {
    this.setup()
    this.app.listen(config.port, () => {
      console.log(`Mockingbird listening on http://localhost:${config.port}`)
    })
  }
}