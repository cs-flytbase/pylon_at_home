"use client";

import { notFound, useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { ConversationDetailsSheet } from '@/components/conversations/conversation-details-sheet';
import { motion } from 'framer-motion';

export default function ConversationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  if (!id) {
    return notFound();
  }
  
  return (
    <motion.div 
      className="conversation-detail-overlay"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ paddingTop: '1rem' }}
    >
      <ConversationDetailsSheet 
        conversationId={id}
        open={true}
        onOpenChange={(open: boolean) => {
          if (!open) {
            router.push('/conversations');
          }
        }}
      />
    </motion.div>
  );
}
