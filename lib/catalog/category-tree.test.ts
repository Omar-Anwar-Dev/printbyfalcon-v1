import { describe, expect, it } from 'vitest';
import {
  buildTree,
  descendantIds,
  flattenTree,
  type FlatCategory,
} from './category-tree';

type Row = {
  id: string;
  parentId: string | null;
  position: number;
  name: string;
};

const rows: FlatCategory<Row>[] = [
  { id: 'root-1', parentId: null, position: 1, name: 'Printers' },
  { id: 'root-2', parentId: null, position: 0, name: 'Paper' },
  { id: 'child-1', parentId: 'root-1', position: 0, name: 'Laser' },
  { id: 'child-2', parentId: 'root-1', position: 1, name: 'Inkjet' },
  { id: 'grand-1', parentId: 'child-1', position: 0, name: 'Mono' },
];

describe('category-tree', () => {
  it('builds a nested tree with depth and ordered by position', () => {
    const tree = buildTree(rows);
    expect(tree.map((n) => n.id)).toEqual(['root-2', 'root-1']);
    expect(tree[1].children.map((c) => c.id)).toEqual(['child-1', 'child-2']);
    expect(tree[1].children[0].children[0].name).toBe('Mono');
    expect(tree[1].children[0].children[0].depth).toBe(2);
  });

  it('flattens in DFS order for UI rendering', () => {
    const flat = flattenTree(buildTree(rows));
    expect(flat.map((n) => n.id)).toEqual([
      'root-2',
      'root-1',
      'child-1',
      'grand-1',
      'child-2',
    ]);
  });

  it('returns descendant ids (inclusive of the node itself)', () => {
    const set = descendantIds(buildTree(rows), 'root-1');
    expect([...set].sort()).toEqual([
      'child-1',
      'child-2',
      'grand-1',
      'root-1',
    ]);
  });

  it('returns empty set for unknown root', () => {
    const set = descendantIds(buildTree(rows), 'does-not-exist');
    expect(set.size).toBe(0);
  });
});
