const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

/**
 * 格式化日期部分 (第一列)
 * 同一天: 4月3日 (五)
 * 跨天: 4/03 (五) ~ 4/05 (日)
 */
export function getEventDateLabel(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  
  const isSameDay = 
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const fmtFull = (d: Date) => 
    `${d.getMonth() + 1}月${d.getDate()}日 (${WEEKDAY[d.getDay()]})`;
  
  const fmtShort = (d: Date) => 
    `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, "0")} (${WEEKDAY[d.getDay()]})`;

  if (isSameDay) {
    return fmtFull(start);
  }
  
  // 跨天時，為了美觀採用更精簡的格式
  return `${fmtShort(start)} ~ ${fmtShort(end)}`;
}

/**
 * 格式化時間部分 (第二列)
 * 顯示格式: 4:00 PM ~ 9:30 PM
 */
export function getEventTimeRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);

  const timeFmt = (d: Date) => {
    let hour = d.getHours();
    const minute = String(d.getMinutes()).padStart(2, "0");
    const period = hour >= 12 ? "PM" : "AM";
    let displayHour = hour % 12;
    if (displayHour === 0) displayHour = 12;
    return `${displayHour}:${minute} ${period}`;
  };

  return `${timeFmt(start)} ~ ${timeFmt(end)}`;
}

export function formatEventDate(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}月${d.getDate()}日 (${WEEKDAY[d.getDay()]})`;
  const timeFmt = (d: Date) => {
    const hour = d.getHours();
    const minute = String(d.getMinutes()).padStart(2, "0");
    const period = hour >= 12 ? "下午" : "上午";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${period} ${displayHour}:${minute}`;
  };
  return `${fmt(start)} ${timeFmt(start)} ~ ${timeFmt(end)}`;
}

export function formatEventDateShort(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}月${d.getDate()}日 (${WEEKDAY[d.getDay()]})`;
  const timeFmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fmt(start)} ${timeFmt(start)} ~ ${timeFmt(end)}`;
}
