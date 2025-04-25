"use client";

import { notFound, useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { TicketDetailsSheet } from '@/components/tickets/ticket-details-sheet';
import { motion } from 'framer-motion';

export default function TicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  if (!id) {
    return notFound();
  }

  return (
    <motion.div 
      className="ticket-detail-overlay"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ paddingTop: '1rem' }}
    >
      <TicketDetailsSheet 
        ticketId={id}
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            router.push('/tickets');
          }
        }}
      />
    </motion.div>
  );
}
