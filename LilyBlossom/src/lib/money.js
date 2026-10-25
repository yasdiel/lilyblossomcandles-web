export function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "$0";
  return `$${Number.isInteger(number) ? number : number.toFixed(2)}`;
}
