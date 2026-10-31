export function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "$0";
  return `$${Number.isInteger(number) ? number : number.toFixed(2)}`;
}

const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export function formatEuroPrice(value) {
  const number = Number(value);
  return euroFormatter.format(Number.isFinite(number) ? number : 0);
}
