// siteUrl 仅填最终确认的 origin，如 https://account.github.io。
// 项目站点子路径由 basePath 管理，如 /portfolio/。本地阶段留空 URL。
const creatorDisplayName = 'Nannan Vis';
export const site = {
  siteName: creatorDisplayName,
  creatorDisplayName,
  subtitle: 'Visual Experiments',
  description: '把日常兴趣，变成可以探索的图像与交互。',
  about: '这里记录一些关于电影、色彩与日常生活的可视化尝试。我希望借助数据和交互，换一种方式观察熟悉的事物。',
  locale: 'zh-CN',
  siteUrl: '',
  basePath: '/',
  collectionSize: '约 800 部',
  collectionSizeEn: 'around 800 films', // 与中文数量同步编辑，不加载片库统计。
  contactLinks: [], // 有真实地址时加入 { label: '联系', url: 'mailto:...' }
  links: {
    cinechroma: 'https://nannan1985.github.io/cinechroma-atlas/'
  }
};
