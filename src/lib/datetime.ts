export function formatTaipeiDateTime(date: Date | string) {
  return new Date(date).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
}
