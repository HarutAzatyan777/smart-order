import { useEffect, useState } from "react";
import { db } from "../firebase/firestore";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

export default function useOrdersRealtime() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrders(list);
    });

    return () => unsub();
  }, []);

  return orders;
}
