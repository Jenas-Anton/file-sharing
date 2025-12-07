// app/components/GooeyNav/GooeyNav.js
"use client";
import React, { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./GooeyNav.css";

const GooeyNav = ({
  items,
  animationTime = 600,
  particleCount = 15,
  particleDistances = [90, 10],
  particleR = 100,
  timeVariance = 300,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
  initialActiveIndex = 0,
}) => {
  const router = useRouter();
  const containerRef = useRef(null);
  const navRef = useRef(null);
  const filterRef = useRef(null);
  const textRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);

  const noise = (n = 1) => n / 2 - Math.random() * n;

  const getXY = (distance, pointIndex, totalPoints) => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };

  const createParticle = (i, t, d, r) => {
    let rotate = noise(r / 10);
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10,
    };
  };

  const makeParticles = (element) => {
    if (!element) return;
    // set bubble time on container for CSS usage
    const d = particleDistances;
    const r = particleR;
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty("--time", `${bubbleTime}ms`);

    // clear existing particles safely
    try {
      while (element.firstChild) element.removeChild(element.firstChild);
    } catch (err) {
      console.warn("Error clearing particles:", err);
    }

    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2);
      const p = createParticle(i, t, d, r);

      setTimeout(() => {
        const particle = document.createElement("span");
        const point = document.createElement("span");
        particle.className = "particle";
        point.className = "point";

        particle.style.setProperty("--start-x", `${p.start[0]}px`);
        particle.style.setProperty("--start-y", `${p.start[1]}px`);
        particle.style.setProperty("--end-x", `${p.end[0]}px`);
        particle.style.setProperty("--end-y", `${p.end[1]}px`);
        particle.style.setProperty("--time", `${p.time}ms`);
        particle.style.setProperty("--scale", `${p.scale}`);
        const colorValue = typeof p.color === "string" ? p.color : `var(--color-${p.color}, white)`;
        particle.style.setProperty("--color", colorValue);
        particle.style.setProperty("--rotate", `${p.rotate}deg`);

        particle.appendChild(point);
        element.appendChild(particle);

        // trigger animation class
        requestAnimationFrame(() => {
          element.classList.add("active");
        });

        // remove particle after its duration
        setTimeout(() => {
          try {
            if (element.contains(particle)) element.removeChild(particle);
          } catch (err) {
            // ignore
          }
        }, p.time);
      }, 20 + i * 6);
    }
  };

  const updateEffectPosition = (element) => {
    if (!containerRef.current || !filterRef.current || !textRef.current || !element) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const pos = element.getBoundingClientRect();

    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`,
    };
    Object.assign(filterRef.current.style, styles);
    Object.assign(textRef.current.style, styles);
    textRef.current.textContent = element.textContent || element.innerText || "";
  };

  // handle click: run animation, then navigate (SPA)
  const handleClick = (e, index, href) => {
    // prevent default so we can control navigation
    e.preventDefault();

    const anchor = e.currentTarget;
    const liEl = anchor.closest("li");
    if (!liEl) return;

    // animate only if index changed (but still navigate regardless)
    if (activeIndex !== index) {
      setActiveIndex(index);
      updateEffectPosition(liEl);

      if (textRef.current) {
        textRef.current.classList.remove("active");
        void textRef.current.offsetWidth;
        textRef.current.classList.add("active");
      }

      if (filterRef.current) {
        makeParticles(filterRef.current);
      }
    }

    // perform SPA navigation
    if (href) {
      router.push(href);
    }
  };

  // keyboard handling for accessibility
  const handleKeyDown = (e, index, href) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      // pass the same event object (currentTarget will be the anchor)
      handleClick(e, index, href);
    }
  };

  useEffect(() => {
    // position effect on mount and when activeIndex changes
    const allLis = navRef.current?.querySelectorAll("li") || [];
    const activeLi = allLis[activeIndex];
    if (activeLi) updateEffectPosition(activeLi);

    // observe container size to reposition effect if layout changes
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      const currentActiveLi = navRef.current?.querySelectorAll("li")[activeIndex];
      if (currentActiveLi) updateEffectPosition(currentActiveLi);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
    // `items.length` included to reposition if items change
  }, [activeIndex, items.length]);

  return (
    <div className="gooey-nav-container" ref={containerRef}>
      <nav>
        <ul ref={navRef}>
          {items.map((item, idx) => (
            <li key={idx} className={activeIndex === idx ? "active" : ""}>
              <a
                href={item.href || "#"}
                onClick={(e) => handleClick(e, idx, item.href)}
                onKeyDown={(e) => handleKeyDown(e, idx, item.href)}
                tabIndex={0}
                aria-current={activeIndex === idx ? "page" : undefined}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <span className="effect filter" ref={filterRef} />
      <span className="effect text" ref={textRef} />
    </div>
  );
};

export default GooeyNav;
