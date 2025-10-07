# Visual Changes Guide - History & Ranking Pages

## 🎨 Design System Overview

### Color Palette
```
Primary Red:     #dc2626  ████████
Secondary Red:   #ef4444  ████████
Pink-Red:        #dc267f  ████████
Dark Red:        #b91c1c  ████████
Light Red:       #f87171  ████████

Text Colors:
Dark:            #1f2937  ████████
Medium:          #64748b  ████████
Light:           #f8f9fa  ████████
```

### Typography Scale
```
Logo:            1.5rem / 700 weight
Headers:         1.25-2rem / 600 weight
Body:            0.9-1rem / 400-500 weight
Small:           0.85rem / 400 weight
```

### Spacing System
```
xs:  0.5rem  (8px)
sm:  0.75rem (12px)
md:  1rem    (16px)
lg:  1.5rem  (24px)
xl:  2rem    (32px)
```

### Border Radius
```
Small:   6-8px   (inputs, buttons)
Medium:  12px    (cards, tables)
Large:   16px    (containers, nav)
Circle:  50%     (avatars)
```

## 📱 Component Breakdown

### 1. App Header
```
┌─────────────────────────────────────────────────┐
│  🧠 KD APP              Username [A]            │
│  Glass morphism background with blur            │
│  Sticky positioning, red border bottom          │
└─────────────────────────────────────────────────┘

Features:
- Backdrop blur: 20px
- Background: rgba(255, 255, 255, 0.9)
- Border: 1px solid rgba(220, 38, 127, 0.1)
- Shadow: 0 4px 20px rgba(220, 38, 127, 0.1)
- Position: sticky, top: 0
```

### 2. Navigation Bar
```
┌─────────────────────────────────────────────────┐
│  🏠 Trang chủ  │  📜 Lịch sử  │  🏆 Xếp hạng  │  🚪 Đăng xuất  │
│  Glass background, gradient active state        │
└─────────────────────────────────────────────────┘

States:
- Default:  Gray text, transparent background
- Hover:    Red text, light red background
- Active:   White text, red gradient background

Mobile (< 480px):
┌──────────────────────────┐
│  🏠  │  📜  │  🏆  │  🚪  │
│  Icons only, no text     │
└──────────────────────────┘
```

### 3. History Container
```
┌─────────────────────────────────────────────────┐
│  Filters: [Tháng ▼] [Năm ▼]                    │
├─────────────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ 150  │  │  85% │  │  12  │  │ 1250 │       │
│  │Trận  │  │Đúng  │  │Thắng │  │Điểm  │       │
│  └──────┘  └──────┘  └──────┘  └──────┘       │
├─────────────────────────────────────────────────┤
│  Table with glass effect and red accents        │
└─────────────────────────────────────────────────┘

Stats Cards:
- Gradient backgrounds (red variations)
- Hover: lift effect (-8px)
- Shadow: colored based on gradient
- Text: white with shadow
```

### 4. Ranking Container
```
┌─────────────────────────────────────────────────┐
│  Xếp hạng người chơi theo tháng                 │
│  Filters: [Tháng ▼] [Năm ▼]                    │
├─────────────────────────────────────────────────┤
│         ┌────┐                                  │
│    ┌────┤ 👑 ├────┐                            │
│    │ 2  │ 1  │ 3  │  Top 3 Podium              │
│    └────┴────┴────┘                            │
├─────────────────────────────────────────────────┤
│  Ranking table with gradient rows              │
└─────────────────────────────────────────────────┘

Podium:
- 1st: Gold gradient, scale(1.15), crown emoji
- 2nd: Silver gradient, scale(1.05)
- 3rd: Bronze gradient, scale(1.0)
- Hover: lift effect on all
```

### 5. Tables
```
┌─────────────────────────────────────────────────┐
│  HEADER 1  │  HEADER 2  │  HEADER 3  │  ACTION │
│  Gradient red background, uppercase             │
├─────────────────────────────────────────────────┤
│  Data 1    │  Data 2    │  Data 3    │  [Xem]  │
│  Hover: light red bg, slide right 5px           │
├─────────────────────────────────────────────────┤
│  Data 1    │  Data 2    │  Data 3    │  [Xem]  │
└─────────────────────────────────────────────────┘

Features:
- Header: gradient background
- Rows: hover effect with transform
- Borders: red-tinted
- Buttons: gradient red
- Rounded corners: 12px
```

