import { OperationType } from '../types';
import { pb } from './pocketbase';

export function handlePBError(error: any, operationType: OperationType, path: string | null) {
  let message = error instanceof Error ? error.message : String(error);
  
  // Extract PocketBase specific error details
  if (error?.data && typeof error.data === 'object') {
    const details = Object.entries(error.data)
      .map(([key, val]: [string, any]) => `${key}: ${val.message || JSON.stringify(val)}`)
      .join(', ');
    if (details) message += ` (${details})`;
  }

  const errInfo = {
    error: message,
    status: error?.status,
    authInfo: {
      userId: pb.authStore.model?.id,
      username: pb.authStore.model?.username,
    },
    operationType,
    path
  };
  console.error('PocketBase Error: ', JSON.stringify(errInfo));
  throw new Error(message);
}
