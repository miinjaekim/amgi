'use client';
import { t } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import WritingReviewPanel from '@/components/WritingReviewPanel';

/**
 * Munli's writing tool. A surface of its own, which is the whole reason the
 * Word/Passage toggle does not come back with it.
 */
export default function MunliWritingPage() {
  const { interfaceLanguage } = useUser();
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-mono font-bold mb-6" style={{ color: 'var(--color-text)' }}>
        {t(interfaceLanguage, 'munliToolWriting')}
      </h1>
      <WritingReviewPanel />
    </div>
  );
}
