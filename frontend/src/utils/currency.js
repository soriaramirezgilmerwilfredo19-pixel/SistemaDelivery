export const CURRENCY = 'S/';
export const CURRENCY_CODE = 'PEN';

export function formatMoney(value) {
  const n = Number(value || 0);
  return `${CURRENCY} ${n.toFixed(2)}`;
}
