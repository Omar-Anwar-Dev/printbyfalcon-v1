/**
 * Category tree helpers. Categories form a nested forest (unlimited depth per
 * ADR-027). Helpers here keep UI rendering simple without N+1 queries.
 */
export type FlatCategory<T> = T & {
  id: string;
  parentId: string | null;
  position: number;
};

export type TreeNode<T> = FlatCategory<T> & {
  children: TreeNode<T>[];
  depth: number;
};

export function buildTree<T>(rows: FlatCategory<T>[]): TreeNode<T>[] {
  const byId = new Map<string, TreeNode<T>>();
  for (const row of rows) {
    byId.set(row.id, { ...row, children: [], depth: 0 });
  }
  const roots: TreeNode<T>[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (nodes: TreeNode<T>[], depth: number) => {
    nodes.sort((a, b) =>
      a.position === b.position ? 0 : a.position - b.position,
    );
    for (const n of nodes) {
      n.depth = depth;
      sortNodes(n.children, depth + 1);
    }
  };
  sortNodes(roots, 0);
  return roots;
}

export function flattenTree<T>(roots: TreeNode<T>[]): TreeNode<T>[] {
  const out: TreeNode<T>[] = [];
  const walk = (nodes: TreeNode<T>[]) => {
    for (const n of nodes) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(roots);
  return out;
}

/**
 * Returns the set of descendant IDs (inclusive) — used to prevent assigning
 * a category as a parent of itself or one of its descendants on edit.
 */
export function descendantIds<T>(
  roots: TreeNode<T>[],
  rootId: string,
): Set<string> {
  const out = new Set<string>();
  const find = (nodes: TreeNode<T>[]): TreeNode<T> | null => {
    for (const n of nodes) {
      if (n.id === rootId) return n;
      const r = find(n.children);
      if (r) return r;
    }
    return null;
  };
  const subtree = find(roots);
  if (!subtree) return out;
  const collect = (n: TreeNode<T>) => {
    out.add(n.id);
    n.children.forEach(collect);
  };
  collect(subtree);
  return out;
}
