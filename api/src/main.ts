import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: { origin: '*', methods: 'GET,HEAD,PUT,PATCH,POST,OPTIONS' },
  })
  app.setGlobalPrefix('api')
  await app.listen(3000)
  console.log('[AgriIoT] Backend running on http://localhost:3000')
}
bootstrap()
