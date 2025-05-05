export default function moneyFormat(amount: number, currencyCode = 'USD', locale = 'en-US') {
  if (typeof amount !== 'number') {
    return 'Invalid Amount'; // Or handle non-number input as needed
  }

  return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(amount);
}