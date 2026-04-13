export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '我的收藏',
      enablePullDownRefresh: true,
      backgroundTextStyle: 'dark'
    })
  : { navigationBarTitleText: '我的收藏' }
