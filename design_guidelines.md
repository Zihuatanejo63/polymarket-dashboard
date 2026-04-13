# 概率之眼 - 设计指南

> **产品名称**: 概率之眼
> **设计风格**: 专业数据看板、清晰直观
> **目标用户**: 预测市场爱好者、金融从业者、数据爱好者

---

## 1. 品牌定位

- **核心价值**: 让用户快速掌握预测市场的概率动态
- **设计风格**: 专业数据看板，信息密度高但层次清晰
- **视觉特点**: 数据驱动、色彩语义化、卡片式布局

---

## 2. 配色方案

### 主色板

| 用途 | 颜色 | Tailwind 类名 |
|------|------|---------------|
| **品牌主色** | 蓝色 | `text-blue-600` / `bg-blue-600` |
| **背景色** | 白色 | `bg-white` |
| **浅灰背景** | 浅灰 | `bg-gray-50` |
| **卡片背景** | 白色 | `bg-white` |

### 语义色（概率展示）

| 概率区间 | 标签 | 颜色 | Tailwind 自定义类 |
|---------|------|------|-------------------|
| ≥70% | 极有可能 | 翠绿 | `text-[#00E5A0]` |
| 50–69% | 有可能 | 琥珀 | `text-[#FFB020]` |
| 30–49% | 悬而未决 | 天蓝 | `text-[#4A90D9]` |
| 20–29% | 不太可能 | 珊瑚红 | `text-[#FF4D6A]` |
| <20% | 极不可能 | 深红 | `text-[#FF1744]` |

### 中性色

| 用途 | 颜色 | Tailwind 类名 |
|------|------|---------------|
| 主标题 | 深灰 | `text-gray-900` |
| 正文 | 中灰 | `text-gray-700` |
| 辅助说明 | 浅灰 | `text-gray-500` |
| 分割线 | 浅灰 | `border-gray-200` |

### 分类标签色

| 分类 | 颜色 | Tailwind 类名 |
|------|------|---------------|
| 热榜 🔥 | 橙红 | `bg-orange-100 text-orange-700` |
| 金融 💰 | 金色 | `bg-yellow-100 text-yellow-700` |
| 体育 🏅 | 绿色 | `bg-green-100 text-green-700` |
| 科技 🔬 | 蓝色 | `bg-blue-100 text-blue-700` |
| 其他 | 灰色 | `bg-gray-100 text-gray-700` |

---

## 3. 字体规范

| 级别 | 大小 | 用途 | Tailwind 类名 |
|------|------|------|---------------|
| H1 | 24px | 页面主标题 | `text-2xl font-bold` |
| H2 | 20px | 卡片标题 | `text-xl font-semibold` |
| H3 | 18px | 区块标题 | `text-lg font-semibold` |
| Body | 14px | 正文内容 | `text-sm` |
| Caption | 12px | 辅助信息 | `text-xs text-gray-500` |

---

## 4. 间距系统

### 页面级间距

| 区域 | 间距 | Tailwind 类名 |
|------|------|---------------|
| 页面边距 | 16px | `px-4 py-4` |
| 卡片间距 | 12px | `gap-3` |
| 分组间距 | 16px | `gap-4` |

### 卡片内边距

| 场景 | 间距 | Tailwind 类名 |
|------|------|---------------|
| 紧凑卡片 | 12px | `p-3` |
| 标准卡片 | 16px | `p-4` |
| 宽松卡片 | 20px | `p-5` |

---

## 5. 组件使用原则

### 通用 UI 组件优先级

- **按钮**: 优先使用 `@/components/ui/button`
- **输入框**: 优先使用 `@/components/ui/input`
- **标签页**: 优先使用 `@/components/ui/tabs`
- **卡片**: 优先使用 `@/components/ui/card`
- **弹窗**: 优先使用 `@/components/ui/dialog`
- **开关**: 优先使用 `@/components/ui/switch`
- **下拉选择**: 优先使用 `@/components/ui/select`
- **Toast**: 优先使用 `@/components/ui/sonner`
- **加载态**: 优先使用 `@/components/ui/skeleton`

### 页面组件选型原则

在创建页面时，先判断页面需要哪些 UI 单元：

**首页 - 概率看板**
- 概率卡片 → Card 组件
- 分类标签 → Tabs 组件（横向滑动）
- 下拉刷新 → Taro 原生能力
- 骨架屏 → Skeleton 组件

**收藏页**
- 列表项 → Card 组件
- 空状态 → 自定义空状态组件（可复用）

