import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import type { Coupon } from "../../../types/promotions";
import { fetchCoupon } from "../../../api/promotions";
import { CouponForm } from "../../../components/promotions/CouponForm";

export default function CouponFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [initial, setInitial] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        const data = await fetchCoupon(Number(id));
        setInitial(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  if (isEdit && loading) {
    return <div className="p-6 text-sm">Loading coupon...</div>;
  }

  return <CouponForm initial={isEdit ? initial : null} />;
}

