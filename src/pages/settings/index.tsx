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
  const [showCustomTimeDialog, setShowCustomTimeDialog] = useState(false)
  const [customTime, setCustomTime] = useState({ hour: 8, minute: 0 })

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

  const handleCustomTime = () => {
    setShowCustomTimeDialog(true)
  }

  const confirmCustomTime = () => {
    const schedule = `每日${customTime.hour}:${customTime.minute.toString().padStart(2, '0')}`
    setReportSchedule(schedule)
    setShowCustomTimeDialog(false)

    // 调用后端设置定时任务
    Network.request({
      url: '/api/notification/schedule',
      method: 'POST',
      data: { schedule }
    })

    showToast({
      title: `已设置每日 ${customTime.hour}:${customTime.minute.toString().padStart(2, '0')} 定时报告`,
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

      {/* AI 智能分析卡片（整合定时报告和分享） */}
      <Card className="m-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles size={18} strokeWidth={2} color="#3B82F6" />
            <Text className="block">AI 智能分析</Text>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <View className="bg-blue-50 rounded-lg p-3">
              <View className="flex items-center justify-between mb-2">
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

          {/* 定时报告设置 */}
          <View className="border-t border-gray-200 pt-4">
            <View className="flex items-center justify-between mb-3">
              <Text className="block text-sm font-semibold text-gray-700">
                <Bell size={16} strokeWidth={2} color="#666" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                定时 AI 报告
              </Text>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={(checked) => setNotificationsEnabled(checked)}
              />
            </View>

            {notificationsEnabled && (
              <View className="space-y-2">
                <Text className="block text-xs text-gray-500 mb-2">选择报告时间</Text>
                <View className="grid grid-cols-2 gap-2">
                  {['每日8:00', '每日12:00', '每日18:00', '每日20:00'].map((schedule) => (
                    <View
                      key={schedule}
                      className={`rounded-lg p-3 border-2 text-center ${
                        reportSchedule === schedule
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                      onClick={() => handleSetSchedule(schedule)}
                    >
                      <Text
                        className={`block text-xs ${
                          reportSchedule === schedule
                            ? 'text-blue-700 font-semibold'
                            : 'text-gray-700'
                        }`}
                      >
                        {schedule}
                      </Text>
                    </View>
                  ))}
                </View>
                {/* 自定义时间 */}
                <View
                  className={`rounded-lg p-3 border-2 text-center ${
                    reportSchedule?.startsWith('每日') && !['每日8:00', '每日12:00', '每日18:00', '每日20:00'].includes(reportSchedule)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                  onClick={handleCustomTime}
                >
                  <Text
                    className={`block text-xs ${
                      reportSchedule?.startsWith('每日') && !['每日8:00', '每日12:00', '每日18:00', '每日20:00'].includes(reportSchedule)
                        ? 'text-blue-700 font-semibold'
                        : 'text-gray-700'
                    }`}
                  >
                    {reportSchedule?.startsWith('每日') && !['每日8:00', '每日12:00', '每日18:00', '每日20:00'].includes(reportSchedule)
                      ? reportSchedule
                      : '自定义时间'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* 分享 */}
          <View className="border-t border-gray-200 pt-4">
            <Text className="block text-sm font-semibold text-gray-700 mb-3">
              <Share2 size={16} strokeWidth={2} color="#666" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
              分享
            </Text>
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
          </View>
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

      {/* 自定义时间选择弹窗 */}
      {showCustomTimeDialog && (
        <View
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50"
          onClick={() => setShowCustomTimeDialog(false)}
        >
          <View
            className="bg-white rounded-t-2xl w-full max-w-md p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <View className="flex items-center justify-between mb-4">
              <Text className="block text-base font-bold text-gray-900">自定义时间</Text>
              <Bell size={20} strokeWidth={2} color="#666" />
            </View>

            <View className="mb-4">
              <Text className="block text-sm text-gray-700 mb-3">选择小时</Text>
              <View className="grid grid-cols-6 gap-2">
                {Array.from({ length: 24 }, (_, i) => (
                  <View
                    key={i}
                    className={`rounded-lg p-2 text-center border-2 ${
                      customTime.hour === i
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                    onClick={() => setCustomTime({ ...customTime, hour: i })}
                  >
                    <Text
                      className={`block text-xs ${
                        customTime.hour === i
                          ? 'text-blue-700 font-semibold'
                          : 'text-gray-700'
                      }`}
                    >
                      {i.toString().padStart(2, '0')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="mb-4">
              <Text className="block text-sm text-gray-700 mb-3">选择分钟</Text>
              <View className="grid grid-cols-6 gap-2">
                {Array.from({ length: 60 }, (_, i) => (
                  <View
                    key={i}
                    className={`rounded-lg p-2 text-center border-2 ${
                      customTime.minute === i
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                    onClick={() => setCustomTime({ ...customTime, minute: i })}
                  >
                    <Text
                      className={`block text-xs ${
                        customTime.minute === i
                          ? 'text-blue-700 font-semibold'
                          : 'text-gray-700'
                      }`}
                    >
                      {i.toString().padStart(2, '0')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCustomTimeDialog(false)}
              >
                <Text className="block text-sm">取消</Text>
              </Button>
              <Button
                className="flex-1 bg-blue-500 text-white"
                onClick={confirmCustomTime}
              >
                <Text className="block text-sm">确定</Text>
              </Button>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

export default SettingsPage
