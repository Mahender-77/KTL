export interface DeliverySubOrderItem {
  product: {
    _id: string;
    name: string;
    images: string[];
  };
  variant: string;
  quantity: number;
  price: number;
}

/** Sub-order payload from `/api/delivery/suborders` and `/api/delivery/suborders/:id`. */
export interface DeliverySubOrder {
  _id: string;
  order: {
    _id: string;
    totalAmount?: number;
    paymentStatus?: "pending" | "paid" | "failed";
    orderStatus?: string;
    user: {
      _id: string;
      name: string;
      email: string;
      phone?: string;
    };
    address: {
      name: string;
      phone: string;
      address: string;
      city: string;
      pincode: string;
      landmark?: string;
    };
    createdAt: string;
  };
  category: {
    _id: string;
    name: string;
  };
  categoryName: string;
  items: DeliverySubOrderItem[];
  totalAmount: number;
  deliveryStatus: "pending" | "accepted" | "out_for_delivery" | "delivered";
  /** May be null, a string id, or a populated `{ _id, name, phone }` from the API. */
  deliveryBoyId: string | { _id?: string; name?: string; phone?: string } | null;
  createdAt: string;
}

export function isUnassignedPool(sub: DeliverySubOrder): boolean {
  const id = sub.deliveryBoyId;
  if (id == null) return true;
  if (typeof id === "string") return id.length === 0;
  return false;
}
