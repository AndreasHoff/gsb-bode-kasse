import { useEffect, useState } from "react";
import "./UndoToast.css";

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  isUndoing: boolean;
  autoHideDuration?: number;
  onHidden?: () => void;
}

export default function UndoToast({
  message,
  onUndo,
  isUndoing,
  autoHideDuration = 2000,
  onHidden,
}: UndoToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onHidden?.();
      }, 300); // Wait for animation to complete
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [autoHideDuration, onHidden]);

  return (
    <div className={`undo-toast ${isVisible ? "undo-toast--visible" : "undo-toast--hidden"}`}>
      <div className="undo-toast__content">
        <p className="undo-toast__message">{message}</p>
        <button
          type="button"
          className="undo-toast__button"
          onClick={onUndo}
          disabled={isUndoing}
          aria-label="Fortryd seneste bødeopdeling"
        >
          {isUndoing ? "Fortryder..." : "Fortryd"}
        </button>
      </div>
    </div>
  );
}
