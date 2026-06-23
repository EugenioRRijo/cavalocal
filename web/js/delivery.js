// Costo de envío del cliente: base + por km, redondeado. El backend recalcula igual.
export function deliveryFee(km) {
  const k = Math.min(50, Math.max(0, Number(km) || 0));
  return Math.round((0.80 + 0.35 * k) * 100) / 100;
}
