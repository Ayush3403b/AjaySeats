import { describe, expect, it } from 'vitest';
import en from './locales/en.json';
import hi from './locales/hi.json';

type Tree = { [key: string]: string | string[] | Tree | Array<Record<string, string>> };

function leaves(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else if (Array.isArray(value)) out.set(path, JSON.stringify(value));
    else for (const [k, v] of leaves(value as Tree, path)) out.set(k, v);
  }
  return out;
}

describe('translation files', () => {
  const enLeaves = leaves(en as Tree);
  const hiLeaves = leaves(hi as Tree);

  it('have identical key sets in English and Hindi', () => {
    const onlyEn = [...enLeaves.keys()].filter((k) => !hiLeaves.has(k));
    const onlyHi = [...hiLeaves.keys()].filter((k) => !enLeaves.has(k));
    expect(onlyEn).toEqual([]);
    expect(onlyHi).toEqual([]);
  });

  it('have no empty strings', () => {
    const empty = [...enLeaves, ...hiLeaves].filter(([, v]) => v.trim() === '').map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it('keep the same material keys and the legal section count', () => {
    for (const material of ['leather', 'leatherette', 'pvc', 'fabric', 'other']) {
      expect(enLeaves.has(`materials.${material}.name`)).toBe(true);
      expect(hiLeaves.has(`materials.${material}.name`)).toBe(true);
    }
    expect(JSON.parse(enLeaves.get('legal.privacy.sections') ?? '[]')).toHaveLength(7);
    expect(JSON.parse(hiLeaves.get('legal.terms.sections') ?? '[]')).toHaveLength(7);
  });

  it('keep the home page lists the same length in both languages', () => {
    const lists = ['home.faq.items', 'home.transform.benefits', 'home.care.leather', 'home.care.leatherette', 'home.care.pvc', 'home.care.fabric'];
    for (const key of lists) {
      const enList = JSON.parse(enLeaves.get(key) ?? '[]') as unknown[];
      const hiList = JSON.parse(hiLeaves.get(key) ?? '[]') as unknown[];
      expect(enList.length, key).toBeGreaterThan(0);
      expect(hiList.length, key).toBe(enList.length);
    }
  });
});
