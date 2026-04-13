import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { lastValueFrom } from 'rxjs'

interface WechatLoginResponse {
  openid: string
  session_key: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

@Injectable()
export class AuthService {
  private users: Map<string, {
    userId: string
    openid: string
    nickName?: string
    avatarUrl?: string
    createTime: string
  }> = new Map()

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  /**
   * 微信登录
   */
  async wechatLogin(code: string): Promise<{
    userId: string
    openid: string
    nickName?: string
    avatarUrl?: string
    createTime: string
  }> {
    try {
      // 获取微信配置
      const appId = this.configService.get<string>('WECHAT_APP_ID') || 'your_appid'
      const appSecret = this.configService.get<string>('WECHAT_APP_SECRET') || 'your_appsecret'

      // 调用微信API获取session_key和openid
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`

      const response = await lastValueFrom(
        this.httpService.get<WechatLoginResponse>(url),
      )

      const { openid, session_key, errcode, errmsg } = response.data

      if (errcode && errcode !== 0) {
        throw new Error(`微信登录失败: ${errmsg}`)
      }

      // 查找或创建用户
      let userInfo = this.findUserByOpenid(openid)

      if (!userInfo) {
        // 创建新用户
        userInfo = {
          userId: `user_${openid.substring(0, 10)}`,
          openid,
          nickName: `用户${Math.floor(Math.random() * 10000)}`,
          createTime: new Date().toISOString(),
        }

        this.users.set(userInfo.userId, userInfo)
      }

      console.log('用户登录成功:', userInfo)

      return userInfo
    } catch (error) {
      console.error('微信登录失败:', error)
      throw new Error('微信登录失败')
    }
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(userId: string): Promise<{
    userId: string
    openid: string
    nickName?: string
    avatarUrl?: string
    createTime: string
  } | null> {
    return this.users.get(userId) || null
  }

  /**
   * 根据openid查找用户
   */
  private findUserByOpenid(openid: string): {
    userId: string
    openid: string
    nickName?: string
    avatarUrl?: string
    createTime: string
  } | null {
    for (const user of this.users.values()) {
      if (user.openid === openid) {
        return user
      }
    }
    return null
  }
}
