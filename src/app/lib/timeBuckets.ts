export function bucketTimestamp(
  ts: number,
  bucket: 'day' | 'week' | 'month' | 'year'
): number {
  const d = new Date(ts);

  if (bucket === 'day') {
    d.setHours(0, 0, 0, 0);
  }

  if (bucket === 'week') {
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
  }

  if (bucket === 'month') {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  }

  if (bucket === 'year') {
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
  }

  return d.getTime();
}

