const LOWER_INSTALLATION_LIMIT = 31_000;
const LOCAL_INSTALLATION_BELOW_LIMIT = 3_500;
const LOCAL_INSTALLATION_ABOVE_LIMIT = 5_000;

/**
 * Returns the customer-facing tombstone total, including local installation.
 * Non-numeric values such as "Price Available on Request" are left unchanged.
 */
export function getCatalogueTotal(price: string | null): string | null {
  if (!price) return price;

  const match = price.match(/[\d][\d\s,.]*/);
  if (!match) return price;

  const numericPrice = Number(match[0].replace(/[\s,]/g, ""));
  if (!Number.isFinite(numericPrice)) return price;

  const installationAmount =
    numericPrice <= LOWER_INSTALLATION_LIMIT
      ? LOCAL_INSTALLATION_BELOW_LIMIT
      : LOCAL_INSTALLATION_ABOVE_LIMIT;

  const total = Math.round(numericPrice + installationAmount);
  return `R${total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}.00`;
}
