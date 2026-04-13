import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad, showToast } from '@tarojs/taro'
import { useState } from 'react'
import { Network } from '@/network'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Sparkles, Share2, Download, LogIn, Bell } from 'lucide-react-taro'
import './index.config'

interface AnalysisResult {
  summary: string
  implications: string[]
  riskFactors: string[]
  confidence: '高' | '中' | '低'
  realityConnection: string
  impactScenarios: string[]
}

const SettingsPage = () => {
  const [userInfo, setUserInfo] = useState<any>(null)
  const [favorites, setFavorites] = useState<any[]>([])
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({})
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [reportSchedule, setReportSchedule] = useState<string | null>(null)

  useLoad(() => {
    checkLoginStatus()
    loadFavorites()
    loadAnalysisResults()
  })

  const checkLoginStatus = () => {
    try {
      const userData = Taro.getStorageSync('userInfo')
      if (userData) {
        setUserInfo(userData)
      }
    } catch (error) {
      console.error('检查登录状态失败:', error)
    }
  }

  const handleWechatLogin = async () => {
    try {
      const loginRes = await Taro.login()

      console.log('微信登录 code:', loginRes.code)

      // 调用后端登录接口
      const res = await Network.request({
        url: '/api/auth/wechat',
        method: 'POST',
        data: { code: loginRes.code }
      })

      if (res.data?.code === 200) {
        const userData = res.data.data

        // 保存用户信息
        Taro.setStorageSync('userInfo', userData)
        setUserInfo(userData)

        showToast({
          title: '登录成功',
          icon: 'success'
        })
      } else {
        showToast({
          title: '登录失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('微信登录失败:', error)
      showToast({
        title: '登录失败',
        icon: 'none'
      })
    }
  }

  const handleLogout = () => {
    Taro.removeStorageSync('userInfo')
    setUserInfo(null)

    showToast({
      title: '已退出登录',
      icon: 'success'
    })
  }

  const loadFavorites = async () => {
    try {
      const res = await Network.request({
        url: '/api/favorites'
      })

      if (res.data?.code === 200) {
        setFavorites(res.data.data || [])
      }
    } catch (error) {
      console.error('加载收藏失败:', error)
    }
  }

  const loadAnalysisResults = async () => {
    try {
      const res = await Network.request({
        url: '/api/analysis/all'
      })

      if (res.data?.code === 200) {
        setAnalysisResults(res.data.data || {})
      }
    } catch (error) {
      console.error('加载分析结果失败:', error)
    }
  }

  const handleImportFavorites = async () => {
    setIsImporting(true)
    try {
      await loadFavorites()

      showToast({
        title: `已导入 ${favorites.length} 个收藏`,
        icon: 'success'
      })
    } catch (error) {
      console.error('导入收藏失败:', error)
      showToast({
        title: '导入失败',
        icon: 'none'
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleAnalyzeAll = async () => {
    if (favorites.length === 0) {
      showToast({
        title: '请先导入收藏',
        icon: 'none'
      })
      return
    }

    setIsAnalyzing(true)
    try {
      const eventIds = favorites.map(f => f.id)

      const res = await Network.request({
        url: '/api/analysis/batch',
        method: 'POST',
        data: { eventIds }
      })

      if (res.data?.code === 200) {
        setAnalysisResults(res.data.data || {})

        showToast({
          title: `已完成 ${eventIds.length} 个事件的分析`,
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('批量分析失败:', error)
      showToast({
        title: '分析失败',
        icon: 'none'
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSetSchedule = (schedule: string) => {
    setReportSchedule(schedule)

    // 调用后端设置定时任务
    Network.request({
      url: '/api/notification/schedule',
      method: 'POST',
      data: { schedule }
    })

    showToast({
      title: `已设置${schedule}定时报告`,
      icon: 'success'
    })
  }

  const handleShareAll = async () => {
    if (Object.keys(analysisResults).length === 0) {
      showToast({
        title: '请先进行分析',
        icon: 'none'
      })
      return
    }

    const analyzedCount = Object.keys(analysisResults).length
    const shareContent = {
      title: `概率之眼 - ${analyzedCount} 个事件AI分析报告`,
      path: '/pages/settings/index',
      imageUrl: ''
    }

    // 触发分享
    Taro.showShareMenu({
      withShareTicket: true
    })

    showToast({
      title: '请在右上角菜单分享',
      icon: 'none',
      duration: 2000
    })

    return shareContent
  }

  return (
    <ScrollView scrollY className="min-h-screen bg-gray-50">
      {/* 用户登录卡片 */}
      <Card className="m-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User size={18} strokeWidth={2} color="#666" />
            <Text className="block">账号</Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userInfo ? (
            <View>
              <View className="flex items-center gap-3 mb-4">
                <View className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Text className="block text-lg text-blue-600 font-bold">
                    {userInfo.nickName?.charAt(0) || 'U'}
                  </Text>
                </View>
                <View>
                  <Text className="block text-base font-semibold text-gray-900">
                    {userInfo.nickName || '未设置昵称'}
                  </Text>
                  <Text className="block text-xs text-gray-500">
                    已登录
                  </Text>
                </View>
              </View>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLogout}
              >
                <Text className="block text-sm">退出登录</Text>
              </Button>
            </View>
          ) : (
            <Button
              className="w-full flex items-center justify-center gap-2 bg-green-500 text-white"
              onClick={handleWechatLogin}
            >
              <LogIn size={18} strokeWidth={2} color="#fff" />
              <Text className="block text-base font-semibold">微信登录</Text>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* AI 智能分析卡片 */}
      <Card className="m-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles size={18} strokeWidth={2} color="#3B82F6" />
            <Text className="block">AI 智能分析</Text>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 一键导入收藏 */}
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleImportFavorites}
            disabled={isImporting}
          >
            <Download size={18} strokeWidth={2} color="#666" />
            <Text className="block text-sm">
              {isImporting ? '导入中...' : `一键导入收藏 (${favorites.length})`}
            </Text>
          </Button>

          {/* 全部 AI 分析 */}
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"
            onClick={handleAnalyzeAll}
            disabled={isAnalyzing || favorites.length === 0}
          >
            <Sparkles size={18} strokeWidth={2} color="#3B82F6" />
            <Text className="block text-sm font-semibold text-blue-600">
              {isAnalyzing ? '分析中...' : '全部 AI 分析'}
            </Text>
          </Button>

          {/* 分析状态 */}
          {Object.keys(analysisResults).length > 0 && (
            <View className="bg-blue-50 rounded-lg p-3 mt-2">
              <View className="flex items-center justify-between">
                <Text className="block text-xs text-gray-700">
                  已完成分析
                </Text>
                <Badge className="bg-blue-100 text-blue-700">
                  <Text className="block text-xs">
                    {Object.keys(analysisResults).length} / {favorites.length}
                  </Text>
                </Badge>
              </View>
            </View>
          )}
        </CardContent>
      </Card>

      {/* 定时报告卡片 */}
      <Card className="m-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell size={18} strokeWidth={2} color="#666" />
            <Text className="block">定时 AI 报告</Text>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <View className="flex items-center justify-between">
            <Text className="block text-sm text-gray-700">开启通知</Text>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={(checked) => setNotificationsEnabled(checked)}
            />
          </View>

          <View className="border-t border-gray-200 pt-3">
            <Text className="block text-xs text-gray-500 mb-3">选择报告时间</Text>
            <View className="space-y-2">
              {['每日8:00', '每日12:00', '每日18:00', '每日20:00', '每周一9:00'].map((schedule) => (
                <View
                  key={schedule}
                  className={`rounded-lg p-3 border-2 ${
                    reportSchedule === schedule
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                  onClick={() => handleSetSchedule(schedule)}
                >
                  <View className="flex items-center justify-between">
                    <Text
                      className={`block text-sm ${
                        reportSchedule === schedule
                          ? 'text-blue-700 font-semibold'
                          : 'text-gray-700'
                      }`}
                    >
                      {schedule}
                    </Text>
                    {reportSchedule === schedule && (
                      <View className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </CardContent>
      </Card>

      {/* 分享卡片 */}
      <Card className="m-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 size={18} strokeWidth={2} color="#666" />
            <Text className="block">分享</Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleShareAll}
            disabled={Object.keys(analysisResults).length === 0}
          >
            <Share2 size={18} strokeWidth={2} color="#666" />
            <Text className="block text-sm">
              一键分享所有分析
            </Text>
          </Button>
        </CardContent>
      </Card>

      {/* 关于卡片 */}
      <Card className="m-4 mb-8">
        <CardHeader>
          <CardTitle className="text-base">关于</CardTitle>
        </CardHeader>
        <CardContent>
          <Text className="block text-xs text-gray-500 mb-2">
            概率之眼 v1.0
          </Text>
          <Text className="block text-xs text-gray-400 leading-relaxed">
            本产品仅供信息参考，不构成投资建议。预测市场存在风险，请谨慎决策。
          </Text>
        </CardContent>
      </Card>
    </ScrollView>
  )
}

export default SettingsPage
