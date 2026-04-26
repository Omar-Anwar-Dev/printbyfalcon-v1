import {
  Droplet,
  CircleDot,
  Printer,
  FileText,
  Cog,
  Boxes,
  Cable,
  Camera,
  type LucideIcon,
} from 'lucide-react';

/**
 * Per-slug icon picker for the homepage category rail (and any other place
 * we want a category to feel more identifiable than a generic icon).
 *
 * Picks are slug-fragment based so an admin renaming "ink-cartridges" to
 * "ink" still gets the right glyph. Falls back to `Boxes` for anything
 * unrecognized.
 */
export function categoryIcon(slug: string): LucideIcon {
  const s = slug.toLowerCase();
  if (s.includes('ink') || s.includes('cartridge')) return Droplet;
  if (s.includes('toner')) return CircleDot;
  if (s.includes('printer')) return Printer;
  if (s.includes('paper')) return FileText;
  if (s.includes('part') || s.includes('accessor') || s.includes('spare'))
    return Cog;
  if (s.includes('cable') || s.includes('usb')) return Cable;
  if (s.includes('scan') || s.includes('camera')) return Camera;
  return Boxes;
}
