const whole = new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Formats poisha as taka, showing decimals only when there are any. */
export function money(poisha: number): string {
  const taka = poisha / 100;
  return `৳${(Number.isInteger(taka) ? whole : decimal).format(taka)}`;
}

export const toPoisha = (taka: number) => Math.round(taka * 100);
export const toTaka = (poisha: number) => poisha / 100;

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};
