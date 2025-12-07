"use client";
import React from "react";
import GooeyNav from "./GooeyNav/GooeyNav";

export default function SideNav() {
  const items = [
    { label: "Upload", href: "/upload" },
    { label: "Files", href: "/FilesPage },

  ];

  return (
    <div className="gooey-dock-wrap" role="navigation" aria-label="Top dock navigation">
      <GooeyNav
        items={items}
        particleCount={25}
        particleDistances={[90, 10]}
        particleR={100}
        initialActiveIndex={0}
        animationTime={660}
        timeVariance={200}
        colors={['#f8f7fbff', '#1b14e6ff', '#10084eff', '#150103ff']}
      />
    </div>
  );
}
