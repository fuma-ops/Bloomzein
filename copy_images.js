import fs from 'fs';

// Shop copies
fs.copyFileSync('public/images/shop-cat-accessories.jpg', 'public/images/shop-p-clip.jpg');
fs.copyFileSync('public/images/shop-cat-active.jpg', 'public/images/shop-p-bottle.jpg');
fs.copyFileSync('public/images/shop-cat-active.jpg', 'public/images/shop-p-leggings.jpg');
fs.copyFileSync('public/images/shop-cat-beauty.jpg', 'public/images/shop-p-serum.jpg');
fs.copyFileSync('public/images/shop-cat-beauty.jpg', 'public/images/shop-p-gloss.jpg');
fs.copyFileSync('public/images/shop-cat-cycle.jpg', 'public/images/shop-p-heat.jpg');
fs.copyFileSync('public/images/shop-cat-premium.jpg', 'public/images/shop-p-planner.jpg');
fs.copyFileSync('public/images/shop-cat-selfcare.jpg', 'public/images/shop-p-candle.jpg');
fs.copyFileSync('public/images/shop-cat-selfcare.jpg', 'public/images/shop-p-mask.jpg');

const poses = [
  "pose-easy-seat.png",
  "pose-cat-cow.png",
  "pose-childs-pose.png",
  "pose-seated-twist.png",
  "pose-low-lunge.png",
  "pose-butterfly.png",
  "pose-pigeon.png",
  "pose-garland.png",
  "pose-mountain.png",
  "pose-forward-fold.png",
  "pose-downward-dog.png",
  "pose-warrior-1.png",
  "pose-warrior-2.png",
  "pose-triangle.png",
  "pose-chair.png",
  "pose-tree.png",
  "pose-half-moon.png",
  "pose-cobra.png",
  "pose-bridge.png",
  "pose-camel.png",
  "pose-seated-forward-fold.png",
  "pose-head-to-knee.png",
  "pose-wide-leg-fold.png",
  "pose-reclined-bound-angle.png",
  "pose-knees-to-chest.png",
  "pose-supine-twist.png",
  "pose-legs-up-wall.png",
  "pose-savasana.png",
  "pose-plank.png",
  "pose-boat.png",
  "pose-side-plank.png"
];

poses.forEach(p => fs.copyFileSync('public/images/yoga-hero.png', 'public/images/' + p));
