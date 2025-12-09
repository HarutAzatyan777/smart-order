import { useEffect, useState } from "react";
import { db } from "../firebase/firestore";
import { collection, onSnapshot } from "firebase/firestore";

export default function useOrdersRealtime() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const ref = collection(db, "orders");

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const list = snapshot.docs.map((doc) => {
        const data = doc.data();

        // Detect timestamp (either root-level or nested)
        const createdAt =
          data.createdAt?.toDate?.() ||
          data.timestamps?.createdAt?.toDate?.() ||
          null;

        return {
          id: doc.id,
          ...data,
          createdAt // normalized timestamp
        };
      });

      // Sort safely on frontend
      list.sort((a, b) => {
        const tA = a.createdAt ? a.createdAt.getTime() : 0;
        const tB = b.createdAt ? b.createdAt.getTime() : 0;
        return tB - tA;
      });

      setOrders(list);
    });

    return () => unsubscribe();
  }, []);

  return orders;
}
