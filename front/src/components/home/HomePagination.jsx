import React from 'react';

export default function HomePagination({ page, canPrev, canNext, onPrev, onNext }) {
  return (
    <div className="home-pagination">
      <button disabled={!canPrev} onClick={onPrev} type="button">上一页</button>
      <span>第 {page + 1} 页</span>
      <button disabled={!canNext} onClick={onNext} type="button">下一页</button>
    </div>
  );
}
