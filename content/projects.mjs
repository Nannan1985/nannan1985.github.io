const { scenes } = await import(`./scenes.mjs?build=${Date.now()}`);
// 第一个项目作为首页精选，其余项目会按顺序显示为简洁作品条目。
export const projects = [{
  id: 'cinechroma-atlas',
  title: '影色星图',
  englishTitle: 'Cinechroma Atlas',
  linkKey: 'cinechroma',
  type: '电影 · 色彩 · 交互可视化',
  status: '已上线 · 可交互',
  description: '从一份个人电影收藏出发，探索电影之间的联系，以及画面色彩随时间展开的轨迹。',
  notePath: 'notes/cinechroma-atlas/',
  scenes, overview: scenes[0], detail: scenes[3]
}];
