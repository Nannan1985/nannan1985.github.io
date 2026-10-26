// Build-time interface translations. Missing English strings fail the build.
const english = {
  '跳到主要内容': 'Skip to content', '首页': 'Home', '主导航': 'Main navigation',
  '作品': 'Work', '创作手记': 'Making notes', '关于': 'About', '联系': 'Contact',
  '个人观察与可视化尝试': 'Personal observations, visual experiments',
  '放大查看：': 'Enlarge: ', '查看大图': 'View full image', '作品图': 'Work image',
  '原始尺寸': 'Original size', '适合窗口': 'Fit to window', '关闭大图': 'Close image', '关闭': 'Close',
  '可使用浏览器缩放查看细节 · 按 Esc 或点击关闭返回': 'Use browser zoom for details · Press Esc or Close to return',
  '进入作品': 'Explore the work', '阅读创作手记': 'Read the making notes',
  '六个关键视角 · 作品内有完整 11 步导览': 'Six views · Find the full 11-step tour in the work',
  '向下滚动 · 六个关键视角 · 也可点选章节': 'Scroll to explore · Or choose a chapter',
  '静态阅读': 'Static view', '恢复动效': 'Enable motion', '已减少动效': 'Reduced motion',
  '作品介绍章节': 'Work introduction chapters', '亲自探索影色星图': 'Explore Cinechroma Atlas',
  '更多作品': 'More work', '阅读手记': 'Read the notes', '关于这里': 'About this space',
  '返回主页': 'Back to home', '文章目录': 'On this page', '本文内容': 'Contents',
  '从文字回到图像。': 'From words back to images.', '进入影色星图': 'Explore Cinechroma Atlas',
  '页面未找到': 'Page not found', '这页暂时不在这里。': 'This page is not here.',
  '地址可能有误，可以从主页继续探索。': 'The address may be incorrect. Continue exploring from the home page.',
  '继续探索作品与创作手记。': 'Explore the work and its making notes.',
  '语言': 'Language'
};
export const translator = locale => text => {
  if (locale !== 'en') return text;
  if (!(text in english)) throw new Error(`Missing English UI copy: ${text}`);
  return english[text];
};
