export const uid = () => Date.now() + Math.floor(Math.random() * 1e4);

export const today = () => new Date().toLocaleDateString('en-IN');

export const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');