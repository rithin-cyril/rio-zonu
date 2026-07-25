import { useEffect, useState } from "react";

const KEY = "admin:showDates";
const EVT = "admin:showDates:change";

function read(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(KEY);
  return v === null ? true : v === "1";
}

export function useShowDates(): [boolean, (next: boolean) => void] {
  const [show, setShow] = useState<boolean>(true);

  useEffect(() => {
    setShow(read());
    const onChange = () => setShow(read());
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const update = (next: boolean) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, next ? "1" : "0");
      window.dispatchEvent(new Event(EVT));
    }
    setShow(next);
  };

  return [show, update];
}