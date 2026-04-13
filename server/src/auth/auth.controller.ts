import { Controller, Post, Body, Get } from '@nestjs/common'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 微信登录
   * POST /api/auth/wechat
   */
  @Post('wechat')
  async wechatLogin(@Body() body: { code: string }) {
    try {
      const result = await this.authService.wechatLogin(body.code)

      return {
        code: 200,
        msg: 'success',
        data: result
      }
    } catch (error) {
      return {
        code: 500,
        msg: error.message || '登录失败',
        data: null
      }
    }
  }

  /**
   * 获取用户信息
   * GET /api/auth/user
   */
  @Get('user')
  async getUserInfo(@Body() body: { userId: string }) {
    try {
      const userInfo = await this.authService.getUserInfo(body.userId)

      return {
        code: 200,
        msg: 'success',
        data: userInfo
      }
    } catch (error) {
      return {
        code: 500,
        msg: error.message || '获取用户信息失败',
        data: null
      }
    }
  }
}
