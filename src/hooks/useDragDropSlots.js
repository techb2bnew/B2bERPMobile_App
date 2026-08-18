import { useCallback, useRef, useState } from 'react';

const LONG_PRESS_MS = 350;
const MOVE_THRESHOLD = 12;
const TAP_MAX_MS = 400;

// Generic long-press-and-drag-between-slots engine shared by the meeting
// calendar (day/week views drop onto a date or hour slot) and the meeting
// Kanban board (drop onto a status column). A "slot" is any droppable region
// registered via registerSlot(key, ref) — the caller decides what a slot key
// means (a date string, an hour label, a status name, ...).
export const useDragDropSlots = ({ onDrop, onTap } = {}) => {
  const [dragState, setDragState] = useState(null);
  const [hoverSlot, setHoverSlot] = useState(null);

  const dragStateRef = useRef(null);
  const slotRefs = useRef({});
  const touchStartRef = useRef({});
  const pressTimerRef = useRef({});

  const registerSlot = useCallback((key, ref) => {
    slotRefs.current[key] = ref;
  }, []);

  const findSlotAtPoint = useCallback((x, y, slotKeys) => {
    return new Promise(resolve => {
      let pending = slotKeys.length;
      let matched = null;

      if (pending === 0) {
        resolve(null);
        return;
      }

      slotKeys.forEach(key => {
        const ref = slotRefs.current[key];
        if (!ref) {
          pending -= 1;
          if (pending === 0) resolve(matched);
          return;
        }

        ref.measureInWindow((left, top, width, height) => {
          if (x >= left && x <= left + width && y >= top && y <= top + height) {
            matched = key;
          }
          pending -= 1;
          if (pending === 0) resolve(matched);
        });
      });
    });
  }, []);

  const startDrag = useCallback((item, slotKey, pageX, pageY) => {
    const next = { item, x: pageX, y: pageY };
    dragStateRef.current = next;
    setDragState(next);
    setHoverSlot(slotKey);
  }, []);

  const endDrag = useCallback(
    async (x, y, slotKeys) => {
      const current = dragStateRef.current;
      dragStateRef.current = null;
      setDragState(null);
      setHoverSlot(null);

      if (!current?.item) {
        return;
      }

      const targetSlot = await findSlotAtPoint(x, y, slotKeys);
      if (targetSlot) {
        onDrop?.(current.item, targetSlot);
      }
    },
    [findSlotAtPoint, onDrop],
  );

  const dragHandlersFor = useCallback(
    (item, currentSlotKey, slotKeys) => {
      const itemId = item?.id;

      return {
        onTouchStart: event => {
          const { pageX, pageY } = event.nativeEvent;
          touchStartRef.current[itemId] = { pageX, pageY, time: Date.now() };
          pressTimerRef.current[itemId] = setTimeout(() => {
            startDrag(item, currentSlotKey, pageX, pageY);
          }, LONG_PRESS_MS);
        },
        onTouchMove: event => {
          const { pageX, pageY } = event.nativeEvent;
          const start = touchStartRef.current[itemId];

          if (!dragStateRef.current && start) {
            const moved = Math.abs(pageX - start.pageX) + Math.abs(pageY - start.pageY);
            if (moved > MOVE_THRESHOLD) {
              clearTimeout(pressTimerRef.current[itemId]);
            }
          }

          if (dragStateRef.current?.item?.id !== itemId) {
            return;
          }

          setDragState(prev => (prev ? { ...prev, x: pageX, y: pageY } : null));
          findSlotAtPoint(pageX, pageY, slotKeys).then(slot => {
            if (dragStateRef.current?.item?.id === itemId) {
              setHoverSlot(slot);
            }
          });
        },
        onTouchEnd: event => {
          clearTimeout(pressTimerRef.current[itemId]);
          const { pageX, pageY } = event.nativeEvent;

          if (dragStateRef.current?.item?.id === itemId) {
            endDrag(pageX, pageY, slotKeys);
            touchStartRef.current[itemId] = null;
            return;
          }

          const start = touchStartRef.current[itemId];
          if (start && Date.now() - start.time < TAP_MAX_MS) {
            onTap?.(item);
          }
          touchStartRef.current[itemId] = null;
        },
        onTouchCancel: () => {
          clearTimeout(pressTimerRef.current[itemId]);
          if (dragStateRef.current?.item?.id === itemId) {
            endDrag(dragStateRef.current.x, dragStateRef.current.y, slotKeys);
          }
          touchStartRef.current[itemId] = null;
        },
      };
    },
    [endDrag, findSlotAtPoint, startDrag, onTap],
  );

  return { dragState, hoverSlot, registerSlot, dragHandlersFor };
};
