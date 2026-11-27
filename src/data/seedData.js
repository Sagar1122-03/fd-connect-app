export const ADMIN = {
  email: 'admin@fdconnect.in',
  pass: 'admin123',
};

export const initialSeed = {
  banks: [
    { id: 1, name: 'State Bank of India', code: 'SBIN', email: 'sbi@bank.in', pass: 'bank123' },
    { id: 2, name: 'HDFC Bank', code: 'HDFC', email: 'hdfc@bank.in', pass: 'bank123' },
  ],
  plans: [
    { id: 1, bankId: 1, name: 'SBI Wecare', rate: 7.5, tenure: 60, min: 10000 },
    { id: 2, bankId: 2, name: 'Senior Citizen Care', rate: 7.75, tenure: 60, min: 5000 },
    { id: 3, bankId: 2, name: 'Regular FD', rate: 7, tenure: 36, min: 5000 },
  ],
  users: [],
  enq: [],
  adReq: [],
};
