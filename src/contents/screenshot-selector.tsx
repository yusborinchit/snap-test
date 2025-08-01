import { sendToBackground } from "@plasmohq/messaging";
import { useMessage } from "@plasmohq/messaging/hook";
import { useCallback, useEffect, useState } from "react";
import { ABSURD_HIGH_Z_INDEX } from "~/const";

interface Coords {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ScreenshotSelector() {
  const [isActive, setIsActive] = useState(false);
  const [pendingCapture, setPendingCapture] = useState<Rect | null>(null);
  const [startPoint, setStartPoint] = useState<Coords | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentRect, setCurrentRect] = useState<Rect | null>(null);

  useMessage<{ sessionId: string }, unknown>(async (req, res) => {
    if (req.name === "start-screenshot-selection") {
      const { sessionId } = req.body;
      if (!sessionId || typeof sessionId !== "string")
        return res.send({ status: "error" });

      setIsActive(true);
      setSessionId(sessionId);

      document.body.style.overflow = "hidden";
      document.documentElement.style.cursor = "crosshair";

      res.send({ status: "ok" });
    }
  });

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (!isActive) return;

      event.preventDefault();

      setStartPoint({ x: event.clientX, y: event.clientY });
      setCurrentRect({
        x: event.clientX,
        y: event.clientY,
        width: 0,
        height: 0
      });
    },
    [isActive]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isActive || !startPoint) return;

      const x = Math.min(event.clientX, startPoint.x);
      const y = Math.min(event.clientY, startPoint.y);
      const width = Math.abs(event.clientX - startPoint.x);
      const height = Math.abs(event.clientY - startPoint.y);

      setCurrentRect({ x, y, width, height });
    },
    [isActive, startPoint]
  );

  const handleMouseUp = useCallback(async () => {
    if (!isActive || !startPoint || !currentRect) return;

    setIsActive(false);
    setStartPoint(null);
    setCurrentRect(null);

    document.body.style.overflow = "auto";
    document.documentElement.style.cursor = "auto";

    const finalRect = {
      x: currentRect.x,
      y: currentRect.y,
      width: currentRect.width,
      height: currentRect.height
    };

    if (finalRect.width < 5 || finalRect.height < 5) return;
    setPendingCapture(finalRect);
  }, [isActive, startPoint, currentRect]);

  useEffect(() => {
    if (isActive) {
      document.addEventListener("mousedown", handleMouseDown);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isActive, handleMouseDown, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (!isActive && pendingCapture) {
      requestAnimationFrame(() => {
        requestAnimationFrame(async () => {
          await sendToBackground({
            name: "make-screenshot-selection",
            body: { ...pendingCapture, sessionId }
          });
          setPendingCapture(null);
          setSessionId(null);
        });
      });
    }
  }, [isActive, pendingCapture]);

  return (
    isActive && (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "auto",
          zIndex: ABSURD_HIGH_Z_INDEX,
          boxSizing: "border-box",
          border: "3px solid red"
        }}>
        {currentRect && (
          <div
            style={{
              left: currentRect.x,
              top: currentRect.y,
              width: currentRect.width,
              height: currentRect.height,
              pointerEvents: "auto",
              position: "absolute",
              border: "1px solid #6491de",
              borderStyle: "dashed",
              backgroundColor: "#4752ba",
              opacity: 0.3,
              zIndex: ABSURD_HIGH_Z_INDEX
            }}
          />
        )}
      </div>
    )
  );
}
