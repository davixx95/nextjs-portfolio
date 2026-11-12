"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";

interface CustomScrollbarProps {
  /** Optional custom container ref. If omitted, tracks window scroll. */
  containerRef?: React.RefObject<HTMLElement | null>;
}

/** Breathing room (px) between the track and the header / bottom edge. */
const TRACK_GAP = 4;

export default function CustomScrollbar({
  containerRef,
}: CustomScrollbarProps) {
  const [isHovered, setIsHovered] = useState(false); // True when mouse is physically over the scrollbar
  const [isScrolling, setIsScrolling] = useState(false); // True briefly after a scroll event
  const [isDragging, setIsDragging] = useState(false);

  // When tracking the window, the track starts below the sticky page header:
  // the header never scrolls, so the bar only spans the area that does.
  const [topInset, setTopInset] = useState(0);
  const topInsetRef = useRef(0);
  useEffect(() => {
    if (containerRef) return;
    const header = document.querySelector("header");
    if (!header) return;
    const ro = new ResizeObserver(() => {
      const h = header.getBoundingClientRect().height;
      topInsetRef.current = h;
      setTopInset(h);
    });
    ro.observe(header);
    return () => ro.disconnect();
  }, [containerRef]);

  const thumbPosRef = useRef<HTMLDivElement>(null);
  const thumbVisualRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cached layout metrics to prevent layout thrashing
  const metricsRef = useRef({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
    thumbHeight: 0,
    maxScrollTop: 0,
    maxThumbTop: 0,
  });

  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);
  const originalScrollBehavior = useRef<string>("");

  const updatePositionDirect = useCallback(() => {
    let scrollTop = 0;
    let scrollHeight = 0;
    let clientHeight = 0;

    if (containerRef?.current) {
      const el = containerRef.current;
      scrollTop = el.scrollTop;
      scrollHeight = el.scrollHeight;
      clientHeight = el.clientHeight;
    } else {
      scrollTop = window.scrollY || document.documentElement.scrollTop;
      scrollHeight = document.documentElement.scrollHeight;
      clientHeight = window.innerHeight;
    }

    if (scrollHeight <= clientHeight || clientHeight === 0) {
      return;
    }

    const trackHeight = clientHeight - topInsetRef.current - 2 * TRACK_GAP;
    const minThumbHeight = 40;
    const computedHeight = Math.max(
      (clientHeight / scrollHeight) * trackHeight,
      minThumbHeight,
    );
    const maxScrollTop = scrollHeight - clientHeight;
    const maxThumbTop = trackHeight - computedHeight;
    const computedTop =
      maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxThumbTop : 0;

    metricsRef.current = {
      scrollTop,
      scrollHeight,
      clientHeight,
      thumbHeight: computedHeight,
      maxScrollTop,
      maxThumbTop,
    };

    // Direct DOM mutation for 60fps/120fps smooth performance without React re-render overhead
    if (thumbPosRef.current) {
      thumbPosRef.current.style.transform = `translate3d(0, ${computedTop}px, 0)`;
      thumbPosRef.current.style.height = `${computedHeight}px`;
    }
  }, [containerRef]);

  const handleScroll = useCallback(() => {
    if (rafIdRef.current !== null) return;

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      updatePositionDirect();
    });

    // Temporarily indicate scrolling state
    setIsScrolling(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1200);
  }, [updatePositionDirect]);

  useEffect(() => {
    const target = containerRef?.current || window;

    // Initial position update
    updatePositionDirect();

    target.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      target.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [containerRef, handleScroll, updatePositionDirect]);

  // Re-fit the thumb when the header's height (and so the track) changes.
  useEffect(() => {
    updatePositionDirect();
  }, [topInset, updatePositionDirect]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const { maxScrollTop, maxThumbTop } = metricsRef.current;
      if (maxThumbTop <= 0) return;

      const deltaY = e.clientY - dragStartY.current;
      const scrollDelta = (deltaY / maxThumbTop) * maxScrollTop;
      const newScrollTop = Math.min(
        Math.max(dragStartScrollTop.current + scrollDelta, 0),
        maxScrollTop,
      );

      if (containerRef?.current) {
        containerRef.current.scrollTop = newScrollTop;
      } else {
        window.scrollTo({ top: newScrollTop, behavior: "auto" });
      }

      // Instantly update visual position to eliminate 1-frame lag during drag
      updatePositionDirect();
    },
    [containerRef, updatePositionDirect],
  );

  const handleMouseUp = useCallback(function handleMouseUp() {
    setIsDragging(false);

    if (containerRef?.current) {
      containerRef.current.style.scrollBehavior =
        originalScrollBehavior.current;
    } else {
      document.documentElement.style.scrollBehavior =
        originalScrollBehavior.current;
    }

    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [containerRef, handleMouseMove]);

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;

    if (containerRef?.current) {
      dragStartScrollTop.current = containerRef.current.scrollTop;
      originalScrollBehavior.current =
        containerRef.current.style.scrollBehavior;
      containerRef.current.style.scrollBehavior = "auto"; // Force instant scroll
    } else {
      dragStartScrollTop.current =
        window.scrollY || document.documentElement.scrollTop;
      originalScrollBehavior.current =
        document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto"; // Force instant scroll
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const isActive = isHovered || isDragging || isScrolling;

  return (
    <div
      className="fixed right-1 z-50 w-2.5 pointer-events-auto select-none"
      style={{ top: topInset + TRACK_GAP, bottom: TRACK_GAP }}
    >
      {/* Position container: absolutely NO CSS transitions on transform to guarantee instant 1:1 scroll tracking */}
      <div
        ref={thumbPosRef}
        className="absolute top-0 left-0 right-0 will-change-transform"
        style={{ transform: "translate3d(0,0,0)" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Inner visual thumb: CSS transition applies strictly to background-color & opacity */}
        <div
          ref={thumbVisualRef}
          onMouseDown={handleMouseDown}
          className={`h-full w-full rounded-full cursor-pointer transition-colors duration-300 ease-in-out ${
            isActive
              ? "bg-primary shadow-md opacity-100"
              : "bg-border opacity-60"
          }`}
        />
      </div>
    </div>
  );
}
