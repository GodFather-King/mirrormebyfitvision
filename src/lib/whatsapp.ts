/** Strip non-digits and build a wa.me link with a prefilled message. */
export const buildWhatsAppUrl = (phone: string, message: string) => {
  const digits = (phone || '').replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
};

interface OrderMessageParams {
  itemName: string;
  recommendedSize?: string | null;
}

export const buildOrderMessage = ({ itemName, recommendedSize }: OrderMessageParams) => {
  const sizeLine = recommendedSize ? `\nMy recommended size: ${recommendedSize}` : '';
  return `Hi 👋 I saw this item on MirrorMe and tried it on 🔥\nItem: ${itemName}${sizeLine}\nIs this item available?`;
};