### 6. Pagination
```
┌─────────────────────────────────────────────────┐
│  Hiển thị 1-20 của 150 trận đấu                │
├─────────────────────────────────────────────────┤
│  [« Đầu] [‹ Trước] Trang [1] của 8 [Sau ›] [Cuối »] │
├─────────────────────────────────────────────────┤
│  Hiển thị: [20 ▼] trận đấu/trang               │
└─────────────────────────────────────────────────┘

Buttons:
- Border: red-tinted
- Hover: red border, light bg
- Active: red gradient
- Disabled: gray, 50% opacity
```

### 7. Modal (Game Details)
```
┌─────────────────────────────────────────────────┐
│  Chi tiết trận đấu                          [×] │
├─────────────────────────────────────────────────┤
│  Game Info Section                              │
│  ┌───────────────────────────────────────────┐ │
│  │ Câu hỏi 1: ...                            │ │
│  │ ✓ Correct / ✗ Incorrect                   │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

Features:
- Glass morphism background
- Backdrop blur on overlay
- Smooth fade in/out
- Close button with rotate effect
```

## 🎭 Animation Details

### 1. Background Animation
```css
@keyframes float {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    33%      { transform: translate(30px, -30px) rotate(120deg); }
    66%      { transform: translate(-20px, 20px) rotate(240deg); }
}
Duration: 20s
Easing: ease-in-out
Loop: infinite
```

### 2. Hover Effects
```
Cards:       translateY(-8px) + shadow increase
Buttons:     translateY(-2px) + shadow
Table rows:  translateX(5px) + background
Nav items:   background color change
```

### 3. Transitions
```
All elements: 0.3s ease
Transforms:   0.3s ease
Colors:       0.3s ease
Shadows:      0.3s ease
```

## 📐 Layout Structure

### Desktop (> 768px)
```
┌─────────────────────────────────────────────────┐
│  Header (sticky)                                │
├─────────────────────────────────────────────────┤
│  Navigation (4 items horizontal)                │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │  Container (max-width: 1200px)          │   │
│  │  Padding: 2rem                          │   │
│  │  Glass morphism background              │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Tablet (768px)
```
┌─────────────────────────────────────────────────┐
│  Header (smaller logo)                          │
├─────────────────────────────────────────────────┤
│  Navigation (2x2 grid)                          │
│  🏠 Trang chủ  │  📜 Lịch sử                    │
│  🏆 Xếp hạng   │  🚪 Đăng xuất                  │
├─────────────────────────────────────────────────┤
│  Container (padding: 1.5rem)                    │
└─────────────────────────────────────────────────┘
```

### Mobile (< 480px)
```
┌──────────────────────┐
│  Header (compact)    │
├──────────────────────┤
│  Nav (icons only)    │
│  🏠 📜 🏆 🚪         │
├──────────────────────┤
│  Container           │
│  (padding: 1rem)     │
│  Single column       │
└──────────────────────┘
```

## 🎯 Interactive States

### Buttons
```
Default:  White bg, red border
Hover:    Light red bg, red border, lift
Active:   Red gradient bg, white text
Disabled: Gray bg, 50% opacity
```

### Form Inputs
```
Default:  White bg, light red border
Focus:    Red border, red shadow ring
Error:    Red border, red text
```

### Links
```
Default:  Gray text
Hover:    Red text, underline
Active:   Red text, bold
```

## 🔧 Technical Implementation

### Glass Morphism
```css
background: rgba(255, 255, 255, 0.7);
backdrop-filter: blur(20px);
border: 1px solid rgba(220, 38, 127, 0.1);
box-shadow: 0 8px 32px rgba(220, 38, 127, 0.1);
```

### Gradient Backgrounds
```css
/* Primary gradient */
background: linear-gradient(135deg, #dc2626, #ef4444);

/* Stat cards variations */
background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
background: linear-gradient(135deg, #dc267f 0%, #ef4444 100%);
background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%);
background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
```

### Shadows
```css
/* Subtle */
box-shadow: 0 4px 20px rgba(220, 38, 127, 0.1);

/* Medium */
box-shadow: 0 8px 25px rgba(220, 38, 38, 0.3);

/* Strong */
box-shadow: 0 15px 35px rgba(220, 38, 38, 0.4);
```

---

**Last Updated**: 2025-10-07
**Design System Version**: 2.0
**Status**: ✅ Production Ready

