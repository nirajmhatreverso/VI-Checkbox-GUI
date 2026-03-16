// Generate realistic analytics data for the AZAM TV dashboard

export const generateRevenueData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map(month => ({
    name: month,
    revenue: Math.floor(Math.random() * 5000000) + 2000000, // 2M - 7M TSH
    subscriptions: Math.floor(Math.random() * 500) + 200,
    agents: Math.floor(Math.random() * 50) + 20
  }));
};

export const generateSubscriptionTrends = () => {
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      new: Math.floor(Math.random() * 50) + 10,
      cancelled: Math.floor(Math.random() * 15) + 2,
      renewed: Math.floor(Math.random() * 80) + 30
    };
  });
  return last30Days;
};

export const generatePackageDistribution = () => [
  { name: 'Basic Package', value: 45, color: '#3B82F6' },
  { name: 'Premium Package', value: 30, color: '#10B981' },
  { name: 'Family Package', value: 20, color: '#F59E0B' },
  { name: 'Corporate Package', value: 5, color: '#EF4444' }
];

export const generateServiceTypeData = () => [
  { name: 'DTT', customers: 1250, revenue: 15600000 },
  { name: 'DTH', customers: 890, revenue: 22400000 },
  { name: 'OTT (Azam Max)', customers: 456, revenue: 8900000 }
];

export const generateRegionalData = () => [
  { name: 'Dar es Salaam', customers: 1200, agents: 15, revenue: 28500000 },
  { name: 'Arusha', customers: 680, agents: 8, revenue: 16800000 },
  { name: 'Mwanza', customers: 520, agents: 6, revenue: 12400000 },
  { name: 'Dodoma', customers: 340, agents: 4, revenue: 8200000 },
  { name: 'Mbeya', customers: 280, agents: 3, revenue: 6800000 }
];

export const generatePaymentMethodData = () => [
  { name: 'Mobile Money', value: 65, amount: 31200000 },
  { name: 'Bank Transfer', value: 20, amount: 9600000 },
  { name: 'Cash', value: 10, amount: 4800000 },
  { name: 'Credit Card', value: 5, amount: 2400000 }
];

export const generateInventoryStatus = () => [
  { name: 'Set-Top Boxes', available: 156, reserved: 23, sold: 12, total: 191 },
  { name: 'Smart Cards', available: 89, reserved: 15, sold: 8, total: 112 },
  { name: 'Cables', available: 234, reserved: 12, sold: 6, total: 252 },
  { name: 'Remotes', available: 178, reserved: 19, sold: 9, total: 206 }
];

export const generateAgentPerformance = () => [
  { name: 'John Mwamba', customers: 45, revenue: 5400000, target: 6000000 },
  { name: 'Sarah Kimani', customers: 38, revenue: 4560000, target: 5000000 },
  { name: 'Peter Ngozi', customers: 32, revenue: 3840000, target: 4500000 },
  { name: 'Grace Mollel', customers: 28, revenue: 3360000, target: 4000000 },
  { name: 'David Mushi', customers: 25, revenue: 3000000, target: 3500000 }
];

export const generateHourlyActivity = () => {
  const hours = Array.from({ length: 24 }, (_, i) => {
    const activity = i >= 6 && i <= 22 ? Math.floor(Math.random() * 100) + 20 : Math.floor(Math.random() * 30) + 5;
    return {
      hour: `${i.toString().padStart(2, '0')}:00`,
      activity,
      connections: Math.floor(activity * 1.2),
      transactions: Math.floor(activity * 0.3)
    };
  });
  return hours;
};

export const generateSystemHealth = () => ({
  cpu: Math.floor(Math.random() * 30) + 45, // 45-75%
  memory: Math.floor(Math.random() * 25) + 60, // 60-85%
  storage: Math.floor(Math.random() * 20) + 40, // 40-60%
  network: Math.floor(Math.random() * 15) + 85, // 85-100%
  uptime: 99.8,
  lastUpdate: new Date().toLocaleTimeString()
});

export const generateCustomerSatisfaction = () => ({
  overall: 4.2,
  service: 4.1,
  support: 4.3,
  installation: 4.0,
  billing: 3.9,
  totalResponses: 1247
});