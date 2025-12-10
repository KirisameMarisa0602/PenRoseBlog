// 常量与模型配置，供 Maid 组件与子组件复用
export const DEFAULT_CONFIG_KEY = 'sakuraFox';
export const WIDTH_KEY = 'maid.panelWidth';
export const SPLIT_KEY = 'maid.splitRatio';
export const RATIO_MIN = 0.1;
export const RATIO_MAX = 0.9;
export const MIN_TOP_PX = 160;
export const MIN_BOTTOM_PX = 160;

export const modelConfigs = {
  // 樱花狐（Bhuxian）
  sakuraFox: {
    label: '樱花狐',
    modelPath: '/live2dmodels/樱花狐/Bhuxian/Bhuxian.model3.json',
    expressions: {
      emotionList: [
        { name: '爱心眼', file: '爱心眼.exp3.json', displayName: '爱心眼' },
        { name: '害羞', file: '害羞.exp3.json', displayName: '害羞' },
        { name: '黑脸', file: '黑脸.exp3.json', displayName: '黑脸' },
        { name: '流泪', file: '流泪动画.exp3.json', displayName: '流泪' },
        { name: '生气', file: '生气.exp3.json', displayName: '生气' },
        { name: '星星眼', file: '星星眼.exp3.json', displayName: '星星眼' },
        { name: '歪嘴L', file: '手动歪嘴L.exp3.json', displayName: '歪嘴L' },
        { name: '歪嘴R', file: '手动歪嘴R.exp3.json', displayName: '歪嘴R' },
      ],
      clothesList: [
        { name: '小狐狸', file: '小狐狸.exp3.json', displayName: '小狐狸' },
        { name: '眼镜', file: '眼镜.exp3.json', displayName: '眼镜' },
      ],
      actionList: [
        { name: '折扇闭', file: '折扇（闭）.exp3.json', displayName: '折扇闭' },
        { name: '折扇开', file: '折扇开.exp3.json', displayName: '折扇开' },
      ],
      sceneList: [
        { name: '血迹', file: '血迹.exp3.json', displayName: '血迹' },
      ],
    },
  },
  // 苹果狐（Apple Fox）
  appleFox: {
    label: '苹果狐',
    modelPath: '/live2dmodels/applefox/A苹果小狐狸/A苹果小狐狸.model3.json',
    expressions: {
      emotionList: [
        { name: '爱心', file: '爱心.exp3.json', displayName: '爱心' },
        { name: '生气', file: '生气.exp3.json', displayName: '生气' },
        { name: '流泪', file: '流泪.exp3.json', displayName: '流泪' },
        { name: '星星', file: '星星.exp3.json', displayName: '星星' },
        { name: '脸红', file: '脸红.exp3.json', displayName: '脸红' },
        { name: '脸黑', file: '脸黑.exp3.json', displayName: '脸黑' },
        { name: '钱钱', file: '钱钱.exp3.json', displayName: '钱钱' },
      ],
      clothesList: [
        { name: '宠物', file: '宠物.exp3.json', displayName: '宠物' },
        { name: '尾巴', file: '尾巴.exp3.json', displayName: '尾巴' },
        { name: '睫毛', file: '睫毛.exp3.json', displayName: '睫毛' },
        { name: '棕发', file: '棕发.exp3.json', displayName: '棕发' },
      ],
      actionList: [
        { name: '口红', file: '口红.exp3.json', displayName: '口红' },
        { name: '手势', file: '手势.exp3.json', displayName: '手势' },
      ],
      sceneList: [
        { name: '背景1', file: '背景1.exp3.json', displayName: '背景1' },
        { name: '背景2', file: '背景2.exp3.json', displayName: '背景2' },
        { name: '背景3', file: '背景3.exp3.json', displayName: '背景3' },
      ],
    },
  },
  // 团子鼠（粉鼠团子 / 团子出击）
  tuanziMouse: {
    label: '团子鼠',
    modelPath: '/live2dmodels/粉鼠团子/团子模型文件/团子出击/团子出击.model3.json',
    expressions: {
      emotionList: [
        { name: '爱心眼', file: '爱心眼.exp3.json', displayName: '爱心眼' },
        { name: '打米了', file: '打米了.exp3.json', displayName: '打米了' },
        { name: '生气', file: '生气.exp3.json', displayName: '生气' },
        { name: '脸红', file: '脸红.exp3.json', displayName: '脸红' },
        { name: '流泪', file: '流泪.exp3.json', displayName: '流泪' },
        { name: '流汗', file: '流汗.exp3.json', displayName: '流汗' },
        { name: '晕', file: '晕.exp3.json', displayName: '晕' },
      ],
      clothesList: [
        { name: '抱枕', file: '抱枕.exp3.json', displayName: '抱枕' },
      ],
      actionList: [
        { name: '捏抱枕', file: '捏抱枕.exp3.json', displayName: '捏抱枕' },
        { name: '唱歌手', file: '唱歌手.exp3.json', displayName: '唱歌手' },
      ],
      sceneList: [],
    },
  },
  // 灵蝶狐（灵蝶之狐模型 / 芊芊）
  lingdieFox: {
    label: '灵蝶狐',
    modelPath: '/live2dmodels/灵蝶之狐模型/芊芊/芊芊.model3.json',
    expressions: {
      emotionList: [
        { name: '星星眼', file: 'xingxingyan.exp3.json', displayName: '星星眼' },
        { name: '脸红1', file: 'lianhong.exp3.json', displayName: '脸红1' },
        { name: '脸红2', file: 'lianhong2.exp3.json', displayName: '脸红2' },
        { name: '黑脸', file: 'heilian.exp3.json', displayName: '黑脸' },
        { name: '流泪', file: 'yanlei.exp3.json', displayName: '流泪' },
        { name: '问号1', file: 'wenhao.exp3.json', displayName: '问号1' },
        { name: '问号2', file: 'wenhao2.exp3.json', displayName: '问号2' },
        { name: '流汗', file: 'liuhan.exp3.json', displayName: '流汗' },
        { name: '无语', file: 'wuyu.exp3.json', displayName: '无语' },
        { name: '钱钱', file: 'qianyan.exp3.json', displayName: '钱钱' },
        { name: '爱心眼', file: 'aixinyan.exp3.json', displayName: '爱心眼' },
        { name: '轮回眼', file: 'lunhuiyan.exp3.json', displayName: '轮回眼' },
        { name: '空白眼', file: 'kongbaiyan.exp3.json', displayName: '空白眼' },
        { name: '星星', file: 'xingxing.exp3.json', displayName: '星星' },
        { name: '生气', file: 'shengqi.exp3.json', displayName: '生气' },
      ],
      clothesList: [
        { name: '眼珠', file: 'yanzhu.exp3.json', displayName: '眼珠' },
        { name: '长发', file: 'changfa.exp3.json', displayName: '长发' },
        { name: '双马尾', file: 'shuangmawei.exp3.json', displayName: '双马尾' },
        { name: '垂耳', file: 'chuier.exp3.json', displayName: '垂耳' },
        { name: '狐狸', file: 'huli.exp3.json', displayName: '狐狸' },
      ],
      actionList: [
        { name: '吐舌', file: 'tushe.exp3.json', displayName: '吐舌' },
        { name: '嘟嘴', file: 'duzui.exp3.json', displayName: '嘟嘴' },
        { name: '鼓嘴', file: 'guzui.exp3.json', displayName: '鼓嘴' },
        { name: '镜子', file: 'jingzi.exp3.json', displayName: '镜子' },
        { name: '笔记本', file: 'bijiben2.exp3.json', displayName: '笔记本2' },
        { name: '打游戏', file: 'dayouxi.exp3.json', displayName: '打游戏' },
        { name: '抱狐狸', file: 'baohuli.exp3.json', displayName: '抱狐狸' },
        { name: '扇子', file: 'shanzi.exp3.json', displayName: '扇子' },
        { name: '话筒', file: 'huatong.exp3.json', displayName: '话筒' },
        { name: '比心', file: 'bixin.exp3.json', displayName: '比心' },
      ],
      sceneList: [],
    },
  },
  // 书仙兔（小书仙青兔）
  shuxianRabbit: {
    label: '书仙兔',
    modelPath: '/live2dmodels/小书仙青兔/小书仙青兔/小书仙青兔.model3.json',
    expressions: {
      emotionList: [
        { name: '星星', file: '星星.exp3.json', displayName: '星星' },
        { name: '流汗', file: '流汗.exp3.json', displayName: '流汗' },
        { name: '流汗2', file: '流汗2.exp3.json', displayName: '流汗2' },
        { name: '爱心眼', file: '爱心眼.exp3.json', displayName: '爱心眼' },
        { name: '生气', file: '生气.exp3.json', displayName: '生气' },
        { name: '困困', file: '困困.exp3.json', displayName: '困困' },
        { name: '惊讶', file: '惊讶.exp3.json', displayName: '惊讶' },
        { name: '哭哭1', file: '哭哭1.exp3.json', displayName: '哭哭1' },
        { name: '哭哭2', file: '哭哭2.exp3.json', displayName: '哭哭2' },
        { name: '脸红', file: '脸红.exp3.json', displayName: '脸红' },
        { name: '脸黑', file: '脸黑.exp3.json', displayName: '脸黑' },
        { name: '钱钱', file: '钱钱.exp3.json', displayName: '钱钱' },
        { name: '问号', file: '问号.exp3.json', displayName: '问号' },
        { name: '黑眼', file: '黑眼.exp3.json', displayName: '黑眼' },
      ],
      actionList: [
        { name: '吐舌', file: '吐舌.exp3.json', displayName: '吐舌' },
        { name: '唱歌', file: '唱歌.exp3.json', displayName: '唱歌' },
        { name: '看书', file: '看书.exp3.json', displayName: '看书' },
        { name: '看书写字', file: '看书写字.exp3.json', displayName: '看书写字' },
        { name: '笔的点击按键', file: '笔的点击按键.exp3.json', displayName: '笔的点击按键' },
      ],
      clothesList: [
        { name: '变小', file: '变小.exp3.json', displayName: '变小' },
        { name: '关耳朵', file: '关耳朵.exp3.json', displayName: '关耳朵' },
        { name: '关飘带', file: '关飘带.exp3.json', displayName: '关飘带' },
      ],
      sceneList: [],
    },
  },
};
