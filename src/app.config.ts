export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/favorites/index',
    'pages/settings/index',
    'pages/detail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '概率之眼',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f5f5f5'
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#1890ff',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '看板',
        iconPath: './assets/tabbar/chart-bar.png',
        selectedIconPath: './assets/tabbar/chart-bar-active.png'
      },
      {
        pagePath: 'pages/favorites/index',
        text: '收藏',
        iconPath: './assets/tabbar/star.png',
        selectedIconPath: './assets/tabbar/star-active.png'
      },
      {
        pagePath: 'pages/settings/index',
        text: '设置',
        iconPath: './assets/tabbar/settings.png',
        selectedIconPath: './assets/tabbar/settings-active.png'
      }
    ]
  }
})
