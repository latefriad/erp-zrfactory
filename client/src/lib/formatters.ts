export function formatCurrency(amount: number, locale: string = 'fr'): string {
  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : 'fr-DZ', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);

  if (locale === 'ar') {
    return `${formatted} د.ج`;
  }
  return `${formatted} DA`;
}

export function formatDate(dateString: string, locale: string = 'fr'): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : 'fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string, locale: string = 'fr'): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : 'fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatPercentage(value: number): string {
  return `${value}%`;
}
