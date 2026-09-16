export const AVATARS = [
  { id: '1', emoji: '🐶', label: '小狗' },
  { id: '2', emoji: '🐱', label: '小貓' },
  { id: '3', emoji: '🐻', label: '熊熊' },
  { id: '4', emoji: '🦊', label: '狐狸' },
  { id: '5', emoji: '🐼', label: '貓熊' },
  { id: '6', emoji: '🐨', label: '無尾熊' },
  { id: '7', emoji: '🐯', label: '老虎' },
  { id: '8', emoji: '🦁', label: '獅子' },
  { id: '9', emoji: '🐸', label: '青蛙' },
  { id: '10', emoji: '🐮', label: '乳牛' },
  { id: '11', emoji: '🐰', label: '兔子' },
  { id: '12', emoji: '🐹', label: '倉鼠' },
  { id: '13', emoji: '🦋', label: '蝴蝶' },
  { id: '14', emoji: '🦄', label: '獨角獸' },
  { id: '15', emoji: '🐧', label: '企鵝' },
  { id: '16', emoji: '🦖', label: '恐龍' },
  { id: '17', emoji: '🐳', label: '鯨魚' },
  { id: '18', emoji: '🐙', label: '章魚' },
  { id: '19', emoji: '🐢', label: '烏龜' },
  { id: '20', emoji: '🐣', label: '小雞' },
  { id: '21', emoji: '🐵', label: '猴子' },
  { id: '22', emoji: '🎃', label: '南瓜' },
  { id: '23', emoji: '🤖', label: '機器人' },
  { id: '24', emoji: '🦥', label: '樹懶' },
]

export function getAvatarById(id: string) {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0]
}