**设置页**
- 分组 → Card 组件
- 开关 → Switch 组件
- 选择器 → Select 组件

### 禁止事项

- 禁止用 `View/Text` + Tailwind 手搓按钮、输入框、弹窗等通用组件
- 通用 UI 组件优先从 `@/components/ui/*` 导入使用
- 组件库缺失时，优先补齐到 `src/components/ui`，再在页面中引用

---

## 6. 导航结构

### TabBar 配置

使用底部 TabBar 导航，包含 3 个主要页面：

| 图标 | 页面 | 文字 | 图标名称 |
|------|------|------|---------|
| 📊 | 首页 | 看板 | BarChart3 |
| ⭐ | 收藏 | 我的收藏 | Star |
| ⚙️ | 设置 | 设置 | Settings |

### 页面路由

```
pages/index/index        # 首页 - 概率看板
pages/favorites/index    # 收藏页
pages/settings/index     # 设置页
pages/detail/index       # 事件详情页（可选，P2优先级）
```

### 导航规则

- **TabBar 页面**: 使用 `Taro.switchTab()` 切换
- **普通页面**: 使用 `Taro.navigateTo()` 跳转
- **返回**: 使用 `Taro.navigateBack()` 返回

---

## 7. 容器样式原则

### 卡片样式

```tsx
// 标准卡片
<Card className="bg-white rounded-2xl shadow-sm overflow-hidden">
  <CardContent className="p-4">
    {/* 卡片内容 */}
  </CardContent>
</Card>

// 带边框卡片
<Card className="bg-white rounded-2xl border border-gray-200">
  <CardContent className="p-4">
    {/* 卡片内容 */}
  </CardContent>
</Card>
```

### 圆角规范

- **小元素**: `rounded-lg` (8px)
- **标准卡片**: `rounded-xl` (12px)
- **大卡片/容器**: `rounded-2xl` (16px)

### 阴影规范

- **浅阴影**: `shadow-sm` (卡片)
- **标准阴影**: `shadow-md` (弹窗)
- **深阴影**: `shadow-lg` (浮动元素)

---

## 8. 状态展示原则

### 空状态

```tsx
<View className="flex flex-col items-center justify-center py-20">
  <View className="w-20 h-20 mb-4 text-gray-300">
    {/* 空状态图标 */}
  </View>
  <Text className="block text-center text-gray-500 text-sm">
    暂无数据
  </Text>
</View>
```

### 加载态

```tsx
// 页面级加载
<Skeleton className="h-24 w-full rounded-xl mb-3" />
<Skeleton className="h-24 w-full rounded-xl mb-3" />

// 列表项加载
<Skeleton className="h-20 w-full rounded-lg mb-2" />
```

### 错误状态

```tsx
<View className="flex flex-col items-center justify-center py-20">
  <Text className="block text-center text-red-500 text-sm mb-4">
    加载失败
  </Text>
  <Button onClick={onRetry} size="sm">
    重试
  </Button>
</View>
```

---

## 9. 小程序约束

### 包体积限制

- 主包体积 ≤ 2MB
- 总包体积 ≤ 20MB
- 图片资源必须使用 TOS 对象存储

### 性能优化

- 图片懒加载: 使用 `lazyLoad` 属性
- 列表分页: 每页 20 条
- 数据缓存: 使用 TTL 60s 缓存

### 合规要求

- 禁止在前端代码中包含敏感词表
- 敏感过滤必须在服务端执行
- 页面名称不得包含 "Polymarket" 字样
- 必须包含免责声明："本产品仅供信息参考，不构成投资建议"

---

## 10. 设计原则总结

### 核心原则

1. **数据优先**: 清晰展示概率数据，信息层次分明
2. **语义化颜色**: 用颜色直观表达概率高低
3. **组件复用**: 优先使用 `@/components/ui/*` 中的组件
4. **性能优先**: 懒加载、分页、缓存
5. **合规优先**: 敏感过滤服务端，前端无感知

### 视觉层次

```
1. 核心数据（概率百分比） - 最大、最醒目
2. 辅助数据（价格、成交量） - 次要
3. 元数据（分类、标签） - 辅助
4. 操作按钮（收藏、刷新） - 易触达
```

### 交互原则

- **直观**: 一目了然，无需学习成本
- **快速**: 减少操作步骤，提升效率
- **反馈**: 每个操作都有明确的视觉反馈
- **容错**: 提供重试、取消等容错机制
