import { AsyncLocalStorage } from 'async_hooks';

export const auditContext = new AsyncLocalStorage<{ userId: string }>();

export const calculateDiff = (oldData: any, newData: any) => {
  const diff: any = {};
  const sensitiveFields = ['passwordHash'];

  for (const key in newData) {
    if (sensitiveFields.includes(key)) continue;
    
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      diff[key] = {
        from: oldData[key],
        to: newData[key]
      };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
};
