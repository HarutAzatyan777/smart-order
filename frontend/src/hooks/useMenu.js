import { useState, useEffect } from "react";

export default function useMenu() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5001/swift-stack-444307-m4/us-central1/api/menu")
      .then(res => res.json())
      .then(data => {
        setMenu(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Menu fetch error:", err);
        setLoading(false);
      });
  }, []);

  return { menu, loading };
}
