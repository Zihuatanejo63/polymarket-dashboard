export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '事件详情'
    })
  : { navigationBarTitleText: '事件详情' }
