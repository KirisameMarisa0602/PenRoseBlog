export const CAT_ICONS = [
  '三花猫.svg','傻猫.svg','博学猫.svg','布偶.svg','无毛猫.svg','暹罗猫.svg','橘猫.svg','波斯猫.svg','牛奶猫.svg','狸花猫.svg','猫.svg','田园猫.svg','白猫.svg','眯眯眼猫.svg','缅因猫.svg','美短.svg','英短猫.svg','蓝猫.svg','黄猫.svg','黑猫.svg'
];

export function getDefaultAvatar(userId) {
  if (!userId) {
    // If no user ID, return a random one (or fixed, but random is better for guests)
    // But for consistency across components for the same session, we might want something else.
    // For now, let's stick to random for guests, but deterministic for logged in users.
    const idx = Math.floor(Math.random() * CAT_ICONS.length);
    return `/icons/avatar_no_sign_in/${CAT_ICONS[idx]}`;
  }
  
  // Simple hash for deterministic selection
  let hash = 0;
  const str = String(userId);
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CAT_ICONS.length;
  return `/icons/avatar_no_sign_in/${CAT_ICONS[index]}`;
}
