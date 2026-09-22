export function humanizeEnumValue(value) {
  if (!value) return ''

  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function formatMoney(amount, currencyCode) {
  if (!currencyCode) return String(amount)

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
  }).format(amount)
}
