import { View, Text } from '@tarojs/components'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import './index.config'

const SettingsPage = () => {
  return (
    <View className="min-h-screen bg-gray-50 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">显示设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <View className="flex items-center justify-between">
            <Text className="block text-sm text-gray-700">显示波动提示</Text>
            <Switch />
          </View>
          <View className="flex items-center justify-between">
            <Text className="block text-sm text-gray-700">仅显示高置信度</Text>
            <Switch />
          </View>
        </CardContent>
      </Card>

      <Card className="mt-4">
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
    </View>
  )
}

export default SettingsPage
