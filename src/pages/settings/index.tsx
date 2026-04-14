import { View, Text, ScrollView, Picker } from '@tarojs/components'
import Taro, { useLoad, showToast } from '@tarojs/taro'
import { useState } from 'react'
import { Network } from '@/network'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Sparkles, Share2, Download, LogIn, Check, Clock } from 'lucide-react-taro'
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

  // 弹窗状态
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [allEvents, setAllEvents] = useState<any[]>([])
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())

  // 定时报告设置
  const [scheduledTime, setScheduledTime] = useState<string>('09:00')
  const [scheduleEnabled, setScheduleEnabled] = useState(false)

  useLoad(() => {
    checkLoginStatus()
    loadFavorites()
    loadAnalysisResults()
    loadScheduleSettings()
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

  const loadScheduleSettings = async () => {
    try {
      const res = await Network.request({
        url: '/api/schedule/settings'
      })

      if (res.data?.code === 200) {
        const settings = res.data.data
        setScheduledTime(settings.time || '09:00')
        setScheduleEnabled(settings.enabled || false)
      }
    } catch (error) {
      console.error('加载定时设置失败:', error)
    }
  }

  const handleImportFavorites = async () => {
    try {
      // 先打开弹窗显示加载状态
      setShowImportDialog(true)
      setAllEvents([]) // 清空之前的数据

      // 获取所有可用事件（手动构建query参数）
      const res = await Network.request({
        url: '/api/market/events?page=1&pageSize=50'
      })

      if (res.data?.code === 200) {
        const events = res.data.data?.events || []
        setAllEvents(events)
        // 初始化选中状态：已收藏的默认选中
        const favoriteIds = new Set(favorites.map(f => f.id))
        setSelectedEvents(favoriteIds)

        if (events.length === 0) {
          showToast({
            title: '暂无可用事件',
            icon: 'none'
          })
        }
      } else {
        showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载事件失败:', error)
      showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  }

  const confirmImportFavorites = async () => {
    setIsImporting(true)
    try {
      // 取消未选中的收藏
      const currentFavoriteIds = new Set(favorites.map(f => f.id))
      const toRemove = [...currentFavoriteIds].filter(id => !selectedEvents.has(id))

      // 添加新选中的收藏
      const toAdd = [...selectedEvents].filter(id => !currentFavoriteIds.has(id))

      // 执行删除操作
      for (const eventId of toRemove) {
        await Network.request({
          url: `/api/favorites/${eventId}`,
          method: 'DELETE'
        })
      }

      // 执行添加操作
      for (const eventId of toAdd) {
        await Network.request({
          url: '/api/favorites',
          method: 'POST',
          data: { eventId }
        })
      }

      // 重新加载收藏
      await loadFavorites()

      setShowImportDialog(false)

      showToast({
        title: `已导入 ${selectedEvents.size} 个收藏`,
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

  const handleBatchAnalyze = async () => {
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
          title: `分析完成 ${Object.keys(res.data.data || {}).length} 个事件`,
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

  const handleTimeChange = (e: any) => {
    const { value } = e.detail
    const hour = value[0].toString().padStart(2, '0')
    const minute = value[1].toString().padStart(2, '0')
    setScheduledTime(`${hour}:${minute}`)
  }

  const confirmTimeSetting = async () => {
    try {
      const res = await Network.request({
        url: '/api/schedule/settings',
        method: 'POST',
        data: {
          enabled: true,
          time: scheduledTime
        }
      })

      if (res.data?.code === 200) {
        setScheduleEnabled(true)
        setShowTimePicker(false)
        showToast({
          title: `已设置为每天 ${scheduledTime} 发送报告`,
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('保存定时设置失败:', error)
      showToast({
        title: '设置失败',
        icon: 'none'
      })
    }
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

          {/* 一键AI分析 */}
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"
            onClick={handleBatchAnalyze}
            disabled={isAnalyzing || favorites.length === 0}
          >
            <Sparkles size={18} strokeWidth={2} color="#3B82F6" />
            <Text className="block text-sm font-semibold text-blue-600">
              {isAnalyzing ? `分析中 (${Object.keys(analysisResults).length}/${favorites.length})...` : '一键 AI 分析'}
            </Text>
          </Button>

          {/* 定时报告设置 */}
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200"
            onClick={() => setShowTimePicker(true)}
          >
            <Clock size={18} strokeWidth={2} color="#F59E0B" />
            <Text className="block text-sm font-semibold text-orange-600">
              定时报告设置 {scheduleEnabled && `(${scheduledTime})`}
            </Text>
          </Button>

          {/* 分享按钮（分析完成后显示） */}
          {Object.keys(analysisResults).length > 0 && (
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleShareAll}
            >
              <Share2 size={18} strokeWidth={2} color="#666" />
              <Text className="block text-sm">
                一键分享 ({Object.keys(analysisResults).length})
              </Text>
            </Button>
          )}

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

      {/* 导入收藏弹窗 */}
      {showImportDialog && (
        <View
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowImportDialog(false)}
        >
          <View
            className="bg-white rounded-t-2xl w-full"
            style={{
              maxHeight: '70vh',
              padding: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <View className="flex items-center justify-between mb-4">
              <Text className="block text-base font-bold text-gray-900">选择要导入的收藏</Text>
              <Download size={20} strokeWidth={2} color="#666" />
            </View>

            <ScrollView scrollY className="h-[50vh] mb-4" style={{ minHeight: '300px' }}>
              {allEvents.length === 0 ? (
                <View className="flex items-center justify-center h-full py-12">
                  <Text className="block text-sm text-gray-500 text-center">
                    {isImporting ? '加载中...' : '暂无可用事件\n请检查网络连接'}
                  </Text>
                </View>
              ) : (
                <View className="space-y-2">
                  {allEvents.map((event) => (
                    <View
                      key={event.id}
                      className={`rounded-lg p-3 border-2 ${
                        selectedEvents.has(event.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                      onClick={() => {
                        setSelectedEvents(prev => {
                          const newSet = new Set(prev)
                          if (newSet.has(event.id)) {
                            newSet.delete(event.id)
                          } else {
                            newSet.add(event.id)
                          }
                          return newSet
                        })
                      }}
                    >
                      <View className="flex items-start gap-3">
                        <View
                          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            selectedEvents.has(event.id)
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedEvents.has(event.id) && (
                            <Check size={12} strokeWidth={3} color="#fff" />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text
                            className={`block text-sm font-medium mb-1 ${
                              selectedEvents.has(event.id)
                                ? 'text-blue-700'
                                : 'text-gray-900'
                            }`}
                          >
                            {event.question}
                          </Text>
                          <Text
                            className={`block text-xs ${
                              selectedEvents.has(event.id)
                                ? 'text-blue-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {event.probability.toFixed(1)}% · {event.category}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowImportDialog(false)}
              >
                <Text className="block text-sm">取消</Text>
              </Button>
              <Button
                className="flex-1 bg-blue-500 text-white"
                onClick={confirmImportFavorites}
                disabled={isImporting}
              >
                <Text className="block text-sm">
                  {isImporting ? '导入中...' : `确定 (${selectedEvents.size})`}
                </Text>
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* AI分析功能弹窗 */}
      {showAnalysisDialog && (
        <View
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50"
          onClick={() => setShowAnalysisDialog(false)}
        >
          <View
            className="bg-white rounded-t-2xl w-full max-h-[80vh] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <View className="flex items-center justify-between mb-4">
              <Text className="block text-base font-bold text-gray-900">AI 分析功能</Text>
              <Sparkles size={20} strokeWidth={2} color="#3B82F6" />
            </View>

            {/* 事件选择 */}
            <ScrollView scrollY className="max-h-[40vh] mb-4">
              <View className="space-y-2">
                {favorites.map((event) => (
                  <View
                    key={event.id}
                    className={`rounded-lg p-3 border-2 ${
                      selectedEvents.has(event.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                    onClick={() => {
                      setSelectedEvents(prev => {
                        const newSet = new Set(prev)
                        if (newSet.has(event.id)) {
                          newSet.delete(event.id)
                        } else {
                          newSet.add(event.id)
                        }
                        return newSet
                      })
                    }}
                  >
                    <View className="flex items-start gap-3">
                      <View
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          selectedEvents.has(event.id)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedEvents.has(event.id) && (
                          <Check size={12} strokeWidth={3} color="#fff" />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`block text-sm font-medium mb-1 ${
                            selectedEvents.has(event.id)
                              ? 'text-blue-700'
                              : 'text-gray-900'
                          }`}
                        >
                          {event.question}
                        </Text>
                        <Text
                          className={`block text-xs ${
                            selectedEvents.has(event.id)
                              ? 'text-blue-600'
                              : 'text-gray-500'
                          }`}
                        >
                          {event.probability.toFixed(1)}% · {event.category}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>


            {/* 分享按钮 */}
            {Object.keys(analysisResults).length > 0 && (
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 mb-3"
                onClick={handleShareAll}
              >
                <Share2 size={16} strokeWidth={2} color="#666" />
                <Text className="block text-sm">分享分析结果</Text>
              </Button>
            )}

            {/* 操作按钮 */}
            <View className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAnalysisDialog(false)}
              >
                <Text className="block text-sm">取消</Text>
              </Button>
              <Button
                className="flex-1 bg-blue-500 text-white"
                onClick={handleBatchAnalyze}
                disabled={isAnalyzing || selectedEvents.size === 0}
              >
                <Text className="block text-sm">
                  {isAnalyzing ? '分析中...' : `开始分析 (${selectedEvents.size})`}
                </Text>
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* 时间选择器弹窗 */}
      {showTimePicker && (
        <View
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50"
          onClick={() => setShowTimePicker(false)}
        >
          <View
            className="bg-white rounded-t-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <View className="flex items-center justify-between mb-6">
              <Text className="block text-lg font-bold text-gray-900">设置定时报告</Text>
              <Clock size={24} strokeWidth={2} color="#F59E0B" />
            </View>

            {/* 时间选择器 */}
            <View className="mb-6">
              <Text className="block text-sm text-gray-600 mb-3">
                选择每天发送报告的时间
              </Text>
              <View className="bg-gray-50 rounded-xl p-4">
                <Picker
                  mode="multiSelector"
                  range={[
                    Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')),
                    Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))
                  ]}
                  value={[
                    parseInt(scheduledTime.split(':')[0]),
                    parseInt(scheduledTime.split(':')[1])
                  ]}
                  onChange={handleTimeChange}
                >
                  <View className="flex items-center justify-center gap-2 py-4">
                    <Text className="block text-3xl font-bold text-orange-600">
                      {scheduledTime}
                    </Text>
                    <Text className="block text-sm text-gray-500">每天</Text>
                  </View>
                </Picker>
              </View>
            </View>

            {/* 操作按钮 */}
            <View className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowTimePicker(false)}
              >
                <Text className="block text-sm">取消</Text>
              </Button>
              <Button
                className="flex-1 bg-orange-500 text-white"
                onClick={confirmTimeSetting}
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
