import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const STORAGE_KEY = 'mm_delivery_prefill_v1';

export interface DeliveryFormState {
  customer_name: string;
  customer_phone: string;
  delivery_street: string;
  delivery_area: string;
  delivery_city: string;
  size: string;
  message: string;
}

export const emptyDeliveryForm: DeliveryFormState = {
  customer_name: '',
  customer_phone: '',
  delivery_street: '',
  delivery_area: '',
  delivery_city: '',
  size: '',
  message: '',
};

/** Load prefill values from localStorage (graceful if missing/corrupt). */
export const loadDeliveryPrefill = (): Partial<DeliveryFormState> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Never restore the size or message — those are per-order
    const { customer_name, customer_phone, delivery_street, delivery_area, delivery_city } = parsed || {};
    return { customer_name, customer_phone, delivery_street, delivery_area, delivery_city };
  } catch {
    return {};
  }
};

/** Persist the parts of the form that are reusable across orders. */
export const persistDeliveryPrefill = (state: DeliveryFormState) => {
  try {
    const toSave = {
      customer_name: state.customer_name,
      customer_phone: state.customer_phone,
      delivery_street: state.delivery_street,
      delivery_area: state.delivery_area,
      delivery_city: state.delivery_city,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    /* ignore quota / privacy errors */
  }
};

interface Props {
  value: DeliveryFormState;
  onChange: (next: DeliveryFormState) => void;
  /** When true, prefill fields from localStorage on mount if empty. */
  autoPrefill?: boolean;
}

/**
 * Reusable delivery form. Includes ALL required fields:
 * Full Name, Phone, Street, Area, City, Size, optional Message.
 */
const DeliveryFormFields = ({ value, onChange, autoPrefill = true }: Props) => {
  // One-time prefill from localStorage
  useEffect(() => {
    if (!autoPrefill) return;
    const isEmpty =
      !value.customer_name &&
      !value.customer_phone &&
      !value.delivery_street &&
      !value.delivery_area &&
      !value.delivery_city;
    if (!isEmpty) return;
    const pre = loadDeliveryPrefill();
    if (Object.keys(pre).length === 0) return;
    onChange({ ...value, ...pre });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (patch: Partial<DeliveryFormState>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="df-name">Full name *</Label>
        <Input
          id="df-name"
          value={value.customer_name}
          onChange={(e) => set({ customer_name: e.target.value })}
          placeholder="e.g., Sarah Mokoena"
          maxLength={100}
          autoComplete="name"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="df-phone">Phone number *</Label>
        <Input
          id="df-phone"
          type="tel"
          value={value.customer_phone}
          onChange={(e) => set({ customer_phone: e.target.value })}
          placeholder="e.g., 082 123 4567"
          maxLength={20}
          autoComplete="tel"
          inputMode="tel"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="df-street">Street address *</Label>
        <Input
          id="df-street"
          value={value.delivery_street}
          onChange={(e) => set({ delivery_street: e.target.value })}
          placeholder="e.g., 12 Long Street"
          maxLength={200}
          autoComplete="street-address"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="df-area">Area / Suburb *</Label>
          <Input
            id="df-area"
            value={value.delivery_area}
            onChange={(e) => set({ delivery_area: e.target.value })}
            placeholder="e.g., Umlazi"
            maxLength={100}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="df-city">City *</Label>
          <Input
            id="df-city"
            value={value.delivery_city}
            onChange={(e) => set({ delivery_city: e.target.value })}
            placeholder="e.g., Durban"
            maxLength={100}
            autoComplete="address-level2"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Size *</Label>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set({ size: s })}
              className={
                'px-3 py-1.5 text-xs rounded-full border transition-colors ' +
                (value.size === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:border-primary')
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="df-message">Message (optional)</Label>
        <Textarea
          id="df-message"
          value={value.message}
          onChange={(e) => set({ message: e.target.value })}
          placeholder="Anything the brand should know?"
          rows={2}
          maxLength={500}
        />
      </div>
    </div>
  );
};

export default DeliveryFormFields;
