import { Droplets, Gem, Layers, Sparkles, Wind, type LucideIcon } from 'lucide-react';
import { MATERIAL_META, type Material } from '@pcs/shared';

/** Icon shown beside each material name. */
export const MATERIAL_ICON: Record<Material, LucideIcon> = { leather: Gem, leatherette: Layers, pvc: Droplets, fabric: Wind, other: Sparkles };

/** CSS texture per material. Each is a layered gradient so no images are needed. */
export const MATERIAL_TEXTURE: Record<Material, string> = {
  leather:
    'radial-gradient(circle at 30% 30%, rgba(255,255,255,.22) 0 1.5px, transparent 2.5px) 0 0 / 14px 14px, radial-gradient(circle at 70% 70%, rgba(0,0,0,.3) 0 2px, transparent 3px) 0 0 / 22px 22px',
  leatherette: 'repeating-linear-gradient(45deg, rgba(255,255,255,.14) 0 2px, transparent 2px 10px)',
  pvc: 'linear-gradient(rgba(255,255,255,.16) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px) 0 0 / 24px 24px',
  fabric:
    'repeating-linear-gradient(0deg, rgba(255,255,255,.12) 0 2px, transparent 2px 6px), repeating-linear-gradient(90deg, rgba(0,0,0,.2) 0 2px, transparent 2px 6px)',
  other: 'repeating-radial-gradient(circle at 50% 120%, rgba(255,255,255,.16) 0 2px, transparent 2px 14px)',
};

/** Texture over a material-coloured gradient, for swatch panels. */
export function materialSurface(material: Material): string {
  const token = MATERIAL_META[material].token;
  return `${MATERIAL_TEXTURE[material]}, linear-gradient(135deg, color-mix(in srgb, var(${token}) 88%, white), color-mix(in srgb, var(${token}) 62%, #1b1660))`;
}
