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

interface DeliveryOrderMessageParams {
  itemName: string;
  size: string;
  customerName: string;
  customerPhone: string;
  street: string;
  area: string;
  city: string;
  customerMessage?: string | null;
  tryOnImageUrl?: string | null;
}

/**
 * Build a complete, brand-ready WhatsApp message containing every detail
 * the brand needs to fulfill the order.
 */
export const buildDeliveryOrderMessage = ({
  itemName,
  size,
  customerName,
  customerPhone,
  street,
  area,
  city,
  customerMessage,
  tryOnImageUrl,
}: DeliveryOrderMessageParams) => {
  const lines = [
    'Hi 👋 I would like to order this item from MirrorMe:',
    '',
    `🛍️ *Item:* ${itemName}`,
    `📏 *Size:* ${size}`,
    '',
    '👤 *Customer details*',
    `Name: ${customerName}`,
    `Phone: ${customerPhone}`,
    '',
    '📍 *Delivery address*',
    street,
    `${area}, ${city}`,
  ];
  if (customerMessage && customerMessage.trim()) {
    lines.push('', `💬 *Note:* ${customerMessage.trim()}`);
  }
  if (tryOnImageUrl) {
    lines.push('', `🪞 *My virtual try-on:* ${tryOnImageUrl}`);
  }
  lines.push('', 'Please confirm availability and total. Thank you!');
  return lines.join('\n');
};
