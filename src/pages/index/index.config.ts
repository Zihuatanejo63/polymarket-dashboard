export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '概率之眼',
      enablePullDownRefresh: true,
      backgroundTextStyle: 'dark',
      backgroundColor: '#f5f5f5'
    })
  : { navigationBarTitleText: '概率之眼' }
