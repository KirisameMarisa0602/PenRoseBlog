import React, { useState, useMemo, useEffect } from 'react';
import ArticleCard from '@components/common/ArticleCard';
import '@styles/selfspace/ArticleFolderTree.css';

// Helper to build tree from posts
const buildTree = (posts) => {
  const root = {
    name: '我的文章',
    path: 'root',
    type: 'folder',
    children: {
      published: {
        name: '已发布文章',
        path: 'root/published',
        type: 'folder',
        children: {}
      },
      drafts: {
        name: '草稿箱',
        path: 'root/drafts',
        type: 'folder',
        children: {}
      }
    }
  };

  posts.forEach(post => {
    const isDraft = post.status && post.status.toUpperCase() === 'DRAFT';
    const statusNode = isDraft ? root.children.drafts : root.children.published;

    const category = post.categoryName || '未分类';
    const categoryPath = `${statusNode.path}/${category}`;

    if (!statusNode.children[category]) {
      statusNode.children[category] = {
        name: category,
        path: categoryPath,
        type: 'folder',
        children: {}
      };
    }

    let current = statusNode.children[category];
    let currentPath = categoryPath;

    // Handle directory path
    if (post.directory) {
      const parts = post.directory.split('/');

      parts.forEach(part => {
        currentPath = `${currentPath}/${part}`;
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: currentPath,
            type: 'folder',
            children: {}
          };
        }
        current = current.children[part];
      });
    }

    // Add post as a child node
    const postId = post.id || post.postId;
    current.children[`post-${postId}`] = {
      name: post.title,
      path: `${currentPath}/post-${postId}`,
      type: 'file',
      data: post
    };
  });

  return root;
};

const FolderNode = ({ node, onSelect, selectedPath, level = 0, onDelete }) => {
  const hasChildren = node.children && Object.keys(node.children).length > 0;
  const [expanded, setExpanded] = useState(false);

  // Auto-expand if a child is selected or if this node is selected
  useEffect(() => {
    if (selectedPath && selectedPath.startsWith(node.path)) {
      setExpanded(true);
    }
  }, [selectedPath, node.path]);

  // Default expand root and status nodes
  useEffect(() => {
    if (level < 2) {
      setExpanded(true);
    }
  }, [level]);

  // If it's a file (article), render the ArticleCard
  if (node.type === 'file') {
    return (
      <div className={`folder-file-node level-${level}`}>
        <ArticleCard post={node.data} onDelete={onDelete} className="tree-article-card" />
      </div>
    );
  }

  const handleHeaderClick = (e) => {
    e.stopPropagation();
    // Clicking the header text selects the folder and ensures it is expanded
    if (onSelect) onSelect(node);
    if (!expanded) setExpanded(true);
  };

  const handleIconClick = (e) => {
    e.stopPropagation();
    // Clicking the icon ONLY toggles expansion, does not trigger selection
    setExpanded(!expanded);
  };

  const isSelected = selectedPath === node.path;

  // Separate children into folders and files
  const childrenList = node.children ? Object.values(node.children) : [];
  const folderChildren = childrenList.filter(c => c.type === 'folder');
  const fileChildren = childrenList.filter(c => c.type === 'file');

  return (
    <div className={`folder-node level-${level} ${expanded ? 'expanded' : ''} ${!hasChildren ? 'is-leaf' : ''}`}>
      <div
        className={`folder-header ${isSelected ? 'active' : ''}`}
        onClick={handleHeaderClick}
      >
        <div className="folder-name">{node.name}</div>
        {hasChildren && (
          <div
            className="folder-cross"
            onClick={handleIconClick}
            role="button"
            aria-label={expanded ? "Collapse" : "Expand"}
          ></div>
        )}
      </div>

      {hasChildren && (
        <div className="folder-children">
          {/* Render subfolders vertically */}
          {folderChildren.map(child => (
            <FolderNode
              key={child.path}
              node={child}
              onSelect={onSelect}
              selectedPath={selectedPath}
              level={level + 1}
              onDelete={onDelete}
            />
          ))}

          {/* Render files horizontally */}
          {fileChildren.length > 0 && (
            <div className="folder-files-horizontal-wrapper">
              <div className="folder-files-horizontal-scroll">
                {fileChildren.map(child => (
                  <FolderNode
                    key={child.path}
                    node={child}
                    onSelect={onSelect}
                    selectedPath={selectedPath}
                    level={level + 1}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function ArticleFolderTree({ posts, onDelete }) {
  const tree = useMemo(() => buildTree(posts || []), [posts]);
  const [selectedPath, setSelectedPath] = useState('root/published');

  const handleSelect = (node) => {
    if (node.type === 'file') return;
    setSelectedPath(node.path);
  };

  return (
    <div className="folder-tree-container">
      <FolderNode
        node={tree}
        onSelect={handleSelect}
        selectedPath={selectedPath}
        level={0}
        onDelete={onDelete}
      />
    </div>
  );
}
