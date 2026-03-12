# Liquid Glass Design Guide

This document outlines the core principles, CSS utilities, and component structures required to maintain the "Liquid Glass" aesthetic throughout the Diagnostic web application.

## Core Philosophy

The Liquid Glass aesthetic is inspired by premium, modern physical materials—specifically refractive, polished glass overlaid on vibrant, fluid light sources.

**Key Characteristics:**
1.  **Translucency over Transparency:** Surfaces aren't just see-through; they actively blur, saturate, and distort what lies beneath them.
2.  **Physical Lighting:** Elements must have a sense of depth, achieved through specular edge highlights (catching light on the top edge) and soft, tinted drop shadows.
3.  **Inner Radiance:** Glass elements often have a very soft, faint glow emanating from their center top, simulating light passing through the thickest part of the glass.
4.  **Fluid Motion:** Interactions (hover, tap, load) should feel organic and fluid, utilizing spring physics rather than linear web transitions.

---

## 1. The Canvas: Animated Mesh Gradients

The glass effect only works if there is something colorful and dynamic behind it to refract.

*   **Background Base:** Avoid stark white or flat colors. Use a soft, multi-stop radial or linear gradient.
*   **Drifting Blobs:** Position 2-3 large, absolute `div` elements behind your main content.
    *   **Size:** Very large (e.g., `w-[500px] h-[500px]`).
    *   **Blur:** Extremely high (e.g., `blur(120px)` or `blur(150px)`).
    *   **Colors:** Soft lavenders (`#C9B8F0`), sky blues (`#A8D8F0`), and pinks (`#F0B8D0`).
    *   **Animation:** Use slow, drifting CSS `@keyframes` (20-30 seconds per cycle) to move them in figure-eight or elliptical patterns.

---

## 2. The Glass Material (Tailwind CSS Recipe)

To create a standard Liquid Glass container, card, or button, combine the following Tailwind utilities:

### A. The Base Layer
*   **Fill:** `bg-white/8` to `bg-white/12` (Extremely sheer white).
*   **Blur & Saturation:** `backdrop-blur-[24px]` (or up to `28px` for larger cards). You can add `backdrop-saturate-[140%]` via custom CSS if you need colors beneath to pop more.
*   **Structure:** `rounded-[30px]` (generous border radii look more natural for glass) and `overflow-hidden` (to contain the inner glow).

### B. The Edges (Specular Highlights)
*   **Border:** A sheer white border `border border-white/20` to `border-white/30` simulates the sharp edge of the cut glass.

### C. The Shadows (Depth & Light)
*   **Complex Box Shadow:** This is the most critical part. It requires two distinct shadows applied simultaneously:
    1.  **Tinted Drop Shadow:** `0 8px 32px rgba(93,46,168,0.12)` (A soft, wide shadow tinted with the primary brand purple, not stark black).
    2.  **Inset Top Highlight:** `inset 0 1px 0 rgba(255,255,255,0.35)` (A sharp, pure white inner shadow that catches the light exactly on the top inner edge).
*   *Tailwind Example:* `shadow-[0_8px_32px_rgba(93,46,168,0.12),inset_0_1px_0_rgba(255,255,255,0.35)]`

### D. The Inner Glow (Volume)
Glass isn't uniformly flat. To give it volume, inject a pseudo-element or absolute `div` inside the container:
```tsx
{/* Inner radial glow */}
<div className="absolute inset-0 rounded-[30px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.2)_0%,transparent_50%)] pointer-events-none" />
```
*   This creates a soft white light pooling at the top center and fading out halfway down. Make sure `pointer-events-none` is applied so it doesn't block clicks.

---

## 3. Typography & Gradients

Because the backgrounds are visually noisy, text needs to be highly legible.

*   **Primary Text:** Use deep, saturated darks like `#1F1B2D` or `#2F1C4E` instead of pure black for a softer, more integrated look.
*   **Gradient Text:** For titles and emphasis, use a vibrant gradient that mimics light dispersion (chromatic aberration):
    *   `bg-linear-to-r from-[#5D2EA8] to-[#F294B9]`
    *   `bg-clip-text text-transparent`

---

## 4. Micro-Interactions (Framer Motion)

Interactions should feel fluid, snappy, and physical.

### Buttons & Clickables
*   **Hover Lift:**
    *   `whileHover={{ scale: 1.05, filter: "brightness(1.15)" }}`
    *   Scaling up slightly makes the element feel physically closer to the user.
    *   Increasing brightness simulates the glass catching more light as it "lifts".
*   **Tap Compress:**
    *   `whileTap={{ scale: 0.96 }}` (Simulates the element being pressed into the screen).

### Page/Element Transitions
*   **Deep Focus Animation:** For prominent entry animations (like the main logo), start elements deep out-of-focus and small, pushing them forward into sharpness:
    *   `initial={{ opacity: 0, filter: "blur(24px)", scale: 0.9, y: 10 }}`
    *   `animate={{ opacity: 1, filter: "blur(0px)", scale: 1, y: 0 }}`
    *   `transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}` (A smooth swift-out curve).

---

## 5. Summary Cheat Code (React Component Wrapper)

To wrap any content in a standardized Liquid Glass container:

```tsx
<motion.div
  whileHover={{ scale: 1.02 }}
  className="relative bg-white/10 border border-white/25 rounded-[30px] backdrop-blur-[28px] overflow-hidden shadow-[0_8px_32px_rgba(93,46,168,0.12),inset_0_1px_0_rgba(255,255,255,0.35)]"
>
  {/* Inner radial glow */}
  <div className="absolute inset-0 rounded-[30px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.15)_0%,transparent_50%)] pointer-events-none" />
  
  {/* Your crisp, dark text content goes here */}
  <div className="relative z-10 p-8">
    <h3 className="text-[#2F2646] font-medium text-lg">Glass Container</h3>
  </div>
</motion.div>
```
