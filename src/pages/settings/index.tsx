import { View, Text, ScrollView, Picker } from '@tarojs/components'
import Taro, { useLoad, showToast } from '@tarojs/taro'
import { useState } from 'react'
import { Network } from '@/network'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Sparkles, Share2, Download, LogIn, Bell, Check, Clock } from 'lucide-react-taro'
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
  const [selectedHour, setSelectedHour] = useState(8)
  const [selectedMinute, setSelectedMinute] = useState(0)

  // 弹窗状态
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false)
  const [showTimeDialog, setShowTimeDialog] = useState(false)
  const [allEvents, setAllEvents] = useState<any[]>([])
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())

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
    try {
      // 获取所有可用事件（手动构建query参数）
      const res = await Network.request({
        url: '/api/market/events?page=1&pageSize=50'
      })

      if (res.data?.code === 200) {
        setAllEvents(res.data.data.events || [])
        // 初始化选中状态：已收藏的默认选中
        const favoriteIds = new Set(favorites.map(f => f.id))
        setSelectedEvents(favoriteIds)
        setShowImportDialog(true)
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

  const handleAnalyzeAll = () => {
    if (favorites.length === 0) {
      showToast({
        title: '请先导入收藏',
        icon: 'none'
      })
      return
    }

    // 初始化选中状态：默认全选
    setSelectedEvents(new Set(favorites.map(f => f.id)))
    setShowAnalysisDialog(true)
  }

  const startAnalysis = async () => {
    if (selectedEvents.size === 0) {
      showToast({
        title: '请选择要分析的事件',
        icon: 'none'
      })
      return
    }

    setIsAnalyzing(true)
    try {
      const eventIds = Array.from(selectedEvents)

      const res = await Network.request({
        url: '/api/analysis/batch',
        method: 'POST',
        data: { eventIds }
      })

      if (res.data?.code === 200) {
        setAnalysisResults(res.data.data || {})
        setShowAnalysisDialog(false)

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

  const handleTimePickerChange = (e: any) => {
    const { value } = e.detail
    setSelectedHour(value[0])
    // 分钟索引转换为实际分钟数（0-11对应0-55，每5分钟）
    setSelectedMinute(value[1] * 5)
  }

  const confirmTimePicker = () => {
    const schedule = `每日${selectedHour}:${selectedMinute.toString().padStart(2, '0')}`

    // 调用后端设置定时任务
    Network.request({
      url: '/api/notification/schedule',
      method: 'POST',
      data: { schedule }
    })

    showToast({
      title: `已设置每日 ${selectedHour}:${selectedMinute.toString().padStart(2, '0')} 定时报告`,
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

          {/* 定时报告设置 */}
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => setShowTimeDialog(true)}
          >
            <Bell size={18} strokeWidth={2} color="#666" />
            <Text className="block text-sm">
              {notificationsEnabled
                ? `定时报告 (${selectedHour}:${selectedMinute.toString().padStart(2, '0')})`
                : '设置定时报告'}
            </Text>
          </Button>

          {/* 分享按钮 */}
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50"
          onClick={() => setShowImportDialog(false)}
        >
          <View
            className="bg-white rounded-t-2xl w-full max-h-[70vh] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <View className="flex items-center justify-between mb-4">
              <Text className="block text-base font-bold text-gray-900">选择要导入的收藏</Text>
              <Download size={20} strokeWidth={2} color="#666" />
            </View>

            <ScrollView scrollY className="max-h-[50vh] mb-4">
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

            {/* 定时报告设置 */}
            <View className="border-t border-gray-200 pt-3 mb-3">
              <View className="flex items-center justify-between mb-2">
                <Text className="block text-sm font-semibold text-gray-700">
                  <Bell size={14} strokeWidth={2} color="#666" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  定时报告
                </Text>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={(checked) => setNotificationsEnabled(checked)}
                />
              </View>

              {notificationsEnabled && (
                <View>
                  {/* 苹果闹钟样式的滚轮时间选择器 */}
                  <View className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                    <Text className="block text-sm font-semibold text-gray-700 mb-3">
                      <Clock
                        size={16}
                        strokeWidth={2}
                        color="#666"
                        style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }}
                      />
                      设置定时报告时间
                    </Text>

                    {/* 时间选择器 */}
                    <Picker
                      mode="multiSelector"
                      range={[
                        Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}时`),
                        ['00分', '05分', '10分', '15分', '20分', '25分', '30分', '35分', '40分', '45分', '50分', '55分']
                      ]}
                      value={[selectedHour, Math.floor(selectedMinute / 5)]}
                      onChange={handleTimePickerChange}
                    >
                      <View className="bg-white rounded-lg p-4 border border-gray-300">
                        <View className="flex items-center justify-center gap-3">
                          <View className="flex-1 text-center">
                            <Text className="block text-4xl font-bold text-blue-600">
                              {selectedHour.toString().padStart(2, '0')}
                            </Text>
                            <Text className="block text-xs text-gray-500 mt-1">时</Text>
                          </View>
                          <Text className="block text-3xl font-bold text-gray-400">:</Text>
                          <View className="flex-1 text-center">
                            <Text className="block text-4xl font-bold text-blue-600">
                              {selectedMinute.toString().padStart(2, '0')}
                            </Text>
                            <Text className="block text-xs text-gray-500 mt-1">分</Text>
                          </View>
                        </View>
                        <View className="flex items-center justify-center gap-2 mt-3">
                          <Text className="block text-sm text-gray-500">
                            每日 {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')} 发送AI分析报告
                          </Text>
                        </View>
                      </View>
                    </Picker>

                    <View className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setNotificationsEnabled(false)}
                      >
                        <Text className="block text-xs">关闭</Text>
                      </Button>
                      <Button
                        className="flex-1 bg-blue-500 text-white"
                        onClick={confirmTimePicker}
                      >
                        <Text className="block text-xs">确定</Text>
                      </Button>
                    </View>
                  </View>
                </View>
              )}
            </View>

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
                onClick={startAnalysis}
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

      {/* 定时报告弹窗 */}
      {showTimeDialog && (
        <View
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50"
          onClick={() => setShowTimeDialog(false)}
        >
          <View
            className="bg-white rounded-t-2xl w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <View className="flex items-center justify-between mb-4">
              <Text className="block text-base font-bold text-gray-900">设置定时报告</Text>
              <Bell size={20} strokeWidth={2} color="#3B82F6" />
            </View>

            {/* 苹果闹钟样式的时间选择器 */}
            <Picker
              mode="multiSelector"
              range={[
                Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}时`),
                ['00分', '05分', '10分', '15分', '20分', '25分', '30分', '35分', '40分', '45分', '50分', '55分']
              ]}
              value={[selectedHour, Math.floor(selectedMinute / 5)]}
              onChange={handleTimePickerChange}
            >
              <View className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200 mb-4">
                <View className="flex items-center justify-center gap-3">
                  <View className="flex-1 text-center">
                    <Text className="block text-5xl font-bold text-blue-600">
                      {selectedHour.toString().padStart(2, '0')}
                    </Text>
                    <Text className="block text-sm text-gray-500 mt-2">时</Text>
                  </View>
                  <Text className="block text-4xl font-bold text-gray-400">:</Text>
                  <View className="flex-1 text-center">
                    <Text className="block text-5xl font-bold text-blue-600">
                      {selectedMinute.toString().padStart(2, '0')}
                    </Text>
                    <Text className="block text-sm text-gray-500 mt-2">分</Text>
                  </View>
                </View>
                <View className="flex items-center justify-center mt-4">
                  <Text className="block text-base text-gray-600">
                    每日 {selectedHour}:{selectedMinute.toString().padStart(2, '0')} 发送AI分析报告
                  </Text>
                </View>
              </View>
            </Picker>

            <View className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowTimeDialog(false)}
              >
                <Text className="block text-sm">取消</Text>
              </Button>
              <Button
                className="flex-1 bg-blue-500 text-white"
                onClick={confirmTimePicker}
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
