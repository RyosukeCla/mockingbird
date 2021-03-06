import * as fastify from 'fastify'
import * as path from 'path'
import { Config } from './config'
import resolver from './resolver'
import * as util from './util'
import chalk from 'chalk'

export default class MockingcatServer {
  private app: fastify.FastifyInstance
  private config: Config

  constructor (config: Config) {
    this.config = config
    this.app = fastify()
  }

  getFastifyInstence (): fastify.FastifyInstance {
    return this.app
  }

  stop (): Promise<void> {
    return new Promise((resolve, reject) => {
      this.app.close(() => {
        resolve()
      })
    })
  }

  reset () {
    this.app = fastify()
  }

  start () {
    this.setup()
    this.app.listen(this.config.port, () => {
      console.log(`Mockingcat listening on http://localhost:${this.config.port}`)
    })
  }

  private setup () {
    if (this.config.verbose) {
      this.app.use((req, rep, next) => {
        console.log(`${util.leftPad(chalk.green(req.method || 'NONE'), 7)} ${req.url}`)
        next()
      })
    }

    this.config.middlewares.forEach((middleware) => {
      this.app.use(middleware)
    })

    if (this.config.verbose) console.log('Mock api routes')
    const files = resolver(this.config.srcDir).filter((filepath) => {
      const ignored = this.config.ignore.some(ignore => ignore.test(filepath))
      return !ignored
    })
    files.forEach((filepath) => {
      this.register(filepath)
    })
  }

  private register (filepath: string) {
    const url = util.processFilename(filepath, this.config.srcDir, this.config.baseUrl)

    const mockObject = util.requireWithoutCache(filepath)

    if (mockObject instanceof Array) {
      this.registerRoute(url, mockObject)
    } else {
      this.registerRoute(url, [mockObject])
    }
  }

  private registerRoute (url: string, mockOjects: any[]) {
    mockOjects.forEach((mockObject) => {
      const option = {
        method: 'GET',
        url,
        handler (request: any, reply: any) {
          reply.send({ message: 'not implemented yet' })
        },
        ...mockObject
      }

      if (this.config.verbose) console.log(`  - ${util.leftPad(chalk.green(option.method), 7)} ${option.url}`)

      this.app.route(option)
    })
  }
}
